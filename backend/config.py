import os

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
DB_PATH = os.path.join(BASE_DIR, "backend", "assetvault.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "backend", "uploads")
STATIC_FOLDER = os.path.join(BASE_DIR, "static")

SECRET_KEY = os.environ.get("SECRET_KEY", "assetvault-super-secure-jwt-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

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

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
