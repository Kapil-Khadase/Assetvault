import os
import io
import datetime
from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename
from functools import wraps

from config import STATIC_FOLDER, UPLOAD_FOLDER, DB_PATH
from database import get_db_connection, init_db
from seed_data import seed_database
from services.auth_service import register_user, authenticate_user, decode_token, get_user_profile, update_user_profile
from services.market_data_service import get_latest_market_rates, sync_live_market_rates, get_historical_market_trends
from services.valuation_engine import get_portfolio_summary, calculate_asset_valuation, get_metal_purity_factor
from services.transaction_service import sell_asset, update_asset_lifecycle_status, get_user_transactions, record_transaction
from services.simulator_service import run_portfolio_simulation
from services.alert_service import create_alert, get_user_alerts, delete_alert
from services.report_service import generate_pdf_report, generate_excel_report, generate_csv_export
from services.rate_limiter import rate_limit, limiter

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path="")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit

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
            return jsonify({"error": "Authentication required. Please sign in to access your portfolio."}), 401

        payload = decode_token(token)
        if not payload or "user_id" not in payload:
            return jsonify({"error": "Invalid or expired session. Please sign in again."}), 401

        request.user_id = payload["user_id"]
        request.user_email = payload.get("email", "")
        return f(*args, **kwargs)
    return decorated

# ----------------- AUTH ROUTES ----------------- #
@app.route("/api/auth/register", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=60, scope="auth_register")
def api_register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    currency = data.get("currency", "INR")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    user, err = register_user(name, email, password, currency)
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": "Registration successful", "user": user}), 201

@app.route("/api/auth/login", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=60, scope="auth_login")
def api_login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user, err = authenticate_user(email, password)
    if err:
        return jsonify({"error": err}), 401
    return jsonify({"message": "Login successful", "user": user})

@app.route("/api/auth/me", methods=["GET"])
@token_required
def api_get_me():
    user = get_user_profile(request.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user})

@app.route("/api/auth/profile", methods=["PUT"])
@token_required
def api_update_profile():
    data = request.get_json() or {}
    user = update_user_profile(
        request.user_id,
        name=data.get("name"),
        currency=data.get("currency"),
        target_portfolio_value=data.get("target_portfolio_value")
    )
    return jsonify({"message": "Profile updated", "user": user})

# ----------------- MARKET RATES ROUTES ----------------- #
@app.route("/api/market-rates", methods=["GET"])
@token_required
def api_get_market_rates():
    currency = request.args.get("currency", "INR")
    rates = get_latest_market_rates(currency)
    return jsonify({"rates": rates, "currency": currency})

@app.route("/api/market-rates/sync", methods=["POST"])
@token_required
@rate_limit(max_requests=10, window_seconds=60, scope="market_sync")
def api_sync_market_rates():
    data = request.get_json() or {}
    api_key = data.get("api_key")
    synced = sync_live_market_rates(api_key)
    return jsonify({"message": "Market rates synchronized successfully", "rates": synced})

@app.route("/api/market-rates/history", methods=["GET"])
@token_required
def api_get_market_history():
    days = int(request.args.get("days", 30))
    currency = request.args.get("currency", "INR")
    trends = get_historical_market_trends(days, currency)
    return jsonify({"trends": trends, "days": days, "currency": currency})

# ----------------- PORTFOLIO SUMMARY ----------------- #
@app.route("/api/portfolio/summary", methods=["GET"])
@token_required
def api_portfolio_summary():
    currency = request.args.get("currency", "INR")
    summary = get_portfolio_summary(request.user_id, currency)
    return jsonify(summary)

# ----------------- ASSETS CRUD ROUTES ----------------- #
@app.route("/api/assets", methods=["GET"])
@token_required
def api_get_assets():
    currency = request.args.get("currency", "INR")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, c.category_name, c.icon as category_icon
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.user_id = ?
        ORDER BY a.id DESC
    """, (request.user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

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
                "created_at": a.get("created_at"),
                "updated_at": a.get("updated_at")
            })
        else:
            # Legacy unencrypted asset
            val = calculate_asset_valuation(a, target_currency=currency)
            result.append({**a, **val})

    return jsonify({"assets": result, "total_count": len(result), "currency": currency})

@app.route("/api/assets/<int:asset_id>", methods=["GET"])
@token_required
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
@rate_limit(max_requests=30, window_seconds=60, scope="asset_create")
def api_create_asset():
    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()

    # Zero-Knowledge Encrypted Payload Handling
    if "encrypted_data" in data and "iv" in data:
        status = data.get("status", "Active")
        cursor.execute("""
            INSERT INTO assets (
                user_id, encrypted_data, iv, status,
                asset_name, asset_type, metal, purity, purity_factor,
                quantity, gross_weight, net_weight, stone_weight, purchase_date,
                purchase_price, making_charges, wastage, taxes, total_acquisition_cost,
                description, updated_at
            )
            VALUES (
                ?, ?, ?, ?,
                '', 'Encrypted', 'Encrypted', 'Encrypted', 1.0,
                1, 0.0, 0.0, 0.0, DATE('now'),
                0.0, 0.0, 0.0, 0.0, 0.0,
                '', CURRENT_TIMESTAMP
            )
        """, (request.user_id, data["encrypted_data"], data["iv"], status))
        asset_id = cursor.lastrowid

        # If an encrypted transaction is also attached
        if "transaction_encrypted_data" in data and "transaction_iv" in data:
            cursor.execute("""
                INSERT INTO transactions (user_id, asset_id, encrypted_data, iv, transaction_type, transaction_date, amount, realized_profit)
                VALUES (?, ?, ?, ?, 'PURCHASE', CURRENT_TIMESTAMP, 0.0, 0.0)
            """, (request.user_id, asset_id, data["transaction_encrypted_data"], data["transaction_iv"]))

        conn.commit()
        conn.close()
        return jsonify({"message": "Asset encrypted and saved to zero-knowledge vault", "asset_id": asset_id}), 201

    # Legacy Unencrypted Creation
    asset_name = data.get("asset_name")
    if not asset_name:
        conn.close()
        return jsonify({"error": "Asset name or encrypted payload required"}), 400

    metal = data.get("metal", "Gold")
    purity = data.get("purity", "22K")
    purity_factor = get_metal_purity_factor(metal, purity)
    gross_weight = float(data.get("gross_weight") or 0.0)
    stone_weight = float(data.get("stone_weight") or 0.0)
    net_weight = float(data.get("net_weight") or max(0.0, gross_weight - stone_weight))
    
    purchase_date = data.get("purchase_date") or datetime.date.today().isoformat()
    purchase_price = float(data.get("purchase_price") or 0.0)
    making_charges = float(data.get("making_charges") or 0.0)
    wastage = float(data.get("wastage") or 0.0)
    taxes = float(data.get("taxes") or 0.0)
    total_cost = float(data.get("total_acquisition_cost") or (purchase_price + making_charges + wastage + taxes))
    owner_name = data.get("owner_name") or data.get("buyer_name") or ""

    cursor.execute("""
        INSERT INTO assets (
            user_id, asset_name, category_id, asset_type, metal, purity, purity_factor,
            quantity, gross_weight, net_weight, stone_weight, purchase_date, purchase_price,
            making_charges, wastage, taxes, total_acquisition_cost, description, status,
            hallmark_huid, jeweller_name, invoice_number, diamond_carat, diamond_cut,
            diamond_color, diamond_clarity, diamond_shape, diamond_cert_lab, diamond_cert_number, photo_url, owner_name
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, 'Active',
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
        )
    """, (
        request.user_id, asset_name, data.get("category_id"), data.get("asset_type", "Jewellery"), metal, purity, purity_factor,
        int(data.get("quantity") or 1), gross_weight, net_weight, stone_weight, purchase_date, purchase_price,
        making_charges, wastage, taxes, total_cost, data.get("description", ""),
        data.get("hallmark_huid"), data.get("jeweller_name"), data.get("invoice_number"),
        float(data.get("diamond_carat") or 0.0), data.get("diamond_cut"), data.get("diamond_color"),
        data.get("diamond_clarity"), data.get("diamond_shape"), data.get("diamond_cert_lab"),
        data.get("diamond_cert_number"), data.get("photo_url"), owner_name
    ))
    asset_id = cursor.lastrowid

    # Record acquisition transaction
    cursor.execute("""
        INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
        VALUES (?, ?, 'PURCHASE', ?, ?, 0.0, ?, ?)
    """, (request.user_id, asset_id, purchase_date, total_cost, data.get("jeweller_name", "Acquisition"), f"Added asset: {asset_name}"))

    conn.commit()
    conn.close()
    return jsonify({"message": "Asset created successfully", "asset_id": asset_id}), 201

@app.route("/api/assets/<int:asset_id>", methods=["PUT"])
@token_required
@rate_limit(max_requests=30, window_seconds=60, scope="asset_update")
def api_update_asset(asset_id: int):
    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "Asset not found"}), 404

    # Zero-Knowledge Encrypted Update
    if "encrypted_data" in data and "iv" in data:
        status = data.get("status", existing["status"] or "Active")
        cursor.execute("""
            UPDATE assets SET encrypted_data = ?, iv = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        """, (data["encrypted_data"], data["iv"], status, asset_id, request.user_id))
        conn.commit()
        conn.close()
        return jsonify({"message": "Encrypted asset updated successfully"})

    # Legacy Unencrypted Update
    metal = data.get("metal")
    purity = data.get("purity")
    purity_factor = None
    if metal or purity:
        m = metal or existing["metal"] or "Gold"
        p = purity or existing["purity"] or "22K"
        purity_factor = get_metal_purity_factor(m, p)

    gross_weight = float(data["gross_weight"]) if data.get("gross_weight") is not None else None
    stone_weight = float(data["stone_weight"]) if data.get("stone_weight") is not None else None
    net_weight = float(data["net_weight"]) if data.get("net_weight") is not None else None
    if gross_weight is not None and net_weight is None:
        st_w = stone_weight if stone_weight is not None else (existing["stone_weight"] or 0.0)
        net_weight = max(0.0, gross_weight - st_w)
    
    purchase_price = float(data["purchase_price"]) if data.get("purchase_price") is not None else None
    making_charges = float(data["making_charges"]) if data.get("making_charges") is not None else None
    wastage = float(data["wastage"]) if data.get("wastage") is not None else None
    taxes = float(data["taxes"]) if data.get("taxes") is not None else None
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
@rate_limit(max_requests=30, window_seconds=60, scope="asset_delete")
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

@app.route("/api/assets/<int:asset_id>/sell", methods=["POST"])
@token_required
@rate_limit(max_requests=30, window_seconds=60, scope="asset_sell")
def api_sell_asset(asset_id: int):
    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
    asset = cursor.fetchone()
    if not asset:
        conn.close()
        return jsonify({"error": "Asset not found or unauthorized access"}), 404

    if "encrypted_data" in data and "iv" in data:
        # Mark asset as sold
        cursor.execute("UPDATE assets SET status = 'Sold', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", (asset_id, request.user_id))
        # Insert sale transaction with valid amount & realized_profit
        cursor.execute("""
            INSERT INTO transactions (user_id, asset_id, encrypted_data, iv, transaction_type, transaction_date, amount, realized_profit)
            VALUES (?, ?, ?, ?, 'SALE', CURRENT_TIMESTAMP, 0.0, 0.0)
        """, (request.user_id, asset_id, data["encrypted_data"], data["iv"]))
        conn.commit()
        conn.close()
        return jsonify({"message": "Asset marked as sold and transaction recorded"})

    conn.close()
    sale_amount = data.get("sale_amount")
    if sale_amount is None:
        return jsonify({"error": "Sale amount is required"}), 400

    res, err = sell_asset(
        user_id=request.user_id,
        asset_id=asset_id,
        sale_amount=float(sale_amount),
        sale_date=data.get("sale_date"),
        buyer_name=data.get("buyer_name", ""),
        notes=data.get("notes", "")
    )
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": "Asset sold successfully", "transaction": res})

@app.route("/api/assets/<int:asset_id>/status", methods=["POST"])
@token_required
@rate_limit(max_requests=30, window_seconds=60, scope="asset_status")
def api_update_status(asset_id: int):
    data = request.get_json() or {}
    status = data.get("status", "Active")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", (status, asset_id, request.user_id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "Asset not found or unauthorized access"}), 404
    conn.commit()
    conn.close()
    return jsonify({"message": f"Asset status changed to {status}"})

# ----------------- SIMULATOR ROUTE ----------------- #
@app.route("/api/simulator/run", methods=["POST"])
@token_required
def api_run_simulation():
    data = request.get_json() or {}
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
def api_get_transactions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.*, a.asset_name, a.metal, a.purity, a.photo_url, a.owner_name
        FROM transactions t
        LEFT JOIN assets a ON t.asset_id = a.id
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC, t.id DESC
    """, (request.user_id,))
    txs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"transactions": txs})

@app.route("/api/transactions", methods=["POST"])
@token_required
@rate_limit(max_requests=30, window_seconds=60, scope="transaction_create")
def api_create_transaction():
    data = request.get_json() or {}
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
    return jsonify({"message": "Transaction recorded", "transaction_id": tx_id}), 201

# ----------------- ALERTS ROUTES ----------------- #
@app.route("/api/alerts", methods=["GET"])
@token_required
def api_get_alerts():
    currency = request.args.get("currency", "INR")
    alerts = get_user_alerts(request.user_id, currency)
    return jsonify({"alerts": alerts})

@app.route("/api/alerts", methods=["POST"])
@token_required
@rate_limit(max_requests=30, window_seconds=60, scope="alert_create")
def api_create_alert():
    data = request.get_json() or {}
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
        return jsonify({"message": "Encrypted alert rule created", "alert_id": alert_id}), 201

    alert_type = data.get("alert_type", "PRICE_TARGET")
    target_metal = data.get("target_metal", "GOLD")
    target_value = float(data.get("target_value") or 0.0)
    condition = data.get("condition", "GREATER_THAN")
    notes = data.get("notes", "")

    alert_id = create_alert(request.user_id, alert_type, target_metal, target_value, condition, notes)
    conn.close()
    return jsonify({"message": "Alert created successfully", "alert_id": alert_id}), 201

@app.route("/api/alerts/<int:alert_id>", methods=["DELETE"])
@token_required
def api_delete_alert(alert_id: int):
    delete_alert(request.user_id, alert_id)
    return jsonify({"message": "Alert deleted successfully"})

# ----------------- DOCUMENTS ROUTES ----------------- #
@app.route("/api/documents", methods=["GET"])
@token_required
def api_get_documents():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.*, a.asset_name, a.metal, a.purity, a.owner_name
        FROM documents d
        LEFT JOIN assets a ON d.asset_id = a.id
        WHERE d.user_id = ?
        ORDER BY d.uploaded_at DESC
    """, (request.user_id,))
    docs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"documents": docs})

@app.route("/api/documents/upload", methods=["POST"])
@token_required
@rate_limit(max_requests=20, window_seconds=60, scope="document_upload")
def api_upload_document():
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    file = request.files["file"]
    if file.filename == "":
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

    filename = secure_filename(file.filename) or "document"
    unique_name = f"{request.user_id}_{asset_id}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(save_path)
    file_size = os.path.getsize(save_path)

    cursor.execute("""
        INSERT INTO documents (asset_id, user_id, document_type, file_name, file_path, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (asset_id, request.user_id, document_type, filename, unique_name, file_size))
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"message": "Document uploaded successfully", "document_id": doc_id, "file_name": filename}), 201

@app.route("/api/documents/<int:doc_id>/download", methods=["GET"])
@token_required
def api_download_document(doc_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, request.user_id))
    doc = cursor.fetchone()
    conn.close()
    if not doc:
        return jsonify({"error": "Document not found or unauthorized access"}), 404
    
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], doc["file_path"])
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on server"}), 404

    return send_file(
        file_path,
        as_attachment=True,
        download_name=doc["file_name"]
    )

@app.route("/api/documents/<int:doc_id>", methods=["DELETE"])
@token_required
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
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], doc["file_path"])
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

    return jsonify({"message": "Document deleted successfully"})

# ----------------- REPORTS & EXPORTS ----------------- #
@app.route("/api/reports/pdf", methods=["GET"])
@token_required
def api_download_pdf():
    currency = request.args.get("currency", "INR")
    user = get_user_profile(request.user_id) or {"name": "Investor"}
    pdf_bytes = generate_pdf_report(request.user_id, user, currency)
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"AssetVault_Portfolio_{datetime.date.today().isoformat()}.pdf"
    )

@app.route("/api/reports/excel", methods=["GET"])
@token_required
def api_download_excel():
    currency = request.args.get("currency", "INR")
    user = get_user_profile(request.user_id) or {"name": "Investor"}
    xlsx_bytes = generate_excel_report(request.user_id, user, currency)
    return send_file(
        io.BytesIO(xlsx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"AssetVault_Portfolio_{datetime.date.today().isoformat()}.xlsx"
    )

@app.route("/api/reports/csv", methods=["GET"])
@token_required
def api_download_csv():
    currency = request.args.get("currency", "INR")
    csv_str = generate_csv_export(request.user_id, currency)
    return send_file(
        io.BytesIO(csv_str.encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"AssetVault_Assets_{datetime.date.today().isoformat()}.csv"
    )

# ----------------- CATEGORIES ROUTE ----------------- #
@app.route("/api/categories", methods=["GET"])
def api_get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories ORDER BY id ASC")
    cats = [dict(c) for c in cursor.fetchall()]
    conn.close()
    return jsonify({"categories": cats})

# ----------------- STATIC ASSETS & SPA ROUTE ----------------- #
@app.route("/")
def serve_index():
    return send_from_directory(STATIC_FOLDER, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(os.path.join(STATIC_FOLDER, path)):
        return send_from_directory(STATIC_FOLDER, path)
    return send_from_directory(STATIC_FOLDER, "index.html")

# ----------------- SECURITY HEADERS MIDDLEWARE ----------------- #
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

if __name__ == "__main__":
    init_db()
    seed_database()
    print("AssetVault Server running on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
