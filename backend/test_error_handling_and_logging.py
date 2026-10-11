import unittest
import os
import sys
import json
import sqlite3
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app
from config import LOG_FILE

class TestErrorHandlingAndLogging(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch("app.get_db_connection")
    def test_global_exception_handler_masks_database_and_path_errors(self, mock_db_conn):
        """Uncaught exceptions on API routes must return generic 500 without stack traces, file paths, or DB details"""
        simulated_error_msg = "OperationalError: near 'SELECT * FROM categories': syntax error at C:\\Users\\khada\\assetvault\\backend\\database.py:42"
        mock_db_conn.side_effect = sqlite3.OperationalError(simulated_error_msg)

        res = self.app.get("/api/categories")
        self.assertEqual(res.status_code, 500)
        data = res.get_json()
        
        # 1. Generic message verification
        self.assertIn("error", data)
        self.assertIn("An internal server error occurred", data["error"])
        self.assertEqual(data.get("status"), 500)

        # 2. Verify zero leakage of stack traces, paths, or DB errors
        self.assertNotIn("details", data)
        self.assertNotIn("Traceback", json.dumps(data))
        self.assertNotIn("OperationalError", json.dumps(data))
        self.assertNotIn("syntax error", json.dumps(data))
        self.assertNotIn("SELECT", json.dumps(data))
        self.assertNotIn("C:\\Users", json.dumps(data))
        self.assertNotIn("database.py", json.dumps(data))

    @patch("app.get_db_connection")
    def test_server_side_logging_captures_tracebacks(self, mock_db_conn):
        """Full tracebacks and error context must be logged server-side in assetvault.log"""
        unique_token = "UNIQUE_DEBUG_TEST_CRASH_MARKER_98765"
        mock_db_conn.side_effect = RuntimeError(f"Internal DB failure with token: {unique_token}")

        res = self.app.get("/api/categories")
        self.assertEqual(res.status_code, 500)
        data = res.get_json()
        
        # Client never sees debug token or raw message
        self.assertNotIn(unique_token, json.dumps(data))

        # Server-side log MUST contain the unique token and traceback
        self.assertTrue(os.path.exists(LOG_FILE), f"Log file {LOG_FILE} does not exist")
        with open(LOG_FILE, "r", encoding="utf-8", errors="ignore") as f:
            log_contents = f.read()
        self.assertIn(unique_token, log_contents)
        self.assertIn("Traceback (most recent call last):", log_contents)

    def test_api_404_error_handler(self):
        """API 404 returns structured JSON without stack traces"""
        res = self.app.get("/api/nonexistent-route-endpoint-xyz")
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertEqual(data.get("status"), 404)
        self.assertEqual(data.get("error"), "Endpoint not found")
        self.assertNotIn("Traceback", json.dumps(data))

    def test_api_405_error_handler(self):
        """API 405 Method Not Allowed returns structured JSON"""
        res = self.app.delete("/api/health")
        self.assertEqual(res.status_code, 405)
        data = res.get_json()
        self.assertEqual(data.get("status"), 405)
        self.assertEqual(data.get("error"), "Method not allowed")

    def test_import_parser_masks_exceptions(self):
        """CSV and Excel parsing errors return generic messages without leaking python exceptions or paths"""
        from services.import_service import parse_and_validate_file
        import io

        # Malformed bytes that cannot be decoded as utf-8
        bad_stream = io.BytesIO(b"\xff\xfe\x00\x00Corrupt payload \x80\x81\x82")
        res, status = parse_and_validate_file(bad_stream, "test.csv", user_id=1)
        self.assertEqual(status, 400)
        self.assertIn("Failed to parse CSV file", res["error"])
        self.assertNotIn("UnicodeDecodeError", res["error"])
        self.assertNotIn("codec can't decode", res["error"])

    def test_file_validator_masks_exceptions(self):
        """Corrupt image validation raises generic message without internal exception details"""
        from services.file_validator import validate_pre_encryption_file

        corrupt_jpg = b"\xff\xd8\xff\xe0" + b"\x00" * 20 # Truncated JPEG
        with self.assertRaises(ValueError) as ctx:
            validate_pre_encryption_file("corrupt.jpg", corrupt_jpg, "image/jpeg")
        err_msg = str(ctx.exception)
        self.assertIn("Corrupt or unreadable", err_msg)
        self.assertNotIn("struct.error", err_msg)
        self.assertNotIn("Traceback", err_msg)
        self.assertNotIn("C:\\", err_msg)

    @patch("app.generate_pdf_report")
    @patch("app.decode_token")
    def test_report_generation_unexpected_exception_masks_details(self, mock_decode, mock_gen_pdf):
        """Unexpected internal exceptions during report generation return generic 500 without leaking library/path details"""
        mock_decode.return_value = {"user_id": 1, "email": "test@assetvault.com"}
        simulated_err = "ReportLab layout error at C:\\Users\\khada\\assetvault\\.venv\\reportlab\\platypus\\dope.py:99"
        mock_gen_pdf.side_effect = RuntimeError(simulated_err)

        headers = {"Authorization": "Bearer fake_token"}
        res = self.app.post("/api/reports/pdf", headers=headers, json={})
        self.assertEqual(res.status_code, 500)
        data = res.get_json()
        self.assertEqual(data.get("status"), 500)
        self.assertIn("Failed to generate PDF report due to an internal server error", data.get("error"))
        self.assertNotIn("ReportLab", json.dumps(data))
        self.assertNotIn("C:\\Users", json.dumps(data))
        self.assertNotIn("platypus", json.dumps(data))

if __name__ == "__main__":
    unittest.main()
