# AssetVault — Master Physical & Vaulted Precious Asset Valuation System

[![Python](https://img.shields.io/badge/Python-3.13%2B-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-green.svg)](https://palletsprojects.com/p/flask/)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM%20Client%20Encryption-gold.svg)]()
[![Tests](https://img.shields.io/badge/Tests-Verified%20(100%25)-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/Version-2.0.0%20Production-purple.svg)]()

**AssetVault** is an enterprise-grade personal precious asset portfolio depository, live valuation, and risk analytics platform. Designed specifically for high-net-worth bullion investors, family offices, and luxury jewelry collectors, AssetVault seamlessly tracks physical bullion (Gold, Silver, Platinum), certified diamonds & solitaires, digital gold (MMTC-PAMP, Augmont, SafeGold, Jar), RBI Sovereign Gold Bonds (SGB), and luxury collectibles with real-time spot market feeds and landed duty accounting.

---

## 🔒 Security Boundary Matrix

AssetVault enforces strict, technically accurate boundaries between client-side encryption and server-side processing:

| Data | Encrypted Before Server Storage? | Server Can Read? | Storage Mechanism |
| :--- | :---: | :---: | :--- |
| **Assets** | Yes | No, except transient report processing | Client-Side Encrypted Vault (AES-256-GCM ciphertext in SQLite) |
| **Transactions** | Yes | No, except transient report processing | Client-Side Encrypted Vault (AES-256-GCM ciphertext in SQLite) |
| **Documents** | Yes | No | Server-Side Ciphertext Storage Layer (`uploads/*.enc`) with unique IVs |
| **Photos** | Yes | No | Server-Side Ciphertext Storage Layer (`uploads/*.enc`) with unique IVs |
| **Backup (.vault)** | Yes | No | PBKDF2 (100k rounds) + AES-256-GCM envelope with SHA-256 checksum |
| **Password** | Hashed | No | Salted PBKDF2-HMAC-SHA256 (never stored in plaintext) |
| **API keys** | Server configuration only | Server may use configured API keys | Environment variables (`.env`) for spot price feeds |
| **Generated reports** | Temporary processing | Yes, transiently during generation | Streamed directly from volatile RAM (`io.BytesIO`); never persisted |

> [!NOTE]
> **Core Architectural Distinction**: AssetVault provides client-side encrypted vault storage, but report generation temporarily processes decrypted report data in backend memory. Plaintext financial data is never persisted to disk, never logged, and immediate garbage collection clears report buffers from RAM upon HTTP response completion.

---

## 🏛️ Key Architectural Features & Security Controls

### 1. Client-Side AES-256-GCM Document Encryption with Pre-Validation
- **Pre-Encryption File Validation**: Files are inspected in the browser prior to encryption (allowed extensions `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, valid MIME types, magic-byte header inspection, and image dimension decoding) to reject renamed executables and corrupted files.
- **Full Browser Encryption**: Files are encrypted client-side using W3C Web Crypto API with AES-GCM (256-bit key) and a cryptographically random 12-byte IV generated per document.
- **Server-Side Ciphertext Storage Layer**: The backend receives and stores only opaque ciphertext, unique IV, safe metadata (document type, safe file size, category), and randomized UUID filenames. The server has no access to plaintext documents.
- **Local Browser Decryption**: Decryption occurs exclusively in browser memory. Plaintext documents are never cached or written to server disk.
- **Zero-Backdoor Policy**: No master backdoor key, escrow bypass, or recovery backdoor exists. The user's passphrase is the sole root of encryption.

### 2. Transient In-Memory Decrypted Reporting with Payload Integrity
- **In-Memory Generation Only**: PDF statements, multi-tab Excel workbooks, and CSV summaries are rendered in volatile RAM buffers (`io.BytesIO`) using ReportLab and OpenPyXL.
- **Payload Integrity & Anti-Tamper Enforcement**: The backend authenticates the user, verifies ownership of every asset ID and transaction ID, checks numeric ranges and lifecycle statuses, verifies critical fields against trusted database records, and recalculates derived totals server-side to prevent client fabrication of profit, ROI, or totals.
- **Strict No-Disk-Persistence**: Decrypted payloads are never written to disk or logs. Responses enforce `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.

### 3. Comprehensive Bullion & Diamond Valuation Engine
- **Hallmark & Purity Factor Alignment**: Real-time spot pricing across 24K (999.9), 22K (916 BIS Hallmark), 18K (750), 14K (585), 999 Fine Silver, 925 Sterling Silver, and PT950 Platinum.
- **Indian Landed Duty Accounting**: Computes replacement cost incorporating Indian Customs Duty (6.0%), Precious Metal GST (3.0%), and 1.11x landed factor.
- **Diamond 4Cs Algorithmic Engine**: Evaluates Carat weight (non-linear step multiplier), Color (D–M), Clarity (FL/IF to I1–I3), Cut, Polish, Symmetry, and Fluorescence with laboratory certification factors (GIA, IGI, AGS).
- **Natural vs Lab-Grown Diamonds**: Applies a 0.38x valuation factor to Lab-Grown Diamonds (LGD) with clear appraisal notices.
- **Inactive / Liquidated Asset Accounting**: Liquidated (Sold) holdings lock realized P&L and net return; unrealized gains on sold assets are zeroed out.

### 4. Disaster Recovery, Versioned `.vault` Bundles & Atomic Restore
- **Versioned Backup Metadata**: Backups contain explicit versioning: `backup_version`, `schema_version`, `app_version`, `created_at`, `currency`, and `encryption_format`.
- **Password-Derived AES-256-GCM Protection**: Encrypted with PBKDF2 (100,000 iterations), unique 16-byte salt, 12-byte IV, and SHA-256 integrity checksum.
- **Atomic Transactional Restore**: Vault restores execute inside a database transaction. If restore encounters any error or missing ciphertext, database changes rollback and partially written files are purged. Future unsupported versions are safely rejected.

### 5. Secure QR Provenance Certificate Verification with Privacy Controls
- **User-Controlled Privacy Toggle**: Owners can Enable or Disable public certificate verification via `Public Certificate Verification` (defaults to Disabled / privacy-conscious).
- **Masked Ownership**: Owner name is automatically masked (e.g., `Kapil Khadase` $\rightarrow$ `K. Khadase`) unless the owner explicitly opts into full name disclosure.
- **Zero Financial Leakage**: Public verification strictly excludes purchase price, sale price, acquisition cost, profit/loss, ROI, private documents, IVs, and keys.
- **Audited State Changes**: Toggling verification status logs `QR_CERTIFICATE_ENABLED` and `QR_CERTIFICATE_DISABLED` audit events.

### 6. Authentication Hardening & Clean Account Deletion
- **Brute-Force Lockout**: 5 consecutive failed login attempts trigger a 15-minute account lockout with HTTP 429 and standard `Retry-After` headers.
- **Session Revocation (`token_version`)**: Password change immediately increments user `token_version`, invalidating all existing JWTs across all active devices.
- **Global Logout**: Dedicated `/api/auth/logout-all` endpoint invalidates all sessions concurrently.
- **Clean Account Purge**: Deletion verifies password and explicit confirmation phrase (`DELETE MY ACCOUNT`), completely purges all private user records, unlinks physical document files from disk, and records an anonymized `ACCOUNT_DELETED` audit event with `user_id = NULL` ensuring zero broken foreign keys.

### 7. Wealth Goal Tracking (Full CRUD)
- Full RESTful lifecycle for portfolio milestones (`GET`, `POST`, `PUT`, `DELETE` on `/api/goals`).
- Dynamically computes progress percentage, remaining balance, and target achievement status against live valuations.

### 8. CSV & Excel Batch Import
- Dual-phase import: `/api/assets/import/preview` parses and validates rows, highlighting errors without committing data.
- User confirms valid rows via `/api/assets/import/confirm`, automatically calculating fine weights, landed costs, and generating secure certificate tokens.

### 9. WCAG AA Accessibility & Performance
- Full `:focus-visible` high-contrast gold outline (`#d4af37`) on all interactive controls.
- Keyboard focus trapping in modals with `Escape` key dismissal.
- Screen-reader accessible utility classes (`.sr-only`).
- High-contrast typography exceeding WCAG AA 4.5:1 ratio across both dark and light modes.

---

## ⚡ Performance Benchmarks (Development Machine Measured)

AssetVault features a measurable benchmark system (`backend/test_performance.py`) utilizing SQLite WAL mode and verified indexes:

| Benchmark Scenario | Tested Dataset | Median Response | p95 Response | Max Response | Index Verified (`EXPLAIN QUERY PLAN`) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Portfolio Valuation (100 Assets)** | 100 Assets | **~15 ms** | **~25 ms** | **~35 ms** | `idx_assets_user_status` | **PASS** |
| **Stress Valuation (1,000 Assets)** | 1,000 Assets | **~18 ms** | **~30 ms** | **~45 ms** | `idx_assets_user_status` | **PASS** |
| **High-Volume Valuation (5,000 Assets)** | 5,000 Assets | **~35 ms** | **~55 ms** | **~75 ms** | `idx_assets_user_status` | **PASS** |
| **Ledger Pagination (10,000 Transactions)** | 10,000 Txs | **~14 ms** | **~22 ms** | **~30 ms** | `idx_tx_user_date` | **PASS** |
| **High-Volume Ledger (50,000 Transactions)** | 50,000 Txs | **~20 ms** | **~35 ms** | **~50 ms** | `idx_tx_user_date` | **PASS** |

*Note: The figures above represent actual measured benchmarks on development hardware and will vary with CPU, disk I/O, and hosting environment.*

*Run benchmarks locally via:*
```powershell
.\.venv\Scripts\python backend/test_performance.py
```

---

## 🚀 Quick Start

### 1. Clone & Setup Environment
```bash
# Clone the repository
git clone https://github.com/Kapil132005/assetvault.git
cd assetvault

# Create virtual environment (Python 3.10+)
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.\.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration settings in `.env`:
```ini
SECRET_KEY=assetvault_production_secure_token_secret_key_2026_xyz
BASE_CURRENCY=INR
APP_VERSION=2.0.0
ENVIRONMENT=production
DB_PATH=backend/assetvault.db
MAX_CONTENT_LENGTH=10485760  # 10 MB upload limit
```

### 3. Initialize & Seed Database
```bash
python backend/database.py
python backend/seed_data.py
```

### 4. Launch Application
```bash
python run.py
```
Open your browser at **`http://127.0.0.1:5000`**.

### 5. Default Seed Credentials
- **Email**: `kapil@example.com`
- **Password**: `demo123`

---

## 🧪 Comprehensive Test Suite

Run the comprehensive unit, security, disaster-recovery, and integration test suite:

```powershell
.\.venv\Scripts\python backend/test_suite.py
.\.venv\Scripts\python backend/test_disaster_recovery.py
.\.venv\Scripts\python backend/test_performance.py
```

---

## 📡 REST API Reference

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/health` | `GET` | No | System health check (DB status, version, uptime) |
| `/api/verify/certificate/<token>` | `GET` | No | Public QR verification (respects owner privacy toggle, zero financial leakage) |
| `/api/auth/register` | `POST` | No | User registration with PBKDF2 encryption salt |
| `/api/auth/login` | `POST` | No | Authenticate user & issue JWT with lockout protection |
| `/api/auth/change-password` | `POST` | Yes | Change password & invalidate previous sessions via `token_version` |
| `/api/auth/logout-all` | `POST` | Yes | Invalidate all active sessions across all devices |
| `/api/auth/delete-account` | `POST` | Yes | Purge account, unlink files, record clean null-user audit |
| `/api/auth/me` | `GET` | Yes | Get authenticated user profile |
| `/api/auth/profile` | `PUT` | Yes | Update profile name, currency, target milestone, privacy |
| `/api/auth/qr-privacy` | `PUT` | Yes | Toggle public QR certificate verification and owner name privacy |
| `/api/market-rates` | `GET` | No | Current spot rates for Gold, Silver, Platinum, Diamond |
| `/api/market-rates/history` | `GET` | No | 30-day historical daily bullion closing rates |
| `/api/market-rates/sync` | `POST` | No | Trigger on-demand spot rate synchronization |
| `/api/assets` | `GET` | Yes | Retrieve user's physical & vaulted assets |
| `/api/assets` | `POST` | Yes | Create new asset holding with full validation |
| `/api/assets/<id>` | `GET` | Yes | Retrieve detailed asset record with duty & valuation |
| `/api/assets/<id>` | `PUT` | Yes | Update asset specifications & metadata |
| `/api/assets/<id>` | `DELETE`| Yes | Remove asset from portfolio |
| `/api/assets/<id>/sell` | `POST` | Yes | Liquidate asset, verify `Active` status & record transaction |
| `/api/assets/import/preview` | `POST` | Yes | Upload CSV/XLSX for structural and validation preview |
| `/api/assets/import/confirm` | `POST` | Yes | Commit validated rows into depository holding records |
| `/api/transactions` | `GET` | Yes | Paginated transaction ledger with realized P&L & filtering |
| `/api/transactions` | `POST` | Yes | Record manual transaction event |
| `/api/documents` | `GET` | Yes | List user documents with linked asset, category & IV |
| `/api/documents/upload` | `POST` | Yes | Upload client-encrypted ciphertext with IV & safe metadata |
| `/api/documents/<id>/view` | `GET` | Yes | View document (returns ciphertext for client decryption) |
| `/api/documents/<id>/download` | `GET` | Yes | Download document attachment with safe headers |
| `/api/documents/<id>` | `DELETE`| Yes | Delete document & physically unlink file from server |
| `/api/alerts` | `GET` | Yes | List configured price and valuation alerts |
| `/api/alerts` | `POST` | Yes | Create new price target alert |
| `/api/alerts/<id>` | `DELETE`| Yes | Delete alert rule |
| `/api/alerts/<id>/toggle` | `POST` | Yes | Toggle alert enabled / disabled |
| `/api/goals` | `GET` | Yes | Retrieve user's portfolio wealth goals |
| `/api/goals` | `POST` | Yes | Create portfolio wealth target goal |
| `/api/goals/<id>` | `PUT` | Yes | Update existing portfolio wealth goal |
| `/api/goals/<id>` | `DELETE`| Yes | Remove portfolio wealth goal |
| `/api/backup/export-vault-data` | `GET` | Yes | Export versioned `.vault` bundle including encrypted documents & IVs |
| `/api/backup/vault-data` | `GET` | Yes | Alias for exporting versioned `.vault` bundle |
| `/api/backup/restore-vault-data`| `POST`| Yes | Transactional restore of `.vault` bundle and physical files |
| `/api/reports/generate-pdf` | `POST` | Yes | Transient in-memory PDF statement streaming |
| `/api/reports/generate-excel` | `POST`| Yes | Transient in-memory multi-tab Excel (.xlsx) streaming |
| `/api/reports/generate-csv` | `POST` | Yes | Transient in-memory CSV data export |
| `/api/simulator/simulate` | `POST` | Yes | Portfolio stress test simulation under metal shocks |

---

## 🔒 Security Hardening Standards

1. **Strict OWASP Security Headers**:
   - `Content-Security-Policy`: Restricts scripts, styles, fonts, and embeds. Disallows foreign framing (`frame-ancestors 'none'`).
   - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing attacks.
   - `X-Frame-Options: DENY`: Prevents clickjacking.
   - `X-XSS-Protection: 1; mode=block`: Blocks cross-site scripting attacks.
   - `Strict-Transport-Security`: HSTS enforced on HTTPS connections.
2. **Rate Limiting Middleware**:
   - Auth endpoints limited to 5 attempts/minute with account lockout after 5 consecutive failures.
   - Financial mutations limited to 30 requests/minute to prevent transaction flooding.
   - Rate limit headers returned: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
3. **Database Concurrency & Migrations**:
   - SQLite WAL (Write-Ahead Logging) mode enabled (`PRAGMA journal_mode=WAL`) with 30000ms busy timeout to guarantee zero database locking under concurrent requests.
   - Declarative versioned migrations table `schema_migrations` tracking applied schema revisions (v1–v6).
4. **Zero-Backdoor & Transient Memory Model**:
   - Zero master backdoor keys or escrow access.
   - Decrypted report payloads never touch disk; memory streams are wiped upon HTTP transfer completion.
