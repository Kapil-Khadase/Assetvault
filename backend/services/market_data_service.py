import datetime
import requests
import logging
from config import PURITY_FACTORS, SUPPORTED_CURRENCIES, APPLICATION_ESTIMATION_FACTOR, MARKET_API_KEY
from database import get_db_connection

logger = logging.getLogger("assetvault")

# Base authentic reference rates per gram in INR
BASE_RATES_INR = {
    "GOLD_24K": 15535.0,
    "GOLD_22K": 14240.0,
    "GOLD_18K": 11651.0,
    "GOLD_14K": 9063.0,
    "SILVER_999": 250.0,
    "SILVER_925": 231.25,
    "PLATINUM_950": 5379.0,
    "PLATINUM_900": 5096.0,
}

# Currency conversion rates relative to INR (1 USD = ~85.5 INR, 1 EUR = ~93.0 INR, 1 GBP = ~109.5 INR)
INR_EXCHANGE_RATES = {
    "INR": 1.0,
    "USD": 0.0117,
    "EUR": 0.0107,
    "GBP": 0.0091,
}

def get_latest_market_rates(target_currency: str = "INR") -> dict:
    """
    Retrieves the most recent market rates from the database cache.
    Returns rates with metadata: metal, purity, rate_per_gram, currency, source, fetched_at, and data status (LIVE, CACHED, or DEMO).
    If no rates are configured, returns clear 'Market data unavailable' status.
    """
    target_currency = (target_currency or "INR").upper().strip()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT metal, purity, rate_per_gram, currency, unit, source, rate_date, fetched_at
        FROM market_rates
        WHERE id IN (SELECT MAX(id) FROM market_rates GROUP BY metal, purity)
    """)
    rows = cursor.fetchall()
    conn.close()

    rates = {}
    if rows:
        for r in rows:
            key = f"{r['metal'].upper()}_{r['purity'].upper()}"
            rate_inr = r["rate_per_gram"] if r["currency"] == "INR" else r["rate_per_gram"] / (INR_EXCHANGE_RATES.get(r["currency"].upper(), 1.0))
            conv_rate = rate_inr * INR_EXCHANGE_RATES.get(target_currency, 1.0)
            src = r["source"] or "Sample/Demo Historical Data"
            
            if "MetalpriceAPI" in src or "GoldAPI" in src:
                status = "LIVE"
                status_label = f"Live Rate ({src})"
            elif "Sample" in src or "Demo" in src:
                status = "DEMO"
                status_label = "Sample/Demo Historical Data"
            else:
                status = "CACHED"
                status_label = f"Using last available market rate (Cached - {src})"

            rates[key] = {
                "metal": r["metal"],
                "purity": r["purity"],
                "rate_per_gram": round(conv_rate, 2),
                "currency": target_currency,
                "unit": "gram",
                "source": src,
                "rate_date": r["rate_date"],
                "fetched_at": r["fetched_at"],
                "status": status,
                "status_label": status_label
            }
    else:
        # Check if historical records exist to use as fallback cache
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT metal, purity, rate_per_gram, currency, source, recorded_at
            FROM market_rate_history
            WHERE id IN (SELECT MAX(id) FROM market_rate_history GROUP BY metal, purity)
        """)
        hist_rows = cursor.fetchall()
        conn.close()
        if hist_rows:
            for r in hist_rows:
                key = f"{r['metal'].upper()}_{r['purity'].upper()}"
                rate_inr = r["rate_per_gram"] if r["currency"] == "INR" else r["rate_per_gram"] / (INR_EXCHANGE_RATES.get(r["currency"].upper(), 1.0))
                conv_rate = rate_inr * INR_EXCHANGE_RATES.get(target_currency, 1.0)
                src = r["source"] or "Sample/Demo Historical Data"
                status = "DEMO" if ("Sample" in src or "Demo" in src) else "CACHED"
                rates[key] = {
                    "metal": r["metal"],
                    "purity": r["purity"],
                    "rate_per_gram": round(conv_rate, 2),
                    "currency": target_currency,
                    "unit": "gram",
                    "source": src,
                    "rate_date": str(r["recorded_at"]).split()[0],
                    "fetched_at": r["recorded_at"],
                    "status": status,
                    "status_label": "Sample/Demo Historical Data" if status == "DEMO" else f"Cached Rate ({src})"
                }
        else:
            # Explicit transparency: If no configured data or cache exists, market data is unavailable
            today_str = datetime.date.today().isoformat()
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            for key in ["GOLD_24K", "GOLD_22K", "SILVER_999", "PLATINUM_950"]:
                metal, purity = key.split("_", 1)
                rates[key] = {
                    "metal": metal,
                    "purity": purity,
                    "rate_per_gram": 0.0,
                    "currency": target_currency,
                    "unit": "gram",
                    "source": "Market data unavailable",
                    "rate_date": today_str,
                    "fetched_at": now_str,
                    "status": "UNAVAILABLE",
                    "status_label": "Market data unavailable. Configure live API key in Settings."
                }

    return rates

def sync_live_market_rates(api_key: str = None) -> dict:
    """
    Syncs live market rates from external bullion feeds if API key is provided.
    Does NOT generate random numbers or fake fluctuations when API is unavailable.
    Saves successful live updates to market_rates and market_rate_history.
    """
    today_str = datetime.date.today().isoformat()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    synced_rates = {}
    TROY_OZ_TO_GRAMS = 31.1034768
    api_success = False

    active_key = (api_key or MARKET_API_KEY or "").strip()
    if active_key:
        # 1. Attempt MetalpriceAPI
        try:
            url = f"https://api.metalpriceapi.com/v1/latest?api_key={active_key}&base=INR&currencies=XAU,XAG,XPT"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                rates_data = data.get("rates", {})
                if "XAU" in rates_data and rates_data["XAU"] > 0:
                    gold_oz_inr = (1.0 / rates_data["XAU"]) * APPLICATION_ESTIMATION_FACTOR
                    gold_24k_gram = round(gold_oz_inr / TROY_OZ_TO_GRAMS, 2)
                    
                    synced_rates["GOLD_24K"] = gold_24k_gram
                    synced_rates["GOLD_22K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_22K"], 2)
                    synced_rates["GOLD_18K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_18K"], 2)
                    synced_rates["GOLD_14K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_14K"], 2)

                    if "XAG" in rates_data and rates_data["XAG"] > 0:
                        silver_oz_inr = (1.0 / rates_data["XAG"]) * APPLICATION_ESTIMATION_FACTOR
                        silver_999_gram = round(silver_oz_inr / TROY_OZ_TO_GRAMS, 2)
                        synced_rates["SILVER_999"] = silver_999_gram
                        synced_rates["SILVER_925"] = round(silver_999_gram * PURITY_FACTORS["SILVER_925"], 2)

                    if "XPT" in rates_data and rates_data["XPT"] > 0:
                        plat_oz_inr = (1.0 / rates_data["XPT"]) * APPLICATION_ESTIMATION_FACTOR
                        plat_base_gram = round(plat_oz_inr / TROY_OZ_TO_GRAMS, 2)
                        synced_rates["PLATINUM_950"] = round(plat_base_gram * PURITY_FACTORS["PLATINUM_950"], 2)
                        synced_rates["PLATINUM_900"] = round(plat_base_gram * PURITY_FACTORS["PLATINUM_900"], 2)

                    api_success = True
        except Exception as e:
            logger.debug("Primary market data provider failed: %s", e)
            api_success = False

        # 2. Fallback attempt via GoldAPI.io
        if not api_success:
            try:
                url = "https://www.goldapi.io/api/XAU/INR"
                headers = {"x-access-token": active_key, "Content-Type": "application/json"}
                res = requests.get(url, headers=headers, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    raw_spot_gram = data.get("price_gram_24k", BASE_RATES_INR["GOLD_24K"])
                    gold_24k_gram = round(raw_spot_gram * APPLICATION_ESTIMATION_FACTOR, 2)
                    synced_rates["GOLD_24K"] = gold_24k_gram
                    synced_rates["GOLD_22K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_22K"], 2)
                    synced_rates["GOLD_18K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_18K"], 2)
                    synced_rates["GOLD_14K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_14K"], 2)
                    api_success = True
            except Exception as e:
                logger.debug("Fallback market data provider failed: %s", e)
                api_success = False

    conn = get_db_connection()
    cursor = conn.cursor()

    if api_success:
        source_label = "Live Bullion Exchange"
        for key, rate in synced_rates.items():
            metal, purity = key.split("_", 1)
            cursor.execute("""
                INSERT INTO market_rates (metal, purity, rate_per_gram, unit, currency, source, rate_date, fetched_at)
                VALUES (?, ?, ?, 'gram', 'INR', ?, ?, ?)
            """, (metal, purity, rate, source_label, today_str, now_str))
            cursor.execute("""
                INSERT INTO market_rate_history (metal, purity, rate_per_gram, currency, source, recorded_at)
                VALUES (?, ?, ?, 'INR', ?, ?)
            """, (metal, purity, rate, source_label, now_str))
        conn.commit()
    else:
        # When no live API available, do NOT fabricate random noise.
        # Use latest cached rates without modifying values.
        cursor.execute("SELECT metal, purity, rate_per_gram FROM market_rates WHERE id IN (SELECT MAX(id) FROM market_rates GROUP BY metal, purity)")
        rows = cursor.fetchall()
        for r in rows:
            synced_rates[f"{r['metal'].upper()}_{r['purity'].upper()}"] = r["rate_per_gram"]

    conn.close()
    return synced_rates

def get_historical_market_trends(days: int = 30, target_currency: str = "INR") -> list:
    """
    Returns time-series daily rates from genuine recorded market_rate_history records.
    Never fabricates random points. Returns empty list if no history is recorded.
    """
    target_currency = (target_currency or "INR").upper().strip()
    conv = INR_EXCHANGE_RATES.get(target_currency, 1.0)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Query daily closing rates for Gold 24K, Gold 22K, Silver 999, Platinum 950
    cursor.execute("""
        SELECT DATE(recorded_at) as log_date,
               metal, purity, AVG(rate_per_gram) as avg_rate
        FROM market_rate_history
        WHERE recorded_at >= DATE('now', ?)
        GROUP BY DATE(recorded_at), metal, purity
        ORDER BY log_date ASC
    """, (f"-{days} days",))
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return []

    # Pivot by date
    by_date = {}
    for r in rows:
        d = r["log_date"]
        if d not in by_date:
            by_date[d] = {}
        key = f"{r['metal'].upper()}_{r['purity'].upper()}"
        by_date[d][key] = round(r["avg_rate"] * conv, 2)

    points = []
    for d_str in sorted(by_date.keys()):
        rates_map = by_date[d_str]
        try:
            d_obj = datetime.date.fromisoformat(d_str)
            label = d_obj.strftime("%d %b")
        except Exception:
            label = d_str

        gold_24k = rates_map.get("GOLD_24K", 0.0)
        gold_22k = rates_map.get("GOLD_22K", round(gold_24k * PURITY_FACTORS.get("GOLD_22K", 0.9167), 2) if gold_24k else 0.0)
        silver_999 = rates_map.get("SILVER_999", 0.0)
        plat_950 = rates_map.get("PLATINUM_950", 0.0)

        points.append({
            "date": label,
            "full_date": d_str,
            "gold_24k": gold_24k,
            "gold_22k": gold_22k,
            "silver_999": silver_999,
            "platinum_950": plat_950
        })

    return points
