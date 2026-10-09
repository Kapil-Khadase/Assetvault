import re
import datetime
from functools import wraps
from flask import request, jsonify
from config import SUPPORTED_CURRENCIES

# Pre-compiled strict format regular expressions
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
DATE_ISO_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CURRENCY_REGEX = re.compile(r"^[A-Z]{3}$")
ALPHANUMERIC_CODE_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.\s]+$")

# Lifecycle status constants matching backend/app.py
VALID_LIFECYCLE_STATUSES = {
    "Active", "Sold", "Transferred", "Gifted", "Archived", "Held",
    "active", "sold", "transferred", "gifted", "archived", "held"
}
VALID_METALS = {
    "Gold", "Silver", "Platinum", "Diamond", "Palladium", "Other",
    "gold", "silver", "platinum", "diamond", "palladium", "other"
}
VALID_TRANSACTION_TYPES = {"PURCHASE", "SALE", "ADJUSTMENT", "VALUATION", "purchase", "sale"}
VALID_ALERT_CONDITIONS = {"GREATER_THAN", "LESS_THAN", ">", "<", "ABOVE", "BELOW", ">=", "<="}


def check_no_control_chars(s: str) -> bool:
    """Rejects strings with control characters or null bytes."""
    for ch in s:
        cp = ord(ch)
        if cp < 32 and ch not in ("\n", "\r", "\t"):
            return False
        if cp == 127:  # DEL
            return False
    return True


def validate_field(field_name: str, val, spec: dict) -> tuple:
    """
    Validates a single field against its strict specification.
    Returns (True, None) on success or (False, "error message") on failure.
    """
    expected_type = spec.get("type")
    nullable = spec.get("nullable", False)

    # 1. Null check
    if val is None:
        if nullable:
            return True, None
        return False, f"Field '{field_name}' cannot be null."

    # Multi-type support (e.g. tuple like (bool, str))
    if isinstance(expected_type, tuple):
        if not any(isinstance(val, t) for t in expected_type):
            type_names = "/".join(t.__name__ for t in expected_type)
            return False, f"Field '{field_name}' must be one of [{type_names}], got {type(val).__name__}."

    # 2. Strict Type Check
    if expected_type == str or (isinstance(expected_type, tuple) and str in expected_type and isinstance(val, str)):
        if not isinstance(val, str):
            return False, f"Field '{field_name}' must be a string, got {type(val).__name__}."
        if not check_no_control_chars(val):
            return False, f"Field '{field_name}' contains unprintable or control characters."

        # Length checks
        min_len = spec.get("min_len")
        max_len = spec.get("max_len")
        if min_len is not None and len(val) < min_len:
            return False, f"Field '{field_name}' must be at least {min_len} characters long."
        if max_len is not None and len(val) > max_len:
            return False, f"Field '{field_name}' cannot exceed {max_len} characters."

        # Enum choices check
        choices = spec.get("choices")
        if choices is not None and val not in choices and val.capitalize() not in choices:
            return False, f"Field '{field_name}' must be one of: {', '.join(sorted(str(c) for c in choices))}."

        # Format checks
        fmt = spec.get("format")
        if fmt == "email":
            if not EMAIL_REGEX.match(val):
                return False, f"Field '{field_name}' must be a valid email address."
        elif fmt == "date":
            if not DATE_ISO_REGEX.match(val):
                return False, f"Field '{field_name}' must be in YYYY-MM-DD date format."
            try:
                datetime.date.fromisoformat(val)
            except ValueError:
                return False, f"Field '{field_name}' is not a valid calendar date."
        elif fmt == "currency":
            if not CURRENCY_REGEX.match(val) or val.upper() not in SUPPORTED_CURRENCIES:
                return False, f"Field '{field_name}' must be a supported 3-letter currency: {', '.join(SUPPORTED_CURRENCIES)}."
        elif fmt == "regex":
            reg = spec.get("regex")
            if reg and not reg.match(val):
                return False, f"Field '{field_name}' does not match required format."

    elif expected_type == int:
        if isinstance(val, bool) or not isinstance(val, int):
            return False, f"Field '{field_name}' must be an integer, got {type(val).__name__}."
        min_val = spec.get("min_val")
        max_val = spec.get("max_val")
        if min_val is not None and val < min_val:
            return False, f"Field '{field_name}' must be at least {min_val}."
        if max_val is not None and val > max_val:
            return False, f"Field '{field_name}' cannot exceed {max_val}."
        choices = spec.get("choices")
        if choices is not None and val not in choices:
            return False, f"Field '{field_name}' must be one of: {choices}."

    elif expected_type == float:
        # Accepts int or float, but strictly rejects bool and str
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            return False, f"Field '{field_name}' must be a numeric value, got {type(val).__name__}."
        f_val = float(val)
        min_val = spec.get("min_val")
        max_val = spec.get("max_val")
        if min_val is not None and f_val < min_val:
            return False, f"Field '{field_name}' cannot be less than {min_val}."
        if max_val is not None and f_val > max_val:
            return False, f"Field '{field_name}' cannot exceed {max_val}."

    elif expected_type == bool:
        if not isinstance(val, bool):
            return False, f"Field '{field_name}' must be a boolean (true/false), got {type(val).__name__}."

    elif expected_type == list:
        if not isinstance(val, list):
            return False, f"Field '{field_name}' must be a list/array, got {type(val).__name__}."
        min_items = spec.get("min_items")
        max_items = spec.get("max_items")
        if min_items is not None and len(val) < min_items:
            return False, f"Field '{field_name}' must contain at least {min_items} items."
        if max_items is not None and len(val) > max_items:
            return False, f"Field '{field_name}' cannot contain more than {max_items} items."

    elif expected_type == dict:
        if not isinstance(val, dict):
            return False, f"Field '{field_name}' must be a JSON object, got {type(val).__name__}."
        sub_schema = spec.get("schema")
        if sub_schema:
            ok, err = validate_payload(val, sub_schema)
            if not ok:
                return False, f"Field '{field_name}' invalid: {err}"

    return True, None


def validate_payload(data: dict, schema: dict) -> tuple:
    """
    Validates a dictionary against a strict schema.
    Returns (True, None) if completely valid, or (False, "error message") if invalid.
    """
    if not isinstance(data, dict):
        return False, "Payload must be a JSON object."

    # 1. Check all required fields are present
    for field_name, spec in schema.items():
        if field_name.startswith("__"):
            continue
        if spec.get("required", False):
            if field_name not in data or data[field_name] is None:
                return False, f"Missing required field: '{field_name}'."

    # 2. Check each provided field matches specification
    for key, val in data.items():
        if key not in schema:
            if not schema.get("__allow_extra__", False):
                return False, f"Unrecognized field '{key}' in payload."
            continue

        if key.startswith("__"):
            continue

        spec = schema[key]
        ok, err = validate_field(key, val, spec)
        if not ok:
            return False, err

    return True, None


def validate_input(schema: dict):
    """
    Flask route decorator to enforce strict input validation against a schema.
    Rejects any non-conforming input with HTTP 400 Bad Request.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.content_length and request.content_length > 0:
                data = request.get_json(silent=True)
                if data is None:
                    return jsonify({"error": "Malformed JSON payload or invalid Content-Type."}), 400
            else:
                data = {}

            is_valid, err_msg = validate_payload(data, schema)
            if not is_valid:
                return jsonify({"error": err_msg}), 400

            request.validated_data = data
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ==============================================================================
# STRICT SCHEMAS FOR APPLICATION ENDPOINTS
# ==============================================================================

REGISTER_SCHEMA = {
    "__allow_extra__": False,
    "name": {"type": str, "min_len": 1, "max_len": 100, "required": True},
    "email": {"type": str, "min_len": 3, "max_len": 255, "format": "email", "required": True},
    "password": {"type": str, "min_len": 6, "max_len": 128, "required": True},
    "currency": {"type": str, "format": "currency", "required": False, "nullable": True}
}

LOGIN_SCHEMA = {
    "__allow_extra__": False,
    "email": {"type": str, "min_len": 3, "max_len": 255, "format": "email", "required": True},
    "password": {"type": str, "min_len": 1, "max_len": 128, "required": True}
}

CHANGE_PASSWORD_SCHEMA = {
    "__allow_extra__": False,
    "current_password": {"type": str, "min_len": 1, "max_len": 128, "required": False},
    "old_password": {"type": str, "min_len": 1, "max_len": 128, "required": False},
    "new_password": {"type": str, "min_len": 8, "max_len": 128, "required": True},
    "confirm_password": {"type": str, "min_len": 8, "max_len": 128, "required": False}
}

DELETE_ACCOUNT_SCHEMA = {
    "__allow_extra__": False,
    "password": {"type": str, "min_len": 1, "max_len": 128, "required": True},
    "confirmation_phrase": {"type": str, "max_len": 128, "required": False}
}

UPDATE_PROFILE_SCHEMA = {
    "__allow_extra__": False,
    "name": {"type": str, "min_len": 1, "max_len": 100, "required": False},
    "currency": {"type": str, "format": "currency", "required": False},
    "target_portfolio_value": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "target_date": {"type": str, "format": "date", "required": False, "nullable": True},
    "public_certificate_verification": {"type": bool, "required": False},
    "public_owner_name": {"type": (bool, str), "required": False}
}

QR_PRIVACY_SCHEMA = {
    "__allow_extra__": False,
    "public_qr_masked_owner": {"type": bool, "required": False},
    "public_qr_show_asset_name": {"type": bool, "required": False},
    "public_owner_name": {"type": (bool, str), "required": False},
    "public_certificate_verification": {"type": bool, "required": False}
}

CREATE_ASSET_SCHEMA = {
    "__allow_extra__": False,
    # Encrypted payload fields
    "encrypted_data": {"type": str, "min_len": 1, "max_len": 500000, "required": False},
    "iv": {"type": str, "min_len": 1, "max_len": 1000, "required": False},
    "transaction_encrypted_data": {"type": str, "min_len": 1, "max_len": 500000, "required": False},
    "transaction_iv": {"type": str, "min_len": 1, "max_len": 1000, "required": False},
    # Plaintext fields
    "asset_name": {"type": str, "min_len": 1, "max_len": 150, "required": False},
    "asset_type": {"type": str, "min_len": 1, "max_len": 50, "required": False},
    "metal": {"type": str, "min_len": 1, "max_len": 50, "required": False},
    "purity": {"type": str, "min_len": 1, "max_len": 50, "required": False},
    "purity_factor": {"type": float, "min_val": 0.0, "max_val": 1.0, "required": False},
    "quantity": {"type": int, "min_val": 1, "max_val": 1000000, "required": False},
    "gross_weight": {"type": float, "min_val": 0.0, "max_val": 100000.0, "required": False},
    "net_weight": {"type": float, "min_val": 0.0, "max_val": 100000.0, "required": False},
    "stone_weight": {"type": float, "min_val": 0.0, "max_val": 100000.0, "required": False},
    "diamond_carat": {"type": float, "min_val": 0.0, "max_val": 10000.0, "required": False},
    "diamond_pieces": {"type": int, "min_val": 0, "max_val": 100000, "required": False},
    "diamond_color": {"type": str, "max_len": 50, "required": False},
    "diamond_clarity": {"type": str, "max_len": 50, "required": False},
    "diamond_cut": {"type": str, "max_len": 50, "required": False},
    "diamond_shape": {"type": str, "max_len": 50, "required": False},
    "diamond_cert_lab": {"type": str, "max_len": 50, "required": False},
    "diamond_cert_number": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "cert_number": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "purchase_date": {"type": str, "format": "date", "required": False},
    "purchase_price": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "making_charges": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "wastage": {"type": float, "min_val": 0.0, "max_val": 100000.0, "required": False},
    "taxes": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "total_acquisition_cost": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "category_id": {"type": int, "min_val": 1, "required": False, "nullable": True},
    "hallmark_huid": {"type": str, "max_len": 50, "required": False, "nullable": True},
    "huid": {"type": str, "max_len": 50, "required": False, "nullable": True},
    "jeweller_name": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "jeweller": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "owner_name": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "buyer_name": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "certificate_number": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "invoice_number": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "invoice": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "hallmark_center": {"type": str, "max_len": 100, "required": False, "nullable": True},
    "hallmarking_year": {"type": str, "max_len": 20, "required": False, "nullable": True},
    "photo_url": {"type": str, "max_len": 1000, "required": False, "nullable": True},
    "description": {"type": str, "max_len": 5000, "required": False, "nullable": True},
    "notes": {"type": str, "max_len": 5000, "required": False, "nullable": True},
    "status": {"type": str, "choices": VALID_LIFECYCLE_STATUSES, "required": False}
}

UPDATE_ASSET_SCHEMA = dict(CREATE_ASSET_SCHEMA)

SELL_ASSET_SCHEMA = {
    "__allow_extra__": False,
    "encrypted_data": {"type": str, "min_len": 1, "max_len": 500000, "required": False},
    "iv": {"type": str, "min_len": 1, "max_len": 1000, "required": False},
    "sale_amount": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "amount": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "selling_charges": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "realized_profit": {"type": float, "required": False},
    "sale_date": {"type": str, "required": False},
    "buyer_name": {"type": str, "max_len": 100, "required": False},
    "counterparty": {"type": str, "max_len": 100, "required": False},
    "invoice_no": {"type": str, "max_len": 50, "required": False},
    "invoice_number": {"type": str, "max_len": 50, "required": False},
    "notes": {"type": str, "max_len": 2000, "required": False}
}

STATUS_ASSET_SCHEMA = {
    "__allow_extra__": False,
    "status": {"type": str, "choices": VALID_LIFECYCLE_STATUSES, "required": True},
    "notes": {"type": str, "max_len": 2000, "required": False}
}

CHECK_DUPLICATE_SCHEMA = {
    "__allow_extra__": False,
    "asset_name": {"type": str, "max_len": 150, "required": False},
    "hallmark_huid": {"type": str, "max_len": 50, "required": False},
    "huid": {"type": str, "max_len": 50, "required": False},
    "invoice_number": {"type": str, "max_len": 50, "required": False},
    "invoice": {"type": str, "max_len": 50, "required": False},
    "diamond_cert_number": {"type": str, "max_len": 50, "required": False},
    "cert_number": {"type": str, "max_len": 50, "required": False},
    "asset_id": {"type": int, "min_val": 1, "required": False},
    "metal": {"type": str, "max_len": 50, "required": False},
    "gross_weight": {"type": float, "min_val": 0.0, "required": False}
}

CREATE_TRANSACTION_SCHEMA = {
    "__allow_extra__": False,
    "encrypted_data": {"type": str, "min_len": 1, "max_len": 500000, "required": False},
    "iv": {"type": str, "min_len": 1, "max_len": 1000, "required": False},
    "asset_id": {"type": int, "min_val": 1, "required": False, "nullable": True},
    "transaction_type": {"type": str, "choices": VALID_TRANSACTION_TYPES, "required": False},
    "amount": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "rate_per_gram": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "weight": {"type": float, "min_val": 0.0, "max_val": 100000.0, "required": False},
    "transaction_date": {"type": str, "required": False},
    "notes": {"type": str, "max_len": 2000, "required": False},
    "selling_charges": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "realized_profit": {"type": float, "required": False},
    "counterparty": {"type": str, "max_len": 100, "required": False}
}

CREATE_ALERT_SCHEMA = {
    "__allow_extra__": False,
    "encrypted_data": {"type": str, "min_len": 1, "max_len": 500000, "required": False},
    "iv": {"type": str, "min_len": 1, "max_len": 1000, "required": False},
    "metal": {"type": str, "min_len": 1, "max_len": 50, "required": False},
    "target_metal": {"type": str, "min_len": 1, "max_len": 50, "required": False},
    "condition": {"type": str, "choices": VALID_ALERT_CONDITIONS, "required": False},
    "threshold_rate": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "target_value": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "alert_type": {"type": str, "max_len": 50, "required": False},
    "currency": {"type": str, "format": "currency", "required": False},
    "notes": {"type": str, "max_len": 2000, "required": False}
}

GOAL_SCHEMA = {
    "__allow_extra__": False,
    "title": {"type": str, "min_len": 1, "max_len": 150, "required": False},
    "goal_name": {"type": str, "min_len": 1, "max_len": 150, "required": False},
    "target_metal": {"type": str, "max_len": 50, "required": False},
    "target_amount": {"type": float, "min_val": 0.01, "max_val": 1e12, "required": False},
    "target_weight": {"type": float, "min_val": 0.01, "max_val": 1e12, "required": False},
    "current_amount": {"type": float, "min_val": 0.0, "max_val": 1e12, "required": False},
    "target_date": {"type": str, "required": False, "nullable": True},
    "notes": {"type": str, "max_len": 2000, "required": False, "nullable": True}
}

SIMULATOR_SCHEMA = {
    "__allow_extra__": False,
    "gold_shock": {"type": float, "min_val": -100.0, "max_val": 1000.0, "required": False},
    "silver_shock": {"type": float, "min_val": -100.0, "max_val": 1000.0, "required": False},
    "plat_shock": {"type": float, "min_val": -100.0, "max_val": 1000.0, "required": False},
    "diamond_shock": {"type": float, "min_val": -100.0, "max_val": 1000.0, "required": False},
    "gold_change": {"type": float, "min_val": -100.0, "max_val": 1000.0, "required": False},
    "silver_change": {"type": float, "min_val": -100.0, "max_val": 1000.0, "required": False},
    "platinum_change": {"type": float, "min_val": -100.0, "max_val": 1000.0, "required": False},
    "currency": {"type": str, "format": "currency", "required": False},
    "portfolio_gold_val": {"type": float, "min_val": 0.0, "required": False},
    "portfolio_silver_val": {"type": float, "min_val": 0.0, "required": False},
    "portfolio_plat_val": {"type": float, "min_val": 0.0, "required": False}
}

MARKET_SYNC_SCHEMA = {
    "__allow_extra__": False,
    "force": {"type": bool, "required": False},
    "api_key": {"type": str, "max_len": 255, "required": False}
}
