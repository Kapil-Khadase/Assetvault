# AssetVault — Master Physical & Vaulted Precious Asset Valuation System

[![Python](https://img.shields.io/badge/Python-3.13%2B-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-green.svg)](https://palletsprojects.com/p/flask/)
[![Zero--Knowledge](https://img.shields.io/badge/Security-Zero--Knowledge%20E2EE-gold.svg)]()
[![Tests](https://img.shields.io/badge/Tests-22%20Passing%20(100%25)-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/Version-1.0.1%20Production-purple.svg)]()

**AssetVault** is an enterprise MCA-grade personal precious asset portfolio management, live valuation, and risk analytics platform. Designed specifically for high-net-worth bullion investors, family offices, and jewelry collectors, AssetVault seamlessly tracks physical bullion (Gold, Silver, Platinum), certified diamonds & solitaires, digital gold (MMTC-PAMP, Augmont, SafeGold, Jar), RBI Sovereign Gold Bonds (SGB), and luxury collectibles with real-time spot market feeds and landed duty accounting.

---

## 🏛️ Key Architectural Features

### 1. Zero-Knowledge End-to-End Encryption (E2EE)
- **Client-Side Cryptography**: Uses the W3C Web Crypto API with `PBKDF2-HMAC-SHA256` (100,000 rounds) to derive non-exportable 256-bit AES-GCM keys.
- **Zero Server Knowledge**: Financial balances, private holdings, transaction notes, and asset details can be fully encrypted before transmission. The server acts as a zero-knowledge encrypted store.
- **Ephemeral Zero-Knowledge Reports**: PDF statements, Excel workbooks, and CSV exports are generated and streamed entirely in-memory (`io.BytesIO`) via `POST /api/reports/generate-*`. Decrypted financial information is never written to backend server disk or logged.

### 2. Comprehensive Bullion & Diamond Valuation Engine
- **Hallmark & Purity Factor Alignment**: Real-time pricing across 24K (999.9), 22K (916 BIS Hallmark), 18K (750), 14K (585), 999 Fine Silver, 925 Sterling Silver, and PT950 Platinum.
- **Indian Landed Duty Accounting**: Computes landed replacement cost incorporating:
  - **Indian Customs Duty**: 6.0%
  - **Precious Metal GST**: 3.0%
  - **Import Multiplier**: 1.11x landed factor
- **Diamond 4Cs Algorithmic Valuation**: Evaluates Carat weight (non-linear step multiplier), Color (D–M), Clarity (FL/IF to I1–I3), Cut (Ideal to Poor), Polish, Symmetry, and Fluorescence with laboratory certification discounts (GIA, IGI, AGS). Supports Natural diamonds vs Lab-Grown Diamonds (0.38x valuation factor) with standard appraisal disclaimers.
- **Inactive / Liquidated Asset Accounting**: Liquidated (Sold) holdings display locked realized P&L and net return; unrealized gains on sold assets are strictly zeroed out.

### 3. Business Rule Parity & Lifecycle Ledger
- **Strict Sale Validation**: Centralized transaction service enforces that only `Active` holdings can be sold. Duplicate sales of already `Sold` assets are blocked with a `400 Bad Request`.
- **Selling Charges Deduction**: Realized profit accurately accounts for melting, refinement, and brokerage fees:
  $$\text{Net Realized Proceeds} = \text{Sale Price} - \text{Selling Charges}$$
  $$\text{Realized Profit} = \text{Net Proceeds} - \text{Total Acquisition Cost}$$
- **Input Validation**: Backend API strictly rejects negative weights, negative acquisition costs, negative selling charges, invalid carats, and unsupported lifecycle statuses (`Active`, `Sold`, `Transferred`, `Gifted`, `Archived`).

### 4. High-Security Document Vault
- **Magic-Byte Signature Verification**: Rejects spoofed files (e.g. executable or text files renamed to `.pdf` or `.png`). Only genuine `%PDF`, JPEG (`\xff\xd8\xff`), PNG (`\x89PNG`), and WEBP (`RIFF....WEBP`) byte streams are accepted.
- **Safe Server Storage**: Uploaded files are persisted using cryptographically random UUID filenames (`uuid.uuid4().hex.ext`), completely preventing path traversal, filename collisions, and directory injection.
- **IDOR Prevention & Secure Delivery**: Ownership is verified on every file access. Features inline preview (`GET /api/documents/<id>/view`) for PDFs and images, and direct attachment download (`GET /api/documents/<id>/download`).

### 5. QR Asset Certificate & Provenance
- **Bank-Grade Certificate Modal**: Generates official Certificates of Valuation and Provenance featuring registry number `AV-2026-XXXXX`.
- **Vector SVG QR Code**: Pure vector QR matrix rendering with central golden security crest. Embeds registry verification links with zero third-party CDN dependencies.
- **Documentation Completeness Scoring**: Calculates proof verification score across 4 pillars:
  - Tax Invoice / Purchase Bill (+35%)
  - BIS Hallmark / HUID / Assay (+35%)
  - Lab Certificate (GIA/IGI/Assay) (+20%)
  - Photographic Evidence (+10%)

### 6. Disaster Recovery & Encrypted Backups
- **Encrypted `.vault` Bundles**: Password-derived AES-256-GCM encrypted backup envelope with PBKDF2 (100k rounds), fresh 16-byte salt, 12-byte IV, and SHA-256 integrity checksum.
- **Disaster Restoration**: One-click restore workflow verifies file format, checks tamper-evident hash, decrypts client-side, and imports holdings into the user's vault.

### 7. Portfolio Goals & Concentration Exposure
- **Wealth Goal Tracker**: Visual milestone tracking towards portfolio goals (e.g. "100g Bullion Target", "Marriage Reserve", "Emergency Hedge").
- **Asset Allocation & Concentration Risk**: Real-time breakdown of exposure across Gold %, Silver %, Platinum %, Diamond %, and Other %.

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
APP_VERSION=1.0.1
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

Run the comprehensive unit and integration test suite (22 tests covering auth, rate limiting, encryption, valuation, sales, magic bytes, health, and ephemeral reporting):

```powershell
.\.venv\Scripts\python backend/test_suite.py
```

Expected output:
```text
Ran 22 tests in 2.98s
OK (100% Pass)
```

---

## 📡 REST API Reference

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/health` | `GET` | No | System health check (DB status, version, uptime) |
| `/api/auth/register` | `POST` | No | User registration with PBKDF2 encryption salt |
| `/api/auth/login` | `POST` | No | Authenticate user & issue JWT bearer token |
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
| `/api/transactions` | `GET` | Yes | Transaction ledger with realized P&L & counterparty |
| `/api/transactions` | `POST` | Yes | Record manual transaction event |
| `/api/documents` | `GET` | Yes | List user documents with linked asset & owner |
| `/api/documents/upload` | `POST` | Yes | Magic-byte validated upload with safe UUID naming |
| `/api/documents/<id>/view` | `GET` | Yes | View document inline (PDF new tab, image preview) |
| `/api/documents/<id>/download` | `GET` | Yes | Download document as attachment |
| `/api/documents/<id>` | `DELETE`| Yes | Delete document & unlink from server |
| `/api/alerts` | `GET` | Yes | List configured price and valuation alerts |
| `/api/alerts` | `POST` | Yes | Create new price target alert |
| `/api/alerts/<id>` | `DELETE`| Yes | Delete alert rule |
| `/api/alerts/<id>/toggle` | `POST` | Yes | Toggle alert enabled / disabled |
| `/api/goals` | `GET` | Yes | Retrieve user's portfolio wealth goals |
| `/api/goals` | `POST` | Yes | Create portfolio wealth target goal |
| `/api/goals/<id>` | `DELETE`| Yes | Remove portfolio wealth goal |
| `/api/reports/generate-pdf` | `POST` | Yes | In-memory Zero-Knowledge PDF statement streaming |
| `/api/reports/generate-excel` | `POST`| Yes | In-memory Zero-Knowledge multi-tab Excel (.xlsx) |
| `/api/reports/generate-csv` | `POST` | Yes | In-memory Zero-Knowledge CSV data export |
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
   - Auth endpoints limited to 5 attempts/minute to prevent brute-force credential stuffing.
   - Financial mutations limited to 30 requests/minute to prevent transaction flooding.
3. **Database Concurrency**:
   - SQLite WAL (Write-Ahead Logging) mode enabled (`PRAGMA journal_mode=WAL`) with 5000ms busy timeout to guarantee zero database locking under concurrent requests.
4. **Table Column Separation**:
   - Every table across all application views strictly renders `Asset Name` and `Owner / Holder` in dedicated, individual table columns for clean data clarity.

---

## 📄 License & Attribution
Designed and engineered for personal precious metals and luxury asset management. Built with Python, Flask, ReportLab, OpenPyXL, and Web Crypto API.
