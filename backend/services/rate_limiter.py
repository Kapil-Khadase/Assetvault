import time
import threading
from collections import defaultdict
from functools import wraps
from flask import request, jsonify, make_response

class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Keeps track of request timestamps per key within a moving time window.
    """
    def __init__(self):
        self._lock = threading.Lock()
        # Storage: scope -> key -> list of float timestamps
        self._records = defaultdict(lambda: defaultdict(list))
        self.enabled = True

    def _get_client_identifier(self):
        """
        Identify client by authenticated user_id if present,
        otherwise by client remote IP address.
        """
        user_id = getattr(request, "user_id", None)
        if user_id is not None:
            return f"user:{user_id}"

        # Check X-Forwarded-For header if behind a reverse proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # First IP is the original client IP
            client_ip = forwarded_for.split(",")[0].strip()
            if client_ip:
                return f"ip:{client_ip}"

        return f"ip:{request.remote_addr or 'unknown'}"

    def check_limit(self, scope: str, max_requests: int, window_seconds: int):
        """
        Check and record a request under a specific scope.
        Returns (is_allowed, remaining_requests, reset_time_epoch, retry_after_seconds).
        """
        if not self.enabled:
            return True, max_requests, int(time.time()) + window_seconds, 0

        key = self._get_client_identifier()
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            timestamps = self._records[scope][key]
            # Prune timestamps outside the current sliding window
            self._records[scope][key] = [ts for ts in timestamps if ts > window_start]
            valid_timestamps = self._records[scope][key]

            current_count = len(valid_timestamps)
            if current_count >= max_requests:
                # Calculate earliest timestamp that will roll off
                oldest_timestamp = valid_timestamps[0]
                retry_after = max(1, int(oldest_timestamp + window_seconds - now + 0.99))
                reset_epoch = int(oldest_timestamp + window_seconds)
                return False, 0, reset_epoch, retry_after

            # Request is permitted, append timestamp
            valid_timestamps.append(now)
            remaining = max_requests - len(valid_timestamps)
            reset_epoch = int(valid_timestamps[0] + window_seconds)
            return True, remaining, reset_epoch, 0

    def reset(self):
        """Clear all rate limiting records (useful for automated testing)."""
        with self._lock:
            self._records.clear()

limiter = SlidingWindowRateLimiter()

def rate_limit(max_requests: int, window_seconds: int = 60, scope: str = None):
    """
    Flask route decorator to enforce rate limits per IP or authenticated user.
    """
    def decorator(f):
        rule_scope = scope or f.__name__

        @wraps(f)
        def decorated_function(*args, **kwargs):
            is_allowed, remaining, reset_epoch, retry_after = limiter.check_limit(
                scope=rule_scope,
                max_requests=max_requests,
                window_seconds=window_seconds
            )

            if not is_allowed:
                response = make_response(jsonify({
                    "error": f"Too many requests. Please slow down and try again in {retry_after}s.",
                    "retry_after": retry_after
                }), 429)
                response.headers["Retry-After"] = str(retry_after)
                response.headers["X-RateLimit-Limit"] = str(max_requests)
                response.headers["X-RateLimit-Remaining"] = "0"
                response.headers["X-RateLimit-Reset"] = str(reset_epoch)
                return response

            # Execute endpoint handler
            res = f(*args, **kwargs)

            # If response is already a Flask response object or tuple
            response = make_response(res)
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_epoch)
            return response

        return decorated_function
    return decorator
