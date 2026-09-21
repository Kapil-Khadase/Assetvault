"""
AssetVault Performance Testing & Stress Benchmark Suite
Evaluates:
  1. 100 assets portfolio valuation + allocation calculation (< 500ms target)
  2. 1,000 assets stress test valuation calculation (< 500ms target)
  3. 5,000 transactions ledger query with indexed pagination (< 100ms target)
"""

import os
import sys
import time
import unittest
import random
import secrets

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import get_db_connection, init_db
from app import app
from services.auth_service import register_user
from services.valuation_engine import get_portfolio_summary, calculate_asset_valuation
from services.market_data_service import get_latest_market_rates

class PerformanceBenchmarkTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.app = app.test_client()
        cls.app.testing = True

        # Register benchmark user
        cls.bench_email = f"perf_{int(time.time()*1000)}_{secrets.token_hex(4)}@assetvault.com"
        user, _ = register_user("Benchmark User", cls.bench_email, "PerfPass123!", "INR")
        cls.user_id = user["id"]
        cls.token = user["token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

        # Create one baseline asset for transactions foreign key
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            tok = secrets.token_urlsafe(24)
            cursor.execute("""
                INSERT INTO assets (user_id, asset_name, asset_type, metal, purity, gross_weight, net_weight, purchase_price, total_acquisition_cost, purchase_date, status, certificate_token)
                VALUES (?, 'Parent Anchor Asset', 'Physical Bullion', 'Gold', '24K', 10.0, 10.0, 70000.0, 70000.0, '2026-01-15', 'Active', ?)
            """, (cls.user_id, tok))
            cls.anchor_asset_id = cursor.lastrowid
            conn.commit()
        finally:
            conn.close()

    def test_benchmark_100_assets_valuation(self):
        """100 assets portfolio valuation + allocation calculation must complete in < 500ms"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            metals = ["Gold", "Silver", "Platinum"]
            purities = {"Gold": "24K", "Silver": "999", "Platinum": "950"}

            # Bulk insert 100 assets
            assets_batch = []
            for i in range(100):
                m = metals[i % len(metals)]
                p = purities[m]
                wt = round(random.uniform(5.0, 100.0), 2)
                cost = round(wt * random.uniform(2000, 8000), 2)
                tok = secrets.token_urlsafe(24)
                huid = f"HUID-{secrets.token_hex(4).upper()}"
                assets_batch.append((
                    self.user_id, f"Benchmark Asset #{i+1}", 1, "Physical Bullion", m, p,
                    wt, wt, cost, cost, "2026-02-01", "Active", tok, huid
                ))

            cursor.executemany("""
                INSERT INTO assets (user_id, asset_name, category_id, asset_type, metal, purity, gross_weight, net_weight, purchase_price, total_acquisition_cost, purchase_date, status, certificate_token, hallmark_huid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, assets_batch)
            conn.commit()
        finally:
            conn.close()

        # Benchmark valuation execution
        start_time = time.perf_counter()
        summary = get_portfolio_summary(self.user_id, target_currency="INR")
        duration_ms = (time.perf_counter() - start_time) * 1000

        print(f"\n[BENCHMARK] 100 Assets Portfolio Valuation: {duration_ms:.2f} ms (Target: < 500ms)")
        self.assertGreaterEqual(summary["total_assets_count"], 100)
        self.assertLess(duration_ms, 500.0, f"100 assets valuation exceeded 500ms target: {duration_ms:.2f}ms")

    def test_benchmark_1000_assets_stress_valuation(self):
        """1,000 assets stress test valuation calculation must complete in < 500ms"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            metals = ["Gold", "Silver", "Platinum"]
            purities = {"Gold": "24K", "Silver": "999", "Platinum": "950"}

            # Bulk insert 1,000 assets
            stress_batch = []
            for i in range(1000):
                m = metals[i % len(metals)]
                p = purities[m]
                wt = round(random.uniform(1.0, 50.0), 2)
                cost = round(wt * 5000, 2)
                tok = secrets.token_urlsafe(24)
                huid = f"HUID-S-{secrets.token_hex(4).upper()}"
                stress_batch.append((
                    self.user_id, f"Stress Asset #{i+1}", 1, "Physical Bullion", m, p,
                    wt, wt, cost, cost, "2026-01-10", "Active", tok, huid
                ))

            cursor.executemany("""
                INSERT INTO assets (user_id, asset_name, category_id, asset_type, metal, purity, gross_weight, net_weight, purchase_price, total_acquisition_cost, purchase_date, status, certificate_token, hallmark_huid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, stress_batch)
            conn.commit()

            cursor.execute("SELECT * FROM assets WHERE user_id = ? AND status = 'Active'", (self.user_id,))
            assets = [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

        # Fetch live rates once to simulate hot-cache valuation
        rates = get_latest_market_rates(target_currency="INR")

        # Benchmark 1,000 assets calculation in memory
        start_time = time.perf_counter()
        total_value = 0.0
        for a in assets:
            v = calculate_asset_valuation(a, latest_rates=rates, target_currency="INR")
            total_value += v["current_estimated_value"]

        duration_ms = (time.perf_counter() - start_time) * 1000
        print(f"[BENCHMARK] 1,000 Assets Stress Valuation: {duration_ms:.2f} ms for {len(assets)} assets (Target: < 500ms)")
        self.assertGreater(total_value, 0)
        self.assertLess(duration_ms, 500.0, f"1,000 assets stress valuation exceeded 500ms target: {duration_ms:.2f}ms")

    def test_benchmark_5000_transactions_ledger_pagination(self):
        """5,000 transactions: ledger query + pagination response time must complete in < 100ms"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            tx_types = ["PURCHASE", "SALE"]
            dealers = ["Tanishq Flagship", "MMTC-PAMP India", "Kalyan Jewellers", "Malabar Gold", "Bullion Desk"]

            # Bulk insert 5,000 transactions
            tx_batch = []
            for i in range(5000):
                t_type = tx_types[i % 2]
                amt = round(random.uniform(10000, 500000), 2)
                profit = round(random.uniform(-5000, 25000), 2) if t_type == "SALE" else 0.0
                tx_batch.append((
                    self.anchor_asset_id, self.user_id, t_type, "2026-03-15", amt, profit, 150.0,
                    dealers[i % len(dealers)], f"Tx batch benchmark entry #{i+1}"
                ))

            cursor.executemany("""
                INSERT INTO transactions (asset_id, user_id, transaction_type, transaction_date, amount, realized_profit, selling_charges, counterparty, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, tx_batch)
            conn.commit()
        finally:
            conn.close()

        # Benchmark API paginated query
        start_time = time.perf_counter()
        res = self.app.get("/api/transactions?page=1&per_page=50", headers=self.headers)
        duration_ms = (time.perf_counter() - start_time) * 1000

        print(f"[BENCHMARK] 5,000 Transactions Ledger Pagination Query: {duration_ms:.2f} ms (Target: < 100ms)")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreaterEqual(data["total"], 5000)
        self.assertEqual(len(data["transactions"]), 50)
        self.assertLess(duration_ms, 100.0, f"5,000 transactions query exceeded 100ms target: {duration_ms:.2f}ms")

if __name__ == "__main__":
    unittest.main()
