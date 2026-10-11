import os
import sys
import io
import time
import json
import base64
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app
from database import get_db_connection, init_db
from config import UPLOAD_FOLDER, STATIC_FOLDER, ALLOWED_DOCUMENT_EXTENSIONS
from services.auth_service import register_user

class TestFileUploadSafety(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.app = app.test_client()
        email = f"upload_sec_{int(time.time()*1000)}@assetvault.com"
        user, _ = register_user("Upload Security User", email, "SecurePass123!", "INR")
        self.user = user
        self.headers = {"Authorization": f"Bearer {user['token']}"}

        # Create asset for document attachments
        res = self.app.post("/api/assets", headers=self.headers, json={
            "asset_name": "Gold Security Coin",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 10.0,
            "purchase_price": 75000.0
        })
        self.asset_id = res.get_json()["asset_id"]

    def test_upload_stored_outside_web_root_with_uuid(self):
        """Uploaded files must reside in backend/uploads, never in web root (static/), with randomized UUID storage name"""
        self.assertNotEqual(os.path.abspath(UPLOAD_FOLDER), os.path.abspath(STATIC_FOLDER))
        self.assertFalse(os.path.abspath(UPLOAD_FOLDER).startswith(os.path.abspath(STATIC_FOLDER)))

        valid_pdf = (io.BytesIO(b"%PDF-1.4\nSafe invoice content for vault"), "safe_cert.pdf")
        res = self.app.post(
            "/api/documents/upload",
            headers=self.headers,
            data={"asset_id": str(self.asset_id), "document_type": "Certificate", "file": valid_pdf},
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 201)
        doc_id = res.get_json()["document_id"]

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT file_path, file_name FROM documents WHERE id = ?", (doc_id,))
        row = cursor.fetchone()
        conn.close()

        stored_file_path = row["file_path"]
        self.assertTrue(stored_file_path.endswith(".pdf"))
        self.assertNotIn("safe_cert.pdf", stored_file_path)
        # Check UUID length (32 hex characters + extension)
        uuid_part = stored_file_path.split(".")[0]
        self.assertEqual(len(uuid_part), 32)

        physical_path = os.path.join(UPLOAD_FOLDER, stored_file_path)
        self.assertTrue(os.path.exists(physical_path))
        # Ensure it does NOT exist inside web root
        self.assertFalse(os.path.exists(os.path.join(STATIC_FOLDER, stored_file_path)))

    def test_disallowed_file_extensions_rejected(self):
        """Executable, script, or unsupported file extensions must be rejected for both unencrypted and encrypted uploads"""
        dangerous_extensions = ["evil.exe", "script.sh", "shell.php", "macro.py", "xss.html", "hack.js", "run.bat", "cmd.cmd"]
        for bad_filename in dangerous_extensions:
            # 1. Unencrypted upload attempt
            f_unenc = (io.BytesIO(b"%PDF-1.4\nFake Header Content"), bad_filename)
            res_unenc = self.app.post(
                "/api/documents/upload",
                headers=self.headers,
                data={"asset_id": str(self.asset_id), "document_type": "Certificate", "file": f_unenc},
                content_type="multipart/form-data"
            )
            self.assertEqual(res_unenc.status_code, 400, f"Expected rejection for unencrypted {bad_filename}")
            self.assertIn("Invalid file type", res_unenc.get_json().get("error", ""))

            # 2. Encrypted upload attempt
            f_enc = (io.BytesIO(b"CIPHERTEXT_AES_GCM_RAW_PAYLOAD_TEST"), bad_filename)
            res_enc = self.app.post(
                "/api/documents/upload",
                headers=self.headers,
                data={
                    "asset_id": str(self.asset_id),
                    "document_type": "Certificate",
                    "file": f_enc,
                    "is_encrypted": "true",
                    "iv": "112233445566778899aabbcc"
                },
                content_type="multipart/form-data"
            )
            self.assertEqual(res_enc.status_code, 400, f"Expected rejection for encrypted {bad_filename}")
            self.assertIn("Invalid file type", res_enc.get_json().get("error", ""))

    def test_magic_bytes_and_executable_content_validation(self):
        """Disguised executables, shell scripts, and corrupt headers renamed to .pdf or .png must be strictly rejected"""
        attacks = [
            ("MZ Windows Executable", b"MZ\x90\x00\x03\x00\x00\x00\x04\x00", "invoice.pdf", "executable"),
            ("Linux ELF Executable", b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00", "invoice.pdf", "executable"),
            ("PHP Web Shell", b"<?php phpinfo(); ?>", "receipt.pdf", "executable"),
            ("Shell Script", b"#!/bin/bash\nrm -rf /", "warranty.pdf", "executable"),
            ("HTML Script Injection", b"<script>alert('XSS')</script>", "cert.pdf", "executable"),
            ("Plain text spoofed as PDF", b"This is just plain ASCII text masquerading as PDF", "fake.pdf", "file signature"),
            ("Corrupt PNG (bad IHDR)", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rBADH\x00\x00", "bad.png", "corrupt"),
        ]

        for desc, payload, fname, expected_msg_keyword in attacks:
            f = (io.BytesIO(payload), fname)
            res = self.app.post(
                "/api/documents/upload",
                headers=self.headers,
                data={"asset_id": str(self.asset_id), "document_type": "Certificate", "file": f},
                content_type="multipart/form-data"
            )
            self.assertEqual(res.status_code, 400, f"Failed to reject attack: {desc}")
            err = res.get_json().get("error", "").lower()
            self.assertTrue(expected_msg_keyword in err, f"Expected '{expected_msg_keyword}' in error for {desc}, got: '{err}'")

    def test_file_size_validation(self):
        """Zero-byte files and oversized files must be rejected"""
        # Empty file
        empty_file = (io.BytesIO(b""), "empty.pdf")
        res_empty = self.app.post(
            "/api/documents/upload",
            headers=self.headers,
            data={"asset_id": str(self.asset_id), "document_type": "Certificate", "file": empty_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_empty.status_code, 400)
        self.assertIn("empty or corrupted", res_empty.get_json().get("error", "").lower())

        # Sub-minimum threshold (2 bytes)
        tiny_file = (io.BytesIO(b"ab"), "tiny.pdf")
        res_tiny = self.app.post(
            "/api/documents/upload",
            headers=self.headers,
            data={"asset_id": str(self.asset_id), "document_type": "Certificate", "file": tiny_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_tiny.status_code, 400)

        # Oversized file (> 10MB limit)
        oversized = io.BytesIO(b"%PDF-" + b"0" * (10 * 1024 * 1024 + 50))
        res_over = self.app.post(
            "/api/documents/upload",
            headers=self.headers,
            data={"asset_id": str(self.asset_id), "document_type": "Certificate", "file": (oversized, "big.pdf")},
            content_type="multipart/form-data"
        )
        self.assertIn(res_over.status_code, [400, 413])

    def test_document_download_and_view_headers(self):
        """Document view and download endpoints must enforce nosniff, safe CSP sandbox, and attachment disposition"""
        valid_pdf = (io.BytesIO(b"%PDF-1.4\nSafe test pdf for header validation"), "header_test.pdf")
        res_up = self.app.post(
            "/api/documents/upload",
            headers=self.headers,
            data={"asset_id": str(self.asset_id), "document_type": "Certificate", "file": valid_pdf},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_up.status_code, 201)
        doc_id = res_up.get_json()["document_id"]

        # 1. Download endpoint
        res_dl = self.app.get(f"/api/documents/{doc_id}/download", headers=self.headers)
        self.assertEqual(res_dl.status_code, 200)
        self.assertEqual(res_dl.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertIn("sandbox", res_dl.headers.get("Content-Security-Policy", ""))
        self.assertIn("attachment", res_dl.headers.get("Content-Disposition", ""))
        self.assertEqual(res_dl.mimetype, "application/pdf")

        # 2. View endpoint
        res_vw = self.app.get(f"/api/documents/{doc_id}/view", headers=self.headers)
        self.assertEqual(res_vw.status_code, 200)
        self.assertEqual(res_vw.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertIn("sandbox", res_vw.headers.get("Content-Security-Policy", ""))
        self.assertEqual(res_vw.mimetype, "application/pdf")

    def test_asset_import_file_safety(self):
        """Spreadsheet import (/api/assets/import/preview) must reject executables and sanitize formula injection"""
        # 1. Executable disguised as CSV
        mz_csv = (io.BytesIO(b"MZ\x90\x00\x03\x00" + b"\x00" * 100), "assets.csv")
        res_mz = self.app.post(
            "/api/assets/import/preview",
            headers=self.headers,
            data={"file": mz_csv},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_mz.status_code, 400)
        self.assertIn("executable", res_mz.get_json().get("error", "").lower())

        # 2. Corrupt / fake XLSX lacking PK ZIP magic bytes
        fake_xlsx = (io.BytesIO(b"FAKE_SPREADSHEET_HEADER_DATA_STREAM"), "assets.xlsx")
        res_xlsx = self.app.post(
            "/api/assets/import/preview",
            headers=self.headers,
            data={"file": fake_xlsx},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_xlsx.status_code, 400)
        self.assertIn("magic bytes", res_xlsx.get_json().get("error", "").lower())

        # 3. Valid CSV with formula injection attempt
        formula_csv = (
            io.BytesIO(
                b"Asset Name,Metal,Purity,Gross Weight,Purchase Price\n"
                b"=CMD|'/C calc'!A0,Gold,24K,10.0,75000\n"
                b"+SUM(1+1),Silver,999,50.0,4000\n"
            ),
            "formula_test.csv"
        )
        res_formula = self.app.post(
            "/api/assets/import/preview",
            headers=self.headers,
            data={"file": formula_csv},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_formula.status_code, 200)
        preview_rows = res_formula.get_json().get("rows", [])
        self.assertEqual(len(preview_rows), 2)
        # Check that formula triggers have been neutralized with leading single quote
        self.assertTrue(preview_rows[0]["data"]["asset_name"].startswith("'="))
        self.assertTrue(preview_rows[1]["data"]["asset_name"].startswith("'+"))

    def test_csv_export_formula_injection_defense(self):
        """CSV Export must sanitize cells starting with formula characters (=, +, -, @)"""
        res_asset = self.app.post("/api/assets", headers=self.headers, json={
            "asset_name": "=1+1 Formula Injection Coin",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 5.0,
            "purchase_price": 35000.0
        })
        self.assertEqual(res_asset.status_code, 201)

        res_csv = self.app.get("/api/reports/csv", headers=self.headers)
        self.assertEqual(res_csv.status_code, 200)
        csv_text = res_csv.data.decode("utf-8")
        # Ensure formula is escaped with single quote
        self.assertIn("'=1+1", csv_text)

    def test_backup_restore_document_validation(self):
        """Restoring backup payload with disallowed extensions or executable payload must be rejected"""
        # 1. Backup with executable payload inside document
        evil_backup = {
            "backup_version": 1,
            "schema_version": 6,
            "assets": [],
            "transactions": [],
            "documents": [
                {
                    "file_name": "malicious.exe",
                    "file_payload": base64.b64encode(b"MZ\x90\x00\x03\x00\x00\x00").decode("utf-8"),
                    "is_encrypted": 0
                }
            ]
        }
        res_restore = self.app.post("/api/backup/restore-vault-data", headers=self.headers, json=evil_backup)
        self.assertEqual(res_restore.status_code, 400)
        self.assertIn("Unsupported document extension", res_restore.get_json().get("error", ""))

        # 2. Backup with .pdf extension but executable content
        evil_pdf_backup = {
            "backup_version": 1,
            "schema_version": 6,
            "assets": [],
            "transactions": [],
            "documents": [
                {
                    "file_name": "disguised.pdf",
                    "file_payload": base64.b64encode(b"MZ\x90\x00\x03\x00\x00\x00").decode("utf-8"),
                    "is_encrypted": 1,
                    "iv": "112233445566778899aabbcc"
                }
            ]
        }
        res_restore_pdf = self.app.post("/api/backup/restore-vault-data", headers=self.headers, json=evil_pdf_backup)
        self.assertEqual(res_restore_pdf.status_code, 400)
        self.assertIn("Executable or script payload detected", res_restore_pdf.get_json().get("error", ""))

if __name__ == "__main__":
    unittest.main()
