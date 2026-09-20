import datetime
from database import get_db_connection
from services.market_data_service import get_latest_market_rates
from services.valuation_engine import get_portfolio_summary

def create_alert(user_id: int, alert_type: str, target_metal: str, target_value: float, 
                 condition: str = "GREATER_THAN", notes: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO alerts (user_id, alert_type, target_metal, target_value, condition, notes, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    """, (user_id, alert_type.upper(), (target_metal or "").upper(), float(target_value), condition.upper(), notes))
    alert_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return alert_id

def toggle_alert(user_id: int, alert_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, is_active FROM alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
    alert = cursor.fetchone()
    if not alert:
        conn.close()
        return None, "Alert not found or unauthorized access"
    
    current_active = alert["is_active"] if alert["is_active"] is not None else 1
    new_active = 0 if current_active == 1 else 1
    cursor.execute("UPDATE alerts SET is_active = ? WHERE id = ? AND user_id = ?", (new_active, alert_id, user_id))
    conn.commit()
    conn.close()
    return new_active, None

def get_user_alerts(user_id: int, target_currency: str = "INR"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    alerts = [dict(r) for r in cursor.fetchall()]

    # Evaluate alerts against current market rates & portfolio
    latest_rates = get_latest_market_rates(target_currency)
    portfolio = get_portfolio_summary(user_id, target_currency)
    
    evaluated_alerts = []
    for a in alerts:
        is_active = a.get("is_active") if a.get("is_active") is not None else 1
        triggered = False
        current_val = 0.0
        alert_type = a.get("alert_type")
        condition = a.get("condition")
        target_val = float(a.get("target_value") or 0.0)

        if is_active == 1:
            if alert_type == "PRICE_TARGET":
                metal = a.get("target_metal") or "GOLD"
                key = f"{metal}_24K" if metal == "GOLD" else (f"{metal}_999" if metal == "SILVER" else f"{metal}_950")
                if key in latest_rates:
                    current_val = latest_rates[key]["rate_per_gram"]
                if condition == "GREATER_THAN" and current_val >= target_val:
                    triggered = True
                elif condition == "LESS_THAN" and current_val <= target_val:
                    triggered = True

            elif alert_type == "PORTFOLIO_TARGET":
                current_val = portfolio["total_current_market_value"]
                if condition == "GREATER_THAN" and current_val >= target_val:
                    triggered = True
                elif condition == "LESS_THAN" and current_val <= target_val:
                    triggered = True

            if triggered and not a.get("triggered_at"):
                now_str = datetime.datetime.now().isoformat()
                cursor.execute("UPDATE alerts SET triggered_at = ? WHERE id = ?", (now_str, a["id"]))
                a["triggered_at"] = now_str

        evaluated_alerts.append({
            **a,
            "is_active": is_active,
            "current_value": current_val,
            "is_currently_triggered": triggered
        })

    conn.commit()
    conn.close()
    return evaluated_alerts

def delete_alert(user_id: int, alert_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
    conn.commit()
    conn.close()
    return True
