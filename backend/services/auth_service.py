import hashlib
import os
import jwt
import datetime
from config import SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from database import get_db_connection

def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}${pwd_hash}"

def verify_password(stored_password_hash: str, provided_password: str) -> bool:
    try:
        salt, expected_hash = stored_password_hash.split('$')
        computed_hash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        return hmac_compare(expected_hash, computed_hash)
    except Exception:
        return False

def hmac_compare(val1: str, val2: str) -> bool:
    if len(val1) != len(val2):
        return False
    result = 0
    for x, y in zip(val1, val2):
        result |= ord(x) ^ ord(y)
    return result == 0

def generate_token(user_id: int, email: str, name: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.datetime.now(datetime.timezone.utc)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def register_user(name: str, email: str, password: str, currency: str = "INR"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email.strip().lower(),))
    if cursor.fetchone():
        conn.close()
        return None, "Email address already registered."

    pwd_hash = hash_password(password)
    encryption_salt = os.urandom(16).hex()

    cursor.execute(
        "INSERT INTO users (name, email, password_hash, currency, encryption_salt) VALUES (?, ?, ?, ?, ?)",
        (name.strip(), email.strip().lower(), pwd_hash, currency.upper(), encryption_salt)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    token = generate_token(user_id, email.strip().lower(), name.strip())
    return {
        "id": user_id,
        "name": name,
        "email": email,
        "currency": currency,
        "encryption_salt": encryption_salt,
        "token": token
    }, None

def authenticate_user(email: str, password: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, password_hash, currency, target_portfolio_value, encryption_salt FROM users WHERE email = ?", (email.strip().lower(),))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(user["password_hash"], password):
        return None, "Invalid email or password."

    salt = user["encryption_salt"] if user["encryption_salt"] else "assetvault_salt_v1"
    token = generate_token(user["id"], user["email"], user["name"])
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "currency": user["currency"],
        "target_portfolio_value": user["target_portfolio_value"],
        "encryption_salt": salt,
        "token": token
    }, None

def get_user_profile(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, currency, target_portfolio_value, encryption_salt, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return None
    res = dict(user)
    if not res.get("encryption_salt"):
        res["encryption_salt"] = "assetvault_salt_v1"
    return res

def update_user_profile(user_id: int, name: str = None, currency: str = None, target_portfolio_value: float = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    updates = []
    params = []
    if name is not None:
        updates.append("name = ?")
        params.append(name.strip())
    if currency is not None:
        updates.append("currency = ?")
        params.append(currency.upper())
    if target_portfolio_value is not None:
        updates.append("target_portfolio_value = ?")
        params.append(float(target_portfolio_value))

    if updates:
        params.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return get_user_profile(user_id)
