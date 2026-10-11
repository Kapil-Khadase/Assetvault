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
        # Pre-fetch recent prior rates for dynamic 24h change calculation
        prev_rates = {}
        try:
            conn_hist = get_db_connection()
            c_hist = conn_hist.cursor()
            c_hist.execute("""
                SELECT metal, purity, rate_per_gram, recorded_at
                FROM market_rate_history
                WHERE recorded_at < (SELECT MIN(fetched_at) FROM market_rates)
                ORDER BY recorded_at DESC
            """)
            for h in c_hist.fetchall():
                h_key = f"{h['metal'].upper()}_{h['purity'].upper()}"
                if h_key not in prev_rates:
                    prev_rates[h_key] = h['rate_per_gram']
            conn_hist.close()
        except Exception:
            pass

        for r in rows:
            key = f"{r['metal'].upper()}_{r['purity'].upper()}"
            rate_inr = r["rate_per_gram"] if r["currency"] == "INR" else r["rate_per_gram"] / (INR_EXCHANGE_RATES.get(r["currency"].upper(), 1.0))
            conv_rate = rate_inr * INR_EXCHANGE_RATES.get(target_currency, 1.0)
            src = r["source"] or "Sample/Demo Historical Data"
            
            if any(k in src for k in ["MetalpriceAPI", "GoldAPI", "Live", "Exchange", "Spot"]):
                status = "LIVE"
                status_label = f"Live Rate ({src})"
            elif "Sample" in src or "Demo" in src:
                status = "DEMO"
                status_label = "Sample/Demo Historical Data"
            else:
                status = "CACHED"
                status_label = f"Using last available market rate (Cached - {src})"

            prev_val = prev_rates.get(key)
            change_pct = round(((rate_inr - prev_val) / prev_val) * 100, 2) if (prev_val and prev_val > 0) else 0.0

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
                "status_label": status_label,
                "change_pct": change_pct
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
                    "status_label": "Sample/Demo Historical Data" if status == "DEMO" else f"Cached Rate ({src})",
                    "change_pct": 0.0
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
                    "status_label": "Market data unavailable. Configure live API key in Settings.",
                    "change_pct": 0.0
                }

    return rates

def sync_live_market_rates(api_key: str = None) -> dict:
    """
    Syncs live market rates from external bullion feeds:
    1. If api_key (or MARKET_API_KEY) is provided, attempts MetalpriceAPI.
       Supports both paid plans (base=INR) and free plans (base=USD with currency conversion).
    2. Fallback to GoldAPI.io if configured.
    3. Multi-tier zero-config live fallback: If no API key is provided or external API fails,
       fetches real-time spot benchmark rates from public exchange market feeds (GC=F Gold, SI=F Silver,
       PL=F Platinum, and USDINR=X) with Indian landed customs & tax calibrated factor.
    4. Saves successful live updates to market_rates and market_rate_history.
    """
    today_str = datetime.date.today().isoformat()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    synced_rates = {}
    TROY_OZ_TO_GRAMS = 31.1034768
    api_success = False
    source_label = "Sample/Demo Historical Data"

    active_key = (api_key or MARKET_API_KEY or "").strip()

    # Tier 1: MetalpriceAPI (if API key provided)
    if active_key and not api_success:
        try:
            # 1a. Attempt base=INR
            url = f"https://api.metalpriceapi.com/v1/latest?api_key={active_key}&base=INR&currencies=XAU,XAG,XPT"
            res = requests.get(url, timeout=5)
            if res.status_code == 200 and res.json().get("success", False):
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
                    source_label = "Live Bullion Feed (MetalpriceAPI)"
            elif res.status_code == 200 or not api_success:
                # 1b. MetalpriceAPI Free Tier (base=USD only)
                url_free = f"https://api.metalpriceapi.com/v1/latest?api_key={active_key}&base=USD&currencies=XAU,XAG,XPT,INR"
                res_free = requests.get(url_free, timeout=5)
                if res_free.status_code == 200 and res_free.json().get("success", False):
                    data = res_free.json()
                    rates_data = data.get("rates", {})
                    inr_rate = float(rates_data.get("INR") or 86.5)
                    if "XAU" in rates_data and rates_data["XAU"] > 0:
                        gold_oz_usd = 1.0 / rates_data["XAU"]
                        gold_oz_inr = gold_oz_usd * inr_rate * APPLICATION_ESTIMATION_FACTOR
                        gold_24k_gram = round(gold_oz_inr / TROY_OZ_TO_GRAMS, 2)
                        synced_rates["GOLD_24K"] = gold_24k_gram
                        synced_rates["GOLD_22K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_22K"], 2)
                        synced_rates["GOLD_18K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_18K"], 2)
                        synced_rates["GOLD_14K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_14K"], 2)

                        if "XAG" in rates_data and rates_data["XAG"] > 0:
                            silver_oz_usd = 1.0 / rates_data["XAG"]
                            silver_oz_inr = silver_oz_usd * inr_rate * APPLICATION_ESTIMATION_FACTOR
                            silver_999_gram = round(silver_oz_inr / TROY_OZ_TO_GRAMS, 2)
                            synced_rates["SILVER_999"] = silver_999_gram
                            synced_rates["SILVER_925"] = round(silver_999_gram * PURITY_FACTORS["SILVER_925"], 2)

                        if "XPT" in rates_data and rates_data["XPT"] > 0:
                            plat_oz_usd = 1.0 / rates_data["XPT"]
                            plat_oz_inr = plat_oz_usd * inr_rate * APPLICATION_ESTIMATION_FACTOR
                            plat_base_gram = round(plat_oz_inr / TROY_OZ_TO_GRAMS, 2)
                            synced_rates["PLATINUM_950"] = round(plat_base_gram * PURITY_FACTORS["PLATINUM_950"], 2)
                            synced_rates["PLATINUM_900"] = round(plat_base_gram * PURITY_FACTORS["PLATINUM_900"], 2)

                        api_success = True
                        source_label = "Live Bullion Feed (MetalpriceAPI)"
        except Exception as e:
            logger.debug("MetalpriceAPI attempt failed: %s", e)

    # Tier 2: Fallback attempt via GoldAPI.io (if active_key provided)
    if active_key and not api_success:
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
                source_label = "Live Bullion Feed (GoldAPI)"
        except Exception as e:
            logger.debug("GoldAPI attempt failed: %s", e)

    # Tier 3: Zero-Config Live Market Feed (Public Real-time Exchange Spot)
    # Allows genuine, continuous market rates even without an external API key
    if not api_success:
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            sym_map = {"GOLD": "GC=F", "SILVER": "SI=F", "PLATINUM": "PL=F", "USDINR": "USDINR=X"}
            prices = {}
            for k, sym in sym_map.items():
                try:
                    q_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1d"
                    r = requests.get(q_url, headers=headers, timeout=4)
                    if r.status_code == 200:
                        chart = r.json().get("chart", {}).get("result", [])
                        if chart:
                            meta = chart[0].get("meta", {})
                            prices[k] = meta.get("regularMarketPrice")
                except Exception:
                    pass

            if "GOLD" in prices and prices["GOLD"]:
                usdinr = float(prices.get("USDINR") or 86.5)
                gold_oz_inr = float(prices["GOLD"]) * usdinr * APPLICATION_ESTIMATION_FACTOR
                gold_24k_gram = round(gold_oz_inr / TROY_OZ_TO_GRAMS, 2)
                synced_rates["GOLD_24K"] = gold_24k_gram
                synced_rates["GOLD_22K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_22K"], 2)
                synced_rates["GOLD_18K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_18K"], 2)
                synced_rates["GOLD_14K"] = round(gold_24k_gram * PURITY_FACTORS["GOLD_14K"], 2)

                if "SILVER" in prices and prices["SILVER"]:
                    silver_oz_inr = float(prices["SILVER"]) * usdinr * APPLICATION_ESTIMATION_FACTOR
                    silver_999_gram = round(silver_oz_inr / TROY_OZ_TO_GRAMS, 2)
                    synced_rates["SILVER_999"] = silver_999_gram
                    synced_rates["SILVER_925"] = round(silver_999_gram * PURITY_FACTORS["SILVER_925"], 2)

                if "PLATINUM" in prices and prices["PLATINUM"]:
                    plat_oz_inr = float(prices["PLATINUM"]) * usdinr * APPLICATION_ESTIMATION_FACTOR
                    plat_base_gram = round(plat_oz_inr / TROY_OZ_TO_GRAMS, 2)
                    synced_rates["PLATINUM_950"] = round(plat_base_gram * PURITY_FACTORS["PLATINUM_950"], 2)
                    synced_rates["PLATINUM_900"] = round(plat_base_gram * PURITY_FACTORS["PLATINUM_900"], 2)

                api_success = True
                source_label = "Live Market Feed (Exchange Spot)"
        except Exception as e:
            logger.debug("Public exchange spot attempt failed: %s", e)

    conn = get_db_connection()
    cursor = conn.cursor()

    if api_success and synced_rates:
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
        # When all live feeds are unreachable (e.g. offline), retain existing cached rates
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
