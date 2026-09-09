import unittest
import json
import os
import sys

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

class AssetVaultTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        init_db()
        seed_database()

    def test_auth_and_login(self):
        import time
        email = f"testuser_{int(time.time()*1000)}@assetvault.com"
        user, err = register_user("Test User", email, "password123", "INR")
        self.assertIsNone(err)
        self.assertIsNotNone(user)
        self.assertIn("token", user)

        auth_user, auth_err = authenticate_user(email, "password123")
        self.assertIsNone(auth_err)
        self.assertEqual(auth_user["email"], email)

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
        # Create a new asset first to sell
        res = self.app.post("/api/assets", json={
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

if __name__ == "__main__":
    unittest.main()
