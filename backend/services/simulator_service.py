from database import get_db_connection
from services.market_data_service import get_latest_market_rates
from services.valuation_engine import calculate_asset_valuation

def run_portfolio_simulation(user_id: int, gold_pct_change: float = 0.0, silver_pct_change: float = 0.0, 
                             plat_pct_change: float = 0.0, diamond_pct_change: float = 0.0, 
                             target_currency: str = "INR") -> dict:
    """
    Simulates portfolio valuation and ROI under hypothetical market rate fluctuations.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, c.category_name
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.user_id = ? AND a.status = 'Active'
    """, (user_id,))
    assets = [dict(r) for r in cursor.fetchall()]
    conn.close()

    base_rates = get_latest_market_rates(target_currency)
    
    # Create shocked simulated rates dictionary
    simulated_rates = {}
    for key, rate_info in base_rates.items():
        sim_info = dict(rate_info)
        metal = sim_info["metal"].upper()
        
        multiplier = 1.0
        if metal == "GOLD":
            multiplier = 1.0 + (gold_pct_change / 100.0)
        elif metal == "SILVER":
            multiplier = 1.0 + (silver_pct_change / 100.0)
        elif metal == "PLATINUM":
            multiplier = 1.0 + (plat_pct_change / 100.0)

        sim_info["rate_per_gram"] = round(sim_info["rate_per_gram"] * max(0.01, multiplier), 2)
        simulated_rates[key] = sim_info

    base_total_value = 0.0
    sim_total_value = 0.0
    total_invested_cost = 0.0
    asset_simulations = []

    for a in assets:
        # Base valuation
        base_val = calculate_asset_valuation(a, base_rates, target_currency)
        
        # Simulated valuation
        # Adjust diamond carat value multiplier if diamond shock is set
        sim_val = calculate_asset_valuation(a, simulated_rates, target_currency)
        if diamond_pct_change != 0 and sim_val["diamond_value"] > 0:
            adj_diamond = round(sim_val["diamond_value"] * (1.0 + (diamond_pct_change / 100.0)), 2)
            sim_val["diamond_value"] = adj_diamond
            sim_val["current_estimated_value"] = round(sim_val["metal_value"] + adj_diamond, 2)
            sim_val["profit_loss"] = round(sim_val["current_estimated_value"] - sim_val["total_acquisition_cost"], 2)
            sim_val["roi_percentage"] = round((sim_val["profit_loss"] / sim_val["total_acquisition_cost"]) * 100.0, 2)

        diff = round(sim_val["current_estimated_value"] - base_val["current_estimated_value"], 2)
        diff_pct = round((diff / base_val["current_estimated_value"]) * 100.0, 2) if base_val["current_estimated_value"] > 0 else 0.0

        base_total_value += base_val["current_estimated_value"]
        sim_total_value += sim_val["current_estimated_value"]
        total_invested_cost += base_val["total_acquisition_cost"]

        asset_simulations.append({
            "asset_id": a["id"],
            "asset_name": a["asset_name"],
            "metal": a["metal"],
            "purity": a["purity"],
            "net_weight": base_val["net_weight"],
            "total_cost": base_val["total_acquisition_cost"],
            "base_value": base_val["current_estimated_value"],
            "simulated_value": sim_val["current_estimated_value"],
            "value_difference": diff,
            "difference_percentage": diff_pct,
            "simulated_pnl": sim_val["profit_loss"],
            "simulated_roi": sim_val["roi_percentage"]
        })

    portfolio_value_diff = round(sim_total_value - base_total_value, 2)
    portfolio_diff_pct = round((portfolio_value_diff / base_total_value) * 100.0, 2) if base_total_value > 0 else 0.0
    sim_total_pnl = round(sim_total_value - total_invested_cost, 2)
    sim_total_roi = round((sim_total_pnl / total_invested_cost) * 100.0, 2) if total_invested_cost > 0 else 0.0

    return {
        "gold_pct_change": gold_pct_change,
        "silver_pct_change": silver_pct_change,
        "plat_pct_change": plat_pct_change,
        "diamond_pct_change": diamond_pct_change,
        "base_total_value": round(base_total_value, 2),
        "simulated_total_value": round(sim_total_value, 2),
        "portfolio_value_diff": portfolio_value_diff,
        "portfolio_diff_pct": portfolio_diff_pct,
        "total_invested_cost": round(total_invested_cost, 2),
        "simulated_total_pnl": sim_total_pnl,
        "simulated_total_roi": sim_total_roi,
        "asset_simulations": asset_simulations,
        "currency": target_currency
    }
