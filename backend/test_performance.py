"""
AssetVault Measurable Performance Benchmarking & Stress Test Suite
Evaluates:
  1. 100 assets: portfolio valuation + allocation calculation (5 trials: min, median, p95, max)
  2. 1,000 assets: stress test valuation calculation (5 trials: min, median, p95, max)
  3. 5,000 assets: maximum stress tier valuation calculation (5 trials: min, median, p95, max)
  4. 10,000 transactions: ledger query + pagination response time (5 trials: min, median, p95, max)
  5. 50,000 transactions: stress transaction query (5 trials: min, median, p95, max)
  6. Index verification: EXPLAIN QUERY PLAN verification of idx_assets_user_status and idx_tx_user_date
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

def compute_percentiles(times_list):
    """Calculate min, median, p95, max from a list of durations (in ms)."""
    sorted_times = sorted(times_list)
    n = len(sorted_times)
    min_v = sorted_times[0]
    median_v = sorted_times[n // 2]
    p95_idx = int(round(0.95 * n)) - 1
    p95_idx = max(0, min(p95_idx, n - 1))
    p95_v = sorted_times[p95_idx]
    max_v = sorted_times[-1]
    return {
        "min": round(min_v, 2),
        "median": round(median_v, 2),
        "p95": round(p95_v, 2),
        "max": round(max_v, 2)
    }

class PerformanceBenchmarkTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.app = app.test_client()
        cls.app.testing = True

        # Register dedicated benchmark user
        cls.bench_email = f"perf_{int(time.time()*1000)}_{secrets.token_hex(4)}@assetvault.com"
        user, _ = register_user("Benchmark User", cls.bench_email, "PerfPass123!", "INR")
        cls.user_id = user["id"]
        cls.token = user["token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

        # Create baseline anchor asset for transactions foreign key
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

    def test_01_explain_query_plan_index_verification(self):
        """Index verification: Run EXPLAIN QUERY PLAN to verify idx_assets_user_status and idx_tx_user_date are used."""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            # 1. Assets index check
            cursor.execute("""
                EXPLAIN QUERY PLAN
                SELECT * FROM assets WHERE user_id = ? AND status = 'Active'
            """, (self.user_id,))
            asset_plan_rows = cursor.fetchall()
            asset_plan_details = " | ".join([str(r["detail"]) for r in asset_plan_rows])
            print(f"\n[QUERY PLAN] Assets status query: {asset_plan_details}")
            self.assertIn("idx_assets_user_status", asset_plan_details,
                           "idx_assets_user_status was not utilized in query plan!")
            self.assertIn("USING INDEX", asset_plan_details,
                           "USING INDEX was not present in assets query plan!")

            # 2. Transactions index check
            cursor.execute("""
                EXPLAIN QUERY PLAN
                SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC LIMIT 50 OFFSET 0
            """, (self.user_id,))
            tx_plan_rows = cursor.fetchall()
            tx_plan_details = " | ".join([str(r["detail"]) for r in tx_plan_rows])
            print(f"[QUERY PLAN] Transactions date query: {tx_plan_details}")
            self.assertIn("idx_tx_user_date", tx_plan_details,
                           "idx_tx_user_date was not utilized in query plan!")
            self.assertIn("USING INDEX", tx_plan_details,
                           "USING INDEX was not present in transactions query plan!")

        finally:
            conn.close()

    def test_02_benchmark_100_assets_valuation_and_allocation(self):
        """100 assets: portfolio valuation + allocation calculation across 5 trials (Target: < 500ms)"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            metals = ["Gold", "Silver", "Platinum"]
            purities = {"Gold": "24K", "Silver": "999", "Platinum": "950"}

            batch = []
            for i in range(100):
                m = metals[i % len(metals)]
                p = purities[m]
                wt = round(random.uniform(5.0, 50.0), 2)
                cost = round(wt * random.uniform(2000, 7500), 2)
                tok = secrets.token_urlsafe(24)
                huid = f"HUID-100-{secrets.token_hex(4).upper()}"
                batch.append((
                    self.user_id, f"Asset 100 #{i+1}", 1, "Physical Bullion", m, p,
                    wt, wt, cost, cost, "2026-02-01", "Active", tok, huid
                ))

            cursor.executemany("""
                INSERT INTO assets (user_id, asset_name, category_id, asset_type, metal, purity, gross_weight, net_weight, purchase_price, total_acquisition_cost, purchase_date, status, certificate_token, hallmark_huid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)
            conn.commit()
        finally:
            conn.close()

        # Warm-up call
        get_portfolio_summary(self.user_id, target_currency="INR")

        trials = []
        for _ in range(5):
            start = time.perf_counter()
            summary = get_portfolio_summary(self.user_id, target_currency="INR")
            duration_ms = (time.perf_counter() - start) * 1000
            trials.append(duration_ms)

        stats = compute_percentiles(trials)
        print(f"\n[BENCHMARK] 100 Assets Portfolio Valuation & Allocation (5 Trials):")
        print(f"  Min: {stats['min']} ms | Median: {stats['median']} ms | P95: {stats['p95']} ms | Max: {stats['max']} ms (Target: < 500ms)")

        self.assertGreaterEqual(summary["total_assets_count"], 100)
        self.assertLess(stats["median"], 500.0, f"100 assets valuation median {stats['median']}ms exceeded 500ms target")
        self.assertLess(stats["p95"], 500.0, f"100 assets valuation p95 {stats['p95']}ms exceeded 500ms target")

    def test_03_benchmark_1000_assets_stress_valuation(self):
        """1,000 assets: stress test valuation calculation across 5 trials (Target: < 500ms)"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            metals = ["Gold", "Silver", "Platinum"]
            purities = {"Gold": "24K", "Silver": "999", "Platinum": "950"}

            cursor.execute("SELECT COUNT(*) FROM assets WHERE user_id = ? AND status = 'Active'", (self.user_id,))
            current_count = cursor.fetchone()[0]
            needed = max(0, 1000 - current_count)

            batch = []
            for i in range(needed):
                m = metals[i % len(metals)]
                p = purities[m]
                wt = round(random.uniform(2.0, 30.0), 2)
                cost = round(wt * 5000, 2)
                tok = secrets.token_urlsafe(24)
                huid = f"HUID-1K-{secrets.token_hex(4).upper()}"
                batch.append((
                    self.user_id, f"Asset 1K #{i+1}", 1, "Physical Bullion", m, p,
                    wt, wt, cost, cost, "2026-01-10", "Active", tok, huid
                ))

            if batch:
                cursor.executemany("""
                    INSERT INTO assets (user_id, asset_name, category_id, asset_type, metal, purity, gross_weight, net_weight, purchase_price, total_acquisition_cost, purchase_date, status, certificate_token, hallmark_huid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()

            cursor.execute("SELECT * FROM assets WHERE user_id = ? AND status = 'Active' LIMIT 1000", (self.user_id,))
            assets = [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

        rates = get_latest_market_rates(target_currency="INR")

        trials = []
        for _ in range(5):
            start = time.perf_counter()
            total_val = 0.0
            for a in assets:
                v = calculate_asset_valuation(a, latest_rates=rates, target_currency="INR")
                total_val += v["current_estimated_value"]
            duration_ms = (time.perf_counter() - start) * 1000
            trials.append(duration_ms)

        stats = compute_percentiles(trials)
        print(f"\n[BENCHMARK] 1,000 Assets Stress Valuation ({len(assets)} assets, 5 Trials):")
        print(f"  Min: {stats['min']} ms | Median: {stats['median']} ms | P95: {stats['p95']} ms | Max: {stats['max']} ms (Target: < 500ms)")

        self.assertEqual(len(assets), 1000)
        self.assertLess(stats["median"], 500.0, f"1,000 assets stress valuation median {stats['median']}ms exceeded 500ms target")
        self.assertLess(stats["p95"], 500.0, f"1,000 assets stress valuation p95 {stats['p95']}ms exceeded 500ms target")

    def test_04_benchmark_5000_assets_stress_valuation(self):
        """5,000 assets: maximum stress tier valuation calculation across 5 trials (Target: < 1000ms)"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            metals = ["Gold", "Silver", "Platinum"]
            purities = {"Gold": "24K", "Silver": "999", "Platinum": "950"}

            cursor.execute("SELECT COUNT(*) FROM assets WHERE user_id = ? AND status = 'Active'", (self.user_id,))
            current_count = cursor.fetchone()[0]
            needed = max(0, 5000 - current_count)

            batch = []
            for i in range(needed):
                m = metals[i % len(metals)]
                p = purities[m]
                wt = round(random.uniform(1.0, 25.0), 2)
                cost = round(wt * 5500, 2)
                tok = secrets.token_urlsafe(24)
                huid = f"HUID-5K-{secrets.token_hex(4).upper()}"
                batch.append((
                    self.user_id, f"Asset 5K #{i+1}", 1, "Physical Bullion", m, p,
                    wt, wt, cost, cost, "2026-01-05", "Active", tok, huid
                ))

            if batch:
                cursor.executemany("""
                    INSERT INTO assets (user_id, asset_name, category_id, asset_type, metal, purity, gross_weight, net_weight, purchase_price, total_acquisition_cost, purchase_date, status, certificate_token, hallmark_huid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()

            cursor.execute("SELECT * FROM assets WHERE user_id = ? AND status = 'Active' LIMIT 5000", (self.user_id,))
            assets = [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

        rates = get_latest_market_rates(target_currency="INR")

        trials = []
        for _ in range(5):
            start = time.perf_counter()
            total_val = 0.0
            for a in assets:
                v = calculate_asset_valuation(a, latest_rates=rates, target_currency="INR")
                total_val += v["current_estimated_value"]
            duration_ms = (time.perf_counter() - start) * 1000
            trials.append(duration_ms)

        stats = compute_percentiles(trials)
        print(f"\n[BENCHMARK] 5,000 Assets Maximum Stress Valuation ({len(assets)} assets, 5 Trials):")
        print(f"  Min: {stats['min']} ms | Median: {stats['median']} ms | P95: {stats['p95']} ms | Max: {stats['max']} ms (Target: < 1000ms)")

        self.assertEqual(len(assets), 5000)
        self.assertLess(stats["median"], 1000.0, f"5,000 assets stress valuation median {stats['median']}ms exceeded 1000ms target")

    def test_05_benchmark_10000_transactions_ledger_pagination(self):
        """10,000 transactions: ledger query + pagination response time across 5 trials (Target: < 100ms)"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM transactions WHERE user_id = ?", (self.user_id,))
            current_count = cursor.fetchone()[0]
            needed = max(0, 10000 - current_count)

            tx_types = ["PURCHASE", "SALE"]
            dealers = ["Tanishq Flagship", "MMTC-PAMP India", "Kalyan Jewellers", "Malabar Gold"]

            batch = []
            for i in range(needed):
                t_type = tx_types[i % 2]
                amt = round(random.uniform(10000, 200000), 2)
                profit = round(random.uniform(-5000, 15000), 2) if t_type == "SALE" else 0.0
                batch.append((
                    self.anchor_asset_id, self.user_id, t_type, "2026-03-10", amt, profit, 100.0,
                    dealers[i % len(dealers)], f"Tx 10k entry #{i+1}"
                ))

            if batch:
                cursor.executemany("""
                    INSERT INTO transactions (asset_id, user_id, transaction_type, transaction_date, amount, realized_profit, selling_charges, counterparty, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()
        finally:
            conn.close()

        # Warm-up call
        self.app.get("/api/transactions?page=1&per_page=50", headers=self.headers)

        trials = []
        for _ in range(5):
            start = time.perf_counter()
            res = self.app.get("/api/transactions?page=1&per_page=50", headers=self.headers)
            duration_ms = (time.perf_counter() - start) * 1000
            trials.append(duration_ms)

        stats = compute_percentiles(trials)
        print(f"\n[BENCHMARK] 10,000 Transactions Ledger Pagination Query (5 Trials):")
        print(f"  Min: {stats['min']} ms | Median: {stats['median']} ms | P95: {stats['p95']} ms | Max: {stats['max']} ms (Target: < 100ms)")

        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreaterEqual(data["total"], 10000)
        self.assertEqual(len(data["transactions"]), 50)
        self.assertLess(stats["median"], 100.0, f"10,000 transactions query median {stats['median']}ms exceeded 100ms target")

    def test_06_benchmark_50000_transactions_stress_query(self):
        """50,000 transactions: stress transaction query across 5 trials (Target: < 150ms)"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM transactions WHERE user_id = ?", (self.user_id,))
            current_count = cursor.fetchone()[0]
            needed = max(0, 50000 - current_count)

            tx_types = ["PURCHASE", "SALE"]
            dealers = ["Tanishq Flagship", "MMTC-PAMP India", "Kalyan Jewellers", "Malabar Gold"]

            batch = []
            for i in range(needed):
                t_type = tx_types[i % 2]
                amt = round(random.uniform(5000, 150000), 2)
                profit = round(random.uniform(-2000, 10000), 2) if t_type == "SALE" else 0.0
                batch.append((
                    self.anchor_asset_id, self.user_id, t_type, "2026-02-15", amt, profit, 50.0,
                    dealers[i % len(dealers)], f"Tx 50k entry #{i+1}"
                ))

            if batch:
                cursor.executemany("""
                    INSERT INTO transactions (asset_id, user_id, transaction_type, transaction_date, amount, realized_profit, selling_charges, counterparty, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()
        finally:
            conn.close()

        # Warm-up call
        self.app.get("/api/transactions?page=10&per_page=50", headers=self.headers)

        trials = []
        for _ in range(5):
            start = time.perf_counter()
            res = self.app.get("/api/transactions?page=10&per_page=50", headers=self.headers)
            duration_ms = (time.perf_counter() - start) * 1000
            trials.append(duration_ms)

        stats = compute_percentiles(trials)
        print(f"\n[BENCHMARK] 50,000 Transactions Stress Ledger Pagination Query (5 Trials):")
        print(f"  Min: {stats['min']} ms | Median: {stats['median']} ms | P95: {stats['p95']} ms | Max: {stats['max']} ms (Target: < 150ms)")

        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreaterEqual(data["total"], 50000)
        self.assertEqual(len(data["transactions"]), 50)
        self.assertLess(stats["median"], 150.0, f"50,000 transactions query median {stats['median']}ms exceeded 150ms target")

if __name__ == "__main__":
    unittest.main()
