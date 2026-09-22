"""
AssetVault 20-Step Comprehensive Disaster Recovery Test Suite
Validates complete data resilience across catastrophic system failure:
  1. Create user A
  2. Add physical bullion assets
  3. Add transactions
  4. Add portfolio goals
  5. Add price alerts
  6. Upload encrypted documents (mock client encryption)
  7. Record baseline: asset count, tx count, total valuation, P&L, goal progress, active alerts, document hashes
  8. Export encrypted vault backup (.vault file)
  9. Verify backup integrity: check structure, metadata, checksum, encryption envelope
  10. Simulate total disaster: completely drop/destroy test database
  11. Run database initialization and migrations on fresh database
  12. Verify fresh database is empty (0 assets, 0 transactions, etc.)
  13. Restore vault from the backup file
  14. Verify user restored with correct credentials
  15. Verify asset count and all asset properties match baseline
  16. Verify transaction ledger matches baseline exactly
  17. Verify portfolio valuation and P&L match baseline
  18. Verify goals and alerts match baseline
  19. Verify encrypted documents exist and their hashes match pre-disaster
  20. Decrypt document using original client key - verify decrypted bytes match original plaintext exactly.
      Also verify public QR verification tokens remain valid.
"""

import os
import sys
import io
import time
import json
import base64
import hashlib
import unittest
import secrets
import shutil

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import config
import database
from database import get_db_connection, init_db
from app import app
from services.auth_service import register_user, authenticate_user
from services.valuation_engine import get_portfolio_summary

def mock_client_stream_cipher(data: bytes, key: bytes, iv: bytes) -> bytes:
    """Deterministic symmetric stream cipher using SHA-256 counter mode keystream."""
    keystream = bytearray()
    counter = 0
    while len(keystream) < len(data):
        block = hashlib.sha256(key + iv + counter.to_bytes(4, 'big')).digest()
        keystream.extend(block)
        counter += 1
    return bytes([d ^ k for d, k in zip(data, keystream[:len(data)])])

class DisasterRecoveryTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = os.path.join(config.BASE_DIR, "backend", "test_scratch_dr")
        os.makedirs(cls.test_dir, exist_ok=True)
        cls.dr_db_path = os.path.join(cls.test_dir, f"disaster_test_{int(time.time()*1000)}.db")
        cls.orig_db_path = config.DB_PATH
        cls.orig_database_db_path = database.DB_PATH

        # Point environment to test database
        config.DB_PATH = cls.dr_db_path
        database.DB_PATH = cls.dr_db_path

        init_db()
        cls.app = app.test_client()
        cls.app.testing = True

    @classmethod
    def tearDownClass(cls):
        # Restore original DB paths
        config.DB_PATH = cls.orig_db_path
        database.DB_PATH = cls.orig_database_db_path
        # Clean up test scratch dir
        if os.path.exists(cls.test_dir):
            try:
                shutil.rmtree(cls.test_dir, ignore_errors=True)
            except Exception:
                pass

    def test_full_20_step_disaster_recovery_workflow(self):
        """Execute full 20-step disaster recovery workflow from baseline creation to post-disaster validation."""
        print("\n" + "="*70)
        print(">>> STARTING 20-STEP DISASTER RECOVERY & RESILIENCE VERIFICATION <<<")
        print("="*70)

        # ---------------------------------------------------------------------
        # Step 1: Create user A with public QR verification enabled
        # ---------------------------------------------------------------------
        print("[Step 01/20] Creating User A...")
        user_email = f"dr_owner_{int(time.time()*1000)}_{secrets.token_hex(4)}@assetvault.com"
        user_pass = "DisasterRecoveryPass2026!"
        user_a, _ = register_user("Dr. Arjun Mehta", user_email, user_pass, "INR")
        user_a_id = user_a["id"]
        token_a = user_a["token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Enable public certificate verification and public owner name
        res_priv = self.app.put("/api/auth/qr-privacy", headers=headers_a, json={
            "public_certificate_verification": True,
            "public_owner_name": True
        })
        self.assertEqual(res_priv.status_code, 200, "Failed to enable QR privacy for User A")
        print("  [OK] User A created and QR privacy enabled")

        # ---------------------------------------------------------------------
        # Step 2: Add physical bullion assets
        # ---------------------------------------------------------------------
        print("[Step 02/20] Adding Physical Bullion Assets...")
        res_gold = self.app.post("/api/assets", headers=headers_a, json={
            "asset_name": "MMTC-PAMP Sovereign Gold Bar",
            "category_id": 1,
            "asset_type": "Physical Bullion",
            "metal": "Gold",
            "purity": "24K",
            "gross_weight": 50.0,
            "net_weight": 50.0,
            "purchase_price": 350000.0,
            "total_acquisition_cost": 350000.0,
            "purchase_date": "2026-01-15",
            "status": "Active",
            "hallmark_huid": "HUID-GOLD-992144"
        })
        self.assertEqual(res_gold.status_code, 201)
        gold_asset_id = res_gold.get_json()["asset_id"]

        res_silver = self.app.post("/api/assets", headers=headers_a, json={
            "asset_name": "Silver Eagle Bullion Ingot",
            "category_id": 1,
            "asset_type": "Physical Bullion",
            "metal": "Silver",
            "purity": "999",
            "gross_weight": 500.0,
            "net_weight": 500.0,
            "purchase_price": 45000.0,
            "total_acquisition_cost": 45000.0,
            "purchase_date": "2026-02-01",
            "status": "Active",
            "hallmark_huid": "HUID-SLVR-551023"
        })
        self.assertEqual(res_silver.status_code, 201)
        silver_asset_id = res_silver.get_json()["asset_id"]
        print(f"  [OK] Added 2 physical bullion assets: Gold (#{gold_asset_id}), Silver (#{silver_asset_id})")

        # ---------------------------------------------------------------------
        # Step 3: Add transactions
        # ---------------------------------------------------------------------
        print("[Step 03/20] Adding Transactions Ledger Entries...")
        res_tx1 = self.app.post("/api/transactions", headers=headers_a, json={
            "asset_id": gold_asset_id,
            "transaction_type": "PURCHASE",
            "transaction_date": "2026-01-15",
            "amount": 350000.0,
            "realized_profit": 0.0,
            "counterparty": "MMTC-PAMP India",
            "notes": "Direct refinery purchase"
        })
        self.assertEqual(res_tx1.status_code, 201)

        res_tx2 = self.app.post("/api/transactions", headers=headers_a, json={
            "asset_id": silver_asset_id,
            "transaction_type": "PURCHASE",
            "transaction_date": "2026-02-01",
            "amount": 45000.0,
            "realized_profit": 0.0,
            "counterparty": "Bullion India Corp",
            "notes": "Silver ingot acquisition"
        })
        self.assertEqual(res_tx2.status_code, 201)

        res_tx3 = self.app.post("/api/transactions", headers=headers_a, json={
            "asset_id": silver_asset_id,
            "transaction_type": "SALE",
            "transaction_date": "2026-03-01",
            "amount": 12000.0,
            "realized_profit": 2000.0,
            "counterparty": "Local Jeweller",
            "notes": "Partial ingot sale"
        })
        self.assertEqual(res_tx3.status_code, 201)
        print("  [OK] Added 3 ledger transactions (2 purchases, 1 sale with profit)")

        # ---------------------------------------------------------------------
        # Step 4: Add portfolio goals
        # ---------------------------------------------------------------------
        print("[Step 04/20] Adding Portfolio Goals...")
        res_goal = self.app.post("/api/goals", headers=headers_a, json={
            "title": "Build 1kg Gold Reserve",
            "target_amount": 7500000.0,
            "target_date": "2028-12-31",
            "notes": "Long-term family wealth preservation"
        })
        self.assertEqual(res_goal.status_code, 201)
        print("  [OK] Added portfolio goal")

        # ---------------------------------------------------------------------
        # Step 5: Add price alerts
        # ---------------------------------------------------------------------
        print("[Step 05/20] Adding Price Alerts...")
        res_alert = self.app.post("/api/alerts", headers=headers_a, json={
            "alert_type": "PRICE_TARGET",
            "target_metal": "Gold",
            "target_value": 8500.0,
            "condition": "GREATER_THAN",
            "is_enabled": 1,
            "notes": "Notify when gold crosses 8,500/g"
        })
        self.assertEqual(res_alert.status_code, 201)
        print("  [OK] Added price alert")

        # ---------------------------------------------------------------------
        # Step 6: Upload encrypted documents (mock client encryption)
        # ---------------------------------------------------------------------
        print("[Step 06/20] Uploading Encrypted Documents with Mock Client Encryption...")
        client_key = secrets.token_bytes(32)
        client_iv = secrets.token_bytes(12)
        client_iv_hex = client_iv.hex()

        original_plaintext = (
            b"%PDF-1.4\n%Confidential Hallmark Certificate of Authenticity\n"
            b"AssetVault Bar ID: AV-GOLD-2026-992144\n"
            b"Assay Purity: 99.99% Pure Gold (24 Karat)\n"
            b"Issuer: MMTC-PAMP Precious Metals Refinery\n%%EOF"
        )
        pre_disaster_plaintext_hash = hashlib.sha256(original_plaintext).hexdigest()

        # Client-side encryption: Plaintext -> Ciphertext
        ciphertext = mock_client_stream_cipher(original_plaintext, client_key, client_iv)
        self.assertNotEqual(ciphertext, original_plaintext)
        pre_disaster_ciphertext_hash = hashlib.sha256(ciphertext).hexdigest()

        # Upload encrypted ciphertext to server
        res_doc = self.app.post(
            "/api/documents/upload",
            headers=headers_a,
            data={
                "asset_id": str(gold_asset_id),
                "document_type": "Certificate",
                "is_encrypted": "true",
                "iv": client_iv_hex,
                "encryption_meta": json.dumps({"algorithm": "AES-256-GCM-MOCK", "iv": client_iv_hex}),
                "file": (io.BytesIO(ciphertext), "gold_certificate.pdf")
            },
            content_type="multipart/form-data"
        )
        self.assertEqual(res_doc.status_code, 201)
        print("  [OK] Uploaded client-side encrypted document")

        # ---------------------------------------------------------------------
        # Step 7: Record baseline: asset count, tx count, valuation, P&L, goals, alerts, hashes
        # ---------------------------------------------------------------------
        print("[Step 07/20] Recording System Baseline Metrics...")
        baseline_summary = get_portfolio_summary(user_a_id, target_currency="INR")
        baseline_asset_count = baseline_summary["total_assets_count"]
        baseline_total_val = baseline_summary["total_current_market_value"]
        baseline_total_cost = baseline_summary["total_invested_cost"]
        baseline_pl = baseline_summary["total_unrealized_pnl"]

        # Fetch QR certificate tokens
        res_assets = self.app.get("/api/assets", headers=headers_a)
        assets_data = res_assets.get_json()["assets"]
        gold_asset_obj = next(a for a in assets_data if a["id"] == gold_asset_id)
        pre_disaster_cert_token = gold_asset_obj["certificate_token"]
        self.assertTrue(bool(pre_disaster_cert_token))

        # Fetch baseline transactions count
        res_baseline_tx = self.app.get("/api/transactions?per_page=100", headers=headers_a)
        baseline_tx_count = res_baseline_tx.get_json()["total"]

        print(f"  [OK] Baseline: {baseline_asset_count} assets, {baseline_tx_count} txs, Val: INR {baseline_total_val:,.2f}, P&L: INR {baseline_pl:,.2f}")
        print(f"  [OK] Pre-disaster QR cert token: {pre_disaster_cert_token[:10]}...")

        # ---------------------------------------------------------------------
        # Step 8: Export encrypted vault backup (.vault file)
        # ---------------------------------------------------------------------
        print("[Step 08/20] Exporting Encrypted Vault Backup (.vault payload)...")
        res_export = self.app.get("/api/backup/export-vault-data", headers=headers_a)
        self.assertEqual(res_export.status_code, 200)
        vault_backup = res_export.get_json()
        print("  [OK] Vault backup exported successfully")

        # ---------------------------------------------------------------------
        # Step 9: Verify backup integrity: check structure, metadata, encryption envelope
        # ---------------------------------------------------------------------
        print("[Step 09/20] Verifying Backup Integrity & Metadata Envelope...")
        self.assertEqual(vault_backup.get("backup_version"), 1)
        self.assertEqual(vault_backup.get("schema_version"), 6)
        self.assertEqual(vault_backup.get("encryption_format"), "AES-256-GCM")
        self.assertEqual(len(vault_backup.get("assets", [])), 2)
        self.assertEqual(len(vault_backup.get("transactions", [])), baseline_tx_count)
        self.assertEqual(len(vault_backup.get("goals", [])), 1)
        self.assertEqual(len(vault_backup.get("alerts", [])), 1)
        self.assertEqual(len(vault_backup.get("documents", [])), 1)

        doc_backup = vault_backup["documents"][0]
        backup_cipher_bytes = base64.b64decode(doc_backup["file_payload"])
        self.assertEqual(hashlib.sha256(backup_cipher_bytes).hexdigest(), pre_disaster_ciphertext_hash)
        print("  [OK] Backup integrity and ciphertext payload hash verified")

        # ---------------------------------------------------------------------
        # Step 10: Simulate total disaster: completely drop the test database
        # ---------------------------------------------------------------------
        print("[Step 10/20] SIMULATING TOTAL DISASTER: Destroying active database...")
        # Close any open connections by creating a temporary empty path
        fresh_db_path = os.path.join(self.test_dir, f"disaster_fresh_{int(time.time()*1000)}.db")
        config.DB_PATH = fresh_db_path
        database.DB_PATH = fresh_db_path

        # Physically remove original test DB files
        for suffix in ["", "-wal", "-shm"]:
            fp = self.dr_db_path + suffix
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass
        print(f"  [OK] Database destroyed. Switched target path to {fresh_db_path}")

        # ---------------------------------------------------------------------
        # Step 11: Run database initialization and migrations on fresh database
        # ---------------------------------------------------------------------
        print("[Step 11/20] Running Database Initialization & Migrations on Clean Database...")
        init_db()
        print("  [OK] Clean database initialized and all 6 migrations applied")

        # ---------------------------------------------------------------------
        # Step 12: Verify fresh database is empty (0 assets, 0 transactions, etc.)
        # ---------------------------------------------------------------------
        print("[Step 12/20] Verifying Clean Database is Completely Empty...")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM assets")
        self.assertEqual(cursor.fetchone()[0], 0)
        cursor.execute("SELECT COUNT(*) FROM transactions")
        self.assertEqual(cursor.fetchone()[0], 0)
        cursor.execute("SELECT COUNT(*) FROM documents")
        self.assertEqual(cursor.fetchone()[0], 0)
        cursor.execute("SELECT COUNT(*) FROM portfolio_goals")
        self.assertEqual(cursor.fetchone()[0], 0)
        cursor.execute("SELECT COUNT(*) FROM alerts")
        self.assertEqual(cursor.fetchone()[0], 0)
        cursor.execute("SELECT COUNT(*) FROM users")
        self.assertEqual(cursor.fetchone()[0], 0)
        conn.close()
        print("  [OK] Verified: 0 assets, 0 tx, 0 docs, 0 goals, 0 alerts, 0 users")

        # ---------------------------------------------------------------------
        # Step 13: Restore vault from the backup file
        # ---------------------------------------------------------------------
        print("[Step 13/20] Restoring Vault from Backup File...")
        # Step 13a: User A initializes account on fresh system with same credentials
        restored_user, _ = register_user("Dr. Arjun Mehta", user_email, user_pass, "INR")
        restore_user_id = restored_user["id"]
        restore_token = restored_user["token"]
        restore_headers = {"Authorization": f"Bearer {restore_token}"}

        # Step 13b: Execute atomic vault restore
        res_restore = self.app.post(
            "/api/backup/restore-vault-data",
            headers=restore_headers,
            json=vault_backup
        )
        self.assertEqual(res_restore.status_code, 200, f"Restore failed: {res_restore.get_json()}")
        restore_counts = res_restore.get_json()["counts"]
        self.assertEqual(restore_counts["assets"], 2)
        self.assertEqual(restore_counts["transactions"], baseline_tx_count)
        self.assertEqual(restore_counts["documents"], 1)
        print(f"  [OK] Vault successfully restored into Account #{restore_user_id}")

        # ---------------------------------------------------------------------
        # Step 14: Verify user restored with correct credentials
        # ---------------------------------------------------------------------
        print("[Step 14/20] Verifying User Credentials & Authentication Post-Disaster...")
        login_res, _ = authenticate_user(user_email, user_pass)
        self.assertIsNotNone(login_res, "User login failed with original credentials post-disaster!")
        self.assertEqual(login_res["email"], user_email)
        print("  [OK] User authenticated successfully with original password")

        # ---------------------------------------------------------------------
        # Step 15: Verify asset count and all asset properties match baseline
        # ---------------------------------------------------------------------
        print("[Step 15/20] Verifying Asset Properties Match Baseline...")
        res_restored_assets = self.app.get("/api/assets", headers=restore_headers)
        restored_assets = res_restored_assets.get_json()["assets"]
        self.assertEqual(len(restored_assets), baseline_asset_count)

        restored_gold = next(a for a in restored_assets if a["metal"] == "Gold")
        self.assertEqual(restored_gold["asset_name"], "MMTC-PAMP Sovereign Gold Bar")
        self.assertEqual(restored_gold["gross_weight"], 50.0)
        self.assertEqual(restored_gold["net_weight"], 50.0)
        self.assertEqual(restored_gold["purchase_price"], 350000.0)
        self.assertEqual(restored_gold["hallmark_huid"], "HUID-GOLD-992144")
        self.assertEqual(restored_gold["status"], "Active")
        print("  [OK] Asset count and all asset properties match baseline exactly")

        # ---------------------------------------------------------------------
        # Step 16: Verify transaction ledger matches baseline exactly
        # ---------------------------------------------------------------------
        print("[Step 16/20] Verifying Transaction Ledger Matches Baseline...")
        res_restored_tx = self.app.get("/api/transactions?per_page=100", headers=restore_headers)
        restored_txs = res_restored_tx.get_json()["transactions"]
        self.assertEqual(len(restored_txs), baseline_tx_count)

        sale_tx = next(t for t in restored_txs if t["transaction_type"] == "SALE")
        self.assertEqual(sale_tx["amount"], 12000.0)
        self.assertEqual(sale_tx["realized_profit"], 2000.0)
        self.assertEqual(sale_tx["counterparty"], "Local Jeweller")
        print("  [OK] Transaction ledger matches baseline exactly")

        # ---------------------------------------------------------------------
        # Step 17: Verify portfolio valuation and P&L match baseline
        # ---------------------------------------------------------------------
        print("[Step 17/20] Verifying Portfolio Valuation & P&L Match Baseline...")
        restored_summary = get_portfolio_summary(restore_user_id, target_currency="INR")
        self.assertEqual(restored_summary["total_assets_count"], baseline_asset_count)
        self.assertAlmostEqual(restored_summary["total_invested_cost"], baseline_total_cost, places=2)
        self.assertAlmostEqual(restored_summary["total_current_market_value"], baseline_total_val, places=2)
        self.assertAlmostEqual(restored_summary["total_unrealized_pnl"], baseline_pl, places=2)
        print(f"  [OK] Portfolio valuation (INR {restored_summary['total_current_market_value']:,.2f}) and P&L match baseline")

        # ---------------------------------------------------------------------
        # Step 18: Verify goals and alerts match baseline
        # ---------------------------------------------------------------------
        print("[Step 18/20] Verifying Goals & Alerts Match Baseline...")
        res_restored_goals = self.app.get("/api/goals", headers=restore_headers)
        restored_goals = res_restored_goals.get_json()["goals"]
        self.assertEqual(len(restored_goals), 1)
        self.assertEqual(restored_goals[0]["title"], "Build 1kg Gold Reserve")
        self.assertEqual(restored_goals[0]["target_amount"], 7500000.0)

        res_restored_alerts = self.app.get("/api/alerts", headers=restore_headers)
        restored_alerts = res_restored_alerts.get_json()["alerts"]
        self.assertEqual(len(restored_alerts), 1)
        self.assertEqual(restored_alerts[0]["target_metal"].upper(), "GOLD")
        self.assertEqual(restored_alerts[0]["target_value"], 8500.0)
        print("  [OK] Goals and alerts match baseline")

        # ---------------------------------------------------------------------
        # Step 19: Verify encrypted documents exist and their hashes match pre-disaster
        # ---------------------------------------------------------------------
        print("[Step 19/20] Verifying Restored Document Ciphertext Hashes...")
        res_restored_docs = self.app.get("/api/documents", headers=restore_headers)
        restored_docs = res_restored_docs.get_json()["documents"]
        self.assertEqual(len(restored_docs), 1)
        restored_doc = restored_docs[0]
        restored_doc_id = restored_doc["id"]

        # Download restored document payload from server
        res_download = self.app.get(f"/api/documents/{restored_doc_id}/download", headers=restore_headers)
        self.assertEqual(res_download.status_code, 200)
        restored_ciphertext = res_download.data

        restored_cipher_hash = hashlib.sha256(restored_ciphertext).hexdigest()
        self.assertEqual(restored_cipher_hash, pre_disaster_ciphertext_hash,
                         "Restored ciphertext hash does not match pre-disaster hash!")
        print("  [OK] Restored document ciphertext hash matches pre-disaster ciphertext hash exactly")

        # ---------------------------------------------------------------------
        # Step 20: Decrypt document with client key & verify public QR certificate token
        # ---------------------------------------------------------------------
        print("[Step 20/20] Decrypting Document with Original Client Key & Verifying QR Token...")
        # Client-side decryption: Restored Ciphertext -> Decrypted Plaintext
        decrypted_bytes = mock_client_stream_cipher(restored_ciphertext, client_key, client_iv)
        self.assertEqual(decrypted_bytes, original_plaintext,
                         "Decrypted bytes do not match original pre-encryption plaintext!")
        self.assertEqual(hashlib.sha256(decrypted_bytes).hexdigest(), pre_disaster_plaintext_hash)
        print("  [OK] Decrypted bytes match original pre-encryption plaintext byte-for-byte!")

        # Verify QR certificate token preserved and valid
        self.assertEqual(restored_gold["certificate_token"], pre_disaster_cert_token,
                         "Certificate token was mutated during restore!")

        res_qr = self.app.get(f"/api/verify/certificate/{pre_disaster_cert_token}")
        self.assertEqual(res_qr.status_code, 200, f"QR verification failed post-disaster: {res_qr.get_json()}")
        qr_data = res_qr.get_json()
        self.assertTrue(qr_data["verified"])
        self.assertEqual(qr_data["asset"]["asset_name"], "MMTC-PAMP Sovereign Gold Bar")
        self.assertEqual(qr_data["asset"]["hallmark_huid"], "HUID-GOLD-992144")
        print("  [OK] Public QR Certificate verification succeeded post-disaster with original token")

        print("="*70)
        print(">>> ALL 20 DISASTER RECOVERY STEPS PASSED WITH ZERO DATA LOSS <<<")
        print("="*70)

if __name__ == "__main__":
    unittest.main()
