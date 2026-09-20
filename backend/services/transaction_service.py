import datetime
from database import get_db_connection

def record_transaction(user_id: int, asset_id: int, transaction_type: str, amount: float, 
                       realized_profit: float = 0.0, counterparty: str = "", notes: str = "", 
                       transaction_date: str = None):
    if not transaction_date:
        transaction_date = datetime.date.today().isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, asset_id, transaction_type.upper(), transaction_date, float(amount), float(realized_profit), counterparty, notes))
    tx_id = cursor.lastrowid

    # Add audit log
    cursor.execute("""
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (?, ?, ?)
    """, (user_id, f"TRANSACTION_{transaction_type.upper()}", f"Asset #{asset_id}, Amount: {amount}, Realized P&L: {realized_profit}"))

    conn.commit()
    conn.close()
    return tx_id

def sell_asset(user_id: int, asset_id: int, sale_amount: float, sale_date: str = None, 
               buyer_name: str = "", notes: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, user_id))
    asset = cursor.fetchone()
    if not asset:
        conn.close()
        return None, "Asset not found or unauthorized access."

    if asset["status"] == "Sold":
        conn.close()
        return None, "Asset has already been sold."

    total_cost = float(asset["total_acquisition_cost"] if asset["total_acquisition_cost"] is not None else (asset["purchase_price"] or 0.0))
    sale_val = float(sale_amount)
    realized_profit = round(sale_val - total_cost, 2)
    
    if not sale_date:
        sale_date = datetime.date.today().isoformat()

    # Update asset status to 'Sold'
    cursor.execute("UPDATE assets SET status = 'Sold', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (asset_id,))

    # Insert transaction record
    cursor.execute("""
        INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
        VALUES (?, ?, 'SALE', ?, ?, ?, ?, ?)
    """, (user_id, asset_id, sale_date, sale_val, realized_profit, buyer_name, notes or f"Sold for {sale_val}"))
    
    tx_id = cursor.lastrowid
    cursor.execute("""
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (?, 'ASSET_SOLD', ?)
    """, (user_id, f"Asset '{asset['asset_name']}' sold for {sale_val}. Realized P&L: {realized_profit}"))

    conn.commit()
    conn.close()

    return {
        "transaction_id": tx_id,
        "asset_id": asset_id,
        "asset_name": asset["asset_name"],
        "sale_amount": sale_val,
        "realized_profit": realized_profit,
        "sale_date": sale_date
    }, None

def update_asset_lifecycle_status(user_id: int, asset_id: int, new_status: str, notes: str = ""):
    valid_statuses = ["Active", "Sold", "Transferred", "Gifted", "Archived"]
    if new_status not in valid_statuses:
        return None, f"Invalid status. Must be one of: {', '.join(valid_statuses)}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assets WHERE id = ? AND user_id = ?", (asset_id, user_id))
    asset = cursor.fetchone()
    if not asset:
        conn.close()
        return None, "Asset not found."

    cursor.execute("UPDATE assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_status, asset_id))

    today_str = datetime.date.today().isoformat()
    cursor.execute("""
        INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
        VALUES (?, ?, ?, ?, 0.0, 0.0, '', ?)
    """, (user_id, asset_id, new_status.upper(), today_str, notes or f"Status changed to {new_status}"))

    conn.commit()
    conn.close()
    return {"asset_id": asset_id, "new_status": new_status}, None

def get_user_transactions(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.*, a.asset_name, a.metal, a.purity, a.purchase_price, a.total_acquisition_cost, a.photo_url, a.owner_name
        FROM transactions t
        LEFT JOIN assets a ON t.asset_id = a.id
        WHERE t.user_id = ?
        ORDER BY t.transaction_date DESC, t.id DESC
    """, (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
