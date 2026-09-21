# AssetVault — Master Physical & Vaulted Precious Asset Valuation System

[![Python](https://img.shields.io/badge/Python-3.13%2B-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-green.svg)](https://palletsprojects.com/p/flask/)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM%20Client%20Encryption-gold.svg)]()
[![Tests](https://img.shields.io/badge/Tests-36%20Passing%20(100%25)-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/Version-2.0.0%20Production-purple.svg)]()

**AssetVault** is an enterprise-grade personal precious asset portfolio depository, live valuation, and risk analytics platform. Designed specifically for high-net-worth bullion investors, family offices, and luxury jewelry collectors, AssetVault seamlessly tracks physical bullion (Gold, Silver, Platinum), certified diamonds & solitaires, digital gold (MMTC-PAMP, Augmont, SafeGold, Jar), RBI Sovereign Gold Bonds (SGB), and luxury collectibles with real-time spot market feeds and landed duty accounting.

---

## 🏛️ Key Architectural Features & Security Controls

### 1. Client-Side AES-256-GCM Document Encryption
- **Full Browser Encryption**: Document files (invoices, certificates, assay cards, receipts) are encrypted client-side in the browser using the W3C Web Crypto API with AES-GCM (256-bit key) and a unique, cryptographically random 12-byte IV generated per document.
- **Opaque Ciphertext Depository**: The backend server receives and stores only ciphertext, unique IV, safe metadata (document type, safe file size, category), and magic-byte verified file types. The server has no access to document contents.
- **Local Browser Decryption**: Documents are decrypted locally in the client's browser using the user's master key derived via PBKDF2-HMAC-SHA256 (100,000 rounds). Decrypted files are never persisted on the server disk.
- **Zero-Backdoor Policy**: No master backdoor key, escrow bypass, or recovery backdoor exists. The user's passphrase is the sole root of encryption.

### 2. Transient In-Memory Decrypted Reporting
- **In-Memory Generation Only**: PDF statements, multi-tab Excel workbooks, and CSV summaries are generated in-memory via temporary streams (`io.BytesIO`) using ReportLab and OpenPyXL.
- **Strict No-Disk-Persistence**: The server validates incoming decrypted reporting payloads, renders the document stream, and flushes it immediately over HTTPS.
- **Ephemeral HTTP Headers**: Responses are served with `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache`, and `Expires: 0` to prevent intermediate caching.
- **Accurate Architectural Terminology**: Documented strictly as *Transient In-Memory Decrypted Reporting* rather than zero-knowledge, reflecting that decrypted payloads pass transiently through RAM during report rendering.

### 3. Comprehensive Bullion & Diamond Valuation Engine
- **Hallmark & Purity Factor Alignment**: Real-time spot pricing across 24K (999.9), 22K (916 BIS Hallmark), 18K (750), 14K (585), 999 Fine Silver, 925 Sterling Silver, and PT950 Platinum.
- **Indian Landed Duty Accounting**: Computes replacement cost incorporating:
  - **Indian Customs Duty**: 6.0%
  - **Precious Metal GST**: 3.0%
  - **Import Multiplier**: 1.11x landed factor
- **Diamond 4Cs Algorithmic Engine**: Evaluates Carat weight (non-linear step multiplier), Color (D–M), Clarity (FL/IF to I1–I3), Cut (Ideal to Poor), Polish, Symmetry, and Fluorescence with laboratory certification factors (GIA, IGI, AGS).
- **Natural vs Lab-Grown Diamonds**: Applies a 0.38x valuation factor to Lab-Grown Diamonds (LGD) alongside clear appraisal disclaimers.
- **Inactive / Liquidated Asset Accounting**: Liquidated (Sold) holdings lock realized P&L and net return; unrealized gains on sold assets are strictly zeroed out.

### 4. Disaster Recovery & Encrypted `.vault` Bundles
- **Unified Backup Envelope**: Exports complete portfolio state—including encrypted assets, transaction histories, alert configurations, wealth goals, and Base64-encoded encrypted document payloads with IVs and metadata.
- **Password-Derived AES-256-GCM Protection**: Encrypted with PBKDF2 (100,000 iterations), unique 16-byte salt, 12-byte IV, and SHA-256 integrity checksum.
- **Full Vault Restoration**: Restores holding records and re-creates physical encrypted document files with verified integrity checks.

### 5. Secure QR Provenance Certificate Verification
- **Zero Financial Leakage**: Public verification endpoint (`/api/verify/certificate/<token>`) strictly excludes purchase price, acquisition cost, profit/loss, and private documents.
- **Masked Ownership**: Owner name is automatically masked (e.g., `Kapil Khadase` $\rightarrow$ `K. Khadase`) to protect high-net-worth anonymity while verifying genuine registry status.
- **Non-Guessable Registry Tokens**: High-entropy 32-byte cryptographic hex tokens indexed uniquely in the database.

### 6. Authentication Hardening & Account Lifecycle
- **Brute-Force Lockout**: 5 consecutive failed login attempts trigger a 15-minute account lockout with HTTP 429 and standard `Retry-After` headers.
- **Session Revocation (`token_version`)**: Password change immediately increments user `token_version`, invalidating all existing JWTs across all active devices.
- **Global Logout**: Dedicated `/api/auth/logout-all` endpoint invalidates all sessions concurrently.
- **Permanent Account Purge**: Deletion endpoint (`/api/auth/delete-account`) verifies password and explicit confirmation phrase (`DELETE MY ACCOUNT`), permanently purging all database records and physically unlinking all uploaded files from disk.

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

## ⚡ Performance Benchmarks

The AssetVault core valuation and querying engine is verified for enterprise performance under high data volumes:

| Benchmark Scenario | Tested Volume | Target | Measured Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Portfolio Live Valuation** | 100 Assets | < 500 ms | **17.85 ms** | **PASS** |
| **Stress Portfolio Valuation** | 1,000 Assets | < 500 ms | **17.21 ms** | **PASS** |
| **Ledger Pagination & Filter** | 5,000 Transactions | < 100 ms | **16.11 ms** | **PASS** |

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

### 3. Launch Application
```bash
python run.py
```
Open your browser at **`http://127.0.0.1:5000`**.

### 4. Default Seed Credentials
- **Email**: `kapil@example.com`
- **Password**: `demo123`

---

## 🧪 Comprehensive Test Suite

Run the comprehensive unit, security, and integration test suite (36 tests covering client-side encryption, session revocation, physical unlinking, brute-force lockout, origin enforcement, certificate verification, goals CRUD, CSV import, and performance benchmarks):

```powershell
.\.venv\Scripts\python backend/test_suite.py
```

Expected output:
```text
Ran 36 tests in 9.90s
OK (100% Pass)
```

---

## 📡 REST API Reference

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/health` | `GET` | No | System health check (DB status, version, uptime) |
| `/api/verify/certificate/<token>` | `GET` | No | Public QR verification (masked owner, zero financial leakage) |
| `/api/auth/register` | `POST` | No | User registration with PBKDF2 encryption salt |
| `/api/auth/login` | `POST` | No | Authenticate user & issue JWT with lockout protection |
| `/api/auth/change-password` | `POST` | Yes | Change password & invalidate previous sessions via `token_version` |
| `/api/auth/logout-all` | `POST` | Yes | Invalidate all active sessions across all devices |
| `/api/auth/delete-account` | `POST` | Yes | Purge account, delete DB records & physically unlink files |
| `/api/auth/me` | `GET` | Yes | Get authenticated user profile |
| `/api/auth/profile` | `PUT` | Yes | Update profile name, currency, target milestone |
| `/api/market-rates` | `GET` | No | Current spot rates for Gold, Silver, Platinum, Diamond |
| `/api/market-rates/history` | `GET` | No | 30-day historical daily bullion closing rates |
| `/api/market-rates/sync` | `POST` | No | Trigger on-demand spot rate synchronization |
| `/api/assets` | `GET` | Yes | Retrieve user's physical & vaulted assets |
| `/api/assets` | `POST` | Yes | Create new asset holding with full validation |
| `/api/assets/<id>` | `GET` | Yes | Retrieve detailed asset record with duty & valuation |
| `/api/assets/<id>` | `PUT` | Yes | Update asset specifications & metadata |
| `/api/assets/<id>` | `DELETE`| Yes | Remove asset from portfolio |
| `/api/assets/<id>/sell` | `POST` | Yes | Liquidate asset, verify `Active` status & deduct charges |
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
| `/api/backup/export-vault-data` | `GET` | Yes | Export `.vault` bundle including encrypted documents & IVs |
| `/api/backup/restore-vault-data`| `POST`| Yes | Restore full `.vault` bundle and physical files |
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
   - SQLite WAL (Write-Ahead Logging) mode enabled (`PRAGMA journal_mode=WAL`) with 5000ms busy timeout to guarantee zero database locking under concurrent requests.
   - Declarative versioned migrations table `schema_migrations` tracking applied schema revisions (v1–v5).
4. **Zero-Backdoor & Transient Memory Model**:
   - Zero master backdoor keys or escrow access.
   - Decrypted report payloads never touch disk; memory streams are wiped upon HTTP transfer completion.

---

## 📄 License & Attribution
Designed and engineered for personal precious metals and luxury asset management. Built with Python, Flask, ReportLab, OpenPyXL, and Web Crypto API.
