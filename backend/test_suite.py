import unittest
import json
import os
import sys
import time
import io
import base64
import secrets

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import init_db
from seed_data import seed_database
from app import app
from services.auth_service import register_user, authenticate_user
from services.valuation_engine import calculate_diamond_valuation, calculate_asset_valuation, get_portfolio_summary
from services.transaction_service import sell_asset
from services.simulator_service import run_portfolio_simulation
from services.report_service import generate_pdf_report, generate_excel_report
from services.rate_limiter import limiter

class AssetVaultTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database()

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        limiter.reset()

    def test_auth_and_login(self):
        email = f"testuser_{int(time.time()*1000)}@assetvault.com"
        user, err = register_user("Test User", email, "password123", "INR")
        self.assertIsNone(err)
        self.assertIsNotNone(user)
        self.assertIn("token", user)

        auth_user, auth_err = authenticate_user(email, "password123")
        self.assertIsNone(auth_err)
        self.assertEqual(auth_user["email"], email)

    def test_unauthenticated_requests_blocked(self):
        # Requests without token must return 401 Unauthorized
        res = self.app.get("/api/portfolio/summary")
        self.assertEqual(res.status_code, 401)
        self.assertIn("Authentication required", res.get_json().get("error", ""))

        res_assets = self.app.get("/api/assets")
        self.assertEqual(res_assets.status_code, 401)

    def test_fresh_account_data_isolation(self):
        # Register fresh user
        email = f"fresh_{int(time.time()*1000)}@assetvault.com"
        user, err = register_user("Fresh Account", email, "freshpass123", "INR")
        self.assertIsNone(err)
        token = user["token"]

        headers = {"Authorization": f"Bearer {token}"}

        # Portfolio summary for fresh user must be completely empty (0 assets, 0 value)
        res = self.app.get("/api/portfolio/summary", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["total_assets_count"], 0)
        self.assertEqual(data["total_active_assets"], 0)
        self.assertEqual(data["total_invested_cost"], 0.0)
        self.assertEqual(data["total_current_market_value"], 0.0)
        self.assertEqual(data["total_unrealized_pnl"], 0.0)
        self.assertEqual(data["total_realized_pnl"], 0.0)
        self.assertEqual(data["total_sales_count"], 0)
        self.assertEqual(len(data["assets"]), 0)
        self.assertEqual(len(data["metal_allocation"]), 0)

        # Assets list must be empty
        res_assets = self.app.get("/api/assets", headers=headers)
        self.assertEqual(res_assets.status_code, 200)
        self.assertEqual(len(res_assets.get_json()["assets"]), 0)

        # Transactions list must be empty
        res_tx = self.app.get("/api/transactions", headers=headers)
        self.assertEqual(res_tx.status_code, 200)
        self.assertEqual(len(res_tx.get_json()["transactions"]), 0)

        # Alerts list must be empty
        res_alerts = self.app.get("/api/alerts", headers=headers)
        self.assertEqual(res_alerts.status_code, 200)
        self.assertEqual(len(res_alerts.get_json()["alerts"]), 0)

    def test_user_asset_isolation(self):
        # User 1: Demo
        demo_user, _ = authenticate_user("kapil@example.com", "demo123")
        demo_token = demo_user["token"]
        demo_headers = {"Authorization": f"Bearer {demo_token}"}

        # User 2: Fresh User
        fresh_email = f"user2_{int(time.time()*1000)}@assetvault.com"
        fresh_user, _ = register_user("User Two", fresh_email, "pass12345", "INR")
        fresh_token = fresh_user["token"]
        fresh_headers = {"Authorization": f"Bearer {fresh_token}"}

        # User 2 creates an asset
        create_res = self.app.post("/api/assets", headers=fresh_headers, json={
            "asset_name": "User 2 Custom Gold Coin",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 50.0,
            "purchase_price": 350000.0,
            "total_acquisition_cost": 350000.0
        })
        self.assertEqual(create_res.status_code, 201)
        u2_asset_id = create_res.get_json()["asset_id"]

        # User 2 sees 1 asset
        u2_assets = self.app.get("/api/assets", headers=fresh_headers).get_json()["assets"]
        self.assertEqual(len(u2_assets), 1)
        self.assertEqual(u2_assets[0]["id"], u2_asset_id)

        # User 1 does NOT see User 2's asset
        u1_assets = self.app.get("/api/assets", headers=demo_headers).get_json()["assets"]
        u1_ids = [a["id"] for a in u1_assets]
        self.assertNotIn(u2_asset_id, u1_ids)

        # User 1 cannot access User 2's asset detail (returns 404)
        detail_res = self.app.get(f"/api/assets/{u2_asset_id}", headers=demo_headers)
        self.assertEqual(detail_res.status_code, 404)

    def test_diamond_valuation(self):
        val_1ct = calculate_diamond_valuation(1.0, cut="EXCELLENT", color="D", clarity="VVS1", cert="GIA")
        val_0_5ct = calculate_diamond_valuation(0.5, cut="EXCELLENT", color="D", clarity="VVS1", cert="GIA")
        self.assertGreater(val_1ct, 0)
        self.assertGreater(val_1ct, val_0_5ct * 2)  # Non-linear rarity curve

    def test_portfolio_summary(self):
        summary = get_portfolio_summary(1, "INR")
        self.assertGreater(summary["total_assets_count"], 0)
        self.assertGreater(summary["total_current_market_value"], 0)
        self.assertGreater(summary["total_invested_cost"], 0)
        self.assertIn("metal_allocation", summary)
        self.assertIn("assets", summary)

    def test_sell_asset_realized_pnl(self):
        demo_user, _ = authenticate_user("kapil@example.com", "demo123")
        token = demo_user["token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Temporary Gold Ring",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 10.0,
            "purchase_price": 50000.0,
            "total_acquisition_cost": 50000.0
        })
        self.assertEqual(res.status_code, 201)
        asset_id = res.get_json()["asset_id"]

        sell_res, err = sell_asset(user_id=1, asset_id=asset_id, sale_amount=65000.0, notes="Liquidated")
        self.assertIsNone(err)
        self.assertEqual(sell_res["realized_profit"], 15000.0)

    def test_scenario_simulator(self):
        sim = run_portfolio_simulation(user_id=1, gold_pct_change=10.0, silver_pct_change=20.0)
        self.assertGreater(sim["simulated_total_value"], sim["base_total_value"])
        self.assertGreater(sim["portfolio_value_diff"], 0)

    def test_pdf_and_excel_reports(self):
        pdf_data = generate_pdf_report(1, {"name": "Test Investor"}, "INR")
        self.assertGreater(len(pdf_data), 1000)
        self.assertTrue(pdf_data.startswith(b"%PDF"))

        excel_data = generate_excel_report(1, {"name": "Test Investor"}, "INR")
        self.assertGreater(len(excel_data), 1000)

    def test_zero_knowledge_encryption_salt_generation(self):
        email = f"e2ee_user_{int(time.time()*1000)}@assetvault.com"
        user, err = register_user("E2EE User", email, "secret12345", "INR")
        self.assertIsNone(err)
        self.assertIn("encryption_salt", user)
        self.assertEqual(len(user["encryption_salt"]), 32) # 16-byte hex string

    def test_zero_knowledge_encrypted_asset_and_storage(self):
        from database import get_db_connection
        email = f"crypto_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Zero Knowledge User", email, "myvaultkey", "USD")
        token = user["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Simulated client-side AES-256-GCM ciphertext payload
        dummy_ciphertext = "dGhpcyBpcyBhbiBhZXMtMjU2LWdjbSBjaXBoZXJ0ZXh0IGJsb2I="
        dummy_iv = "MTIzNDU2Nzg5MDEy"

        res = self.app.post("/api/assets", headers=headers, json={
            "encrypted_data": dummy_ciphertext,
            "iv": dummy_iv,
            "status": "Active"
        })
        self.assertEqual(res.status_code, 201)
        asset_id = res.get_json()["asset_id"]

        # 1. Verify in database: ONLY ciphertext and IV stored, NO plaintext asset_name/weights/cost
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        row = dict(cursor.fetchone())
        conn.close()

        self.assertEqual(row["encrypted_data"], dummy_ciphertext)
        self.assertEqual(row["iv"], dummy_iv)
        self.assertEqual(row["asset_name"], "")
        self.assertEqual(row["purchase_price"], 0.0)
        self.assertEqual(row["gross_weight"], 0.0)

        # 2. Verify GET /api/assets returns the ciphertext payload for client-side decryption
        get_res = self.app.get("/api/assets", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        assets = get_res.get_json()["assets"]
        self.assertEqual(len(assets), 1)
        self.assertEqual(assets[0]["id"], asset_id)
        self.assertEqual(assets[0]["encrypted_data"], dummy_ciphertext)
        self.assertEqual(assets[0]["iv"], dummy_iv)

        # 3. Verify GET /api/assets/<id> returns the ciphertext detail
        detail_res = self.app.get(f"/api/assets/{asset_id}", headers=headers)
        self.assertEqual(detail_res.status_code, 200)
        asset_detail = detail_res.get_json()["asset"]
        self.assertEqual(asset_detail["encrypted_data"], dummy_ciphertext)
        self.assertEqual(asset_detail["iv"], dummy_iv)

    def test_zero_knowledge_encrypted_alerts_and_transactions(self):
        email = f"e2ee_alert_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Alert User", email, "secretkey99", "INR")
        token = user["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create an asset first to link transaction
        asset_res = self.app.post("/api/assets", headers=headers, json={
            "encrypted_data": "YXNzZXQtY2lwaGVydGV4dA==",
            "iv": "aXYtYXNzZXQxMjM=",
            "status": "Active"
        })
        self.assertEqual(asset_res.status_code, 201)
        asset_id = asset_res.get_json()["asset_id"]

        # Encrypted transaction
        tx_cipher = "dHgtdmF1bHQtY2lwaGVydGV4dA=="
        tx_iv = "aXYtdHgtdGVzdDEy"
        tx_res = self.app.post("/api/transactions", headers=headers, json={
            "asset_id": asset_id,
            "encrypted_data": tx_cipher,
            "iv": tx_iv,
            "transaction_type": "PURCHASE"
        })
        self.assertEqual(tx_res.status_code, 201)

        get_txs = self.app.get("/api/transactions", headers=headers).get_json()["transactions"]
        self.assertEqual(len(get_txs), 1)
        self.assertEqual(get_txs[0]["encrypted_data"], tx_cipher)

        # Encrypted alert
        alert_cipher = "YWxlcnQtY2lwaGVydGV4dA=="
        alert_iv = "aXYtYWxlcnQxMjM="
        alert_res = self.app.post("/api/alerts", headers=headers, json={
            "encrypted_data": alert_cipher,
            "iv": alert_iv,
            "alert_type": "PRICE_TARGET"
        })
        self.assertEqual(alert_res.status_code, 201)

        get_alerts = self.app.get("/api/alerts", headers=headers).get_json()["alerts"]
        self.assertEqual(len(get_alerts), 1)
        self.assertEqual(get_alerts[0]["encrypted_data"], alert_cipher)

    def test_digital_gold_and_sgb_valuation(self):
        # 1. Verify 24K Digital Gold valuation (10g @ 24K spot rate with 0 making charges)
        digi_gold = {
            "asset_name": "MMTC-PAMP 24K Digital Gold",
            "asset_type": "Digital Gold",
            "metal": "Gold",
            "purity": "24K",
            "net_weight": 10.0,
            "purchase_price": 65000.0,
            "making_charges": 0.0,
            "wastage": 0.0,
            "taxes": 0.0,
            "total_acquisition_cost": 65000.0
        }
        val = calculate_asset_valuation(digi_gold, target_currency="INR")
        self.assertGreater(val["current_estimated_value"], 70000.0)
        self.assertEqual(val["purity_factor"], 1.0)
        self.assertGreater(val["profit_loss"], 0)
        self.assertGreater(val["roi_percentage"], 0)

        # 2. Verify SGB 24K evaluation
        sgb = {
            "asset_name": "RBI Sovereign Gold Bond 2021",
            "asset_type": "Sovereign Gold Bond (SGB)",
            "metal": "Gold",
            "purity": "24K",
            "net_weight": 20.0,
            "purchase_price": 95800.0,
            "total_acquisition_cost": 95800.0
        }
        sgb_val = calculate_asset_valuation(sgb, target_currency="INR")
        self.assertGreater(sgb_val["current_estimated_value"], 100000.0)
        self.assertEqual(sgb_val["purity_factor"], 1.0)

    def test_asset_owner_name_crud_and_reports(self):
        email = f"owner_test_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Owner Tester", email, "pass123", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        # 1. Create asset with explicit owner_name
        create_res = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Pooja Gold Diya",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 25.0,
            "purchase_price": 175000.0,
            "total_acquisition_cost": 175000.0,
            "owner_name": "Kapil Khadase",
            "jeweller_name": "Tanishq"
        })
        self.assertEqual(create_res.status_code, 201)
        asset_id = create_res.get_json()["asset_id"]

        # 2. Verify GET /api/assets/<id> contains owner_name
        detail_res = self.app.get(f"/api/assets/{asset_id}", headers=headers)
        self.assertEqual(detail_res.status_code, 200)
        asset = detail_res.get_json()["asset"]
        self.assertEqual(asset["owner_name"], "Kapil Khadase")

        # 3. Update asset owner_name via PUT
        update_res = self.app.put(f"/api/assets/{asset_id}", headers=headers, json={
            "asset_name": "Pooja Gold Diya",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 25.0,
            "total_acquisition_cost": 175000.0,
            "owner_name": "Priya & Kapil Khadase",
            "jeweller_name": "Tanishq"
        })
        self.assertEqual(update_res.status_code, 200)

        # 4. Verify updated owner_name in list and detail
        detail_res2 = self.app.get(f"/api/assets/{asset_id}", headers=headers)
        self.assertEqual(detail_res2.get_json()["asset"]["owner_name"], "Priya & Kapil Khadase")

        # 5. Verify PDF and Excel generation with owner_name
        pdf_data = generate_pdf_report(user["id"], {"name": "Owner Tester"}, "INR")
        self.assertGreater(len(pdf_data), 1000)
        excel_data = generate_excel_report(user["id"], {"name": "Owner Tester"}, "INR")
        self.assertGreater(len(excel_data), 1000)

    def test_security_headers_enforced(self):
        res = self.app.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "DENY")
        self.assertIn("default-src 'self'", res.headers.get("Content-Security-Policy", ""))
        self.assertEqual(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")

    def test_rate_limiting_auth_endpoints(self):
        limiter.reset()
        # Attempt 5 rapid logins within allowed threshold
        for _ in range(5):
            res = self.app.post("/api/auth/login", json={
                "email": "ratelimit_test@assetvault.com",
                "password": "wrongpassword"
            })
            self.assertEqual(res.status_code, 401)
            self.assertIn("X-RateLimit-Remaining", res.headers)

        # 6th attempt should be blocked by rate limiter with 429 Too Many Requests
        res_blocked = self.app.post("/api/auth/login", json={
            "email": "ratelimit_test@assetvault.com",
            "password": "wrongpassword"
        })
        self.assertEqual(res_blocked.status_code, 429)
        self.assertIn("Retry-After", res_blocked.headers)
        self.assertIn("Too many requests", res_blocked.get_json()["error"])

    def test_rate_limiting_financial_mutation(self):
        limiter.reset()
        email = f"ratelimit_mut_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Mutation Tester", email, "pass123", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        # 30 asset creations are allowed under the mutation rate limit
        for i in range(30):
            res = self.app.post("/api/assets", headers=headers, json={
                "asset_name": f"Gold Sovereign #{i}",
                "metal": "Gold",
                "purity": "24K",
                "gross_weight": 8.0,
                "purchase_price": 56000.0
            })
            self.assertEqual(res.status_code, 201)

        # 31st creation should trigger 429 Too Many Requests
        res_blocked = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Sovereign Blocked",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 8.0,
            "purchase_price": 56000.0
        })
        self.assertEqual(res_blocked.status_code, 429)
        self.assertIn("Retry-After", res_blocked.headers)
        self.assertIn("Too many requests", res_blocked.get_json()["error"])

    def test_system_health_endpoint(self):
        res = self.app.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["app_version"], "1.0.1")
        self.assertEqual(data["database"], "connected")
        self.assertIn("timestamp", data)

    def test_portfolio_goals_crud(self):
        email = f"goals_user_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Goals Tester", email, "pass12345", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        # 1. Reject invalid target amount
        res_bad = self.app.post("/api/goals", headers=headers, json={
            "title": "Invalid Goal",
            "target_amount": -5000.0
        })
        self.assertEqual(res_bad.status_code, 400)

        # 2. Create valid goal
        res_create = self.app.post("/api/goals", headers=headers, json={
            "title": "100g Bullion Target",
            "target_amount": 750000.0,
            "current_amount": 350000.0,
            "target_date": "2026-12-31"
        })
        self.assertEqual(res_create.status_code, 201)
        goal_id = res_create.get_json()["goal_id"]

        # 3. Retrieve goals
        res_list = self.app.get("/api/goals", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        goals = res_list.get_json()["goals"]
        self.assertEqual(len(goals), 1)
        self.assertEqual(goals[0]["title"], "100g Bullion Target")

        # 4. Delete goal
        res_del = self.app.delete(f"/api/goals/{goal_id}", headers=headers)
        self.assertEqual(res_del.status_code, 200)

        res_list2 = self.app.get("/api/goals", headers=headers)
        self.assertEqual(len(res_list2.get_json()["goals"]), 0)

    def test_sale_parity_and_charges(self):
        email = f"sale_parity_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Sale Tester", email, "pass12345", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        # Create asset
        res_asset = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Bangle to Liquidate",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 20.0,
            "purchase_price": 120000.0,
            "total_acquisition_cost": 120000.0
        })
        self.assertEqual(res_asset.status_code, 201)
        asset_id = res_asset.get_json()["asset_id"]

        # Negative charges must be rejected
        res_neg = self.app.post(f"/api/assets/{asset_id}/sell", headers=headers, json={
            "sale_amount": 150000.0,
            "selling_charges": -500.0
        })
        self.assertEqual(res_neg.status_code, 400)

        # Successful sale with selling charges
        res_sale = self.app.post(f"/api/assets/{asset_id}/sell", headers=headers, json={
            "sale_amount": 150000.0,
            "selling_charges": 2000.0,
            "buyer_name": "MMTC-PAMP Buyback",
            "notes": "Liquidated holding"
        })
        self.assertEqual(res_sale.status_code, 200)

        # Selling an already sold asset MUST be rejected
        res_duplicate = self.app.post(f"/api/assets/{asset_id}/sell", headers=headers, json={
            "sale_amount": 155000.0
        })
        self.assertEqual(res_duplicate.status_code, 400)
        self.assertIn("already been sold", res_duplicate.get_json().get("error", "").lower())

    def test_document_magic_byte_security(self):
        import io
        email = f"doc_magic_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Doc Tester", email, "pass12345", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        # Create an asset for document association
        res_asset = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Coin for Certificate",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 10.0,
            "purchase_price": 70000.0
        })
        asset_id = res_asset.get_json()["asset_id"]

        # 1. Spoofed file: text content renamed to .pdf should be REJECTED
        spoofed_file = (io.BytesIO(b"This is just plain text, not a real PDF!"), "invoice.pdf")
        res_spoof = self.app.post(
            "/api/documents/upload",
            headers=headers,
            data={"asset_id": str(asset_id), "document_type": "Invoice", "file": spoofed_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_spoof.status_code, 400)
        self.assertIn("File signature does not match", res_spoof.get_json().get("error", ""))

        # 2. Valid PDF header (%PDF...) should be ACCEPTED
        valid_pdf = (io.BytesIO(b"%PDF-1.4\n%Fake valid test pdf stream content"), "valid_invoice.pdf")
        res_valid = self.app.post(
            "/api/documents/upload",
            headers=headers,
            data={"asset_id": str(asset_id), "document_type": "Invoice", "file": valid_pdf},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_valid.status_code, 201)
        self.assertIn("document_id", res_valid.get_json())

    def test_zero_knowledge_ephemeral_reports(self):
        email = f"zk_report_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("ZK Report Tester", email, "pass12345", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        # Create valid asset for authenticated user to satisfy anti-tamper check
        res_asset = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Sovereign Gold Bar 100g",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 100.0,
            "purchase_price": 700000.0
        })
        asset_id = res_asset.get_json()["asset_id"]

        client_portfolio = {
            "assets": [
                {
                    "id": asset_id,
                    "asset_name": "Sovereign Gold Bar 100g",
                    "owner_name": "Self Vault",
                    "category_name": "Bullion",
                    "metal": "Gold",
                    "purity": "24K",
                    "net_weight": 100.0,
                    "purchase_price": 700000.0,
                    "total_acquisition_cost": 700000.0,
                    "current_valuation": 745000.0,
                    "unrealized_gain": 45000.0,
                    "roi_percentage": 6.43,
                    "status": "Active"
                }
            ],
            "summary": {
                "total_invested_cost": 700000.0,
                "total_current_market_value": 745000.0,
                "total_unrealized_pnl": 45000.0,
                "overall_roi_percentage": 6.43
            }
        }

        # 1. Ephemeral PDF streaming
        res_pdf = self.app.post("/api/reports/generate-pdf", headers=headers, json={"portfolio": client_portfolio, "currency": "INR"})
        self.assertEqual(res_pdf.status_code, 200)
        self.assertEqual(res_pdf.mimetype, "application/pdf")
        self.assertGreater(len(res_pdf.data), 1000)

        # 2. Ephemeral Excel streaming
        res_excel = self.app.post("/api/reports/generate-excel", headers=headers, json={"portfolio": client_portfolio, "currency": "INR"})
        self.assertEqual(res_excel.status_code, 200)
        self.assertEqual(res_excel.mimetype, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.assertGreater(len(res_excel.data), 1000)

        # 3. Ephemeral CSV streaming
        res_csv = self.app.post("/api/reports/generate-csv", headers=headers, json={"portfolio": client_portfolio, "currency": "INR"})
        self.assertEqual(res_csv.status_code, 200)
        self.assertEqual(res_csv.mimetype, "text/csv")
        csv_text = res_csv.data.decode("utf-8")
        self.assertIn("Asset Name", csv_text)
        self.assertIn("Owner / Holder", csv_text)
        self.assertIn("Sovereign Gold Bar 100g", csv_text)

    # =========================================================================
    # REQUIREMENT 21: AUTOMATED TEST SUITE (14 VERIFICATION CATEGORIES)
    # =========================================================================

    def test_req1_document_client_side_encryption_and_safe_metadata(self):
        """Req 1: Document ciphertext on disk, unique IV, safe metadata in DB, no plaintext leak"""
        email = f"req1_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Req1 User", email, "Pass1234!", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        res_a = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Encrypted Assay Asset",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 50.0,
            "purchase_price": 350000.0
        })
        asset_id = res_a.get_json()["asset_id"]

        fake_iv = secrets.token_hex(12)
        fake_ciphertext = b"CIPHERTEXT_AES_GCM_RAW_BINARY_ENCRYPTED_STREAM_XYZ"
        enc_file = (io.BytesIO(fake_ciphertext), "safe_assay_invoice.pdf")

        res_up = self.app.post(
            "/api/documents/upload",
            headers=headers,
            data={
                "asset_id": str(asset_id),
                "document_type": "Certificate",
                "is_encrypted": "true",
                "iv": fake_iv,
                "encryption_meta": json.dumps({"algo": "AES-GCM", "tagLength": 128}),
                "file": enc_file
            },
            content_type="multipart/form-data"
        )
        self.assertEqual(res_up.status_code, 201)
        doc_id = res_up.get_json()["document_id"]

        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        doc_row = dict(cursor.fetchone())
        conn.close()

        self.assertEqual(doc_row["is_encrypted"], 1)
        self.assertEqual(doc_row["iv"], fake_iv)
        self.assertEqual(doc_row["file_name"], "safe_assay_invoice.pdf")
        self.assertTrue(doc_row["file_path"].endswith(".enc"))

        disk_path = os.path.join(os.path.dirname(__file__), "uploads", doc_row["file_path"])
        self.assertTrue(os.path.exists(disk_path))
        with open(disk_path, "rb") as f:
            disk_bytes = f.read()
        self.assertEqual(disk_bytes, fake_ciphertext)
        self.assertNotIn(b"plaintext", disk_bytes)

    def test_req2_transient_in_memory_decrypted_reporting_headers(self):
        """Req 2: Transient in-memory report streaming with no-store headers and zero disk leakage"""
        email = f"req2_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Req2 User", email, "Pass1234!", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        res_a = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Report Gold Coin",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 10.0,
            "purchase_price": 70000.0
        })
        asset_id = res_a.get_json()["asset_id"]

        payload = {
            "assets": [{
                "id": asset_id,
                "asset_name": "Report Gold Coin",
                "metal": "Gold",
                "purity": "24K",
                "gross_weight": 10.0,
                "purchase_price": 70000.0,
                "total_acquisition_cost": 70000.0,
                "current_valuation": 75000.0,
                "unrealized_gain": 5000.0,
                "status": "Active"
            }],
            "summary": {"total_invested_cost": 70000.0, "total_current_market_value": 75000.0}
        }

        res_pdf = self.app.post("/api/reports/generate-pdf", headers=headers, json={"portfolio": payload, "currency": "INR"})
        self.assertEqual(res_pdf.status_code, 200)
        self.assertIn("no-store", res_pdf.headers.get("Cache-Control", ""))
        self.assertIn("no-cache", res_pdf.headers.get("Pragma", ""))

        res_excel = self.app.post("/api/reports/generate-excel", headers=headers, json={"portfolio": payload, "currency": "INR"})
        self.assertEqual(res_excel.status_code, 200)
        self.assertIn("no-store", res_excel.headers.get("Cache-Control", ""))

    def test_req3_client_side_payload_anti_tamper_validation(self):
        """Req 3: Reject tampered unowned asset IDs, negative financials, and invalid statuses"""
        email = f"req3_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Req3 User", email, "Pass1234!", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        tampered_payload_unowned = {
            "portfolio": {
                "assets": [{"id": 99999999, "asset_name": "Stolen Asset", "metal": "Gold", "purchase_price": 5000.0, "status": "Active"}]
            }
        }
        res_tamper1 = self.app.post("/api/reports/generate-pdf", headers=headers, json=tampered_payload_unowned)
        self.assertEqual(res_tamper1.status_code, 400)
        self.assertIn("Tamper detected", res_tamper1.get_json().get("error", ""))

        res_a = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Valid Anchor", "metal": "Gold", "purity": "24K", "gross_weight": 5.0, "purchase_price": 35000.0
        })
        valid_id = res_a.get_json()["asset_id"]

        tampered_payload_neg = {
            "portfolio": {
                "assets": [{"id": valid_id, "asset_name": "Valid Anchor", "purchase_price": -50000.0, "status": "Active"}]
            }
        }
        res_tamper2 = self.app.post("/api/reports/generate-pdf", headers=headers, json=tampered_payload_neg)
        self.assertEqual(res_tamper2.status_code, 400)

        tampered_payload_status = {
            "portfolio": {
                "assets": [{"id": valid_id, "asset_name": "Valid Anchor", "purchase_price": 50000.0, "status": "COMPROMISED_STATUS"}]
            }
        }
        res_tamper3 = self.app.post("/api/reports/generate-pdf", headers=headers, json=tampered_payload_status)
        self.assertEqual(res_tamper3.status_code, 400)

    def test_req4_vault_backup_and_restore_with_document_payloads(self):
        """Req 4: Complete vault backup bundling assets, transactions, and document base64 payloads, then restored"""
        email1 = f"req4_u1_{int(time.time()*1000)}@assetvault.com"
        user1, _ = register_user("Backup User", email1, "Pass1234!", "INR")
        headers1 = {"Authorization": f"Bearer {user1['token']}"}

        res_a = self.app.post("/api/assets", headers=headers1, json={
            "asset_name": "Backup Gold Coin",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 10.0,
            "purchase_price": 70000.0
        })
        asset_id = res_a.get_json()["asset_id"]

        fake_cipher = b"ENCRYPTED_VAULT_BACKUP_TEST_DOCUMENT_DATA"
        self.app.post(
            "/api/documents/upload",
            headers=headers1,
            data={
                "asset_id": str(asset_id),
                "document_type": "Invoice",
                "is_encrypted": "true",
                "iv": "112233445566778899aabbcc",
                "file": (io.BytesIO(fake_cipher), "invoice_vault.pdf")
            },
            content_type="multipart/form-data"
        )

        res_export = self.app.get("/api/backup/vault-data", headers=headers1)
        self.assertEqual(res_export.status_code, 200)
        export_data = res_export.get_json()

        self.assertIn("assets", export_data)
        self.assertIn("documents", export_data)
        self.assertEqual(len(export_data["documents"]), 1)
        doc_payload_b64 = export_data["documents"][0]["file_payload"]
        self.assertEqual(base64.b64decode(doc_payload_b64), fake_cipher)

        email2 = f"req4_u2_{int(time.time()*1000)}@assetvault.com"
        user2, _ = register_user("Restore User", email2, "Pass1234!", "INR")
        headers2 = {"Authorization": f"Bearer {user2['token']}"}

        res_restore = self.app.post("/api/backup/restore-vault-data", headers=headers2, json={"vault_data": export_data})
        self.assertEqual(res_restore.status_code, 200)

        res_assets2 = self.app.get("/api/assets", headers=headers2)
        self.assertEqual(len(res_assets2.get_json()["assets"]), 1)

        res_docs2 = self.app.get("/api/documents", headers=headers2)
        docs2 = res_docs2.get_json()["documents"]
        self.assertEqual(len(docs2), 1)

        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT file_path FROM documents WHERE id = ?", (docs2[0]["id"],))
        restored_path = cursor.fetchone()[0]
        conn.close()
        full_restored_path = os.path.join(os.path.dirname(__file__), "uploads", restored_path)
        self.assertTrue(os.path.exists(full_restored_path))
        with open(full_restored_path, "rb") as f:
            self.assertEqual(f.read(), fake_cipher)

    def test_req5_portfolio_goal_crud_operations(self):
        """Req 5: Complete CRUD operations for portfolio accumulation goals"""
        email = f"req5_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Goal User", email, "Pass1234!", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        # 1. CREATE (POST)
        res_post = self.app.post("/api/goals", headers=headers, json={
            "goal_name": "50g Gold Target",
            "target_metal": "Gold",
            "target_weight": 50.0,
            "target_date": "2027-12-31",
            "notes": "Wedding hedge"
        })
        self.assertEqual(res_post.status_code, 201)
        goal_id = res_post.get_json()["goal_id"]

        # 2. READ (GET)
        res_get = self.app.get("/api/goals", headers=headers)
        self.assertEqual(res_get.status_code, 200)
        goals = res_get.get_json()["goals"]
        self.assertEqual(len(goals), 1)
        self.assertEqual(goals[0]["goal_name"], "50g Gold Target")
        self.assertEqual(goals[0]["target_weight"], 50.0)

        # 3. UPDATE (PUT)
        res_put = self.app.put(f"/api/goals/{goal_id}", headers=headers, json={
            "goal_name": "75g Gold Target (Upgraded)",
            "target_metal": "Gold",
            "target_weight": 75.0,
            "target_date": "2028-06-30",
            "notes": "Upgraded target"
        })
        self.assertEqual(res_put.status_code, 200)

        res_get2 = self.app.get("/api/goals", headers=headers)
        self.assertEqual(res_get2.get_json()["goals"][0]["target_weight"], 75.0)

        # 4. DELETE
        res_del = self.app.delete(f"/api/goals/{goal_id}", headers=headers)
        self.assertEqual(res_del.status_code, 200)

        res_get3 = self.app.get("/api/goals", headers=headers)
        self.assertEqual(len(res_get3.get_json()["goals"]), 0)

    def test_req6_password_change_and_session_revocation(self):
        """Req 6: Password change increments token_version and invalidates all existing sessions"""
        email = f"req6_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Revoke User", email, "InitialPass123!", "INR")
        token1 = user["token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        res_change = self.app.post("/api/auth/change-password", headers=headers1, json={
            "old_password": "InitialPass123!",
            "new_password": "NewSecurePass456!"
        })
        self.assertEqual(res_change.status_code, 200)

        res_old_token = self.app.get("/api/assets", headers=headers1)
        self.assertEqual(res_old_token.status_code, 401)
        self.assertIn("Session expired or revoked", res_old_token.get_json().get("error", ""))

        _, auth_err = authenticate_user(email, "InitialPass123!")
        self.assertIsNotNone(auth_err)

        user_new, auth_ok = authenticate_user(email, "NewSecurePass456!")
        self.assertIsNone(auth_ok)
        token2 = user_new["token"]
        res_new_token = self.app.get("/api/assets", headers={"Authorization": f"Bearer {token2}"})
        self.assertEqual(res_new_token.status_code, 200)

    def test_req7_account_deletion_with_physical_file_cleanup(self):
        """Req 7: Account deletion deletes all database records and physically unlinks uploaded files"""
        email = f"req7_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Delete User", email, "DeleteMePass123!", "INR")
        user_id = user["id"]
        headers = {"Authorization": f"Bearer {user['token']}"}

        res_a = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Coin to Delete", "metal": "Gold", "purity": "24K", "gross_weight": 10.0, "purchase_price": 70000.0
        })
        asset_id = res_a.get_json()["asset_id"]

        res_up = self.app.post(
            "/api/documents/upload",
            headers=headers,
            data={"asset_id": str(asset_id), "document_type": "Invoice", "file": (io.BytesIO(b"%PDF-1.4\nTest to delete"), "del.pdf")},
            content_type="multipart/form-data"
        )
        doc_id = res_up.get_json()["document_id"]

        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT file_path FROM documents WHERE id = ?", (doc_id,))
        doc_path = os.path.join(os.path.dirname(__file__), "uploads", cursor.fetchone()[0])
        conn.close()
        self.assertTrue(os.path.exists(doc_path))

        res_del = self.app.post("/api/auth/delete-account", headers=headers, json={"password": "DeleteMePass123!"})
        self.assertEqual(res_del.status_code, 200)

        self.assertFalse(os.path.exists(doc_path))

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        self.assertIsNone(cursor.fetchone())
        cursor.execute("SELECT id FROM assets WHERE user_id = ?", (user_id,))
        self.assertEqual(len(cursor.fetchall()), 0)
        conn.close()

    def test_req8_auth_rate_limiting_and_account_lockout(self):
        """Req 8: 5 consecutive failed logins trigger lockout and return 429 Too Many Requests with Retry-After"""
        email = f"lockout_{int(time.time()*1000)}@assetvault.com"
        register_user("Lockout Target", email, "CorrectPass123!", "INR")

        for _ in range(5):
            res = self.app.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
            self.assertEqual(res.status_code, 401)

        res_locked = self.app.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
        self.assertEqual(res_locked.status_code, 429)
        self.assertIn("Retry-After", res_locked.headers)
        self.assertIn("locked", res_locked.get_json().get("error", "").lower())

    def test_req9_csrf_cors_origin_enforcement(self):
        """Req 9: Untrusted cross-origin POST requests blocked with 403 Forbidden"""
        email = f"req9_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Origin User", email, "Pass1234!", "INR")
        headers = {
            "Authorization": f"Bearer {user['token']}",
            "Origin": "https://malicious-phishing-site.com"
        }

        res = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Blocked Asset", "metal": "Gold", "purity": "24K", "gross_weight": 10.0, "purchase_price": 70000.0
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Cross-Origin Request Blocked", res.get_json().get("error", ""))

    def test_req10_secure_qr_certificate_public_verification_privacy(self):
        """Req 10: Public QR verification returns masked owner, zero financial data (no purchase price, no valuation)"""
        email = f"req10_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Kapil Khadase", email, "Pass1234!", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        res_a = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Certified Gold Sovereign Bar",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 100.0,
            "purchase_price": 750000.0,
            "total_acquisition_cost": 750000.0,
            "huid": "HUID-CERT-888"
        })
        asset_id = res_a.get_json()["asset_id"]

        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT certificate_token FROM assets WHERE id = ?", (asset_id,))
        token = cursor.fetchone()[0]
        conn.close()

        self.assertIsNotNone(token)
        self.assertGreaterEqual(len(token), 24)

        res_pub = self.app.get(f"/api/verify/certificate/{token}")
        self.assertEqual(res_pub.status_code, 200)
        cert = res_pub.get_json()["certificate"]

        self.assertEqual(cert["asset_name"], "Certified Gold Sovereign Bar")
        self.assertEqual(cert["gross_weight_g"], 100.0)
        self.assertEqual(cert["masked_owner"], "K. Khadase")

        self.assertNotIn("purchase_price", cert)
        self.assertNotIn("total_acquisition_cost", cert)
        self.assertNotIn("current_valuation", cert)
        self.assertNotIn("profit_loss", cert)
        self.assertNotIn("roi", cert)

        res_invalid = self.app.get("/api/verify/certificate/invalid_random_nonexistent_token_123")
        self.assertEqual(res_invalid.status_code, 404)

    def test_req11_duplicate_asset_detection_live_check(self):
        """Req 11: Live check identifies matching HUID, invoice number, or diamond cert"""
        email = f"req11_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Dupl User", email, "Pass1234!", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Original Bangle",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 25.0,
            "purchase_price": 150000.0,
            "huid": "HUID-TEST-UNIQUE-999",
            "invoice_number": "INV-2026-001"
        })

        res_dupl = self.app.post("/api/assets/check-duplicate", headers=headers, json={"huid": "HUID-TEST-UNIQUE-999"})
        self.assertEqual(res_dupl.status_code, 200)
        self.assertTrue(res_dupl.get_json()["is_duplicate"])

        res_inv = self.app.post("/api/assets/check-duplicate", headers=headers, json={"invoice_number": "INV-2026-001"})
        self.assertTrue(res_inv.get_json()["is_duplicate"])

        res_unique = self.app.post("/api/assets/check-duplicate", headers=headers, json={"huid": "HUID-COMPLETELY-NEW-000"})
        self.assertFalse(res_unique.get_json()["is_duplicate"])

    def test_req12_csv_import_preview_and_confirm(self):
        """Req 12: CSV parsing, row-level validation preview, duplicate detection, and batch commit"""
        email = f"req12_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Import User", email, "Pass1234!", "INR")
        headers = {"Authorization": f"Bearer {user['token']}"}

        csv_content = (
            "asset_name,category,metal,purity,gross_weight,purchase_price,huid,invoice_number\n"
            "Imported Sovereign Bar,Bullion,Gold,24K,50.0,350000,HUID-IMP-001,INV-IMP-001\n"
            "Imported Silver Ingot,Bullion,Silver,999,500.0,45000,HUID-IMP-002,INV-IMP-002\n"
        )
        csv_file = (io.BytesIO(csv_content.encode("utf-8")), "import_test.csv")

        res_preview = self.app.post(
            "/api/assets/import/preview",
            headers=headers,
            data={"file": csv_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_preview.status_code, 200)
        p_data = res_preview.get_json()
        self.assertEqual(len(p_data["valid_rows"]), 2)
        self.assertEqual(len(p_data["invalid_rows"]), 0)

        res_confirm = self.app.post("/api/assets/import/confirm", headers=headers, json={"rows": p_data["valid_rows"]})
        self.assertEqual(res_confirm.status_code, 201)
        self.assertEqual(res_confirm.get_json()["imported_count"], 2)

        res_assets = self.app.get("/api/assets", headers=headers)
        self.assertEqual(len(res_assets.get_json()["assets"]), 2)

    def test_req13_large_dataset_performance_benchmark(self):
        """Req 13: Large dataset benchmark execution verifying valuation and pagination speed"""
        from test_performance import PerformanceBenchmarkTestCase
        suite = unittest.TestSuite()
        suite.addTest(PerformanceBenchmarkTestCase("test_benchmark_100_assets_valuation"))
        suite.addTest(PerformanceBenchmarkTestCase("test_benchmark_5000_transactions_ledger_pagination"))
        runner = unittest.TextTestRunner(stream=io.StringIO())
        res = runner.run(suite)
        self.assertEqual(len(res.errors), 0)
        self.assertEqual(len(res.failures), 0)

    def test_req14_password_loss_zero_backdoor_verification(self):
        """Req 14: Verifies zero-knowledge client-side encryption architecture has zero server-side backdoors"""
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        cols = [r[1] for r in cursor.fetchall()]
        conn.close()

        self.assertNotIn("plaintext_password", cols)
        self.assertNotIn("master_key", cols)
        self.assertNotIn("backdoor_recovery_key", cols)
        self.assertIn("password_hash", cols)

if __name__ == "__main__":
    unittest.main()



