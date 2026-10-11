import os
import io
import uuid
import secrets
import base64
import datetime
import math
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, request, jsonify, send_file, send_from_directory, make_response
from werkzeug.utils import secure_filename
from werkzeug.exceptions import HTTPException
from functools import wraps

from config import (
    STATIC_FOLDER, UPLOAD_FOLDER, DB_PATH, LOG_FILE, DEBUG,
    ALLOWED_DOCUMENT_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_CONTENT_LENGTH, APP_VERSION, ENVIRONMENT,
    ALLOW_DEMO_LOGIN, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, MARKET_API_KEY
)
from database import get_db_connection, init_db
from seed_data import seed_database
from services.auth_service import (
    register_user, authenticate_user, authenticate_demo_user, decode_token, get_user_profile, update_user_profile,
    change_user_password, delete_user_account, invalidate_all_user_sessions,
    get_user_sessions, revoke_session, revoke_other_sessions
)
from services.market_data_service import get_latest_market_rates, sync_live_market_rates, get_historical_market_trends, get_market_status
from services.valuation_engine import get_portfolio_summary, calculate_asset_valuation, get_metal_purity_factor
from services.transaction_service import sell_asset, update_asset_lifecycle_status, get_user_transactions, record_transaction
from services.simulator_service import run_portfolio_simulation
from services.alert_service import create_alert, get_user_alerts, delete_alert, toggle_alert
from services.report_service import generate_pdf_report, generate_excel_report, generate_csv_export
from services.import_service import parse_and_validate_file, commit_valid_import_rows
from services.file_validator import validate_file_pre_encryption, DISALLOWED_EXECUTABLE_SIGNATURES
from services.rate_limiter import (
    rate_limit,
    rate_limit_auth,
    rate_limit_public,
    rate_limit_authenticated_read,
    rate_limit_authenticated_mutation,
    limiter,
    backoff_tracker
)
from services.validator import (
    validate_input,
    validate_payload,
    REGISTER_SCHEMA,
    LOGIN_SCHEMA,
    CHANGE_PASSWORD_SCHEMA,
    DELETE_ACCOUNT_SCHEMA,
    UPDATE_PROFILE_SCHEMA,
    QR_PRIVACY_SCHEMA,
    CREATE_ASSET_SCHEMA,
    UPDATE_ASSET_SCHEMA,
    SELL_ASSET_SCHEMA,
    STATUS_ASSET_SCHEMA,
    CHECK_DUPLICATE_SCHEMA,
    CREATE_TRANSACTION_SCHEMA,
    CREATE_ALERT_SCHEMA,
    GOAL_SCHEMA,
    SIMULATOR_SCHEMA,
    MARKET_SYNC_SCHEMA
)

# Configure centralized server-side logging to LOG_FILE and stderr
logger = logging.getLogger("assetvault")
logger.setLevel(logging.DEBUG if DEBUG else logging.INFO)
if not logger.handlers:
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] [%(filename)s:%(lineno)d] - %(message)s"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

logger.propagate = False

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path="")
app.logger.handlers = logger.handlers
app.logger.setLevel(logger.level)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

VALID_LIFECYCLE_STATUSES = {"Active", "Sold", "Transferred", "Gifted", "Archived"}

def log_audit(action: str, user_id: int = None, details: str = "", ip: str = None):
    """Protected append-only security audit log helper."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        client_ip = ip or request.headers.get("X-Forwarded-For", request.remote_addr or "")
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, details, ip_address)
            VALUES (?, ?, ?, ?)
        """, (user_id, action, details, client_ip))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Audit log recording error: %s", e, exc_info=True)

def validate_magic_bytes(stream, ext: str) -> bool:
    """Validates file magic bytes against the declared extension for unencrypted files."""
    header = stream.read(16)
    stream.seek(0)
    if not header:
        return False
    ext = ext.lower().strip()
    if ext == "pdf":
        return header.startswith(b"%PDF")
    elif ext in ["jpg", "jpeg"]:
        return header.startswith(b"\xff\xd8\xff")
    elif ext == "png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext == "webp":
        return len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    return False

# Authentication Middleware Decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        token = None
        if auth_header:
            parts = auth_header.split(" ")
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
        
        if not token:
            token = request.args.get("token")
            
        if not token:
            log_audit("UNAUTHORIZED_ACCESS_ATTEMPT", details="Missing authorization token")
            return jsonify({"error": "Authentication required. Please sign in to access your portfolio."}), 401

        payload = decode_token(token)
        if not payload or "user_id" not in payload:
            log_audit("UNAUTHORIZED_ACCESS_ATTEMPT", details="Invalid or expired token presentation")
            return jsonify({"error": "Invalid or expired session. Please sign in again."}), 401

        request.user_id = payload["user_id"]
        request.user_email = payload.get("email", "")
        request.session_id = payload.get("session_id")
        return f(*args, **kwargs)
    return decorated

# ----------------- AUTH ROUTES ----------------- #
@app.route("/api/auth/register", methods=["POST"])
@rate_limit_auth(scope="auth_register", per_account=True)
@validate_input(REGISTER_SCHEMA)
def api_register():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    currency = data.get("currency", "INR") or "INR"

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "")

    user, err = register_user(name, email, password, currency, ip_address=client_ip, user_agent=user_agent)
    if err:
        return jsonify({"error": err}), 400
    
    log_audit("USER_REGISTERED", user_id=user["id"], details=f"User registered with base currency {currency}")
    return jsonify({"message": "Registration successful", "user": user}), 201

@app.route("/api/auth/login", methods=["POST"])
@rate_limit_auth(scope="auth_login", per_account=True)
@validate_input(LOGIN_SCHEMA)
def api_login():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "")

    user, err = authenticate_user(email, password, ip_address=client_ip, user_agent=user_agent)
    if err:
        log_audit("LOGIN_FAILED", details=f"Failed login attempt for email: {email}")
        if "exponential backoff" in err.lower() or "too many" in err.lower() or "temporarily locked" in err.lower() or "locked" in err.lower():
            import re
            m = re.search(r"(\d+)\s+seconds", err)
            wait_s = int(m.group(1)) if m else 5
            resp = make_response(jsonify({"error": f"Too many requests. {err}", "retry_after": wait_s}), 429)
            resp.headers["Retry-After"] = str(wait_s)
            return resp
        return jsonify({"error": err}), 401
    
    log_audit("LOGIN_SUCCESS", user_id=user["id"], details=f"User logged in successfully from {client_ip}")
    return jsonify({"message": "Login successful", "user": user})

@app.route("/api/auth/demo-status", methods=["GET"])
@rate_limit_public(scope="auth_demo_status")
def api_demo_status():
    return jsonify({
        "demo_enabled": ALLOW_DEMO_LOGIN,
        "demo_email": DEMO_USER_EMAIL if ALLOW_DEMO_LOGIN else None
    })

@app.route("/api/auth/demo-login", methods=["POST"])
@rate_limit_auth(scope="auth_demo_login")
def api_demo_login():
    if not ALLOW_DEMO_LOGIN:
        return jsonify({"error": "Demo sandbox login is disabled in this environment."}), 403
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "")
    user, err = authenticate_demo_user(ip_address=client_ip, user_agent=user_agent)
    if err:
        return jsonify({"error": err}), 400
    log_audit("DEMO_LOGIN_SUCCESS", user_id=user["id"], details="Demo sandbox login executed")
    return jsonify({"message": "Demo login successful", "user": user, "demo_password": DEMO_USER_PASSWORD})

@app.route("/api/auth/change-password", methods=["POST"])
@token_required
@rate_limit_auth(scope="auth_change_password", per_account=True)
@validate_input(CHANGE_PASSWORD_SCHEMA)
def api_change_password():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    current_pwd = data.get("current_password") or data.get("old_password")
    new_pwd = data.get("new_password")
    confirm_pwd = data.get("confirm_password") or new_pwd

    if not current_pwd or not new_pwd:
        return jsonify({"error": "Current password and new password are required"}), 400
    if new_pwd != confirm_pwd:
        return jsonify({"error": "New password and confirmation do not match"}), 400

    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "")

    res, err = change_user_password(request.user_id, current_pwd, new_pwd, ip_address=client_ip, user_agent=user_agent)
    if err:
        return jsonify({"error": err}), 400

    return jsonify(res)

@app.route("/api/auth/sessions", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="auth_sessions")
def api_get_sessions():
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "")

    sessions = get_user_sessions(
        request.user_id,
        current_session_id=request.session_id,
        current_ip=client_ip,
        current_ua=user_agent
    )
    return jsonify({
        "sessions": sessions,
        "total_active": len(sessions),
        "current_session_id": request.session_id
    })

@app.route("/api/auth/sessions/<session_id>", methods=["DELETE"])
@token_required
@rate_limit_authenticated_mutation(scope="session_delete")
def api_revoke_session(session_id):
    if not session_id:
        return jsonify({"error": "Session ID required"}), 400
    
    success = revoke_session(request.user_id, session_id)
    if not success:
        return jsonify({"error": "Session not found or already revoked."}), 404
        
    is_current = (session_id == request.session_id)
    return jsonify({
        "message": "Session revoked successfully.",
        "was_current": is_current
    })

@app.route("/api/auth/sessions/revoke-others", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="session_revoke_others")
def api_revoke_other_sessions():
    count = revoke_other_sessions(request.user_id, request.session_id)
    return jsonify({
        "message": f"Successfully revoked {count} other active session(s).",
        "revoked_count": count
    })

@app.route("/api/auth/logout", methods=["POST"])
@token_required
def api_logout():
    if request.session_id:
        revoke_session(request.user_id, request.session_id)
    log_audit("LOGOUT", user_id=request.user_id, details="User logged out of active session")
    return jsonify({"message": "Successfully logged out."})

@app.route("/api/auth/logout-all", methods=["POST"])
@token_required
def api_logout_all():
    invalidate_all_user_sessions(request.user_id)
    return jsonify({"message": "Successfully invalidated all active sessions across all devices."})

@app.route("/api/auth/delete-account", methods=["POST", "DELETE"])
@token_required
@rate_limit_auth(scope="auth_delete_account", per_account=True)
@validate_input(DELETE_ACCOUNT_SCHEMA)
def api_delete_account():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    password = data.get("password")
    confirm_phrase = data.get("confirmation_phrase") or "DELETE MY ACCOUNT"

    if not password:
        return jsonify({"error": "Password is required to confirm account deletion"}), 400

    ok, err = delete_user_account(request.user_id, password, confirm_phrase)
    if not ok:
        return jsonify({"error": err or "Failed to delete account"}), 400

    return jsonify({"message": "Account, portfolio assets, and all uploaded documents permanently purged."})

@app.route("/api/auth/me", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="auth_me")
def api_get_me():
    user = get_user_profile(request.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user})

@app.route("/api/auth/profile", methods=["PUT"])
@token_required
@rate_limit_authenticated_mutation(scope="profile_update")
@validate_input(UPDATE_PROFILE_SCHEMA)
def api_update_profile():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    user = update_user_profile(
        request.user_id,
        name=data.get("name"),
        currency=data.get("currency"),
        target_portfolio_value=data.get("target_portfolio_value"),
        public_certificate_verification=data.get("public_certificate_verification"),
        public_owner_name=data.get("public_owner_name")
    )
    return jsonify({"message": "Profile updated", "user": user})

@app.route("/api/auth/qr-privacy", methods=["PUT"])
@token_required
@rate_limit_authenticated_mutation(scope="qr_privacy")
@validate_input(QR_PRIVACY_SCHEMA)
def api_update_qr_privacy():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    user = update_user_profile(
        request.user_id,
        public_certificate_verification=data.get("public_certificate_verification"),
        public_owner_name=data.get("public_owner_name")
    )
    status_str = "ENABLED" if user.get("public_certificate_verification") else "DISABLED"
    return jsonify({
        "message": f"QR Certificate privacy updated. Public verification is now {status_str}.",
        "public_certificate_verification": bool(user.get("public_certificate_verification")),
        "public_owner_name": bool(user.get("public_owner_name")),
        "user": user
    })

# ----------------- AUDIT LOGS ROUTE ----------------- #
@app.route("/api/audit-logs", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="audit_logs")
def api_get_audit_logs():
    limit = min(int(request.args.get("limit", 50)), 200)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, action, details, ip_address, created_at
        FROM audit_logs
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
    """, (request.user_id, limit))
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"audit_logs": logs})

# ----------------- MARKET RATES ROUTES ----------------- #
@app.route("/api/market-rates", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="market_rates")
def api_get_market_rates():
    currency = request.args.get("currency", "INR")
    rates = get_latest_market_rates(currency)
    market_info = get_market_status()
    return jsonify({"rates": rates, "currency": currency, "market_info": market_info})

@app.route("/api/market-rates/sync", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="market_sync")
@validate_input(MARKET_SYNC_SCHEMA)
def api_sync_market_rates():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    api_key = data.get("api_key") or MARKET_API_KEY
    synced = sync_live_market_rates(api_key)
    rates = get_latest_market_rates(request.args.get("currency", "INR"))
    market_info = get_market_status()
    return jsonify({
        "message": "Market rates synchronized successfully",
        "rates": rates,
        "market_info": market_info
    })

@app.route("/api/market-rates/history", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="market_history")
def api_get_market_history():
    days = int(request.args.get("days", 30))
    currency = request.args.get("currency", "INR")
    trends = get_historical_market_trends(days, currency)
    return jsonify({"trends": trends, "days": days, "currency": currency})

# ----------------- PORTFOLIO SUMMARY ----------------- #
@app.route("/api/portfolio/summary", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="portfolio_summary")
def api_portfolio_summary():
    currency = request.args.get("currency", "INR")
    summary = get_portfolio_summary(request.user_id, currency)
    return jsonify(summary)

# ----------------- ASSETS CRUD ROUTES ----------------- #
@app.route("/api/assets", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="assets_list")
def api_get_assets():
    currency = request.args.get("currency", "INR")
    status = request.args.get("status")
    metal = request.args.get("metal")
    category_id = request.args.get("category_id")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", "id")
    order = request.args.get("order", "desc").lower()

    # Base query
    query = """
        SELECT a.*, c.category_name, c.icon as category_icon
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.user_id = ?
    """
    count_query = "SELECT COUNT(*) FROM assets a WHERE a.user_id = ?"
    params = [request.user_id]
    count_params = [request.user_id]

    if status and status.strip():
        query += " AND LOWER(a.status) = ?"
        count_query += " AND LOWER(a.status) = ?"
        params.append(status.strip().lower())
        count_params.append(status.strip().lower())

    if metal and metal.strip():
        query += " AND LOWER(a.metal) = ?"
        count_query += " AND LOWER(a.metal) = ?"
        params.append(metal.strip().lower())
        count_params.append(metal.strip().lower())

    if category_id:
        try:
            cid = int(category_id)
            query += " AND a.category_id = ?"
            count_query += " AND a.category_id = ?"
            params.append(cid)
            count_params.append(cid)
        except (ValueError, TypeError):
            pass

    if search and search.strip():
        s_term = f"%{search.strip().lower()}%"
        query += " AND (LOWER(a.asset_name) LIKE ? OR LOWER(COALESCE(a.hallmark_huid, '')) LIKE ? OR LOWER(COALESCE(a.jeweller_name, '')) LIKE ? OR LOWER(COALESCE(a.invoice_number, '')) LIKE ?)"
        count_query += " AND (LOWER(a.asset_name) LIKE ? OR LOWER(COALESCE(a.hallmark_huid, '')) LIKE ? OR LOWER(COALESCE(a.jeweller_name, '')) LIKE ? OR LOWER(COALESCE(a.invoice_number, '')) LIKE ?)"
        params.extend([s_term, s_term, s_term, s_term])
        count_params.extend([s_term, s_term, s_term, s_term])

    # Allowed sorting fields
    sort_map = {
        "id": "a.id",
        "date": "a.purchase_date",
        "purchase_date": "a.purchase_date",
        "name": "a.asset_name",
        "cost": "a.total_acquisition_cost",
        "acquisition_cost": "a.total_acquisition_cost"
    }
    col_sort = sort_map.get(sort_by.lower(), "a.id")
    dir_sort = "ASC" if order == "asc" else "DESC"
    query += f" ORDER BY {col_sort} {dir_sort}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(count_query, count_params)
    total_count = cursor.fetchone()[0]

    limit_param = request.args.get("limit")
    page_param = request.args.get("page", 1)
    limit = None
    page = 1
    total_pages = 1

    if limit_param and str(limit_param).isdigit() and int(limit_param) > 0:
        limit = int(limit_param)
        page = max(1, int(page_param) if str(page_param).isdigit() else 1)
        offset = (page - 1) * limit
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        total_pages = max(1, (total_count + limit - 1) // limit)

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    latest_rates = get_latest_market_rates(currency)
    result = []
    for a in rows:
        if a.get("encrypted_data") and a.get("iv"):
            result.append({
                "id": a["id"],
                "user_id": a["user_id"],
                "encrypted_data": a["encrypted_data"],
                "iv": a["iv"],
                "status": a.get("status", "Active"),
                "category_id": a.get("category_id"),
                "certificate_token": a.get("certificate_token"),
                "created_at": a.get("created_at"),
                "updated_at": a.get("updated_at")
            })
        else:
            val = calculate_asset_valuation(a, latest_rates=latest_rates, target_currency=currency)
            result.append({**a, **val})

    resp = {
        "assets": result,
        "total_count": total_count,
        "page": page,
        "limit": limit or total_count,
        "total_pages": total_pages,
        "currency": currency
    }
    return jsonify(resp)

@app.route("/api/assets/<int:asset_id>", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="asset_detail")
def api_get_asset_detail(asset_id: int):
    currency = request.args.get("currency", "INR")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, c.category_name, c.icon as category_icon
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.id = ? AND a.user_id = ?
    """, (asset_id, request.user_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Asset not found"}), 404

    asset = dict(row)

    # Fetch transactions for this asset
    cursor.execute("""
        SELECT * FROM transactions WHERE asset_id = ? AND user_id = ? ORDER BY id DESC
    """, (asset_id, request.user_id))
    txs = [dict(t) for t in cursor.fetchall()]

    # Fetch documents for this asset
    cursor.execute("""
        SELECT * FROM documents WHERE asset_id = ? AND user_id = ? ORDER BY id DESC
    """, (asset_id, request.user_id))
    docs = [dict(d) for d in cursor.fetchall()]
    conn.close()

    if asset.get("encrypted_data"):
        return jsonify({
            "asset": {
                "id": asset["id"],
                "user_id": asset["user_id"],
                "encrypted_data": asset["encrypted_data"],
                "iv": asset["iv"],
                "status": asset.get("status", "Active"),
                "certificate_token": asset.get("certificate_token"),
                "transactions": txs,
                "documents": docs,
                "created_at": asset.get("created_at"),
                "updated_at": asset.get("updated_at")
            }
        })

    val = calculate_asset_valuation(asset, target_currency=currency)
    full_asset = {**asset, **val, "transactions": txs, "documents": docs}
    return jsonify({"asset": full_asset})

@app.route("/api/assets", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="asset_create")
@validate_input(CREATE_ASSET_SCHEMA)
def api_create_asset():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cert_token = secrets.token_urlsafe(24)

    # Client-Side Encrypted Payload Handling
    if "encrypted_data" in data and "iv" in data:
        status = data.get("status", "Active")
        cursor.execute("""
            INSERT INTO assets (
                user_id, encrypted_data, iv, status,
                asset_name, asset_type, metal, purity, purity_factor,
                quantity, gross_weight, net_weight, stone_weight, purchase_date,
                purchase_price, making_charges, wastage, taxes, total_acquisition_cost,
                description, certificate_token, updated_at
            )
            VALUES (
                ?, ?, ?, ?,
                '', 'Encrypted', 'Encrypted', 'Encrypted', 1.0,
                1, 0.0, 0.0, 0.0, DATE('now'),
                0.0, 0.0, 0.0, 0.0, 0.0,
                '', ?, CURRENT_TIMESTAMP
            )
        """, (request.user_id, data["encrypted_data"], data["iv"], status, cert_token))
        asset_id = cursor.lastrowid

        # If an encrypted transaction is also attached
        if "transaction_encrypted_data" in data and "transaction_iv" in data:
            cursor.execute("""
                INSERT INTO transactions (user_id, asset_id, encrypted_data, iv, transaction_type, transaction_date, amount, realized_profit)
                VALUES (?, ?, ?, ?, 'PURCHASE', CURRENT_TIMESTAMP, 0.0, 0.0)
            """, (request.user_id, asset_id, data["transaction_encrypted_data"], data["transaction_iv"]))

        conn.commit()
        conn.close()
        log_audit("ASSET_CREATED", user_id=request.user_id, details=f"Encrypted Asset #{asset_id} added to vault")
        return jsonify({
            "message": "Asset encrypted and saved to client-side encrypted vault",
            "asset_id": asset_id,
            "certificate_token": cert_token
        }), 201

    # Legacy Unencrypted Creation
    asset_name = data.get("asset_name")
    if not asset_name:
        conn.close()
        return jsonify({"error": "Asset name or encrypted payload required"}), 400

    try:
        gross_weight = float(data.get("gross_weight") or 0.0)
        stone_weight = float(data.get("stone_weight") or 0.0)
        net_weight = float(data.get("net_weight") or max(0.0, gross_weight - stone_weight))
        quantity = int(data.get("quantity") or 1)
        purchase_price = float(data.get("purchase_price") or 0.0)
        making_charges = float(data.get("making_charges") or 0.0)
        wastage = float(data.get("wastage") or 0.0)
        taxes = float(data.get("taxes") or 0.0)
        diamond_carat = float(data.get("diamond_carat") or 0.0)
        
        if quantity < 1:
            conn.close()
            return jsonify({"error": "Quantity must be at least 1"}), 400
        if any(v < 0 for v in [gross_weight, stone_weight, net_weight, purchase_price, making_charges, wastage, taxes, diamond_carat]):
            conn.close()
            return jsonify({"error": "Weights, prices, charges, and carats cannot be negative"}), 400
    except (ValueError, TypeError):
        conn.close()
        return jsonify({"error": "Invalid numeric values provided"}), 400

    metal = data.get("metal", "Gold")
    purity = data.get("purity", "22K")
    purity_factor = get_metal_purity_factor(metal, purity)
    
    purchase_date = data.get("purchase_date") or datetime.date.today().isoformat()
    total_cost = float(data.get("total_acquisition_cost") or (purchase_price + making_charges + wastage + taxes))
    owner_name = data.get("owner_name") or data.get("buyer_name") or ""

    cursor.execute("""
        INSERT INTO assets (
            user_id, asset_name, category_id, asset_type, metal, purity, purity_factor,
            quantity, gross_weight, net_weight, stone_weight, purchase_date, purchase_price,
            making_charges, wastage, taxes, total_acquisition_cost, description, status,
            hallmark_huid, jeweller_name, invoice_number, diamond_carat, diamond_cut,
            diamond_color, diamond_clarity, diamond_shape, diamond_cert_lab, diamond_cert_number,
            photo_url, owner_name, certificate_token
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, 'Active',
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?
        )
    """, (
        request.user_id, asset_name, data.get("category_id"), data.get("asset_type", "Jewellery"), metal, purity, purity_factor,
        quantity, gross_weight, net_weight, stone_weight, purchase_date, purchase_price,
        making_charges, wastage, taxes, total_cost, data.get("description", ""),
        (data.get("hallmark_huid") or data.get("huid")), data.get("jeweller_name"), (data.get("invoice_number") or data.get("invoice")),
        diamond_carat, data.get("diamond_cut"), data.get("diamond_color"),
        data.get("diamond_clarity"), data.get("diamond_shape"), data.get("diamond_cert_lab"),
        (data.get("diamond_cert_number") or data.get("cert_number")), data.get("photo_url"), owner_name, cert_token
    ))
    asset_id = cursor.lastrowid

    # Record acquisition transaction
    cursor.execute("""
        INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
        VALUES (?, ?, 'PURCHASE', ?, ?, 0.0, ?, ?)
    """, (request.user_id, asset_id, purchase_date, total_cost, data.get("jeweller_name", "Acquisition"), f"Added asset: {asset_name}"))

    conn.commit()
    conn.close()
    log_audit("ASSET_CREATED", user_id=request.user_id, details=f"Asset #{asset_id} '{asset_name}' created")
    return jsonify({
        "message": "Asset created successfully",
        "asset_id": asset_id,
        "certificate_token": cert_token
    }), 201

# ----------------- DUPLICATE ASSET DETECTION ROUTE ----------------- #
@app.route("/api/assets/check-duplicate", methods=["POST"])
@token_required
@rate_limit_authenticated_read(scope="check_duplicate")
@validate_input(CHECK_DUPLICATE_SCHEMA)
def api_check_duplicate():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    huid = (data.get("hallmark_huid") or data.get("huid") or "").strip().lower()
    invoice = (data.get("invoice_number") or data.get("invoice") or "").strip().lower()
    cert = (data.get("diamond_cert_number") or data.get("cert_number") or "").strip().lower()
    current_asset_id = data.get("asset_id")

    if not huid and not invoice and not cert:
        return jsonify({"is_duplicate": False})

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, asset_name, hallmark_huid, invoice_number, diamond_cert_number
        FROM assets
        WHERE user_id = ?
    """, (request.user_id,))
    rows = cursor.fetchall()
    conn.close()

    for r in rows:
        if current_asset_id and r["id"] == int(current_asset_id):
            continue
        if huid and r["hallmark_huid"] and r["hallmark_huid"].strip().lower() == huid:
            return jsonify({
                "is_duplicate": True,
                "field": "hallmark_huid",
                "matched_asset": {"id": r["id"], "asset_name": r["asset_name"]},
                "message": f"Possible duplicate: An asset with HUID '{data.get('hallmark_huid')}' already exists in your vault ('{r['asset_name']}')."
            })
        if invoice and r["invoice_number"] and r["invoice_number"].strip().lower() == invoice:
            return jsonify({
                "is_duplicate": True,
                "field": "invoice_number",
                "matched_asset": {"id": r["id"], "asset_name": r["asset_name"]},
                "message": f"Possible duplicate: An asset with Invoice '{data.get('invoice_number')}' already exists in your vault ('{r['asset_name']}')."
            })
        if cert and r["diamond_cert_number"] and r["diamond_cert_number"].strip().lower() == cert:
            return jsonify({
                "is_duplicate": True,
                "field": "diamond_cert_number",
                "matched_asset": {"id": r["id"], "asset_name": r["asset_name"]},
                "message": f"Possible duplicate: An asset with Certificate '{data.get('diamond_cert_number')}' already exists in your vault ('{r['asset_name']}')."
            })

    return jsonify({"is_duplicate": False})

# ----------------- SECURE PUBLIC QR CERTIFICATE VERIFICATION ROUTE ----------------- #
@app.route("/api/verify/certificate/<string:token>", methods=["GET"])
@rate_limit_public(scope="verify_cert")
def api_verify_certificate(token: str):
    token = (token or "").strip()
    if not token:
        return jsonify({"valid": False, "error": "Invalid verification token."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.asset_name, COALESCE(NULLIF(a.owner_name, ''), u.name) AS owner_name, a.metal, a.purity, a.gross_weight, a.net_weight,
               a.purchase_date, a.hallmark_huid, a.jeweller_name, a.diamond_carat, a.diamond_cut,
               a.diamond_color, a.diamond_clarity, a.diamond_shape, a.diamond_cert_lab, a.diamond_cert_number,
               a.status, a.created_at, c.category_name,
               COALESCE(u.public_certificate_verification, 0) AS public_certificate_verification,
               COALESCE(u.public_owner_name, 0) AS public_owner_name
        FROM assets a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.certificate_token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({
            "valid": False,
            "error": "Asset certificate not found or invalid registry token."
        }), 404

    asset = dict(row)

    # User-controlled privacy control: Public Certificate Verification [Enabled / Disabled]
    if not asset.get("public_certificate_verification"):
        return jsonify({
            "valid": False,
            "status": "DISABLED",
            "message": "Public certificate verification is disabled by the vault owner.",
            "error": "Public certificate verification is disabled by the vault owner."
        }), 403

    owner_raw = asset.get("owner_name") or "Depository Legal Bearer"
    # Masked ownership by default unless user explicitly opted in to make real full name public
    if asset.get("public_owner_name"):
        owner_display = owner_raw
    else:
        owner_display = (owner_raw.split()[0][0] + ". " + owner_raw.split()[-1]) if len(owner_raw.split()) > 1 else (owner_raw[:1] + "***")
    registry_id = f"AV-2026-{str(asset['id']).zfill(5)}"

    # Strictly excludes purchase price, sale price, acquisition cost, profit/loss, private docs
    cert_data = {
        "asset_id": asset["id"],
        "registry_id": registry_id,
        "asset_name": asset["asset_name"] or "Certified Vaulted Asset",
        "masked_owner": owner_display,
        "owner_display": owner_display,
        "category": asset.get("category_name") or "Precious Holding",
        "metal": asset.get("metal", "Gold"),
        "purity": asset.get("purity", "22K"),
        "gross_weight": asset.get("gross_weight", 0.0),
        "gross_weight_g": asset.get("gross_weight", 0.0),
        "net_weight": asset.get("net_weight", 0.0),
        "fine_weight_g": asset.get("net_weight", 0.0),
        "purchase_date": asset.get("purchase_date", ""),
        "hallmark_huid": asset.get("hallmark_huid") or "Standard BIS Assay",
        "huid": asset.get("hallmark_huid") or "Standard BIS Assay",
        "jeweller_name": asset.get("jeweller_name") or "Certified Depository",
        "diamond_carat": asset.get("diamond_carat", 0.0),
        "diamond_cut": asset.get("diamond_cut"),
        "diamond_color": asset.get("diamond_color"),
        "diamond_clarity": asset.get("diamond_clarity"),
        "diamond_shape": asset.get("diamond_shape"),
        "diamond_cert_lab": asset.get("diamond_cert_lab"),
        "diamond_cert_number": asset.get("diamond_cert_number"),
        "status": (asset.get("status") or "Active").upper(),
        "verification_status": "OFFICIALLY REGISTERED & AUTHENTICATED",
        "registered_at": asset.get("created_at")
    }

    return jsonify({
        "valid": True,
        "verified": True,
        "certificate": cert_data,
        "asset": cert_data,
        **cert_data
    })

# ----------------- CSV / XLSX IMPORT ROUTES ----------------- #
@app.route("/api/assets/import/preview", methods=["POST"])
@token_required
def api_import_preview():
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    res, status_code = parse_and_validate_file(file.stream, file.filename, request.user_id)
    return jsonify(res), status_code

@app.route("/api/assets/import/confirm", methods=["POST"])
@token_required
def api_import_confirm():
    data = request.get_json() or {}
    valid_rows = data.get("valid_rows") or data.get("rows") or []
    if not valid_rows:
        return jsonify({"error": "No valid rows to import"}), 400

    res, status_code = commit_valid_import_rows(request.user_id, valid_rows)
    return jsonify(res), status_code

@app.route("/api/assets/<int:asset_id>", methods=["PUT"])
@token_required
@rate_limit_authenticated_mutation(scope="asset_update")
@validate_input(UPDATE_ASSET_SCHEMA)
def api_update_asset(asset_id: int):
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "Asset not found"}), 404

    # Client-Side Encrypted Update
    if "encrypted_data" in data and "iv" in data:
        status = data.get("status", existing["status"] or "Active")
        if status not in VALID_LIFECYCLE_STATUSES:
            conn.close()
            return jsonify({"error": f"Invalid status '{status}'. Must be one of: {', '.join(VALID_LIFECYCLE_STATUSES)}"}), 400
        cursor.execute("""
            UPDATE assets SET encrypted_data = ?, iv = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        """, (data["encrypted_data"], data["iv"], status, asset_id, request.user_id))
        conn.commit()
        conn.close()
        return jsonify({"message": "Encrypted asset updated successfully"})

    # Legacy Unencrypted Update
    try:
        gross_weight = float(data["gross_weight"]) if data.get("gross_weight") is not None else None
        stone_weight = float(data["stone_weight"]) if data.get("stone_weight") is not None else None
        net_weight = float(data["net_weight"]) if data.get("net_weight") is not None else None
        quantity = int(data["quantity"]) if data.get("quantity") is not None else None
        purchase_price = float(data["purchase_price"]) if data.get("purchase_price") is not None else None
        making_charges = float(data["making_charges"]) if data.get("making_charges") is not None else None
        wastage = float(data["wastage"]) if data.get("wastage") is not None else None
        taxes = float(data["taxes"]) if data.get("taxes") is not None else None
        diamond_carat = float(data["diamond_carat"]) if data.get("diamond_carat") is not None else None
        
        if quantity is not None and quantity < 1:
            conn.close()
            return jsonify({"error": "Quantity must be at least 1"}), 400
        for val in [gross_weight, stone_weight, net_weight, purchase_price, making_charges, wastage, taxes, diamond_carat]:
            if val is not None and val < 0:
                conn.close()
                return jsonify({"error": "Weights, prices, charges, and carats cannot be negative"}), 400
    except (ValueError, TypeError):
        conn.close()
        return jsonify({"error": "Invalid numeric values provided"}), 400

    status = data.get("status")
    if status is not None:
        status = status.capitalize()
        if status not in VALID_LIFECYCLE_STATUSES:
            conn.close()
            return jsonify({"error": f"Invalid status '{status}'. Must be one of: {', '.join(VALID_LIFECYCLE_STATUSES)}"}), 400

    metal = data.get("metal")
    purity = data.get("purity")
    purity_factor = None
    if metal or purity:
        m = metal or existing["metal"] or "Gold"
        p = purity or existing["purity"] or "22K"
        purity_factor = get_metal_purity_factor(m, p)

    if gross_weight is not None and net_weight is None:
        st_w = stone_weight if stone_weight is not None else (existing["stone_weight"] or 0.0)
        net_weight = max(0.0, gross_weight - st_w)
    
    total_cost = float(data["total_acquisition_cost"]) if data.get("total_acquisition_cost") is not None else None
    if purchase_price is not None and total_cost is None:
        mc = making_charges if making_charges is not None else (existing["making_charges"] or 0.0)
        ws = wastage if wastage is not None else (existing["wastage"] or 0.0)
        tx = taxes if taxes is not None else (existing["taxes"] or 0.0)
        total_cost = purchase_price + mc + ws + tx

    owner_name = data.get("owner_name", data.get("buyer_name"))

    cursor.execute("""
        UPDATE assets SET
            asset_name = coalesce(?, asset_name),
            category_id = coalesce(?, category_id),
            asset_type = coalesce(?, asset_type),
            metal = coalesce(?, metal),
            purity = coalesce(?, purity),
            purity_factor = coalesce(?, purity_factor),
            quantity = coalesce(?, quantity),
            gross_weight = coalesce(?, gross_weight),
            net_weight = coalesce(?, net_weight),
            stone_weight = coalesce(?, stone_weight),
            purchase_date = coalesce(?, purchase_date),
            purchase_price = coalesce(?, purchase_price),
            making_charges = coalesce(?, making_charges),
            wastage = coalesce(?, wastage),
            taxes = coalesce(?, taxes),
            total_acquisition_cost = coalesce(?, total_acquisition_cost),
            description = coalesce(?, description),
            status = coalesce(?, status),
            hallmark_huid = coalesce(?, hallmark_huid),
            jeweller_name = coalesce(?, jeweller_name),
            invoice_number = coalesce(?, invoice_number),
            diamond_carat = coalesce(?, diamond_carat),
            diamond_cut = coalesce(?, diamond_cut),
            diamond_color = coalesce(?, diamond_color),
            diamond_clarity = coalesce(?, diamond_clarity),
            diamond_shape = coalesce(?, diamond_shape),
            diamond_cert_lab = coalesce(?, diamond_cert_lab),
            diamond_cert_number = coalesce(?, diamond_cert_number),
            photo_url = coalesce(?, photo_url),
            owner_name = coalesce(?, owner_name),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    """, (
        data.get("asset_name"),
        data.get("category_id"),
        data.get("asset_type"),
        metal,
        purity,
        purity_factor,
        data.get("quantity"),
        gross_weight,
        net_weight,
        stone_weight,
        data.get("purchase_date"),
        purchase_price,
        making_charges,
        wastage,
        taxes,
        total_cost,
        data.get("description"),
        data.get("status"),
        data.get("hallmark_huid"),
        data.get("jeweller_name", data.get("jeweller")),
        data.get("invoice_number"),
        data.get("diamond_carat"),
        data.get("diamond_cut"),
        data.get("diamond_color"),
        data.get("diamond_clarity"),
        data.get("diamond_shape"),
        data.get("diamond_cert_lab"),
        data.get("diamond_cert_number"),
        data.get("photo_url"),
        owner_name,
        asset_id,
        request.user_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": "Asset updated successfully"})

@app.route("/api/assets/<int:asset_id>", methods=["DELETE"])
@token_required
@rate_limit_authenticated_mutation(scope="asset_delete")
def api_delete_asset(asset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM assets WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Asset not found or unauthorized access"}), 404

    cursor.execute("DELETE FROM assets WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
    cursor.execute("DELETE FROM transactions WHERE asset_id = ? AND user_id = ?", (asset_id, request.user_id))
    cursor.execute("DELETE FROM documents WHERE asset_id = ? AND user_id = ?", (asset_id, request.user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Asset deleted successfully"})

VALID_LIFECYCLE_STATUSES = ["Active", "Sold", "Transferred", "Gifted", "Archived"]

@app.route("/api/assets/<int:asset_id>/sell", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="asset_sell")
@validate_input(SELL_ASSET_SCHEMA)
def api_sell_asset(asset_id: int):
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
    asset = cursor.fetchone()
    if not asset:
        conn.close()
        return jsonify({"error": "Asset not found or unauthorized access"}), 404

    # Centralized lifecycle check: Cannot sell an asset that is already sold or inactive
    if asset["status"] == "Sold":
        conn.close()
        return jsonify({"error": "Asset has already been sold."}), 400

    if asset["status"] != "Active":
        conn.close()
        return jsonify({"error": f"Cannot sell an asset with status '{asset['status']}'. Only Active assets can be sold."}), 400

    # Encrypted Sale Flow
    if "encrypted_data" in data and "iv" in data:
        sale_date = data.get("sale_date") or datetime.date.today().isoformat()
        notes = data.get("notes", "Encrypted sale transaction")
        counterparty = data.get("buyer_name", "")
        try:
            sale_amount = float(data.get("sale_amount") or data.get("amount") or 0.0)
            charges = float(data.get("selling_charges") or 0.0)
            realized_profit = float(data.get("realized_profit") or 0.0)
            if charges < 0:
                conn.close()
                return jsonify({"error": "Selling charges cannot be negative"}), 400
        except (ValueError, TypeError):
            conn.close()
            return jsonify({"error": "Invalid numeric values in sale details"}), 400

        cursor.execute("UPDATE assets SET status = 'Sold', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
        cursor.execute("""
            INSERT INTO transactions (user_id, asset_id, encrypted_data, iv, transaction_type, transaction_date, amount, realized_profit, counterparty, notes, selling_charges)
            VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, ?)
        """, (request.user_id, asset_id, data["encrypted_data"], data["iv"], sale_date, sale_amount, realized_profit, counterparty, notes, charges))
        tx_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, details)
            VALUES (?, 'ASSET_SOLD_ENCRYPTED', ?)
        """, (request.user_id, f"Encrypted Asset #{asset_id} marked as sold. Transaction #{tx_id}"))

        conn.commit()
        conn.close()
        return jsonify({
            "message": "Asset marked as sold and encrypted transaction recorded",
            "transaction_id": tx_id
        })

    conn.close()
    sale_amount = data.get("sale_amount")
    if sale_amount is None:
        return jsonify({"error": "Sale amount is required"}), 400

    try:
        sale_val = float(sale_amount)
        charges_val = float(data.get("selling_charges") or 0.0)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid numeric values for sale amount or selling charges"}), 400

    res, err = sell_asset(
        user_id=request.user_id,
        asset_id=asset_id,
        sale_amount=sale_val,
        sale_date=data.get("sale_date"),
        buyer_name=data.get("buyer_name", ""),
        notes=data.get("notes", ""),
        selling_charges=charges_val
    )
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": "Asset sold successfully", "transaction": res})

@app.route("/api/assets/<int:asset_id>/status", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="asset_status")
@validate_input(STATUS_ASSET_SCHEMA)
def api_update_status(asset_id: int):
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    raw_status = (data.get("status") or "").capitalize()
    if raw_status not in VALID_LIFECYCLE_STATUSES:
        return jsonify({"error": f"Invalid status '{raw_status}'. Must be one of: {', '.join(VALID_LIFECYCLE_STATUSES)}"}), 400

    notes = data.get("notes", f"Status changed to {raw_status}")
    res, err = update_asset_lifecycle_status(request.user_id, asset_id, raw_status, notes)
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Asset status changed to {raw_status}", "result": res})

# ----------------- SIMULATOR ROUTE ----------------- #
@app.route("/api/simulator/run", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="simulator_run")
@validate_input(SIMULATOR_SCHEMA)
def api_run_simulation():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    gold_shock = float(data.get("gold_shock") or 0.0)
    silver_shock = float(data.get("silver_shock") or 0.0)
    plat_shock = float(data.get("plat_shock") or 0.0)
    diamond_shock = float(data.get("diamond_shock") or 0.0)
    currency = data.get("currency", "INR")

    result = run_portfolio_simulation(
        user_id=request.user_id,
        gold_pct_change=gold_shock,
        silver_pct_change=silver_shock,
        plat_pct_change=plat_shock,
        diamond_pct_change=diamond_shock,
        target_currency=currency
    )
    return jsonify(result)

# ----------------- TRANSACTIONS ROUTE ----------------- #
@app.route("/api/transactions", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="transactions_list")
def api_get_transactions():
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit_param = request.args.get("limit") or request.args.get("per_page") or 50
        limit = int(limit_param)
    except (ValueError, TypeError):
        page = 1
        limit = 50

    tx_type = (request.args.get("transaction_type") or "").strip().upper()
    date_from = (request.args.get("date_from") or "").strip()
    date_to = (request.args.get("date_to") or "").strip()
    search = (request.args.get("search") or "").strip().lower()

    query_parts = ["t.user_id = ?"]
    params = [request.user_id]

    if tx_type:
        query_parts.append("UPPER(t.transaction_type) = ?")
        params.append(tx_type)
    if date_from:
        query_parts.append("t.transaction_date >= ?")
        params.append(date_from)
    if date_to:
        query_parts.append("t.transaction_date <= ?")
        params.append(date_to)
    if search:
        query_parts.append("(LOWER(a.asset_name) LIKE ? OR LOWER(t.counterparty) LIKE ? OR LOWER(t.notes) LIKE ?)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern])

    where_clause = " WHERE " + " AND ".join(query_parts)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Count total matching
    cursor.execute(f"""
        SELECT COUNT(*) as cnt
        FROM transactions t
        LEFT JOIN assets a ON t.asset_id = a.id
        {where_clause}
    """, tuple(params))
    total = cursor.fetchone()["cnt"]

    # Order and paginate
    sql = f"""
        SELECT t.*, a.asset_name, a.metal, a.purity, a.photo_url, a.owner_name
        FROM transactions t
        LEFT JOIN assets a ON t.asset_id = a.id
        {where_clause}
        ORDER BY t.transaction_date DESC, t.id DESC
    """
    if limit > 0:
        offset = (page - 1) * limit
        sql += f" LIMIT {limit} OFFSET {offset}"

    cursor.execute(sql, tuple(params))
    txs = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return jsonify({
        "transactions": txs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    })

@app.route("/api/transactions", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="transaction_create")
@validate_input(CREATE_TRANSACTION_SCHEMA)
def api_create_transaction():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    if "encrypted_data" in data and "iv" in data:
        conn = get_db_connection()
        cursor = conn.cursor()
        asset_id = int(data.get("asset_id")) if data.get("asset_id") else None
        cursor.execute("""
            INSERT INTO transactions (user_id, asset_id, encrypted_data, iv, transaction_type, transaction_date, amount, realized_profit)
            VALUES (?, ?, ?, ?, ?, ?, 0.0, 0.0)
        """, (
            request.user_id,
            asset_id,
            data["encrypted_data"],
            data["iv"],
            data.get("transaction_type", "PURCHASE"),
            data.get("transaction_date", datetime.date.today().isoformat())
        ))
        tx_id = cursor.lastrowid
        conn.commit()
        conn.close()
        log_audit("TRANSACTION_CREATED", user_id=request.user_id, details=f"Encrypted transaction #{tx_id} recorded")
        return jsonify({"message": "Encrypted transaction recorded", "transaction_id": tx_id}), 201

    tx_id = record_transaction(
        user_id=request.user_id,
        asset_id=int(data.get("asset_id") or 0),
        transaction_type=data.get("transaction_type", "PURCHASE"),
        amount=float(data.get("amount") or 0.0),
        realized_profit=float(data.get("realized_profit") or 0.0),
        counterparty=data.get("counterparty", ""),
        notes=data.get("notes", ""),
        transaction_date=data.get("transaction_date")
    )
    log_audit("TRANSACTION_CREATED", user_id=request.user_id, details=f"Transaction #{tx_id} recorded")
    return jsonify({"message": "Transaction recorded", "transaction_id": tx_id}), 201

# ----------------- ALERTS ROUTES ----------------- #
@app.route("/api/alerts", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="alerts_list")
def api_get_alerts():
    currency = request.args.get("currency", "INR")
    alert_type = (request.args.get("alert_type") or "").strip()
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = int(request.args.get("limit", 50))
    except (ValueError, TypeError):
        page = 1
        limit = 50

    alerts = get_user_alerts(request.user_id, currency)
    if alert_type:
        alerts = [a for a in alerts if a.get("alert_type", "").upper() == alert_type.upper()]

    total = len(alerts)
    if limit > 0:
        offset = (page - 1) * limit
        paged_alerts = alerts[offset:offset + limit]
    else:
        paged_alerts = alerts

    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return jsonify({
        "alerts": paged_alerts,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    })

@app.route("/api/alerts", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="alert_create")
@validate_input(CREATE_ALERT_SCHEMA)
def api_create_alert():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    if "encrypted_data" in data and "iv" in data:
        cursor.execute("""
            INSERT INTO alerts (user_id, encrypted_data, iv, alert_type, target_metal, target_value, condition, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.user_id,
            data["encrypted_data"],
            data["iv"],
            data.get("alert_type", "PRICE_TARGET"),
            data.get("target_metal", "GOLD"),
            float(data.get("target_value") or 0.0),
            data.get("condition", "GREATER_THAN"),
            data.get("notes", "")
        ))
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        log_audit("ALERT_CREATED", user_id=request.user_id, details=f"Encrypted alert rule #{alert_id} created")
        return jsonify({"message": "Encrypted alert rule created", "alert_id": alert_id}), 201

    alert_type = data.get("alert_type", "PRICE_TARGET")
    target_metal = data.get("target_metal", "GOLD")
    target_value = float(data.get("target_value") or 0.0)
    condition = data.get("condition", "GREATER_THAN")
    notes = data.get("notes", "")

    alert_id = create_alert(request.user_id, alert_type, target_metal, target_value, condition, notes)
    conn.close()
    log_audit("ALERT_CREATED", user_id=request.user_id, details=f"Alert #{alert_id} created for {target_metal}")
    return jsonify({"message": "Alert created successfully", "alert_id": alert_id}), 201

@app.route("/api/alerts/<int:alert_id>", methods=["DELETE"])
@token_required
@rate_limit_authenticated_mutation(scope="alert_delete")
def api_delete_alert(alert_id: int):
    delete_alert(request.user_id, alert_id)
    log_audit("ALERT_DELETED", user_id=request.user_id, details=f"Alert #{alert_id} deleted")
    return jsonify({"message": "Alert deleted successfully"})

@app.route("/api/alerts/<int:alert_id>/toggle", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="alert_toggle")
def api_toggle_alert(alert_id: int):
    new_active, err = toggle_alert(request.user_id, alert_id)
    if err:
        return jsonify({"error": err}), 400
    log_audit("ALERT_TOGGLED", user_id=request.user_id, details=f"Alert #{alert_id} toggled to active={new_active}")
    return jsonify({"message": "Alert status updated", "is_active": new_active})

# ----------------- DOCUMENTS ROUTES (CLIENT-SIDE ENCRYPTED) ----------------- #
@app.route("/api/documents", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="documents_list")
def api_get_documents():
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = int(request.args.get("limit", 50))
    except (ValueError, TypeError):
        page = 1
        limit = 50

    doc_type = (request.args.get("document_type") or "").strip()
    asset_id = request.args.get("asset_id")
    search = (request.args.get("search") or "").strip().lower()

    query_parts = ["d.user_id = ?"]
    params = [request.user_id]

    if doc_type:
        query_parts.append("UPPER(d.document_type) = ?")
        params.append(doc_type.upper())
    if asset_id:
        try:
            query_parts.append("d.asset_id = ?")
            params.append(int(asset_id))
        except (ValueError, TypeError):
            pass
    if search:
        query_parts.append("(LOWER(d.file_name) LIKE ? OR LOWER(a.asset_name) LIKE ? OR LOWER(d.document_type) LIKE ? OR LOWER(a.metal) LIKE ?)")
        sp = f"%{search}%"
        params.extend([sp, sp, sp, sp])

    where_clause = " WHERE " + " AND ".join(query_parts)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT COUNT(*) as cnt
        FROM documents d
        LEFT JOIN assets a ON d.asset_id = a.id
        {where_clause}
    """, tuple(params))
    total = cursor.fetchone()["cnt"]

    sql = f"""
        SELECT d.*, a.asset_name, a.metal, a.purity, a.owner_name
        FROM documents d
        LEFT JOIN assets a ON d.asset_id = a.id
        {where_clause}
        ORDER BY d.uploaded_at DESC
    """
    if limit > 0:
        offset = (page - 1) * limit
        sql += f" LIMIT {limit} OFFSET {offset}"

    cursor.execute(sql, tuple(params))
    docs = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return jsonify({
        "documents": docs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    })

@app.route("/api/documents/upload", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="document_upload")
def api_upload_document():
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    asset_id = request.form.get("asset_id")
    document_type = request.form.get("document_type", "Certificate")
    if not asset_id:
        return jsonify({"error": "Asset ID is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM assets WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Asset not found or unauthorized access"}), 404

    is_encrypted = request.form.get("is_encrypted") in ["true", "True", "1"] or bool(request.form.get("iv"))
    iv = request.form.get("iv", "")
    encryption_metadata = request.form.get("encryption_metadata", '{"alg":"AES-GCM","key_bits":256,"tag_bits":128}')
    
    raw_filename = request.form.get("file_name") or file.filename or ""
    if "\x00" in raw_filename:
        conn.close()
        return jsonify({"error": "Null byte detected in filename."}), 400
    orig_filename = secure_filename(raw_filename) or "document"

    ext = orig_filename.rsplit(".", 1)[-1].lower() if "." in orig_filename else ""
    if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        conn.close()
        return jsonify({"error": f"Invalid file type '.{ext}'. Allowed formats: PDF, PNG, JPG, JPEG, WEBP"}), 400

    file_bytes = file.read()
    if not file_bytes or len(file_bytes) < 4:
        conn.close()
        return jsonify({"error": "File is empty or corrupted (below minimum size threshold)."}), 400

    if len(file_bytes) > MAX_CONTENT_LENGTH:
        conn.close()
        return jsonify({"error": f"File size ({len(file_bytes)} bytes) exceeds the maximum allowed limit of {MAX_CONTENT_LENGTH // (1024*1024)} MB."}), 400

    if is_encrypted:
        if not iv or not isinstance(iv, str) or len(iv.strip()) < 12 or len(iv.strip()) > 128:
            conn.close()
            return jsonify({"error": "Encryption IV is required and must be a valid 12-to-128 character hex/base64 string for encrypted document upload"}), 400
        
        # Verify encrypted payload does not disguise raw unencrypted executable binaries
        for sig, desc in DISALLOWED_EXECUTABLE_SIGNATURES:
            if file_bytes.startswith(sig):
                conn.close()
                return jsonify({"error": f"Executable or script file detected ({desc}). Upload rejected for security."}), 400

        unique_storage_name = f"{uuid.uuid4().hex}.enc"
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_storage_name)
        try:
            with open(save_path, "wb") as f:
                f.write(file_bytes)
            try:
                os.chmod(save_path, 0o644)
            except Exception:
                pass
            file_size = len(file_bytes)

            cursor.execute("""
                INSERT INTO documents (
                    asset_id, user_id, document_type, file_name, file_path, file_size,
                    iv, encryption_meta, is_encrypted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (asset_id, request.user_id, document_type, orig_filename, unique_storage_name, file_size, iv, encryption_metadata))
            doc_id = cursor.lastrowid
            conn.commit()
        except Exception as e:
            conn.rollback()
            if os.path.exists(save_path):
                try:
                    os.remove(save_path)
                except Exception:
                    pass
            logger.exception("Failed to store encrypted document for user %s: %s", request.user_id, e)
            return jsonify({"error": "Failed to upload document due to an internal server error."}), 500
        finally:
            conn.close()

        log_audit("DOCUMENT_UPLOADED_ENCRYPTED", user_id=request.user_id, details=f"Client-side encrypted document #{doc_id} ('{orig_filename}') stored for Asset #{asset_id}")
        return jsonify({
            "message": "Document encrypted client-side and saved securely to vault",
            "document_id": doc_id,
            "file_name": orig_filename,
            "is_encrypted": True
        }), 201

    # Unencrypted upload flow: full pre-encryption content, magic bytes, dimensions, and executable validation
    try:
        validate_file_pre_encryption(orig_filename, file_bytes, file.mimetype)
    except ValueError as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    unique_storage_name = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_storage_name)
    try:
        with open(save_path, "wb") as f:
            f.write(file_bytes)
        try:
            os.chmod(save_path, 0o644)
        except Exception:
            pass
        file_size = len(file_bytes)

        cursor.execute("""
            INSERT INTO documents (asset_id, user_id, document_type, file_name, file_path, file_size, is_encrypted)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (asset_id, request.user_id, document_type, orig_filename, unique_storage_name, file_size))
        doc_id = cursor.lastrowid
        conn.commit()
    except Exception as e:
        conn.rollback()
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except Exception:
                pass
        logger.exception("Failed to store unencrypted document for user %s: %s", request.user_id, e)
        return jsonify({"error": "Failed to upload document due to an internal server error."}), 500
    finally:
        conn.close()

    log_audit("DOCUMENT_UPLOADED", user_id=request.user_id, details=f"Document #{doc_id} ('{orig_filename}') stored for Asset #{asset_id}")
    return jsonify({
        "message": "Document uploaded and verified successfully",
        "document_id": doc_id,
        "file_name": orig_filename,
        "is_encrypted": False
    }), 201

@app.route("/api/documents/<int:doc_id>/view", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="document_view")
def api_view_document(doc_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, request.user_id))
    doc = cursor.fetchone()
    conn.close()
    if not doc:
        return jsonify({"error": "Document not found or unauthorized access"}), 404
    
    doc_dict = dict(doc)
    storage_name = os.path.basename(doc_dict["file_path"])
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], storage_name)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on server"}), 404

    safe_download_name = secure_filename(doc_dict.get("file_name") or "document") or "document"
    is_encrypted = bool(doc_dict.get("is_encrypted"))
    if is_encrypted:
        response = send_file(file_path, mimetype="application/octet-stream", as_attachment=False, download_name=safe_download_name)
        response.headers["X-Is-Encrypted"] = "true"
        response.headers["X-IV"] = doc_dict.get("iv") or ""
        response.headers["X-File-Name"] = safe_download_name
        response.headers["X-Encryption-Metadata"] = doc_dict.get("encryption_meta") or doc_dict.get("encryption_metadata") or ""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response

    ext = safe_download_name.rsplit(".", 1)[-1].lower() if "." in safe_download_name else ""
    mime_map = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp"
    }
    mimetype = mime_map.get(ext, "application/octet-stream")
    response = send_file(file_path, mimetype=mimetype, as_attachment=False, download_name=safe_download_name)
    response.headers["X-Is-Encrypted"] = "false"
    response.headers["X-File-Name"] = safe_download_name
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response

@app.route("/api/documents/<int:doc_id>/download", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="document_download")
def api_download_document(doc_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, request.user_id))
    doc = cursor.fetchone()
    conn.close()
    if not doc:
        return jsonify({"error": "Document not found or unauthorized access"}), 404
    
    doc_dict = dict(doc)
    storage_name = os.path.basename(doc_dict["file_path"])
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], storage_name)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on server"}), 404

    safe_download_name = secure_filename(doc_dict.get("file_name") or "document") or "document"
    is_encrypted = bool(doc_dict.get("is_encrypted"))
    if is_encrypted:
        response = send_file(file_path, mimetype="application/octet-stream", as_attachment=True, download_name=safe_download_name)
        response.headers["X-Is-Encrypted"] = "true"
        response.headers["X-IV"] = doc_dict.get("iv") or ""
        response.headers["X-File-Name"] = safe_download_name
        response.headers["X-Encryption-Metadata"] = doc_dict.get("encryption_meta") or doc_dict.get("encryption_metadata") or ""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response

    ext = safe_download_name.rsplit(".", 1)[-1].lower() if "." in safe_download_name else ""
    mime_map = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp"
    }
    mimetype = mime_map.get(ext, "application/octet-stream")
    response = send_file(
        file_path,
        mimetype=mimetype,
        as_attachment=True,
        download_name=safe_download_name
    )
    response.headers["X-Is-Encrypted"] = "false"
    response.headers["X-File-Name"] = safe_download_name
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response

@app.route("/api/documents/<int:doc_id>/payload", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="document_payload")
def api_get_document_payload(doc_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, request.user_id))
    doc = cursor.fetchone()
    conn.close()
    if not doc:
        return jsonify({"error": "Document not found or unauthorized access"}), 404

    doc_dict = dict(doc)
    storage_name = os.path.basename(doc_dict["file_path"])
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], storage_name)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on server"}), 404

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    return jsonify({
        "id": doc_dict["id"],
        "asset_id": doc_dict.get("asset_id"),
        "document_type": doc_dict.get("document_type"),
        "file_name": doc_dict.get("file_name"),
        "file_size": doc_dict.get("file_size"),
        "is_encrypted": bool(doc_dict.get("is_encrypted")),
        "iv": doc_dict.get("iv") or "",
        "encryption_metadata": doc_dict.get("encryption_meta") or doc_dict.get("encryption_metadata") or "",
        "ciphertext_base64": base64.b64encode(file_bytes).decode("utf-8")
    })

@app.route("/api/documents/<int:doc_id>", methods=["DELETE"])
@token_required
@rate_limit_authenticated_mutation(scope="document_delete")
def api_delete_document(doc_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, request.user_id))
    doc = cursor.fetchone()
    if not doc:
        conn.close()
        return jsonify({"error": "Document not found or unauthorized access"}), 404
    
    cursor.execute("DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, request.user_id))
    conn.commit()
    conn.close()

    try:
        storage_name = os.path.basename(doc["file_path"])
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], storage_name)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

    log_audit("DOCUMENT_DELETED", user_id=request.user_id, details=f"Document #{doc_id} ('{doc['file_name']}') deleted")
    return jsonify({"message": "Document deleted successfully"})

# ----------------- REPORTS & EXPORTS ----------------- #
# ----------------- REPORTS & EXPORTS (TRANSIENT IN-MEMORY REPORTING) ----------------- #
@app.route("/api/reports/pdf", methods=["GET", "POST"])
@app.route("/api/reports/generate-pdf", methods=["POST"])
@token_required
def api_download_pdf():
    payload = request.get_json(silent=True) or {}
    currency = payload.get("currency") or request.args.get("currency", "INR")
    user = get_user_profile(request.user_id) or {"name": "Investor"}
    portfolio_data = payload.get("portfolio")
    if portfolio_data is None and ("assets" in payload or "summary" in payload):
        portfolio_data = payload
    try:
        pdf_bytes = generate_pdf_report(user_id=request.user_id, user_info=user, target_currency=currency, portfolio_data=portfolio_data)
    except PermissionError as e:
        logger.warning("Permission error generating PDF for user %s: %s", request.user_id, e)
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        logger.warning("Validation error generating PDF for user %s: %s", request.user_id, e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception("Failed to generate PDF report for user %s: %s", request.user_id, e)
        return jsonify({"error": "Failed to generate PDF report due to an internal server error.", "status": 500}), 500
    
    resp = send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"AssetVault_Portfolio_{datetime.date.today().isoformat()}.pdf"
    )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

@app.route("/api/reports/excel", methods=["GET", "POST"])
@app.route("/api/reports/generate-excel", methods=["POST"])
@token_required
def api_download_excel():
    payload = request.get_json(silent=True) or {}
    currency = payload.get("currency") or request.args.get("currency", "INR")
    user = get_user_profile(request.user_id) or {"name": "Investor"}
    portfolio_data = payload.get("portfolio")
    if portfolio_data is None and ("assets" in payload or "summary" in payload):
        portfolio_data = payload
    transactions_data = payload.get("transactions")
    try:
        xlsx_bytes = generate_excel_report(user_id=request.user_id, user_info=user, target_currency=currency, portfolio_data=portfolio_data, transactions_data=transactions_data)
    except PermissionError as e:
        logger.warning("Permission error generating Excel for user %s: %s", request.user_id, e)
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        logger.warning("Validation error generating Excel for user %s: %s", request.user_id, e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception("Failed to generate Excel report for user %s: %s", request.user_id, e)
        return jsonify({"error": "Failed to generate Excel report due to an internal server error.", "status": 500}), 500
    
    resp = send_file(
        io.BytesIO(xlsx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"AssetVault_Portfolio_{datetime.date.today().isoformat()}.xlsx"
    )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

@app.route("/api/reports/csv", methods=["GET", "POST"])
@app.route("/api/reports/generate-csv", methods=["POST"])
@token_required
def api_download_csv():
    payload = request.get_json(silent=True) or {}
    currency = payload.get("currency") or request.args.get("currency", "INR")
    portfolio_data = payload.get("portfolio")
    if portfolio_data is None and ("assets" in payload or "summary" in payload):
        portfolio_data = payload
    try:
        csv_str = generate_csv_export(user_id=request.user_id, target_currency=currency, portfolio_data=portfolio_data)
    except PermissionError as e:
        logger.warning("Permission error generating CSV for user %s: %s", request.user_id, e)
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        logger.warning("Validation error generating CSV for user %s: %s", request.user_id, e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception("Failed to generate CSV export for user %s: %s", request.user_id, e)
        return jsonify({"error": "Failed to generate CSV export due to an internal server error.", "status": 500}), 500
    
    resp = send_file(
        io.BytesIO(csv_str.encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"AssetVault_Assets_{datetime.date.today().isoformat()}.csv"
    )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

# ----------------- SYSTEM HEALTH & DIAGNOSTICS ----------------- #
@app.route("/api/health", methods=["GET"])
@rate_limit_public(scope="health")
def api_health():
    db_ok = False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        db_ok = True
        conn.close()
    except Exception:
        db_ok = False

    status_code = 200 if db_ok else 503
    return jsonify({
        "status": "healthy" if db_ok else "unhealthy",
        "app_version": APP_VERSION,
        "environment": ENVIRONMENT,
        "database": "connected" if db_ok else "disconnected",
        "timestamp": datetime.datetime.now().isoformat()
    }), status_code

# ----------------- PORTFOLIO GOALS ROUTES ----------------- #
@app.route("/api/goals", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="goals_list")
def api_get_goals():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM portfolio_goals WHERE user_id = ? ORDER BY target_date ASC, id ASC", (request.user_id,))
    goals = []
    for r in cursor.fetchall():
        d = dict(r)
        d["goal_name"] = d.get("title")
        d["target_weight"] = d.get("target_amount")
        goals.append(d)
    conn.close()
    return jsonify({"goals": goals})

@app.route("/api/goals", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="goals_create")
@validate_input(GOAL_SCHEMA)
def api_create_goal():
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    title = (data.get("title") or data.get("goal_name") or "").strip()
    if not title:
        return jsonify({"error": "Goal title is required"}), 400
    try:
        raw_amt = data.get("target_amount") if data.get("target_amount") is not None else data.get("target_weight")
        target_amount = float(raw_amt or 0.0)
        current_amount = float(data.get("current_amount") or 0.0)
        if target_amount <= 0:
            return jsonify({"error": "Target amount must be greater than zero"}), 400
        if current_amount < 0:
            return jsonify({"error": "Current amount cannot be negative"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid numeric values for goal target or current amount"}), 400
    
    target_date = data.get("target_date") or ""
    notes = data.get("notes", "")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO portfolio_goals (user_id, title, target_amount, current_amount, target_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (request.user_id, title, target_amount, current_amount, target_date, notes))
    goal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"message": "Goal created successfully", "goal_id": goal_id}), 201

@app.route("/api/goals/<int:goal_id>", methods=["PUT"])
@token_required
@rate_limit_authenticated_mutation(scope="goals_update")
@validate_input(GOAL_SCHEMA)
def api_update_goal(goal_id: int):
    data = getattr(request, "validated_data", None) or request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM portfolio_goals WHERE id = ? AND user_id = ?", (goal_id, request.user_id))
    goal = cursor.fetchone()
    if not goal:
        conn.close()
        return jsonify({"error": "Goal not found or unauthorized access"}), 404
    
    title = (data.get("title") or data.get("goal_name") or goal["title"] or "").strip()
    if not title:
        conn.close()
        return jsonify({"error": "Goal title cannot be empty"}), 400
    
    try:
        raw_target = data.get("target_amount") if data.get("target_amount") is not None else data.get("target_weight")
        target_amount = float(raw_target if raw_target is not None else goal["target_amount"])
        current_amount = float(data.get("current_amount") if data.get("current_amount") is not None else goal["current_amount"])
        if target_amount <= 0:
            conn.close()
            return jsonify({"error": "Target amount must be greater than zero"}), 400
        if current_amount < 0:
            conn.close()
            return jsonify({"error": "Current amount cannot be negative"}), 400
    except (ValueError, TypeError):
        conn.close()
        return jsonify({"error": "Invalid numeric values for goal target or current amount"}), 400
        
    target_date = data.get("target_date") if data.get("target_date") is not None else goal["target_date"]
    notes = data.get("notes") if data.get("notes") is not None else goal["notes"]
    
    cursor.execute("""
        UPDATE portfolio_goals
        SET title = ?, target_amount = ?, current_amount = ?, target_date = ?, notes = ?
        WHERE id = ? AND user_id = ?
    """, (title, target_amount, current_amount, target_date, notes, goal_id, request.user_id))
    conn.commit()
    conn.close()
    log_audit("GOAL_UPDATED", user_id=request.user_id, details=f"Goal #{goal_id} '{title}' updated")
    return jsonify({"message": "Goal updated successfully"})

@app.route("/api/goals/<int:goal_id>", methods=["DELETE"])
@token_required
@rate_limit_authenticated_mutation(scope="goals_delete")
def api_delete_goal(goal_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM portfolio_goals WHERE id = ? AND user_id = ?", (goal_id, request.user_id))
    conn.commit()
    conn.close()
    log_audit("GOAL_DELETED", user_id=request.user_id, details=f"Goal #{goal_id} deleted")
    return jsonify({"message": "Goal deleted successfully"})

# ----------------- VAULT BACKUP & RESTORE ROUTES (WITH ENCRYPTED DOCUMENTS) ----------------- #
@app.route("/api/backup/vault-data", methods=["GET"])
@app.route("/api/backup/export-vault-data", methods=["GET"])
@token_required
@rate_limit_authenticated_read(scope="vault_backup")
def api_export_vault_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM assets WHERE user_id = ?", (request.user_id,))
    assets = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM transactions WHERE user_id = ?", (request.user_id,))
    transactions = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM alerts WHERE user_id = ?", (request.user_id,))
    alerts = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM portfolio_goals WHERE user_id = ?", (request.user_id,))
    goals = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM documents WHERE user_id = ?", (request.user_id,))
    doc_rows = cursor.fetchall()
    
    documents = []
    for r in doc_rows:
        doc_dict = dict(r)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], doc_dict["file_path"])
        payload_b64 = ""
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                payload_b64 = base64.b64encode(f.read()).decode("utf-8")
        doc_dict["file_data_b64"] = payload_b64
        doc_dict["file_payload"] = payload_b64
        documents.append(doc_dict)
        
    cursor.execute("SELECT name, email, currency, target_portfolio_value, public_certificate_verification, public_owner_name FROM users WHERE id = ?", (request.user_id,))
    user_row = cursor.fetchone()
    user_prefs = dict(user_row) if user_row else {}
    if "currency" in user_prefs:
        user_prefs["base_currency"] = user_prefs["currency"]
    conn.close()
    
    log_audit("VAULT_BACKUP_EXPORTED", user_id=request.user_id, details=f"Exported {len(assets)} assets, {len(documents)} documents, {len(transactions)} transactions")
    
    # Requirement 6: Versioned backup metadata
    return jsonify({
        "backup_version": 1,
        "schema_version": 6,
        "app_version": "2.0.0",
        "created_at": datetime.datetime.now().isoformat(),
        "exported_at": datetime.datetime.now().isoformat(),
        "currency": user_prefs.get("currency") or "INR",
        "encryption_format": "AES-256-GCM",
        "version": "2.0",
        "vault_version": "v6",
        "profile": user_prefs,
        "assets": assets,
        "transactions": transactions,
        "alerts": alerts,
        "goals": goals,
        "documents": documents
    })

@app.route("/api/backup/restore-vault-data", methods=["POST"])
@token_required
@rate_limit_authenticated_mutation(scope="vault_restore")
def api_restore_vault_data():
    data = request.get_json() or {}
    if "vault_data" in data and isinstance(data["vault_data"], dict):
        data = data["vault_data"]

    # Requirement 6: Validate backup version, schema compatibility, and encryption format
    backup_ver = data.get("backup_version")
    if backup_ver is not None:
        try:
            bv = int(backup_ver)
            if bv > 1:
                return jsonify({"error": f"Unsupported future backup version (v{bv}). Please upgrade AssetVault."}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid backup_version format in backup file."}), 400

    schema_ver = data.get("schema_version")
    if schema_ver is not None:
        try:
            sv = int(schema_ver)
            if sv > 6:
                return jsonify({"error": f"Unsupported future schema version ({sv}). Please upgrade AssetVault."}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid schema_version format in backup file."}), 400

    enc_format = data.get("encryption_format")
    if enc_format is not None and enc_format not in ["AES-256-GCM", "AES-GCM"]:
        return jsonify({"error": f"Unsupported encryption format '{enc_format}'. Expected AES-256-GCM."}), 400

    assets = data.get("assets", [])
    transactions = data.get("transactions", [])
    alerts = data.get("alerts", [])
    goals = data.get("goals", [])
    documents = data.get("documents", [])

    if not isinstance(assets, list) or not isinstance(transactions, list) or not isinstance(documents, list):
        return jsonify({"error": "Corrupted backup structure: assets, transactions, and documents must be arrays."}), 400

    # Verify document ciphertext and content integrity before touching database
    for d in documents:
        if not isinstance(d, dict):
            return jsonify({"error": "Corrupted backup structure: document entry is not a valid object."}), 400
        raw_name = d.get("file_name") or "document.pdf"
        if "\x00" in raw_name:
            return jsonify({"error": "Null byte detected in document filename."}), 400
        orig_filename = secure_filename(raw_name) or "document.pdf"
        ext = orig_filename.rsplit(".", 1)[-1].lower() if "." in orig_filename else ""
        if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            return jsonify({"error": f"Corrupted backup: Unsupported document extension '.{ext}' in document '{raw_name}'."}), 400

        b64_payload = d.get("file_data_b64") or d.get("file_payload")
        if not b64_payload or not isinstance(b64_payload, str) or len(b64_payload.strip()) == 0:
            return jsonify({"error": f"Corrupted backup: Missing document payload for '{orig_filename}'."}), 400
        try:
            raw_bytes = base64.b64decode(b64_payload)
        except Exception:
            return jsonify({"error": f"Corrupted backup: Invalid base64 payload in document '{orig_filename}'."}), 400

        if len(raw_bytes) < 4 or len(raw_bytes) > MAX_CONTENT_LENGTH:
            return jsonify({"error": f"Corrupted backup: Document size ({len(raw_bytes)} bytes) is out of bounds for '{orig_filename}'."}), 400

        is_enc = 1 if d.get("is_encrypted") in [1, True, "1", "true"] else 0
        if is_enc:
            if not d.get("iv"):
                return jsonify({"error": f"Corrupted backup: Missing cryptographic IV for document '{orig_filename}'."}), 400
            for sig, desc in DISALLOWED_EXECUTABLE_SIGNATURES:
                if raw_bytes.startswith(sig):
                    return jsonify({"error": f"Corrupted backup: Executable or script payload detected ({desc}) in '{orig_filename}'."}), 400
        else:
            try:
                validate_file_pre_encryption(orig_filename, raw_bytes)
            except ValueError as e:
                return jsonify({"error": f"Corrupted backup: Invalid document content in '{orig_filename}': {str(e)}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    created_file_paths = []
    
    try:
        # Atomic transaction-style restore
        cursor.execute("BEGIN TRANSACTION;")
        
        # Restore user preferences if provided
        profile = data.get("profile") or {}
        pref_curr = data.get("currency") or profile.get("currency")
        if pref_curr:
            cursor.execute("UPDATE users SET currency = ? WHERE id = ?", (pref_curr, request.user_id))
        if "target_portfolio_value" in profile:
            cursor.execute("UPDATE users SET target_portfolio_value = ? WHERE id = ?", (profile["target_portfolio_value"], request.user_id))
        if "public_certificate_verification" in profile:
            cursor.execute("UPDATE users SET public_certificate_verification = ? WHERE id = ?", (profile["public_certificate_verification"], request.user_id))
        if "public_owner_name" in profile:
            cursor.execute("UPDATE users SET public_owner_name = ? WHERE id = ?", (profile["public_owner_name"], request.user_id))

        old_to_new_asset_id = {}

        for a in assets:
            cert_token = a.get("certificate_token")
            if cert_token:
                cursor.execute("SELECT id FROM assets WHERE certificate_token = ?", (cert_token,))
                if cursor.fetchone():
                    cert_token = secrets.token_urlsafe(24)
            if not cert_token:
                cert_token = secrets.token_urlsafe(24)
            cursor.execute("""
                INSERT INTO assets (
                    user_id, asset_name, category_id, asset_type, metal, purity, purity_factor,
                    quantity, gross_weight, net_weight, stone_weight, purchase_date, purchase_price,
                    making_charges, wastage, taxes, total_acquisition_cost, description, status,
                    hallmark_huid, jeweller_name, invoice_number, diamond_carat, diamond_cut,
                    diamond_color, diamond_clarity, diamond_shape, diamond_cert_lab, diamond_cert_number,
                    photo_url, owner_name, certificate_token, encrypted_data, iv
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?
                )
            """, (
                request.user_id, a.get("asset_name", "Restored Asset"), a.get("category_id", 1),
                a.get("asset_type", "Jewellery"), a.get("metal", "Gold"), a.get("purity", "22K"),
                a.get("purity_factor", 1.0), a.get("quantity", 1), a.get("gross_weight", 0.0),
                a.get("net_weight", 0.0), a.get("stone_weight", 0.0),
                a.get("purchase_date") or datetime.date.today().isoformat(),
                a.get("purchase_price", 0.0), a.get("making_charges", 0.0),
                a.get("wastage", 0.0), a.get("taxes", 0.0), a.get("total_acquisition_cost", 0.0),
                a.get("description", ""), a.get("status", "Active"), a.get("hallmark_huid"),
                a.get("jeweller_name"), a.get("invoice_number"), a.get("diamond_carat", 0.0),
                a.get("diamond_cut"), a.get("diamond_color"), a.get("diamond_clarity"),
                a.get("diamond_shape"), a.get("diamond_cert_lab"), a.get("diamond_cert_number"),
                a.get("photo_url"), a.get("owner_name", "Self"), cert_token,
                a.get("encrypted_data"), a.get("iv")
            ))
            new_id = cursor.lastrowid
            old_id = a.get("id")
            if old_id:
                old_to_new_asset_id[old_id] = new_id
                
        for t in transactions:
            old_aid = t.get("asset_id")
            new_aid = old_to_new_asset_id.get(old_aid) if old_aid else None
            cursor.execute("""
                INSERT INTO transactions (
                    asset_id, user_id, transaction_type, transaction_date, amount,
                    realized_profit, counterparty, notes, encrypted_data, iv
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_aid, request.user_id, t.get("transaction_type", "PURCHASE"),
                t.get("transaction_date") or datetime.date.today().isoformat(),
                t.get("amount", 0.0), t.get("realized_profit", 0.0),
                t.get("counterparty"), t.get("notes"), t.get("encrypted_data"), t.get("iv")
            ))
            
        for g in goals:
            cursor.execute("""
                INSERT INTO portfolio_goals (user_id, title, target_amount, current_amount, target_date, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                request.user_id, g.get("title", "Restored Goal"), g.get("target_amount", 100000.0),
                g.get("current_amount", 0.0), g.get("target_date", ""), g.get("notes", "")
            ))
            
        for al in alerts:
            cursor.execute("""
                INSERT INTO alerts (
                    user_id, alert_type, target_metal, target_value, condition, is_enabled, notes, encrypted_data, iv
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                request.user_id, al.get("alert_type", "PRICE_TARGET"), al.get("target_metal", "GOLD"),
                al.get("target_value", 0.0), al.get("condition", "GREATER_THAN"),
                al.get("is_enabled", 1), al.get("notes", ""), al.get("encrypted_data"), al.get("iv")
            ))
            
        docs_restored = 0
        for d in documents:
            file_data_b64 = d.get("file_data_b64") or d.get("file_payload")
            if not file_data_b64:
                continue
            raw_bytes = base64.b64decode(file_data_b64)
                
            is_enc = 1 if d.get("is_encrypted") in [1, True, "1", "true"] else 0
            raw_name = d.get("file_name") or "document.pdf"
            orig_filename = secure_filename(raw_name) or "document.pdf"
            ext = orig_filename.rsplit(".", 1)[-1].lower() if "." in orig_filename else "pdf"
            storage_ext = "enc" if is_enc else ext
            unique_name = f"{uuid.uuid4().hex}.{storage_ext}"
            save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
            with open(save_path, "wb") as f:
                f.write(raw_bytes)
            try:
                os.chmod(save_path, 0o644)
            except Exception:
                pass
            created_file_paths.append(save_path)
                
            old_aid = d.get("asset_id")
            new_aid = old_to_new_asset_id.get(old_aid) if old_aid else None
            cursor.execute("""
                INSERT INTO documents (
                    asset_id, user_id, document_type, file_name, file_path, file_size, iv, encryption_meta, is_encrypted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_aid, request.user_id, d.get("document_type", "Certificate"),
                orig_filename, unique_name, len(raw_bytes),
                d.get("iv"), d.get("encryption_metadata") or d.get("encryption_meta"), is_enc
            ))
            docs_restored += 1
            
        conn.commit()
        conn.close()
        
        log_audit("VAULT_RESTORED", user_id=request.user_id, details=f"Restored {len(assets)} assets, {docs_restored} documents, {len(transactions)} transactions")
        return jsonify({
            "message": "Vault successfully restored",
            "counts": {
                "assets": len(assets),
                "transactions": len(transactions),
                "goals": len(goals),
                "alerts": len(alerts),
                "documents": docs_restored
            }
        })
    except Exception as e:
        conn.rollback()
        conn.close()
        # Clean up any physically written files so filesystem is never left in partial state
        for fp in created_file_paths:
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass
        logger.exception("Failed to restore vault backup for user %s: %s", request.user_id, e)
        return jsonify({"error": "Failed to restore vault backup due to an internal processing error or invalid backup data."}), 400

# ----------------- CATEGORIES ROUTE ----------------- #
@app.route("/api/categories", methods=["GET"])
@rate_limit_public(scope="categories")
def api_get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories ORDER BY id ASC")
    cats = [dict(c) for c in cursor.fetchall()]
    conn.close()
    return jsonify({"categories": cats})

# ----------------- STATIC ASSETS, 404 & SPA ROUTE ----------------- #
@app.route("/")
def serve_index():
    return send_from_directory(STATIC_FOLDER, "index.html")

@app.route("/404")
@app.route("/404.html")
@app.route("/offline")
@app.route("/offline.html")
def serve_404_page():
    return send_from_directory(STATIC_FOLDER, "404.html")

@app.route("/<path:path>")
def serve_static(path):
    target = os.path.join(STATIC_FOLDER, path)
    if os.path.exists(target) and not os.path.isdir(target):
        return send_from_directory(STATIC_FOLDER, path)
    if path.startswith("api/"):
        return jsonify({"error": "API route not found", "status": 404, "path": f"/{path}"}), 404
    # Check if requesting a missing asset with an extension (e.g. image, script)
    ext = os.path.splitext(path)[1].lower()
    if ext and ext not in [".html"]:
        return jsonify({"error": "Resource not found", "status": 404, "file": path}), 404
    return send_from_directory(STATIC_FOLDER, "index.html")

@app.errorhandler(400)
def handle_400(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": getattr(e, "description", "Bad Request"), "status": 400}), 400
    return send_from_directory(STATIC_FOLDER, "404.html"), 400

@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Endpoint not found", "status": 404, "path": request.path}), 404
    return send_from_directory(STATIC_FOLDER, "404.html"), 404

@app.errorhandler(405)
def handle_405(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Method not allowed", "status": 405}), 405
    return send_from_directory(STATIC_FOLDER, "404.html"), 405

@app.errorhandler(413)
def handle_413(e):
    logger.warning("Upload payload exceeded maximum size limit during %s %s", request.method, request.path)
    if request.path.startswith("/api/"):
        return jsonify({"error": "Uploaded file exceeds maximum allowed size (10 MB).", "status": 413}), 413
    return send_from_directory(STATIC_FOLDER, "404.html"), 413

@app.errorhandler(500)
def handle_500(e):
    logger.exception("Internal server error (500) processing %s %s", request.method, request.path)
    if request.path.startswith("/api/"):
        return jsonify({
            "error": "An internal server error occurred. Please try again later.",
            "status": 500
        }), 500
    return send_from_directory(STATIC_FOLDER, "404.html"), 500

@app.errorhandler(Exception)
def handle_unhandled_exception(e):
    if isinstance(e, HTTPException):
        if request.path.startswith("/api/"):
            return jsonify({
                "error": getattr(e, "description", "Request failed"),
                "status": e.code
            }), e.code
        return e

    logger.exception("Unhandled runtime exception processing %s %s: %s", request.method, request.path, e)
    if request.path.startswith("/api/"):
        return jsonify({
            "error": "An internal server error occurred. Please try again later.",
            "status": 500
        }), 500
    return send_from_directory(STATIC_FOLDER, "404.html"), 500

# ----------------- SECURITY HEADERS & DEFENSE-IN-DEPTH MIDDLEWARE ----------------- #
@app.before_request
def check_csrf_and_origins():
    # Enforce Origin/Referer match for state-changing requests when Origin header is sent
    if request.method in ["POST", "PUT", "DELETE"] and request.path.startswith("/api/"):
        origin = request.headers.get("Origin")
        host = request.host
        if origin:
            # Strip protocol
            origin_host = origin.split("://")[-1]
            if origin_host != host and not origin_host.startswith("localhost") and not origin_host.startswith("127.0.0.1"):
                log_audit("CSRF_BLOCKED", details=f"Blocked cross-origin request from {origin}")
                return jsonify({"error": "Cross-origin state modification blocked."}), 403

@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    if not request.path.startswith("/api/documents/"):
        response.headers["X-Frame-Options"] = "DENY"
    else:
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"
    response.headers["Access-Control-Expose-Headers"] = "X-Is-Encrypted, X-IV, X-File-Name, X-Encryption-Metadata, Retry-After"
    if "Content-Security-Policy" not in response.headers:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self'; "
            "frame-src 'self' blob: data:; "
            "child-src 'self' blob: data:; "
            "object-src 'self' blob: data:; "
            "frame-ancestors 'self';"
        )
    if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

if __name__ == "__main__":
    init_db()
    seed_database()
    print("AssetVault Server running on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
