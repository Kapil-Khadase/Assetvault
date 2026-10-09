import time
import threading
from collections import defaultdict
from functools import wraps
from flask import request, jsonify, make_response
from config import (
    RATE_LIMIT_AUTH_PER_IP_MAX,
    RATE_LIMIT_AUTH_PER_IP_WINDOW,
    RATE_LIMIT_AUTH_PER_ACCOUNT_MAX,
    RATE_LIMIT_AUTH_PER_ACCOUNT_WINDOW,
    RATE_LIMIT_AUTH_REGISTER_MAX,
    RATE_LIMIT_AUTH_REGISTER_WINDOW,
    RATE_LIMIT_AUTH_PASSWORD_CHANGE_MAX,
    RATE_LIMIT_AUTH_PASSWORD_CHANGE_WINDOW,
    AUTH_BACKOFF_THRESHOLD,
    AUTH_BACKOFF_BASE_SECONDS,
    AUTH_BACKOFF_FACTOR,
    AUTH_BACKOFF_MAX_SECONDS,
    RATE_LIMIT_PUBLIC_MAX,
    RATE_LIMIT_PUBLIC_WINDOW,
    RATE_LIMIT_HEALTH_MAX,
    RATE_LIMIT_HEALTH_WINDOW,
    RATE_LIMIT_VERIFY_MAX,
    RATE_LIMIT_VERIFY_WINDOW,
    RATE_LIMIT_AUTHENTICATED_READ_MAX,
    RATE_LIMIT_AUTHENTICATED_READ_WINDOW,
    RATE_LIMIT_AUTHENTICATED_MUTATION_MAX,
    RATE_LIMIT_AUTHENTICATED_MUTATION_WINDOW,
    RATE_LIMIT_DOCUMENT_UPLOAD_MAX,
    RATE_LIMIT_DOCUMENT_UPLOAD_WINDOW,
    RATE_LIMIT_REPORTS_MAX,
    RATE_LIMIT_REPORTS_WINDOW,
    RATE_LIMIT_MARKET_SYNC_MAX,
    RATE_LIMIT_MARKET_SYNC_WINDOW,
    RATE_LIMIT_BACKUP_RESTORE_MAX,
    RATE_LIMIT_BACKUP_RESTORE_WINDOW
)

def get_client_ip() -> str:
    """Extracts client IP address safely considering reverse proxies."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        if client_ip:
            return client_ip
    return request.remote_addr or "127.0.0.1"


class ExponentialBackoffTracker:
    """
    Thread-safe tracker for exponential backoff on authentication failures.
    Replaces rigid hard lockouts with progressively increasing delays per IP and per account.
    All parameters are dynamically configurable via config.py / environment variables.
    """
    def __init__(self):
        self._lock = threading.Lock()
        # identifier -> failed attempt count
        self._failure_counts = defaultdict(int)
        # identifier -> epoch timestamp until which requests must back off
        self._backoff_until = defaultdict(float)

    def record_failure(self, identifier: str) -> tuple:
        """
        Records an authentication failure for an identifier (IP or account).
        Returns (is_under_backoff, wait_seconds, total_failures).
        """
        now = time.time()
        with self._lock:
            self._failure_counts[identifier] += 1
            failures = self._failure_counts[identifier]

            if failures >= AUTH_BACKOFF_THRESHOLD:
                exponent = failures - AUTH_BACKOFF_THRESHOLD
                delay = min(
                    AUTH_BACKOFF_MAX_SECONDS,
                    int(AUTH_BACKOFF_BASE_SECONDS * (AUTH_BACKOFF_FACTOR ** exponent))
                )
                self._backoff_until[identifier] = now + delay
                return True, delay, failures
            return False, 0, failures

    def record_success(self, identifier: str):
        """Resets backoff state upon successful authentication."""
        with self._lock:
            self._failure_counts.pop(identifier, None)
            self._backoff_until.pop(identifier, None)

    def check_backoff(self, identifier: str) -> tuple:
        """
        Checks whether an identifier is currently undergoing exponential backoff.
        Returns (is_allowed, wait_seconds).
        """
        now = time.time()
        with self._lock:
            backoff_until = self._backoff_until.get(identifier, 0.0)
            if now < backoff_until:
                wait_seconds = max(1, int(backoff_until - now + 0.99))
                return False, wait_seconds
            return True, 0

    def get_failure_count(self, identifier: str) -> int:
        with self._lock:
            return self._failure_counts.get(identifier, 0)

    def reset(self):
        """Resets all backoff tracking state."""
        with self._lock:
            self._failure_counts.clear()
            self._backoff_until.clear()


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
        return f"ip:{get_client_ip()}"

    def check_limit(self, scope: str, max_requests: int, window_seconds: int, key: str = None):
        """
        Check and record a request under a specific scope and key.
        Returns (is_allowed, remaining_requests, reset_time_epoch, retry_after_seconds).
        """
        if not self.enabled:
            return True, max_requests, int(time.time()) + window_seconds, 0

        target_key = key or self._get_client_identifier()
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            timestamps = self._records[scope][target_key]
            # Prune timestamps outside current sliding window
            self._records[scope][target_key] = [ts for ts in timestamps if ts > window_start]
            valid_timestamps = self._records[scope][target_key]

            current_count = len(valid_timestamps)
            if current_count >= max_requests:
                oldest_timestamp = valid_timestamps[0]
                retry_after = max(1, int(oldest_timestamp + window_seconds - now + 0.99))
                reset_epoch = int(oldest_timestamp + window_seconds)
                return False, 0, reset_epoch, retry_after

            # Request permitted
            valid_timestamps.append(now)
            remaining = max_requests - len(valid_timestamps)
            reset_epoch = int(valid_timestamps[0] + window_seconds)
            return True, remaining, reset_epoch, 0

    def reset(self):
        """Clear all rate limiting and backoff records."""
        with self._lock:
            self._records.clear()
        backoff_tracker.reset()


limiter = SlidingWindowRateLimiter()
backoff_tracker = ExponentialBackoffTracker()


def rate_limit(max_requests: int = None, window_seconds: int = 60, scope: str = None):
    """
    Standard sliding window rate limiter decorator.
    Backwards-compatible with custom or default thresholds.
    """
    def decorator(f):
        rule_scope = scope or f.__name__
        effective_max = max_requests if max_requests is not None else RATE_LIMIT_AUTHENTICATED_MUTATION_MAX

        @wraps(f)
        def decorated_function(*args, **kwargs):
            is_allowed, remaining, reset_epoch, retry_after = limiter.check_limit(
                scope=rule_scope,
                max_requests=effective_max,
                window_seconds=window_seconds
            )

            if not is_allowed:
                response = make_response(jsonify({
                    "error": f"Too many requests. Please slow down and try again in {retry_after}s.",
                    "retry_after": retry_after
                }), 429)
                response.headers["Retry-After"] = str(retry_after)
                response.headers["X-RateLimit-Limit"] = str(effective_max)
                response.headers["X-RateLimit-Remaining"] = "0"
                response.headers["X-RateLimit-Reset"] = str(reset_epoch)
                return response

            res = f(*args, **kwargs)
            response = make_response(res)
            response.headers["X-RateLimit-Limit"] = str(effective_max)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_epoch)
            return response

        return decorated_function
    return decorator


def rate_limit_auth(scope: str = "auth", per_account: bool = True, max_requests: int = None, window_seconds: int = None):
    """
    Stricter rate limiting decorator for authentication routes.
    Enforces dual-axis rate limiting: per-IP and per-Account with exponential backoff.
    """
    ip_max = max_requests or RATE_LIMIT_AUTH_PER_IP_MAX
    ip_window = window_seconds or RATE_LIMIT_AUTH_PER_IP_WINDOW
    acct_max = max_requests or RATE_LIMIT_AUTH_PER_ACCOUNT_MAX
    acct_window = window_seconds or RATE_LIMIT_AUTH_PER_ACCOUNT_WINDOW

    def decorator(f):
        rule_scope = scope or f.__name__

        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = get_client_ip()
            ip_key = f"ip:{client_ip}"

            # 1. Check Exponential Backoff on Client IP
            ip_allowed, ip_wait = backoff_tracker.check_backoff(ip_key)
            if not ip_allowed:
                resp = make_response(jsonify({
                    "error": f"Too many requests. Exponential backoff active for IP. Please retry in {ip_wait}s.",
                    "retry_after": ip_wait
                }), 429)
                resp.headers["Retry-After"] = str(ip_wait)
                return resp

            # 2. Extract account identifier if present (JSON email, user_id, etc.)
            account_key = None
            if per_account:
                user_id = getattr(request, "user_id", None)
                if user_id:
                    account_key = f"account:user_{user_id}"
                else:
                    payload = request.get_json(silent=True) or {}
                    email = payload.get("email") or payload.get("username")
                    if email and isinstance(email, str):
                        account_key = f"account:{email.strip().lower()}"

            # 3. Check Exponential Backoff on Account
            if account_key:
                acct_allowed, acct_wait = backoff_tracker.check_backoff(account_key)
                if not acct_allowed:
                    resp = make_response(jsonify({
                        "error": f"Too many requests. Exponential backoff active for account. Please retry in {acct_wait}s.",
                        "retry_after": acct_wait
                    }), 429)
                    resp.headers["Retry-After"] = str(acct_wait)
                    return resp

            # 4. Check Sliding Window on Client IP
            is_ip_allowed, ip_rem, ip_reset, ip_retry = limiter.check_limit(
                scope=f"{rule_scope}_ip",
                max_requests=ip_max,
                window_seconds=ip_window,
                key=ip_key
            )
            if not is_ip_allowed:
                resp = make_response(jsonify({
                    "error": f"Too many requests from this IP. Please retry in {ip_retry}s.",
                    "retry_after": ip_retry
                }), 429)
                resp.headers["Retry-After"] = str(ip_retry)
                resp.headers["X-RateLimit-Limit"] = str(ip_max)
                resp.headers["X-RateLimit-Remaining"] = "0"
                resp.headers["X-RateLimit-Reset"] = str(ip_reset)
                return resp

            # 5. Check Sliding Window on Account
            if account_key:
                is_acct_allowed, acct_rem, acct_reset, acct_retry = limiter.check_limit(
                    scope=f"{rule_scope}_account",
                    max_requests=acct_max,
                    window_seconds=acct_window,
                    key=account_key
                )
                if not is_acct_allowed:
                    resp = make_response(jsonify({
                        "error": f"Too many requests for this account. Please retry in {acct_retry}s.",
                        "retry_after": acct_retry
                    }), 429)
                    resp.headers["Retry-After"] = str(acct_retry)
                    resp.headers["X-RateLimit-Limit"] = str(acct_max)
                    resp.headers["X-RateLimit-Remaining"] = "0"
                    resp.headers["X-RateLimit-Reset"] = str(acct_reset)
                    return resp

            res = f(*args, **kwargs)
            response = make_response(res)
            response.headers["X-RateLimit-Limit"] = str(ip_max)
            response.headers["X-RateLimit-Remaining"] = str(ip_rem)
            response.headers["X-RateLimit-Reset"] = str(ip_reset)
            return response

        return decorated_function
    return decorator


def rate_limit_public(scope: str = "public", max_requests: int = None, window_seconds: int = None):
    """Moderate limits on unauthenticated public endpoints."""
    effective_max = max_requests if max_requests is not None else RATE_LIMIT_PUBLIC_MAX
    effective_window = window_seconds if window_seconds is not None else RATE_LIMIT_PUBLIC_WINDOW
    return rate_limit(max_requests=effective_max, window_seconds=effective_window, scope=scope)


def rate_limit_authenticated_read(scope: str = "auth_read", max_requests: int = None, window_seconds: int = None):
    """Looser limits on authenticated read-only endpoints."""
    effective_max = max_requests if max_requests is not None else RATE_LIMIT_AUTHENTICATED_READ_MAX
    effective_window = window_seconds if window_seconds is not None else RATE_LIMIT_AUTHENTICATED_READ_WINDOW
    return rate_limit(max_requests=effective_max, window_seconds=effective_window, scope=scope)


def rate_limit_authenticated_mutation(scope: str = "auth_mutation", max_requests: int = None, window_seconds: int = None):
    """Controlled limits on authenticated financial and vault mutations."""
    effective_max = max_requests if max_requests is not None else RATE_LIMIT_AUTHENTICATED_MUTATION_MAX
    effective_window = window_seconds if window_seconds is not None else RATE_LIMIT_AUTHENTICATED_MUTATION_WINDOW
    return rate_limit(max_requests=effective_max, window_seconds=effective_window, scope=scope)
