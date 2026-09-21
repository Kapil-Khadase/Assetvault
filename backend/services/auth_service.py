import hashlib
import os
import jwt
import datetime
from config import SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, UPLOAD_FOLDER
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

def generate_token(user_id: int, email: str, name: str, token_version: int = 1) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "token_version": token_version,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.datetime.now(datetime.timezone.utc)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            return None
        
        # Verify token_version against current user record in database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT token_version FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        expected_version = row["token_version"] or 1
        token_version = payload.get("token_version", 1)
        if token_version != expected_version:
            # Session was invalidated (e.g. password changed or logged out from all devices)
            return None
            
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
        "INSERT INTO users (name, email, password_hash, currency, encryption_salt, token_version) VALUES (?, ?, ?, ?, ?, 1)",
        (name.strip(), email.strip().lower(), pwd_hash, currency.upper(), encryption_salt)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    token = generate_token(user_id, email.strip().lower(), name.strip(), token_version=1)
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
    cursor.execute(
        "SELECT id, name, email, password_hash, currency, target_portfolio_value, encryption_salt, token_version, failed_logins, locked_until FROM users WHERE email = ?",
        (email.strip().lower(),)
    )
    user = cursor.fetchone()

    if not user:
        conn.close()
        return None, "Invalid email or password."

    now = datetime.datetime.now()
    locked_until = user["locked_until"]
    if locked_until:
        try:
            lock_dt = datetime.datetime.fromisoformat(str(locked_until))
            if lock_dt > now:
                conn.close()
                wait_sec = int((lock_dt - now).total_seconds())
                return None, f"Account temporarily locked due to multiple failed login attempts. Retry in {wait_sec} seconds."
        except Exception:
            pass

    if not verify_password(user["password_hash"], password):
        failed = (user["failed_logins"] or 0) + 1
        new_lock = None
        if failed >= 5:
            new_lock = (now + datetime.timedelta(minutes=15)).isoformat()
        cursor.execute("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?", (failed, new_lock, user["id"]))
        conn.commit()
        conn.close()
        if failed >= 5:
            return None, "Too many failed login attempts. Account locked for 15 minutes."
        return None, "Invalid email or password."

    # Login successful: reset failed login attempts
    token_version = user["token_version"] or 1
    cursor.execute("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    salt = user["encryption_salt"] if user["encryption_salt"] else "assetvault_salt_v1"
    token = generate_token(user["id"], user["email"], user["name"], token_version=token_version)
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "currency": user["currency"],
        "target_portfolio_value": user["target_portfolio_value"],
        "encryption_salt": salt,
        "token": token
    }, None

def change_user_password(user_id: int, current_password: str, new_password: str):
    if not current_password or not new_password:
        return None, "Current and new password are required."
    if len(new_password) < 8:
        return None, "New password must be at least 8 characters long."
    if current_password == new_password:
        return None, "New password must be different from current password."

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name, password_hash, token_version FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return None, "User not found."

    if not verify_password(user["password_hash"], current_password):
        conn.close()
        return None, "Current password is incorrect."

    new_hash = hash_password(new_password)
    new_token_version = (user["token_version"] or 1) + 1
    cursor.execute(
        "UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?",
        (new_hash, new_token_version, user_id)
    )
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'PASSWORD_CHANGED', ?)",
        (user_id, "User changed account password; active sessions invalidated")
    )
    conn.commit()
    conn.close()

    # Generate fresh token with new token_version
    new_token = generate_token(user["id"], user["email"], user["name"], token_version=new_token_version)
    return {
        "message": "Password updated successfully. All other sessions have been logged out.",
        "token": new_token
    }, None

def invalidate_all_user_sessions(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET token_version = coalesce(token_version, 1) + 1 WHERE id = ?", (user_id,))
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'SESSIONS_REVOKED', 'User logged out of all active devices')",
        (user_id,)
    )
    conn.commit()
    conn.close()
    return True

def delete_user_account(user_id: int, password: str, confirmation_phrase: str):
    if (confirmation_phrase or "").strip().upper() != "DELETE MY ACCOUNT":
        return False, "Confirmation phrase must be 'DELETE MY ACCOUNT'."

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, password_hash FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return False, "User not found."

    if not verify_password(user["password_hash"], password):
        conn.close()
        return False, "Incorrect password."

    # Delete physical document files from disk
    cursor.execute("SELECT file_path FROM documents WHERE user_id = ?", (user_id,))
    doc_files = cursor.fetchall()
    for row in doc_files:
        p = os.path.join(UPLOAD_FOLDER, row["file_path"])
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    # Log audit event before deletion
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'ACCOUNT_DELETED', 'User initiated complete account and data purge')",
        (user_id,)
    )
    # Delete user record (foreign keys cascade to assets, transactions, documents, alerts, portfolio_goals)
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True, None

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
    if target_portfolio_value is not None and str(target_portfolio_value).strip() != "":
        try:
            updates.append("target_portfolio_value = ?")
            params.append(float(target_portfolio_value))
        except (ValueError, TypeError):
            pass

    if updates:
        params.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return get_user_profile(user_id)

