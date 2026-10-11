import hashlib
import os
import jwt
import datetime
import secrets
import logging
from config import (
    SECRET_KEY, JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, UPLOAD_FOLDER,
    AUTH_BACKOFF_THRESHOLD, AUTH_BACKOFF_BASE_SECONDS, AUTH_BACKOFF_FACTOR, AUTH_BACKOFF_MAX_SECONDS,
    DEMO_USER_EMAIL, DEMO_USER_PASSWORD, ALLOW_DEMO_LOGIN
)
from database import get_db_connection
from services.rate_limiter import backoff_tracker

logger = logging.getLogger("assetvault")


def parse_user_agent(ua_str: str) -> dict:
    """Parses a User-Agent header into browser, OS, and device type without heavy dependencies."""
    if not ua_str:
        return {"browser": "Web Browser", "os": "Desktop OS", "device_type": "Desktop"}
    
    ua_lower = ua_str.lower()
    
    # 1. Device Type
    device_type = "Desktop"
    if "tablet" in ua_lower or "ipad" in ua_lower:
        device_type = "Tablet"
    elif "mobi" in ua_lower or "iphone" in ua_lower or "android" in ua_lower:
        device_type = "Mobile"
        
    # 2. Operating System
    os_name = "Desktop OS"
    if "windows nt 10.0" in ua_lower:
        os_name = "Windows 10/11"
    elif "windows nt 6.3" in ua_lower:
        os_name = "Windows 8.1"
    elif "windows nt 6.1" in ua_lower:
        os_name = "Windows 7"
    elif "windows" in ua_lower:
        os_name = "Windows"
    elif "iphone" in ua_lower:
        os_name = "iOS (iPhone)"
    elif "ipad" in ua_lower:
        os_name = "iOS (iPad)"
    elif "mac os x" in ua_lower or "macintosh" in ua_lower:
        os_name = "macOS"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "linux" in ua_lower:
        os_name = "Linux"
    elif "cros" in ua_lower:
        os_name = "Chrome OS"

    # 3. Browser
    browser_name = "Web Browser"
    if "edg/" in ua_lower or "edge/" in ua_lower:
        browser_name = "Microsoft Edge"
    elif "opr/" in ua_lower or "opera" in ua_lower:
        browser_name = "Opera"
    elif "brave" in ua_lower:
        browser_name = "Brave"
    elif "vivaldi" in ua_lower:
        browser_name = "Vivaldi"
    elif "chrome/" in ua_lower or "crios/" in ua_lower:
        browser_name = "Google Chrome"
    elif "firefox/" in ua_lower or "fxios/" in ua_lower:
        browser_name = "Mozilla Firefox"
    elif "safari/" in ua_lower and "version/" in ua_lower:
        browser_name = "Apple Safari"
    elif "msie" in ua_lower or "trident" in ua_lower:
        browser_name = "Internet Explorer"
    else:
        if "curl" in ua_lower:
            browser_name = "cURL"
        elif "postman" in ua_lower:
            browser_name = "Postman"
        elif "python" in ua_lower:
            browser_name = "Python Client"

    return {
        "browser": browser_name,
        "os": os_name,
        "device_type": device_type
    }

def create_user_session(user_id: int, ip_address: str = None, user_agent: str = None) -> str:
    """Creates a new tracked session entry in user_sessions."""
    session_id = secrets.token_hex(16)
    ua_info = parse_user_agent(user_agent or "")
    ip = (ip_address or "127.0.0.1").strip()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, browser, os, device_type, created_at, last_active, is_revoked)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
    """, (
        session_id,
        user_id,
        ip,
        (user_agent or "")[:500],
        ua_info["browser"],
        ua_info["os"],
        ua_info["device_type"]
    ))
    conn.commit()
    conn.close()
    return session_id

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

def generate_token(user_id: int, email: str, name: str, token_version: int = 1, session_id: str = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "token_version": token_version,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.datetime.now(datetime.timezone.utc)
    }
    if session_id:
        payload["session_id"] = session_id
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            return None
        
        # Verify token_version against current user record in database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT token_version FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return None
        
        expected_version = row["token_version"] or 1
        token_version = payload.get("token_version", 1)
        if token_version != expected_version:
            conn.close()
            # Session was invalidated (e.g. password changed or logged out from all devices)
            return None
            
        # If token has a session_id, verify that this specific session is not revoked
        session_id = payload.get("session_id")
        if session_id:
            cursor.execute("SELECT is_revoked FROM user_sessions WHERE session_id = ? AND user_id = ?", (session_id, user_id))
            sess_row = cursor.fetchone()
            if sess_row and sess_row["is_revoked"] == 1:
                conn.close()
                return None
            
            # Update last_active timestamp
            try:
                cursor.execute("UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = ?", (session_id,))
                conn.commit()
            except Exception:
                pass
                
        conn.close()
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def register_user(name: str, email: str, password: str, currency: str = "INR", ip_address: str = None, user_agent: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email.strip().lower(),))
    if cursor.fetchone():
        conn.close()
        return None, "Email address already registered."

    pwd_hash = hash_password(password)
    encryption_salt = os.urandom(16).hex()

    try:
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, currency, encryption_salt, token_version) VALUES (?, ?, ?, ?, ?, 1)",
            (name.strip(), email.strip().lower(), pwd_hash, currency.upper(), encryption_salt)
        )
        user_id = cursor.lastrowid
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.exception("Failed to insert user record during registration: %s", e)
        return None, "Registration failed due to an internal server error. Please try again."
    finally:
        conn.close()
    
    session_id = create_user_session(user_id, ip_address=ip_address, user_agent=user_agent)
    token = generate_token(user_id, email.strip().lower(), name.strip(), token_version=1, session_id=session_id)
    return {
        "id": user_id,
        "name": name,
        "email": email,
        "currency": currency,
        "encryption_salt": encryption_salt,
        "session_id": session_id,
        "token": token
    }, None

def authenticate_user(email: str, password: str, ip_address: str = None, user_agent: str = None):
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

    email_clean = email.strip().lower()
    ip_clean = (ip_address or "127.0.0.1").strip()
    acct_key = f"account:{email_clean}"
    ip_key = f"ip:{ip_clean}"

    # 1. Check in-memory exponential backoff tracker (per-account and per-IP)
    acct_allowed, acct_wait = backoff_tracker.check_backoff(acct_key)
    ip_allowed, ip_wait = backoff_tracker.check_backoff(ip_key)
    if not acct_allowed or not ip_allowed:
        conn.close()
        wait_sec = max(acct_wait, ip_wait)
        return None, f"Account temporarily locked due to multiple failed login attempts. Exponential backoff active. Please retry in {wait_sec} seconds."

    # 2. Check persistent DB lockout / backoff timestamp
    now = datetime.datetime.now()
    locked_until = user["locked_until"]
    if locked_until:
        try:
            lock_dt = datetime.datetime.fromisoformat(str(locked_until))
            if lock_dt > now:
                conn.close()
                wait_sec = max(1, int((lock_dt - now).total_seconds()))
                return None, f"Account temporarily locked due to multiple failed login attempts. Exponential backoff active. Please retry in {wait_sec} seconds."
        except Exception:
            pass

    # 3. Verify password with exponential backoff progression on failure
    if not verify_password(user["password_hash"], password):
        failed = (user["failed_logins"] or 0) + 1
        is_backoff_acct, delay_acct, _ = backoff_tracker.record_failure(acct_key)
        is_backoff_ip, delay_ip, _ = backoff_tracker.record_failure(ip_key)
        delay = max(delay_acct, delay_ip)

        new_lock = None
        if is_backoff_acct or is_backoff_ip or failed >= AUTH_BACKOFF_THRESHOLD:
            if delay <= 0:
                exponent = max(0, failed - AUTH_BACKOFF_THRESHOLD)
                delay = min(AUTH_BACKOFF_MAX_SECONDS, int(AUTH_BACKOFF_BASE_SECONDS * (AUTH_BACKOFF_FACTOR ** exponent)))
            new_lock = (now + datetime.timedelta(seconds=delay)).isoformat()

        cursor.execute("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?", (failed, new_lock, user["id"]))
        conn.commit()
        conn.close()

        return None, "Invalid email or password."

    # 4. Login successful: reset failed login attempts and clear backoff trackers
    backoff_tracker.record_success(acct_key)
    backoff_tracker.record_success(ip_key)
    token_version = user["token_version"] or 1
    cursor.execute("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    salt = user["encryption_salt"] if user["encryption_salt"] else "assetvault_salt_v1"
    session_id = create_user_session(user["id"], ip_address=ip_address, user_agent=user_agent)
    token = generate_token(user["id"], user["email"], user["name"], token_version=token_version, session_id=session_id)
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "currency": user["currency"],
        "target_portfolio_value": user["target_portfolio_value"],
        "encryption_salt": salt,
        "session_id": session_id,
        "token": token
    }, None

def change_user_password(user_id: int, current_password: str, new_password: str, ip_address: str = None, user_agent: str = None):
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
    # Revoke all previous active sessions
    cursor.execute("UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?", (user_id,))
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'PASSWORD_CHANGED', ?)",
        (user_id, "User changed account password; active sessions invalidated")
    )
    conn.commit()
    conn.close()

    # Generate fresh session and token with new token_version
    session_id = create_user_session(user["id"], ip_address=ip_address, user_agent=user_agent)
    new_token = generate_token(user["id"], user["email"], user["name"], token_version=new_token_version, session_id=session_id)
    return {
        "message": "Password updated successfully. All other sessions have been logged out.",
        "token": new_token,
        "session_id": session_id
    }, None

def invalidate_all_user_sessions(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?", (user_id,))
    cursor.execute("UPDATE users SET token_version = coalesce(token_version, 1) + 1 WHERE id = ?", (user_id,))
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'SESSIONS_REVOKED', 'User logged out of all active devices')",
        (user_id,)
    )
    conn.commit()
    conn.close()
    return True

def get_user_sessions(user_id: int, current_session_id: str = None, current_ip: str = None, current_ua: str = None) -> list:
    """Returns active (non-revoked) sessions for the user with is_current flag."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT session_id, ip_address, user_agent, browser, os, device_type, created_at, last_active, is_revoked
        FROM user_sessions
        WHERE user_id = ? AND is_revoked = 0
        ORDER BY last_active DESC
    """, (user_id,))
    rows = cursor.fetchall()
    
    # If no sessions exist in database (e.g., user authenticated prior to session migration),
    # automatically create a session record so the current active device is immediately tracked.
    if not rows and current_ua:
        ua_info = parse_user_agent(current_ua)
        cur_sid = current_session_id or secrets.token_hex(16)
        cursor.execute("""
            INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, browser, os, device_type, created_at, last_active, is_revoked)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
        """, (cur_sid, user_id, current_ip or "127.0.0.1", (current_ua or "")[:500], ua_info["browser"], ua_info["os"], ua_info["device_type"]))
        conn.commit()
        cursor.execute("""
            SELECT session_id, ip_address, user_agent, browser, os, device_type, created_at, last_active, is_revoked
            FROM user_sessions WHERE user_id = ? AND is_revoked = 0 ORDER BY last_active DESC
        """, (user_id,))
        rows = cursor.fetchall()
        
    conn.close()

    sessions = []
    for r in rows:
        sid = r["session_id"]
        is_cur = False
        if current_session_id:
            is_cur = (sid == current_session_id)
        elif not sessions: # Default first most-recent if no session_id is bound
            is_cur = True
            
        sessions.append({
            "session_id": sid,
            "ip_address": r["ip_address"] or "127.0.0.1",
            "browser": r["browser"] or "Web Browser",
            "os": r["os"] or "Unknown OS",
            "device_type": r["device_type"] or "Desktop",
            "created_at": str(r["created_at"]),
            "last_active": str(r["last_active"]),
            "is_current": is_cur
        })
    return sessions

def revoke_session(user_id: int, session_id: str) -> bool:
    """Revokes a specific session by its session_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND session_id = ?", (user_id, session_id))
    affected = cursor.rowcount
    if affected > 0:
        cursor.execute(
            "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'SESSION_REVOKED', ?)",
            (user_id, f"Session {session_id[:8]}... revoked by user")
        )
    conn.commit()
    conn.close()
    return affected > 0

def revoke_other_sessions(user_id: int, current_session_id: str) -> int:
    """Revokes all sessions except the current one."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if current_session_id:
        cursor.execute(
            "UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND session_id != ? AND is_revoked = 0",
            (user_id, current_session_id)
        )
    else:
        cursor.execute("UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0", (user_id,))
    count = cursor.rowcount
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'SESSIONS_REVOKED', ?)",
        (user_id, f"User revoked {count} other active session(s)")
    )
    conn.commit()
    conn.close()
    return count

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
            except Exception as e:
                logger.warning("Failed to remove file %s during account purge: %s", p, e)

    # Purge user sessions first to keep foreign-key constraints pristine
    cursor.execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))

    # Purge all prior private user audit logs to ensure zero sensitive user data survives
    cursor.execute("DELETE FROM audit_logs WHERE user_id = ?", (user_id,))

    # Delete user record (cascades to assets, transactions, documents, alerts, portfolio_goals)
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))

    # Record minimal non-sensitive audit event with user_id = NULL
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details) VALUES (NULL, 'ACCOUNT_DELETED', ?)",
        (f"Account User #{user_id} permanently purged; all personal user data deleted",)
    )

    # Verify database foreign-key integrity (must return 0 violations)
    cursor.execute("PRAGMA foreign_key_check")
    fk_violations = cursor.fetchall()
    if fk_violations:
        conn.rollback()
        conn.close()
        return False, f"Foreign key violation detected during account deletion: {fk_violations}"

    conn.commit()
    conn.close()
    return True, None

def get_user_profile(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, email, currency, target_portfolio_value, encryption_salt,
               COALESCE(public_certificate_verification, 0) as public_certificate_verification,
               COALESCE(public_owner_name, 0) as public_owner_name,
               created_at
        FROM users WHERE id = ?
    """, (user_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return None
    res = dict(user)
    if not res.get("encryption_salt"):
        res["encryption_salt"] = "assetvault_salt_v1"
    return res

def update_user_profile(user_id: int, name: str = None, currency: str = None, target_portfolio_value: float = None,
                        public_certificate_verification: int = None, public_owner_name: int = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check current status for audit logging
    cursor.execute("SELECT public_certificate_verification FROM users WHERE id = ?", (user_id,))
    cur_row = cursor.fetchone()
    cur_pcv = cur_row[0] if cur_row else 0

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
    if public_certificate_verification is not None:
        val = 1 if public_certificate_verification in [True, 1, "1", "true"] else 0
        updates.append("public_certificate_verification = ?")
        params.append(val)
        if val != cur_pcv:
            action = "QR_CERTIFICATE_ENABLED" if val else "QR_CERTIFICATE_DISABLED"
            cursor.execute(
                "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
                (user_id, action, f"Public QR certificate verification switched to {'ENABLED' if val else 'DISABLED'}")
            )
    if public_owner_name is not None:
        val_name = 1 if public_owner_name in [True, 1, "1", "true"] else 0
        updates.append("public_owner_name = ?")
        params.append(val_name)

    if updates:
        params.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return get_user_profile(user_id)

def authenticate_demo_user(ip_address: str = None, user_agent: str = None):
    """
    Authenticates the demo sandbox user on the server side using environment-configured credentials.
    Prevents hardcoding passwords in client-side JavaScript.
    """
    if not ALLOW_DEMO_LOGIN:
        return None, "Demo sandbox login is disabled in this environment."
    return authenticate_user(DEMO_USER_EMAIL, DEMO_USER_PASSWORD, ip_address=ip_address, user_agent=user_agent)

