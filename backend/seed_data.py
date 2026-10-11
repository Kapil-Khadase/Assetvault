import datetime
import secrets
from database import get_db_connection, init_db
from services.auth_service import hash_password
from services.market_data_service import BASE_RATES_INR
from config import DEMO_USER_EMAIL, DEMO_USER_PASSWORD, SEED_DEMO_DATA, ENVIRONMENT

def seed_database():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Categories
    categories = [
        ("Precious Metals", "Bullion, coins, bars, and ingots in pure gold, silver, and platinum.", "coins"),
        ("Jewellery", "Necklaces, bangles, rings, chains, earrings, and traditional bridal sets.", "gem"),
        ("Digital Gold & ETFs", "Sovereign Gold Bonds (SGB), 24K Digital Gold (MMTC-PAMP, Augmont, SafeGold), and Gold ETFs.", "smartphone"),
        ("Diamonds & Solitaires", "Certified loose diamonds, solitaire engagement rings, and diamond jewelry.", "sparkles"),
        ("Luxury Watches & Collectibles", "High-end luxury timepieces, heirloom antiquities, and rare collectibles.", "watch"),
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO categories (category_name, description, icon) VALUES (?, ?, ?)
    """, categories)

    # 2. Seed Default Demo User (controlled via environment variables)
    if not SEED_DEMO_DATA:
        conn.commit()
        conn.close()
        print("[*] SEED_DEMO_DATA is disabled; skipping demo user creation.")
        return

    demo_email = DEMO_USER_EMAIL
    cursor.execute("SELECT id, password_hash FROM users WHERE email = ? OR email = 'demo@assetvault.com'", (demo_email,))
    user = cursor.fetchone()
    pwd_hash = hash_password(DEMO_USER_PASSWORD)
    if not user:
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, currency, target_portfolio_value, encryption_salt)
            VALUES (?, ?, ?, 'INR', 2500000.0, 'assetvault_salt_v1')
        """, ("Kapil Khadase", demo_email, pwd_hash))
        user_id = cursor.lastrowid
    else:
        user_id = user["id"]
        # Only set password hash if none exists, preserving user updates
        if not user["password_hash"]:
            cursor.execute("UPDATE users SET password_hash = ?, encryption_salt = 'assetvault_salt_v1' WHERE id = ?", (pwd_hash, user_id))

    # 3. Seed Reference Spot Rates (Only if market_rates table is empty)
    cursor.execute("SELECT COUNT(*) as cnt FROM market_rates")
    rates_count = cursor.fetchone()["cnt"]
    if rates_count == 0:
        today_str = datetime.date.today().isoformat()
        now_str = datetime.datetime.now().isoformat()
        for key, rate in BASE_RATES_INR.items():
            metal, purity = key.split("_", 1)
            cursor.execute("""
                INSERT INTO market_rates (metal, purity, rate_per_gram, unit, currency, source, rate_date, fetched_at)
                VALUES (?, ?, ?, 'gram', 'INR', 'Sample/Demo Historical Data', ?, ?)
            """, (metal, purity, rate, today_str, now_str))

    # 3b. Seed 30-Day Market Rate History (Only if history table is empty)
    cursor.execute("SELECT COUNT(*) as cnt FROM market_rate_history")
    history_count = cursor.fetchone()["cnt"]
    if history_count == 0:
        today = datetime.date.today()
        trend_factors = [
            0.972, 0.974, 0.971, 0.975, 0.978, 0.976, 0.979, 0.982, 0.980, 0.983,
            0.985, 0.982, 0.987, 0.989, 0.986, 0.990, 0.992, 0.989, 0.993, 0.995,
            0.992, 0.996, 0.998, 0.995, 0.997, 0.999, 0.998, 1.001, 0.999, 1.000, 1.000
        ]
        for day_offset in range(30, -1, -1):
            idx = 30 - day_offset
            tf = trend_factors[idx] if idx < len(trend_factors) else 1.0
            past_date = today - datetime.timedelta(days=day_offset)
            past_date_str = past_date.isoformat()
            rec_time = f"{past_date_str} 18:00:00"

            for key, base_rate in BASE_RATES_INR.items():
                metal, purity = key.split("_", 1)
                hist_rate = round(base_rate * tf, 2)
                cursor.execute("""
                    INSERT INTO market_rate_history (metal, purity, rate_per_gram, currency, source, recorded_at)
                    VALUES (?, ?, ?, 'INR', 'Sample/Demo Historical Data', ?)
                """, (metal, purity, hist_rate, rec_time))

    # 4. Seed Categories ID map
    cursor.execute("SELECT id, category_name FROM categories")
    cat_map = {row["category_name"]: row["id"] for row in cursor.fetchall()}

    # 5. Seed Realistic Assets (only if no assets exist yet)
    cursor.execute("SELECT COUNT(*) AS c FROM assets WHERE user_id = ?", (user_id,))
    if cursor.fetchone()["c"] > 0:
        conn.commit()
        conn.close()
        print("[*] User holdings already exist; preserving existing user assets and transactions.")
        return

    cursor.execute("DELETE FROM assets WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM alerts WHERE user_id = ?", (user_id,))

    assets_data = [
        {
            "asset_name": "Antique Temple Necklace",
            "category_id": cat_map.get("Jewellery", 2),
            "asset_type": "Necklace",
            "metal": "Gold",
            "purity": "22K",
            "purity_factor": 0.9167,
            "quantity": 1,
            "gross_weight": 65.2,
            "net_weight": 65.2,
            "stone_weight": 0.0,
            "purchase_date": "2019-11-02",
            "purchase_price": 268400.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 268400.0,
            "description": "AV-001 · Handcrafted heirloom 22K temple necklace with intricate nakshi work.",
            "status": "Active",
            "hallmark_huid": "HM-AV001",
            "jeweller_name": "Tanishq Jewellers",
            "invoice_number": "INV-2019-1102",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/temple_necklace.svg"
        },
        {
            "asset_name": "Bangle Pair (Kada)",
            "category_id": cat_map.get("Jewellery", 2),
            "asset_type": "Bangles",
            "metal": "Gold",
            "purity": "22K",
            "purity_factor": 0.9167,
            "quantity": 2,
            "gross_weight": 41.6,
            "net_weight": 41.6,
            "stone_weight": 0.0,
            "purchase_date": "2021-05-14",
            "purchase_price": 214500.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 214500.0,
            "description": "AV-002 · Solid 22K gold kada pair with screw lock.",
            "status": "Active",
            "hallmark_huid": "HM-AV002",
            "jeweller_name": "Kalyan Jewellers",
            "invoice_number": "INV-2021-0514",
            "owner_name": "Kapil & Priya Joint",
            "photo_url": "/img/assets/kada_bangles.svg"
        },
        {
            "asset_name": "Gold Coins 10 g",
            "category_id": cat_map.get("Precious Metals", 1),
            "asset_type": "Bullion Coin",
            "metal": "Gold",
            "purity": "24K",
            "purity_factor": 1.0,
            "quantity": 2,
            "gross_weight": 20.0,
            "net_weight": 20.0,
            "stone_weight": 0.0,
            "purchase_date": "2023-10-24",
            "purchase_price": 124600.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 124600.0,
            "description": "AV-003 · Dhanteras investment 999.9 fine gold minted coins.",
            "status": "Active",
            "hallmark_huid": "MMTC-AV003",
            "jeweller_name": "MMTC-PAMP",
            "invoice_number": "INV-2023-1024",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/gold_coins.svg"
        },
        {
            "asset_name": "Rose Gold Chain",
            "category_id": cat_map.get("Jewellery", 2),
            "asset_type": "Chain",
            "metal": "Gold",
            "purity": "18K",
            "purity_factor": 0.750,
            "quantity": 1,
            "gross_weight": 24.2,
            "net_weight": 24.2,
            "stone_weight": 0.0,
            "purchase_date": "2024-08-19",
            "purchase_price": 168900.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 168900.0,
            "description": "AV-004 · 18K Italian rose gold box chain.",
            "status": "Active",
            "hallmark_huid": "HM-AV004",
            "jeweller_name": "CaratLane",
            "invoice_number": "INV-2024-0819",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/rose_gold_chain.svg"
        },
        {
            "asset_name": "Platinum Wedding Band",
            "category_id": cat_map.get("Jewellery", 2),
            "asset_type": "Ring",
            "metal": "Platinum",
            "purity": "950",
            "purity_factor": 0.950,
            "quantity": 1,
            "gross_weight": 7.5,
            "net_weight": 7.5,
            "stone_weight": 0.0,
            "purchase_date": "2023-01-10",
            "purchase_price": 34800.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 34800.0,
            "description": "AV-005 · PT950 hallmarked comfort fit band.",
            "status": "Active",
            "hallmark_huid": "PT-AV005",
            "jeweller_name": "Platinum Guild",
            "invoice_number": "INV-2023-0110",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/platinum_band.svg"
        },
        {
            "asset_name": "Silver Pooja Set",
            "category_id": cat_map.get("Jewellery", 2),
            "asset_type": "Pooja Thali & Diya",
            "metal": "Silver",
            "purity": "925",
            "purity_factor": 0.925,
            "quantity": 1,
            "gross_weight": 1240.0,
            "net_weight": 1240.0,
            "stone_weight": 0.0,
            "purchase_date": "2018-10-30",
            "purchase_price": 62000.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 62000.0,
            "description": "AV-006 · Sterling silver engraved pooja thali, diya, and bell.",
            "status": "Active",
            "hallmark_huid": "SLV-AV006",
            "jeweller_name": "Silver Emporium",
            "invoice_number": "INV-2018-1030",
            "owner_name": "Family Vault",
            "photo_url": "/img/assets/silver_pooja.svg"
        },
        {
            "asset_name": "Silver Bars 100 g",
            "category_id": cat_map.get("Precious Metals", 1),
            "asset_type": "Silver Bars",
            "metal": "Silver",
            "purity": "999",
            "purity_factor": 1.0,
            "quantity": 5,
            "gross_weight": 500.0,
            "net_weight": 500.0,
            "stone_weight": 0.0,
            "purchase_date": "2020-02-09",
            "purchase_price": 31500.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 31500.0,
            "description": "AV-007 · Five 999 purity 100g serialized silver minted bars.",
            "status": "Active",
            "hallmark_huid": "SLV-AV007",
            "jeweller_name": "RSBL Bullion",
            "invoice_number": "INV-2020-0209",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/silver_bars.svg"
        },
        {
            "asset_name": "Solitaire Engagement Ring",
            "category_id": cat_map.get("Diamonds & Solitaires", 3),
            "asset_type": "Ring",
            "metal": "Diamond",
            "purity": "18K",
            "purity_factor": 0.750,
            "quantity": 1,
            "gross_weight": 4.5,
            "net_weight": 4.29,
            "stone_weight": 0.21,
            "purchase_date": "2020-02-14",
            "purchase_price": 385000.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 385000.0,
            "description": "AV-008 · GIA certified 1.02 ct F color VS1 clarity diamond solitaire ring.",
            "status": "Active",
            "hallmark_huid": "DM-AV008",
            "jeweller_name": "Tanishq Diamonds",
            "invoice_number": "INV-2020-0214",
            "diamond_carat": 1.02,
            "diamond_cut": "Excellent",
            "diamond_color": "F",
            "diamond_clarity": "VS1",
            "diamond_shape": "Round Brilliant",
            "diamond_cert_lab": "GIA",
            "diamond_cert_number": "GIA-6382910",
            "owner_name": "Priya Khadase",
            "photo_url": "/img/assets/solitaire_ring.svg"
        },
        {
            "asset_name": "Diamond Stud Earrings",
            "category_id": cat_map.get("Diamonds & Solitaires", 3),
            "asset_type": "Earrings",
            "metal": "Diamond",
            "purity": "18K",
            "purity_factor": 0.750,
            "quantity": 2,
            "gross_weight": 3.8,
            "net_weight": 3.6,
            "stone_weight": 0.20,
            "purchase_date": "2023-03-11",
            "purchase_price": 142000.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 142000.0,
            "description": "AV-009 · Pair of 0.50 ct each (1.0 ct total) G/VS2 diamond studs.",
            "status": "Active",
            "hallmark_huid": "DM-AV009",
            "jeweller_name": "BlueStone",
            "invoice_number": "INV-2023-0311",
            "diamond_carat": 1.00,
            "diamond_cut": "Very Good",
            "diamond_color": "G",
            "diamond_clarity": "VS2",
            "diamond_shape": "Round",
            "diamond_cert_lab": "IGI",
            "diamond_cert_number": "IGI-881920",
            "owner_name": "Priya Khadase",
            "photo_url": "/img/assets/diamond_earrings.svg"
        },
        {
            "asset_name": "MMTC-PAMP 24K Digital Gold",
            "category_id": cat_map.get("Digital Gold & ETFs", 1),
            "asset_type": "Digital Gold",
            "metal": "Gold",
            "purity": "24K",
            "purity_factor": 1.0,
            "quantity": 1,
            "gross_weight": 25.0,
            "net_weight": 25.0,
            "stone_weight": 0.0,
            "purchase_date": "2022-08-10",
            "purchase_price": 132500.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 132500.0,
            "description": "AV-010 · 25.0g 999.9 24K pure Digital Gold vaulted securely with MMTC-PAMP / IDBI Trusteeship. 0% making charges.",
            "status": "Active",
            "hallmark_huid": "VAULT-MMTC-104928",
            "jeweller_name": "MMTC-PAMP Digital Vault",
            "invoice_number": "DIGI-2022-0810",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/digital_gold.svg"
        },
        {
            "asset_name": "Sovereign Gold Bond (SGB 2021-22)",
            "category_id": cat_map.get("Digital Gold & ETFs", 1),
            "asset_type": "Sovereign Gold Bond (SGB)",
            "metal": "Gold",
            "purity": "24K",
            "purity_factor": 1.0,
            "quantity": 1,
            "gross_weight": 20.0,
            "net_weight": 20.0,
            "stone_weight": 0.0,
            "purchase_date": "2021-12-05",
            "purchase_price": 95800.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 95800.0,
            "description": "AV-011 · 20.0 units RBI Sovereign Gold Bond 2021-22 Series IX with 2.5% semi-annual coupon + tax-exempt capital gains on redemption.",
            "status": "Active",
            "hallmark_huid": "RBI-SGB-2021-IX-84920",
            "jeweller_name": "Reserve Bank of India (RBI)",
            "invoice_number": "SGB-CERT-2021-84920",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/gold_sgb.svg"
        },
        {
            "asset_name": "Gold Bar 50 g",
            "category_id": cat_map.get("Precious Metals", 1),
            "asset_type": "Bar",
            "metal": "Gold",
            "purity": "24K",
            "purity_factor": 1.0,
            "quantity": 1,
            "gross_weight": 50.0,
            "net_weight": 50.0,
            "stone_weight": 0.0,
            "purchase_date": "2020-04-10",
            "purchase_price": 146000.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 146000.0,
            "description": "MMTC-PAMP 24K 50g Gold Cast Bar. Sold at MMTC buy-back rate.",
            "status": "Sold",
            "hallmark_huid": "PAMP-SOLD",
            "jeweller_name": "MMTC-PAMP",
            "invoice_number": "INV-2020-0410",
            "owner_name": "Kapil Khadase",
            "photo_url": "/img/assets/gold_bar_50g.svg"
        }
    ]

    for item in assets_data:
        cert_token = secrets.token_urlsafe(24)
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
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?
            )
        """, (
            user_id, item["asset_name"], item["category_id"], item["asset_type"], item["metal"], item["purity"], item["purity_factor"],
            item["quantity"], item["gross_weight"], item["net_weight"], item["stone_weight"], item["purchase_date"], item["purchase_price"],
            item["making_charges"], item["wastage"], item["taxes"], item["total_acquisition_cost"], item["description"], item["status"],
            item.get("hallmark_huid"), item.get("jeweller_name"), item.get("invoice_number"), item.get("diamond_carat", 0.0), item.get("diamond_cut"),
            item.get("diamond_color"), item.get("diamond_clarity"), item.get("diamond_shape"), item.get("diamond_cert_lab"), item.get("diamond_cert_number"),
            item.get("photo_url"), item.get("owner_name", ""), cert_token
        ))
        asset_id = cursor.lastrowid

        # Insert acquisition transaction
        cursor.execute("""
            INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
            VALUES (?, ?, 'PURCHASE', ?, ?, 0.0, ?, ?)
        """, (user_id, asset_id, item["purchase_date"], item["total_acquisition_cost"], item.get("jeweller_name", "Jeweller"), f"Acquired {item['asset_name']}"))

        # If sold item, record SALE transaction with realized profit
        if item["status"] == "Sold":
            sale_price = 398500.0
            realized_pnl = round(sale_price - item["total_acquisition_cost"], 2)
            cursor.execute("""
                INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
                VALUES (?, ?, 'SALE', '2025-11-03', ?, ?, 'MMTC-PAMP Desk', 'Sold at MMTC buy-back rate')
            """, (user_id, asset_id, sale_price, realized_pnl))

    # 6. Seed Sample Alerts
    cursor.execute("""
        INSERT INTO alerts (user_id, alert_type, target_metal, target_value, condition, notes)
        VALUES (?, 'PRICE_TARGET', 'GOLD', 7600.0, 'GREATER_THAN', 'Alert when 24K Gold crosses ₹7,600/g')
    """, (user_id,))
    cursor.execute("""
        INSERT INTO alerts (user_id, alert_type, target_metal, target_value, condition, notes)
        VALUES (?, 'PORTFOLIO_TARGET', '', 1200000.0, 'GREATER_THAN', 'Milestone alert when portfolio reaches ₹12 Lakhs')
    """, (user_id,))

    # 7. Seed Real Authentic Physical Vault Documents & Verification Certificates
    try:
        try:
            from services.document_seeder import seed_documents_for_user
        except ImportError:
            from backend.services.document_seeder import seed_documents_for_user
        seed_documents_for_user(user_id)
    except Exception as e:
        print(f"Notice: Document seeding skipped or error: {e}")

    conn.commit()
    conn.close()
    print("Database seeded successfully with demo user, live market rates, luxury assets, and vault documents!")

if __name__ == "__main__":
    seed_database()
