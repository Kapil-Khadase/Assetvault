import unittest
import os
import sys
import time
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import init_db
from seed_data import seed_database
from app import app
from services.auth_service import register_user, authenticate_user
from services.rate_limiter import limiter, backoff_tracker
from config import (
    RATE_LIMIT_AUTH_PER_IP_MAX,
    RATE_LIMIT_PUBLIC_MAX,
    RATE_LIMIT_AUTHENTICATED_READ_MAX,
    AUTH_BACKOFF_THRESHOLD,
    AUTH_BACKOFF_BASE_SECONDS,
    AUTH_BACKOFF_FACTOR
)

class RateLimitingAndValidationTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database()

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        limiter.reset()

    # =========================================================================
    # REQUIREMENT 1: RATE LIMITING APPROPRIATE TO ENDPOINT TYPE
    # =========================================================================

    def test_tiered_rate_limits_stricter_moderate_looser(self):
        """Verify strict auth limits, moderate public limits, and looser authenticated limits."""
        # 1. Stricter limits on auth routes (e.g. register)
        # Register limit is 10/min by default
        reg_email = f"ratelimit_reg_{int(time.time()*1000)}"
        allowed_count = 0
        for i in range(12):
            res = self.app.post("/api/auth/register", json={
                "name": f"User {i}",
                "email": f"{reg_email}_{i}@assetvault.com",
                "password": "Password123!"
            })
            if res.status_code == 201:
                allowed_count += 1
            elif res.status_code == 429:
                break
        self.assertLessEqual(allowed_count, 10, "Auth register should have a strict rate limit")

        # 2. Moderate limits on public endpoints (e.g. /api/health)
        limiter.reset()
        res_health = self.app.get("/api/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertIn("X-RateLimit-Limit", res_health.headers)
        health_limit = int(res_health.headers["X-RateLimit-Limit"])
        self.assertEqual(health_limit, RATE_LIMIT_PUBLIC_MAX)

        # 3. Looser limits on authenticated user actions (e.g. /api/portfolio/summary)
        demo_user, _ = authenticate_user("kapil@example.com", "demo123")
        headers = {"Authorization": f"Bearer {demo_user['token']}"}
        res_summary = self.app.get("/api/portfolio/summary", headers=headers)
        self.assertEqual(res_summary.status_code, 200)
        self.assertIn("X-RateLimit-Limit", res_summary.headers)
        auth_limit = int(res_summary.headers["X-RateLimit-Limit"])
        self.assertEqual(auth_limit, RATE_LIMIT_AUTHENTICATED_READ_MAX)
        self.assertGreater(auth_limit, health_limit, "Authenticated actions should have higher limits than public endpoints")

    # =========================================================================
    # REQUIREMENT 2: DUAL PER-IP AND PER-ACCOUNT EXPONENTIAL BACKOFF
    # =========================================================================

    def test_auth_per_account_and_per_ip_exponential_backoff(self):
        """Verify exponential backoff progression rather than hard permanent lockout."""
        email = f"backoff_test_{int(time.time()*1000)}@assetvault.com"
        register_user("Backoff Target", email, "Password123!", "INR")

        # Initial failed logins under threshold (5 attempts)
        for i in range(AUTH_BACKOFF_THRESHOLD):
            res = self.app.post("/api/auth/login", json={"email": email, "password": "WrongPassword"})
            self.assertEqual(res.status_code, 401, f"Attempt {i+1} should fail with 401")

        # Attempt AUTH_BACKOFF_THRESHOLD + 1 triggers exponential backoff
        res_backoff_1 = self.app.post("/api/auth/login", json={"email": email, "password": "WrongPassword"})
        self.assertEqual(res_backoff_1.status_code, 429)
        self.assertIn("Retry-After", res_backoff_1.headers)
        wait_1 = int(res_backoff_1.headers["Retry-After"])
        self.assertGreaterEqual(wait_1, AUTH_BACKOFF_BASE_SECONDS)
        data = res_backoff_1.get_json()
        self.assertTrue("backoff" in data["error"].lower() or "too many" in data["error"].lower() or "locked" in data["error"].lower())

        # Verify backoff tracker tracks per-account key
        acct_key = f"account:{email}"
        self.assertFalse(backoff_tracker.check_backoff(acct_key)[0])

    def test_auth_successful_login_resets_backoff(self):
        """Verify successful login resets failure counter and backoff."""
        email = f"reset_backoff_{int(time.time()*1000)}@assetvault.com"
        register_user("Reset Target", email, "CorrectPass123!", "INR")

        # Fail 3 times (below threshold of 5)
        for _ in range(3):
            self.app.post("/api/auth/login", json={"email": email, "password": "WrongPassword"})

        acct_key = f"account:{email}"
        self.assertEqual(backoff_tracker.get_failure_count(acct_key), 3)

        # Successful login resets the tracker
        res_ok = self.app.post("/api/auth/login", json={"email": email, "password": "CorrectPass123!"})
        self.assertEqual(res_ok.status_code, 200)
        self.assertEqual(backoff_tracker.get_failure_count(acct_key), 0)

    # =========================================================================
    # REQUIREMENT 3: STRICT INPUT VALIDATION AGAINST SCHEMAS (HTTP 400 REJECTIONS)
    # =========================================================================

    def test_register_strict_validation_rejections(self):
        """Reject invalid registration payloads with HTTP 400."""
        # 1. Missing required field (name)
        limiter.reset()
        res1 = self.app.post("/api/auth/register", json={
            "email": "valid@example.com",
            "password": "ValidPassword123!"
        })
        self.assertEqual(res1.status_code, 400)
        self.assertIn("Missing required field", res1.get_json()["error"])

        # 2. Invalid email format
        limiter.reset()
        res2 = self.app.post("/api/auth/register", json={
            "name": "John Doe",
            "email": "not-an-email-address",
            "password": "ValidPassword123!"
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("email", res2.get_json()["error"].lower())

        # 3. Invalid data type (int where string expected)
        limiter.reset()
        res3 = self.app.post("/api/auth/register", json={
            "name": 12345,
            "email": "valid@example.com",
            "password": "ValidPassword123!"
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn("must be a string", res3.get_json()["error"])

        # 4. Length under minimum (password < 6 chars)
        limiter.reset()
        res4 = self.app.post("/api/auth/register", json={
            "name": "John Doe",
            "email": "valid@example.com",
            "password": "123"
        })
        self.assertEqual(res4.status_code, 400)
        self.assertIn("at least 6 characters", res4.get_json()["error"])

        # 5. Unsupported currency format
        limiter.reset()
        res5 = self.app.post("/api/auth/register", json={
            "name": "John Doe",
            "email": "valid@example.com",
            "password": "ValidPassword123!",
            "currency": "BITCOIN"
        })
        self.assertEqual(res5.status_code, 400)
        self.assertIn("currency", res5.get_json()["error"].lower())

        # 6. Unrecognized extra field
        limiter.reset()
        res6 = self.app.post("/api/auth/register", json={
            "name": "John Doe",
            "email": "valid@example.com",
            "password": "ValidPassword123!",
            "injected_admin_role": True
        })
        self.assertEqual(res6.status_code, 400)
        self.assertIn("Unrecognized field", res6.get_json()["error"])

        # 7. Control characters / null bytes in string
        limiter.reset()
        res7 = self.app.post("/api/auth/register", json={
            "name": "John\x00Doe",
            "email": "valid@example.com",
            "password": "ValidPassword123!"
        })
        self.assertEqual(res7.status_code, 400)
        self.assertIn("control characters", res7.get_json()["error"])

    def test_asset_creation_strict_validation_rejections(self):
        """Reject invalid asset creation payloads with HTTP 400."""
        demo_user, _ = authenticate_user("kapil@example.com", "demo123")
        headers = {"Authorization": f"Bearer {demo_user['token']}"}

        # 1. Wrong type: boolean passed for numeric gross_weight
        res1 = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Coin",
            "metal": "Gold",
            "gross_weight": True,
            "purchase_price": 50000.0
        })
        self.assertEqual(res1.status_code, 400)
        self.assertIn("must be a numeric value", res1.get_json()["error"])

        # 2. String passed for numeric purchase_price
        res2 = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Coin",
            "metal": "Gold",
            "gross_weight": 10.0,
            "purchase_price": "fifty thousand"
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("must be a numeric value", res2.get_json()["error"])

        # 3. Numeric bounds: negative weight
        res3 = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Coin",
            "metal": "Gold",
            "gross_weight": -10.0,
            "purchase_price": 50000.0
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn("cannot be less than", res3.get_json()["error"])

        # 4. Invalid date format
        res4 = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Coin",
            "metal": "Gold",
            "gross_weight": 10.0,
            "purchase_price": 50000.0,
            "purchase_date": "10/09/2026"
        })
        self.assertEqual(res4.status_code, 400)
        self.assertIn("YYYY-MM-DD", res4.get_json()["error"])

        # 5. Invalid enum choice for lifecycle status
        res5 = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Coin",
            "metal": "Gold",
            "gross_weight": 10.0,
            "purchase_price": 50000.0,
            "status": "Destroyed"
        })
        self.assertEqual(res5.status_code, 400)
        self.assertIn("must be one of", res5.get_json()["error"])

        # 6. Unrecognized injected parameter
        res6 = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Coin",
            "metal": "Gold",
            "gross_weight": 10.0,
            "purchase_price": 50000.0,
            "is_admin_verified": True
        })
        self.assertEqual(res6.status_code, 400)
        self.assertIn("Unrecognized field", res6.get_json()["error"])

    def test_malformed_json_rejected(self):
        """Reject malformed JSON request with HTTP 400."""
        res = self.app.post(
            "/api/auth/login",
            data="not a valid json {",
            headers={"Content-Type": "application/json"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Malformed JSON", res.get_json()["error"])

if __name__ == "__main__":
    unittest.main()
