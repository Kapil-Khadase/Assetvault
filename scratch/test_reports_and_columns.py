import unittest
import json
import re
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app import app
from database import init_db
from seed_data import seed_database
from services.report_service import generate_pdf_report, generate_excel_report, generate_csv_export

class TestReportsAndColumnSeparation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database()
        cls.client = app.test_client()

    def test_pdf_report_generation(self):
        user_info = {"name": "Kapil Khadase", "email": "kapil@example.com"}
        pdf_bytes = generate_pdf_report(1, user_info, "INR")
        self.assertGreater(len(pdf_bytes), 1000)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_excel_report_generation(self):
        user_info = {"name": "Kapil Khadase", "email": "kapil@example.com"}
        xlsx_bytes = generate_excel_report(1, user_info, "INR")
        self.assertGreater(len(xlsx_bytes), 1000)
        self.assertTrue(xlsx_bytes.startswith(b"PK"))

    def test_csv_report_generation(self):
        csv_str = generate_csv_export(1, "INR")
        self.assertIn("Asset Name", csv_str)
        self.assertIn("Owner / Buyer", csv_str)

    def test_frontend_table_column_separation(self):
        static_dir = os.path.join(os.path.dirname(__file__), "..", "static", "js", "components")
        
        # 1. assets.js
        with open(os.path.join(static_dir, "assets.js"), "r", encoding="utf-8") as f:
            assets_code = f.read()
        self.assertIn("<th>Asset Name</th>", assets_code)
        self.assertIn("<th>Owner / Holder</th>", assets_code)
        self.assertIn("owner-pill", assets_code)

        # 2. dashboard.js
        with open(os.path.join(static_dir, "dashboard.js"), "r", encoding="utf-8") as f:
            dash_code = f.read()
        self.assertIn("<th>Asset Name</th>", dash_code)
        self.assertIn("<th>Owner / Holder</th>", dash_code)
        self.assertIn("owner-pill", dash_code)

        # 3. analytics.js
        with open(os.path.join(static_dir, "analytics.js"), "r", encoding="utf-8") as f:
            analytics_code = f.read()
        self.assertIn("<th>Asset Name</th>", analytics_code)
        self.assertIn("<th>Owner / Holder</th>", analytics_code)
        self.assertIn("owner-pill", analytics_code)

        # 4. simulator.js
        with open(os.path.join(static_dir, "simulator.js"), "r", encoding="utf-8") as f:
            sim_code = f.read()
        self.assertIn("<th>Asset Name</th>", sim_code)
        self.assertIn("<th>Owner / Holder</th>", sim_code)
        self.assertIn("owner-pill", sim_code)

        # 5. transactions.js
        with open(os.path.join(static_dir, "transactions.js"), "r", encoding="utf-8") as f:
            tx_code = f.read()
        self.assertIn("<th>Asset Name</th>", tx_code)
        self.assertIn("<th>Owner / Holder</th>", tx_code)
        self.assertIn("owner-pill", tx_code)

        # 6. documents.js
        with open(os.path.join(static_dir, "documents.js"), "r", encoding="utf-8") as f:
            doc_code = f.read()
        self.assertIn("<th>Asset Name</th>", doc_code)
        self.assertIn("<th>Owner / Holder</th>", doc_code)
        self.assertIn("owner-pill", doc_code)

        print("All frontend table column separation checks passed successfully!")

if __name__ == "__main__":
    unittest.main()
