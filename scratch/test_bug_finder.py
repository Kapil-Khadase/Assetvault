import os
import sys
import unittest
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from database import init_db, get_db_connection
from seed_data import seed_database
from app import app
from services.auth_service import register_user, authenticate_user, update_user_profile
from services.market_data_service import get_latest_market_rates
from services.valuation_engine import calculate_asset_valuation, get_portfolio_summary
from services.simulator_service import run_portfolio_simulation
from services.rate_limiter import limiter

class AssetVaultBugDetectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database()

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        limiter.reset()

    def test_1_alerts_endpoint_missing_evaluation(self):
        """Check if GET /api/alerts provides current_value and is_currently_triggered"""
        u, _ = register_user("Alert Tester", f"alert_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        headers = {"Authorization": f"Bearer {u['token']}"}

        # Create alert for Gold <= 20000 (currently gold is ~15535, so this SHOULD be triggered)
        res = self.app.post("/api/alerts", headers=headers, json={
            "alert_type": "PRICE_TARGET",
            "target_metal": "GOLD",
            "target_value": 20000.0,
            "condition": "LESS_THAN",
            "notes": "Gold dip trigger"
        })
        self.assertEqual(res.status_code, 201)

        # Retrieve alerts via API
        res_get = self.app.get("/api/alerts?currency=INR", headers=headers)
        data = res_get.get_json()["alerts"]
        self.assertEqual(len(data), 1)
        alert = data[0]

        print("[TEST 1] Alert data returned:", alert)
        self.assertIn("is_currently_triggered", alert, "BUG: is_currently_triggered missing from /api/alerts response!")
        self.assertIn("current_value", alert, "BUG: current_value missing from /api/alerts response!")
        self.assertTrue(alert["is_currently_triggered"], "Alert condition was met (15535 <= 20000) but is_currently_triggered is False!")

    def test_2_profile_update_empty_target_val_crash(self):
        """Check if updating profile with empty target_portfolio_value crashes with 500"""
        u, _ = register_user("Profile Tester", f"prof_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        headers = {"Authorization": f"Bearer {u['token']}"}

        res = self.app.put("/api/auth/profile", headers=headers, json={
            "name": "Updated Name",
            "currency": "USD",
            "target_portfolio_value": ""  # empty string from web input
        })
        print("[TEST 2] Profile update status:", res.status_code)
        self.assertEqual(res.status_code, 200, f"BUG: Profile update crashed with status {res.status_code}: {res.get_data(as_text=True)}")

    def test_3_lowercase_currency_conversion(self):
        """Check if lowercase currency e.g. 'usd' converts rate properly instead of defaulting to 1.0 (INR)"""
        rates_upper = get_latest_market_rates("USD")
        rates_lower = get_latest_market_rates("usd")

        gold_usd_upper = rates_upper["GOLD_24K"]["rate_per_gram"]
        gold_usd_lower = rates_lower["GOLD_24K"]["rate_per_gram"]

        print(f"[TEST 3] Gold USD Upper: {gold_usd_upper}, Gold USD Lower: {gold_usd_lower}")
        self.assertAlmostEqual(gold_usd_upper, gold_usd_lower, places=1, msg="BUG: Lowercase 'usd' does not convert exchange rate!")
        self.assertLess(gold_usd_lower, 1000.0, "BUG: Lowercase currency defaulted to INR rate (~15535) instead of USD (~180)!")

    def test_4_simulator_zero_division(self):
        """Check if simulator crashes when an active asset has 0 acquisition cost and diamond shock is set"""
        u, _ = register_user("Sim Tester", f"sim_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        headers = {"Authorization": f"Bearer {u['token']}"}

        # Create a diamond asset with 0 acquisition cost (gift/heirloom)
        res = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gifted Diamond Solitaire",
            "asset_type": "Diamond",
            "metal": "Gold",
            "purity": "18K",
            "diamond_carat": 1.5,
            "diamond_cut": "EXCELLENT",
            "diamond_color": "D",
            "diamond_clarity": "VVS1",
            "gross_weight": 5.0,
            "purchase_price": 0.0,
            "total_acquisition_cost": 0.0
        })
        self.assertEqual(res.status_code, 201)

        # Run simulation with diamond shock
        res_sim = self.app.post("/api/simulator/run", headers=headers, json={
            "gold_shock": 10,
            "diamond_shock": 15,
            "currency": "INR"
        })
        print("[TEST 4] Simulator status:", res_sim.status_code)
        self.assertEqual(res_sim.status_code, 200, f"BUG: Simulator crashed with {res_sim.status_code}: {res_sim.get_data(as_text=True)}")

    def test_5_asset_update_recalculates_net_weight_and_cost(self):
        """Check if updating gross_weight without sending net_weight recalculates net_weight"""
        u, _ = register_user("Update Tester", f"upd_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        headers = {"Authorization": f"Bearer {u['token']}"}

        create_res = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Ring",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 10.0,
            "stone_weight": 2.0,
            "net_weight": 8.0,
            "purchase_price": 50000.0,
            "total_acquisition_cost": 50000.0
        })
        self.assertEqual(create_res.status_code, 201)
        asset_id = create_res.get_json()["asset_id"]

        # Update gross_weight to 20.0 (with same 2.0 stone weight, net should be 18.0)
        upd_res = self.app.put(f"/api/assets/{asset_id}", headers=headers, json={
            "gross_weight": 20.0
        })
        self.assertEqual(upd_res.status_code, 200)

        # Fetch detail
        detail = self.app.get(f"/api/assets/{asset_id}", headers=headers).get_json()["asset"]
        print("[TEST 5] Updated asset net_weight:", detail.get("net_weight"), "gross_weight:", detail.get("gross_weight"))
        self.assertEqual(detail["net_weight"], 18.0, "BUG: net_weight was not recalculated when gross_weight changed!")

    def test_6_unauthorized_sell_or_delete(self):
        """Check if selling or deleting another user's asset returns 404/403 instead of 200"""
        u1, _ = register_user("Owner", f"u1_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        u2, _ = register_user("Attacker", f"u2_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        h1 = {"Authorization": f"Bearer {u1['token']}"}
        h2 = {"Authorization": f"Bearer {u2['token']}"}

        res = self.app.post("/api/assets", headers=h1, json={
            "asset_name": "Valuable Necklace",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 50.0,
            "purchase_price": 300000.0,
            "total_acquisition_cost": 300000.0
        })
        asset_id = res.get_json()["asset_id"]

        # Attacker tries to sell Owner's asset
        sell_res = self.app.post(f"/api/assets/{asset_id}/sell", headers=h2, json={
            "sale_amount": 350000.0
        })
        print("[TEST 6A] Attacker sell status:", sell_res.status_code)
        self.assertIn(sell_res.status_code, [400, 403, 404], "BUG: Selling another user's asset did not return 4xx!")

        # Attacker tries to delete Owner's asset
        del_res = self.app.delete(f"/api/assets/{asset_id}", headers=h2)
        print("[TEST 6B] Attacker delete status:", del_res.status_code)
        self.assertIn(del_res.status_code, [403, 404], "BUG: Deleting another user's asset returned 200!")

    def test_8_zero_cost_asset_forced_to_one(self):
        """Check if an asset with 0 purchase/cost is corrupted to 1.0"""
        u, _ = register_user("Zero Cost Tester", f"zero_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        headers = {"Authorization": f"Bearer {u['token']}"}

        res = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Family Inherited Gold Chain",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 20.0,
            "purchase_price": 0.0,
            "total_acquisition_cost": 0.0
        })
        self.assertEqual(res.status_code, 201)
        asset_id = res.get_json()["asset_id"]

        detail = self.app.get(f"/api/assets/{asset_id}", headers=headers).get_json()["asset"]
        print("[TEST 8] Zero-cost asset acquisition cost in detail:", detail.get("total_acquisition_cost"))
        self.assertEqual(detail.get("total_acquisition_cost"), 0.0, "BUG: 0.0 acquisition cost was corrupted to 1.0!")

    def test_9_update_status_authorization_check(self):
        """Check if updating status on another user's asset returns 404/403"""
        u1, _ = register_user("Status Owner", f"so_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        u2, _ = register_user("Status Attacker", f"sa_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        h1 = {"Authorization": f"Bearer {u1['token']}"}
        h2 = {"Authorization": f"Bearer {u2['token']}"}

        res = self.app.post("/api/assets", headers=h1, json={
            "asset_name": "Pooja Bell",
            "metal": "Silver",
            "purity": "925",
            "gross_weight": 50.0,
            "purchase_price": 5000.0,
            "total_acquisition_cost": 5000.0
        })
        asset_id = res.get_json()["asset_id"]

        status_res = self.app.post(f"/api/assets/{asset_id}/status", headers=h2, json={"status": "Sold"})
        print("[TEST 9] Attacker update status code:", status_res.status_code)
        self.assertIn(status_res.status_code, [403, 404], "BUG: Attacker allowed to change status of another user's asset!")

    def test_10_document_download_route_exists(self):
        """Check if an uploaded document can be downloaded by its owner"""
        u, _ = register_user("Doc Downloader", f"dd_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        headers = {"Authorization": f"Bearer {u['token']}"}

        res = self.app.post("/api/assets", headers=headers, json={
            "asset_name": "Gold Bangle",
            "metal": "Gold",
            "purity": "22K",
            "gross_weight": 15.0,
            "purchase_price": 100000.0,
            "total_acquisition_cost": 100000.0
        })
        asset_id = res.get_json()["asset_id"]

        import io
        fake_content = b"PDF invoice content for gold bangle"
        fake_file = (io.BytesIO(fake_content), "invoice_123.pdf")
        upload_res = self.app.post("/api/documents/upload", headers=headers, data={
            "asset_id": asset_id,
            "document_type": "Invoice",
            "file": fake_file
        })
        self.assertEqual(upload_res.status_code, 201)
        doc_id = upload_res.get_json()["document_id"]

        # Try to download the uploaded document
        dl_res = self.app.get(f"/api/documents/{doc_id}/download", headers=headers)
        print("[TEST 10] Document download status:", dl_res.status_code)
        self.assertEqual(dl_res.status_code, 200, f"BUG: Document cannot be downloaded! Status: {dl_res.status_code}")
        self.assertEqual(dl_res.data, fake_content, "BUG: Downloaded document content mismatch!")

    def test_11_encrypted_sell_asset_isolation(self):
        """Check if selling another user's asset via encrypted payload returns 404/403"""
        u1, _ = register_user("Enc Owner", f"eo_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        u2, _ = register_user("Enc Attacker", f"ea_{os.urandom(4).hex()}@test.com", "pass123", "INR")
        h1 = {"Authorization": f"Bearer {u1['token']}"}
        h2 = {"Authorization": f"Bearer {u2['token']}"}

        res = self.app.post("/api/assets", headers=h1, json={
            "asset_name": "Encrypted Gold Bar",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 50.0,
            "purchase_price": 350000.0,
            "total_acquisition_cost": 350000.0
        })
        asset_id = res.get_json()["asset_id"]

        sell_res = self.app.post(f"/api/assets/{asset_id}/sell", headers=h2, json={
            "encrypted_data": "dummycipher",
            "iv": "dummyiv"
        })
        print("[TEST 11] Attacker encrypted sell status:", sell_res.status_code)
        self.assertIn(sell_res.status_code, [403, 404], "BUG: Attacker able to sell another user's asset with encrypted payload!")

if __name__ == "__main__":
    unittest.main()

