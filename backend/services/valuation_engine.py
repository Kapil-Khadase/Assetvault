from config import PURITY_FACTORS, INR_EXCHANGE_RATES
from database import get_db_connection
from services.market_data_service import get_latest_market_rates, BASE_RATES_INR

DIAMOND_BASE_RATE_PER_CARAT_INR = 280000.0  # Base 1-carat standard diamond benchmark

COLOR_MULTIPLIERS = {
    "D": 1.28, "E": 1.18, "F": 1.10, "G": 1.00,
    "H": 0.92, "I": 0.84, "J": 0.76, "K": 0.68, "L": 0.60, "M": 0.55
}

CLARITY_MULTIPLIERS = {
    "FL": 1.40, "IF": 1.30, "VVS1": 1.22, "VVS2": 1.14,
    "VS1": 1.06, "VS2": 1.00, "SI1": 0.88, "SI2": 0.74,
    "I1": 0.58, "I2": 0.45, "I3": 0.35
}

CUT_MULTIPLIERS = {
    "EXCELLENT": 1.12, "IDEAL": 1.15, "VERY GOOD": 1.04,
    "GOOD": 0.95, "FAIR": 0.82, "POOR": 0.70
}

CERT_MULTIPLIERS = {
    "GIA": 1.10, "AGS": 1.05, "IGI": 1.00, "HRD": 0.98,
    "SGL": 0.95, "IN-HOUSE": 0.85, "NONE": 0.80
}

def get_metal_purity_factor(metal: str, purity: str) -> float:
    metal = (metal or "").upper().strip()
    purity = (purity or "").upper().strip()
    key = f"{metal}_{purity}"
    if key in PURITY_FACTORS:
        return PURITY_FACTORS[key]
    
    # Handle pure numeric karat strings
    if "24" in purity:
        return 1.0
    if "22" in purity or "916" in purity:
        return 0.9167
    if "18" in purity or "750" in purity:
        return 0.7500
    if "14" in purity or "585" in purity:
        return 0.5833
    if "10" in purity:
        return 0.4167
    if "999" in purity:
        return 1.0
    if "925" in purity:
        return 0.925
    if "950" in purity:
        return 0.95
    return 1.0

def calculate_diamond_valuation(carat: float, cut: str = "VERY GOOD", color: str = "G", 
                               clarity: str = "VS2", cert: str = "IGI", target_currency: str = "INR") -> float:
    if not carat or carat <= 0:
        return 0.0
    
    cut_key = (cut or "VERY GOOD").upper().strip()
    color_key = (color or "G").upper().strip()
    clarity_key = (clarity or "VS2").upper().strip()
    cert_key = (cert or "IGI").upper().strip()

    color_mult = COLOR_MULTIPLIERS.get(color_key, 1.0)
    clarity_mult = CLARITY_MULTIPLIERS.get(clarity_key, 1.0)
    cut_mult = CUT_MULTIPLIERS.get(cut_key, 1.0)
    cert_mult = CERT_MULTIPLIERS.get(cert_key, 0.90)

    # Nonlinear rarity curve for larger carat weights
    size_exponential = carat ** 1.32
    val_inr = size_exponential * DIAMOND_BASE_RATE_PER_CARAT_INR * color_mult * clarity_mult * cut_mult * cert_mult
    
    conv = INR_EXCHANGE_RATES.get(target_currency, 1.0)
    return round(val_inr * conv, 2)

def calculate_asset_valuation(asset_dict: dict, latest_rates: dict = None, target_currency: str = "INR") -> dict:
    """
    Computes purity-adjusted valuation, total acquisition cost, unrealized P&L, and ROI% for an asset.
    """
    if latest_rates is None:
        latest_rates = get_latest_market_rates(target_currency)

    metal = (asset_dict.get("metal") or "").upper().strip()
    purity = (asset_dict.get("purity") or "").upper().strip()
    net_weight = float(asset_dict.get("net_weight") or (float(asset_dict.get("gross_weight") or 0) - float(asset_dict.get("stone_weight") or 0)))
    if net_weight < 0:
        net_weight = 0.0

    qty = int(asset_dict.get("quantity") or 1)
    
    # 1. Precious Metal Raw Valuation
    rate_key = f"{metal}_{purity}"
    market_rate_used = 0.0
    metal_value = 0.0

    if metal in ["GOLD", "SILVER", "PLATINUM"]:
        purity_factor = get_metal_purity_factor(metal, purity)
        
        # Look up 24K/999/950 reference rate
        base_key = f"{metal}_24K" if metal == "GOLD" else (f"{metal}_999" if metal == "SILVER" else f"{metal}_950")
        if base_key in latest_rates:
            market_rate_used = latest_rates[base_key]["rate_per_gram"] * purity_factor
        elif rate_key in latest_rates:
            market_rate_used = latest_rates[rate_key]["rate_per_gram"]
        else:
            # Fallback
            conv = INR_EXCHANGE_RATES.get(target_currency, 1.0)
            base_inr = BASE_RATES_INR.get(base_key, 7000.0)
            market_rate_used = base_inr * purity_factor * conv

        metal_value = net_weight * market_rate_used * qty

    # 2. Diamond / Gemstone Valuation
    diamond_carat = float(asset_dict.get("diamond_carat") or 0.0)
    diamond_value = 0.0
    if diamond_carat > 0 or asset_dict.get("asset_type") == "Diamond":
        diamond_value = calculate_diamond_valuation(
            carat=diamond_carat,
            cut=asset_dict.get("diamond_cut"),
            color=asset_dict.get("diamond_color"),
            clarity=asset_dict.get("diamond_clarity"),
            cert=asset_dict.get("diamond_cert_lab"),
            target_currency=target_currency
        ) * qty

    # Total estimated current value
    current_estimated_value = round(metal_value + diamond_value, 2)
    
    # Total acquisition cost
    purchase_price = float(asset_dict.get("purchase_price") or 0.0)
    making_charges = float(asset_dict.get("making_charges") or 0.0)
    wastage = float(asset_dict.get("wastage") or 0.0)
    taxes = float(asset_dict.get("taxes") or 0.0)
    
    total_cost = float(asset_dict.get("total_acquisition_cost") or (purchase_price + making_charges + wastage + taxes))
    if total_cost <= 0:
        total_cost = purchase_price if purchase_price > 0 else 1.0

    # Profit / Loss and ROI%
    profit_loss = round(current_estimated_value - total_cost, 2)
    roi_percentage = round((profit_loss / total_cost) * 100.0, 2) if total_cost > 0 else 0.0

    return {
        "market_rate_used": round(market_rate_used, 2),
        "metal_value": round(metal_value, 2),
        "diamond_value": round(diamond_value, 2),
        "current_estimated_value": current_estimated_value,
        "total_acquisition_cost": round(total_cost, 2),
        "profit_loss": profit_loss,
        "roi_percentage": roi_percentage,
        "net_weight": net_weight
    }

def get_portfolio_summary(user_id: int, target_currency: str = "INR") -> dict:
    """
    Computes complete portfolio dashboard metrics for a user:
    - Active vs Sold vs Archived counts
    - Total Invested Cost
    - Total Current Estimated Market Value
    - Total Unrealized P&L and ROI%
    - Total Realized P&L from sold assets
    - Asset Allocation breakdown by Metal & Category
    - Best & Worst performing assets
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch all user assets
    cursor.execute("""
        SELECT a.*, c.category_name, c.icon as category_icon
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.user_id = ?
    """, (user_id,))
    raw_assets = [dict(row) for row in cursor.fetchall()]

    # Fetch realized profit/loss from transactions
    cursor.execute("""
        SELECT SUM(realized_profit) as total_realized, COUNT(id) as total_sales
        FROM transactions
        WHERE user_id = ? AND transaction_type = 'SALE'
    """, (user_id,))
    sales_row = cursor.fetchone()
    total_realized_pnl = float(sales_row["total_realized"] or 0.0) if sales_row else 0.0
    total_sales_count = int(sales_row["total_sales"] or 0) if sales_row else 0

    conn.close()

    latest_rates = get_latest_market_rates(target_currency)

    total_active_assets = 0
    total_invested_cost = 0.0
    total_current_market_value = 0.0
    total_unrealized_pnl = 0.0
    
    metal_allocation = {}
    category_allocation = {}
    evaluated_assets = []

    for a in raw_assets:
        status = a.get("status", "Active")
        val = calculate_asset_valuation(a, latest_rates, target_currency)
        a_evaluated = {**a, **val}
        evaluated_assets.append(a_evaluated)

        if status == "Active":
            total_active_assets += 1
            total_invested_cost += val["total_acquisition_cost"]
            total_current_market_value += val["current_estimated_value"]
            total_unrealized_pnl += val["profit_loss"]

            # Allocation aggregations
            metal = (a.get("metal") or "Other").capitalize()
            metal_allocation[metal] = metal_allocation.get(metal, 0.0) + val["current_estimated_value"]

            cat = a.get("category_name") or "Uncategorized"
            category_allocation[cat] = category_allocation.get(cat, 0.0) + val["current_estimated_value"]

    # Calculate overall active ROI%
    overall_roi_pct = round((total_unrealized_pnl / total_invested_cost) * 100.0, 2) if total_invested_cost > 0 else 0.0

    # Best and worst performing active assets
    active_evaluated = [a for a in evaluated_assets if a.get("status") == "Active"]
    best_performer = None
    worst_performer = None
    if active_evaluated:
        sorted_by_roi = sorted(active_evaluated, key=lambda x: x["roi_percentage"], reverse=True)
        best_performer = sorted_by_roi[0]
        worst_performer = sorted_by_roi[-1]

    # Convert allocations to percentages & clean objects
    metal_chart_data = []
    for m, val in metal_allocation.items():
        pct = round((val / total_current_market_value) * 100.0, 1) if total_current_market_value > 0 else 0.0
        metal_chart_data.append({"label": m, "value": round(val, 2), "percentage": pct})

    category_chart_data = []
    for c, val in category_allocation.items():
        pct = round((val / total_current_market_value) * 100.0, 1) if total_current_market_value > 0 else 0.0
        category_chart_data.append({"label": c, "value": round(val, 2), "percentage": pct})

    return {
        "total_assets_count": len(raw_assets),
        "total_active_assets": total_active_assets,
        "total_invested_cost": round(total_invested_cost, 2),
        "total_current_market_value": round(total_current_market_value, 2),
        "total_unrealized_pnl": round(total_unrealized_pnl, 2),
        "total_realized_pnl": round(total_realized_pnl, 2),
        "overall_roi_pct": overall_roi_pct,
        "total_sales_count": total_sales_count,
        "best_performer": best_performer,
        "worst_performer": worst_performer,
        "metal_allocation": metal_chart_data,
        "category_allocation": category_chart_data,
        "assets": evaluated_assets,
        "currency": target_currency,
        "currency_symbol": "₹" if target_currency == "INR" else ("$" if target_currency == "USD" else ("€" if target_currency == "EUR" else "£"))
    }
