import os
import secrets

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
DB_PATH = os.environ.get("DATABASE_URL") or os.path.join(BASE_DIR, "backend", "assetvault.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "backend", "uploads")
STATIC_FOLDER = os.path.join(BASE_DIR, "static")
LOG_FILE = os.path.join(BASE_DIR, "backend", "assetvault.log")

# Lightweight .env file reader if present
env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k not in os.environ:
                    os.environ[k] = v

APP_VERSION = "1.0.1"
ENVIRONMENT = os.environ.get("FLASK_ENV", "development").lower()
DEBUG = os.environ.get("FLASK_DEBUG", "0").lower() in ["1", "true", "yes"]

# Security: Secret Key management
SECRET_KEY = os.environ.get("SECRET_KEY")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or SECRET_KEY
if not SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("FATAL: SECRET_KEY environment variable must be set in production mode.")
    # Safe ephemeral key for local development
    SECRET_KEY = "assetvault-dev-runtime-key-" + secrets.token_hex(16)
    if not JWT_SECRET_KEY:
        JWT_SECRET_KEY = SECRET_KEY

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72
MARKET_API_KEY = os.environ.get("MARKET_API_KEY", "")

# Demo & Sandbox Environment Configuration
DEMO_USER_EMAIL = os.environ.get("DEMO_USER_EMAIL", "kapil@example.com")
DEMO_USER_PASSWORD = os.environ.get("DEMO_USER_PASSWORD", "demo123")
ALLOW_DEMO_LOGIN = os.environ.get("ALLOW_DEMO_LOGIN", "1" if ENVIRONMENT != "production" else "0").lower() in ["1", "true", "yes"]
SEED_DEMO_DATA = os.environ.get("SEED_DEMO_DATA", "1" if ENVIRONMENT != "production" else "0").lower() in ["1", "true", "yes"]

# Default currency and exchange rates relative to INR
SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"]
CURRENCY_SYMBOLS = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£"
}

INR_EXCHANGE_RATES = {
    "INR": 1.0,
    "USD": 0.0117,
    "EUR": 0.0107,
    "GBP": 0.0091,
}

# Precious metal purity factors
PURITY_FACTORS = {
    "GOLD_24K": 1.000,
    "GOLD_22K": 0.9167,
    "GOLD_18K": 0.7500,
    "GOLD_14K": 0.5833,
    "GOLD_10K": 0.4167,
    "SILVER_999": 1.000,
    "SILVER_925": 0.9250,
    "SILVER_900": 0.9000,
    "PLATINUM_950": 0.9500,
    "PLATINUM_900": 0.9000,
}

# Explicit Indian Landed Duty & Domestic Tax Breakdown
# Landed Customs Duty ~6% + 3% GST + Domestic retail benchmark premium ~2% = ~1.11x
INDIAN_CUSTOMS_DUTY_RATE = 0.06
INDIAN_GST_RATE = 0.03
DOMESTIC_RETAIL_PREMIUM = 0.02
APPLICATION_ESTIMATION_FACTOR = 1.11

# Secure Document Upload Constraints
ALLOWED_DOCUMENT_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/pjpeg",
    "image/webp"
}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB limit

# ----------------- CONFIGURABLE RATE LIMITING & EXPONENTIAL BACKOFF ----------------- #
# 1. Stricter limits on authentication routes (e.g. login, signup, password reset)
RATE_LIMIT_AUTH_PER_IP_MAX = int(os.environ.get("RATE_LIMIT_AUTH_PER_IP_MAX", "5"))
RATE_LIMIT_AUTH_PER_IP_WINDOW = int(os.environ.get("RATE_LIMIT_AUTH_PER_IP_WINDOW", "60"))

RATE_LIMIT_AUTH_PER_ACCOUNT_MAX = int(os.environ.get("RATE_LIMIT_AUTH_PER_ACCOUNT_MAX", "5"))
RATE_LIMIT_AUTH_PER_ACCOUNT_WINDOW = int(os.environ.get("RATE_LIMIT_AUTH_PER_ACCOUNT_WINDOW", "60"))

RATE_LIMIT_AUTH_REGISTER_MAX = int(os.environ.get("RATE_LIMIT_AUTH_REGISTER_MAX", "5"))
RATE_LIMIT_AUTH_REGISTER_WINDOW = int(os.environ.get("RATE_LIMIT_AUTH_REGISTER_WINDOW", "60"))

RATE_LIMIT_AUTH_PASSWORD_CHANGE_MAX = int(os.environ.get("RATE_LIMIT_AUTH_PASSWORD_CHANGE_MAX", "5"))
RATE_LIMIT_AUTH_PASSWORD_CHANGE_WINDOW = int(os.environ.get("RATE_LIMIT_AUTH_PASSWORD_CHANGE_WINDOW", "60"))

# Exponential Backoff settings for Auth (Replaces rigid hard lockout)
AUTH_BACKOFF_THRESHOLD = int(os.environ.get("AUTH_BACKOFF_THRESHOLD", "5"))
AUTH_BACKOFF_BASE_SECONDS = int(os.environ.get("AUTH_BACKOFF_BASE_SECONDS", "2"))
AUTH_BACKOFF_FACTOR = float(os.environ.get("AUTH_BACKOFF_FACTOR", "2.0"))
AUTH_BACKOFF_MAX_SECONDS = int(os.environ.get("AUTH_BACKOFF_MAX_SECONDS", "300"))

# 2. Moderate limits on public endpoints
RATE_LIMIT_PUBLIC_MAX = int(os.environ.get("RATE_LIMIT_PUBLIC_MAX", "60"))
RATE_LIMIT_PUBLIC_WINDOW = int(os.environ.get("RATE_LIMIT_PUBLIC_WINDOW", "60"))

RATE_LIMIT_HEALTH_MAX = int(os.environ.get("RATE_LIMIT_HEALTH_MAX", "120"))
RATE_LIMIT_HEALTH_WINDOW = int(os.environ.get("RATE_LIMIT_HEALTH_WINDOW", "60"))

RATE_LIMIT_VERIFY_MAX = int(os.environ.get("RATE_LIMIT_VERIFY_MAX", "30"))
RATE_LIMIT_VERIFY_WINDOW = int(os.environ.get("RATE_LIMIT_VERIFY_WINDOW", "60"))

# 3. Looser limits on authenticated user actions
RATE_LIMIT_AUTHENTICATED_READ_MAX = int(os.environ.get("RATE_LIMIT_AUTHENTICATED_READ_MAX", "120"))
RATE_LIMIT_AUTHENTICATED_READ_WINDOW = int(os.environ.get("RATE_LIMIT_AUTHENTICATED_READ_WINDOW", "60"))

RATE_LIMIT_AUTHENTICATED_MUTATION_MAX = int(os.environ.get("RATE_LIMIT_AUTHENTICATED_MUTATION_MAX", "30"))
RATE_LIMIT_AUTHENTICATED_MUTATION_WINDOW = int(os.environ.get("RATE_LIMIT_AUTHENTICATED_MUTATION_WINDOW", "60"))

RATE_LIMIT_DOCUMENT_UPLOAD_MAX = int(os.environ.get("RATE_LIMIT_DOCUMENT_UPLOAD_MAX", "20"))
RATE_LIMIT_DOCUMENT_UPLOAD_WINDOW = int(os.environ.get("RATE_LIMIT_DOCUMENT_UPLOAD_WINDOW", "60"))

RATE_LIMIT_REPORTS_MAX = int(os.environ.get("RATE_LIMIT_REPORTS_MAX", "20"))
RATE_LIMIT_REPORTS_WINDOW = int(os.environ.get("RATE_LIMIT_REPORTS_WINDOW", "60"))

RATE_LIMIT_MARKET_SYNC_MAX = int(os.environ.get("RATE_LIMIT_MARKET_SYNC_MAX", "10"))
RATE_LIMIT_MARKET_SYNC_WINDOW = int(os.environ.get("RATE_LIMIT_MARKET_SYNC_WINDOW", "60"))

RATE_LIMIT_BACKUP_RESTORE_MAX = int(os.environ.get("RATE_LIMIT_BACKUP_RESTORE_MAX", "10"))
RATE_LIMIT_BACKUP_RESTORE_WINDOW = int(os.environ.get("RATE_LIMIT_BACKUP_RESTORE_WINDOW", "60"))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

