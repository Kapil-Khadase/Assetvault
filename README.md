# AssetVault &mdash; Personal Physical Asset Portfolio Management and Market-Linked Valuation System

AssetVault is a market-aware physical asset portfolio management and analytics platform designed to manage, monitor, value, and analyze precious physical assets owned by individuals (Gold, Silver, Platinum, Diamonds, Fine Jewellery, and Luxury Collectibles).

---

## Key Features & Core Modules

1. **User Authentication & Profile Isolation**:
   - Secure salted password hashing (`PBKDF2-HMAC-SHA256`).
   - JWT token authentication and user-specific asset isolation.
   - Multi-currency preference support (INR ₹, USD $, EUR €, GBP £).

2. **Asset Management (CRUD & Rich Metadata)**:
   - Record gross weight, stone weight, and computed net precious metal weight.
   - Track BIS Hallmark / HUID (6-digit alphanumeric identification), jeweller name, and invoice numbers.
   - Dynamic Diamond 4Cs attribute model (Carat, Cut, Color, Clarity, Shape, and Certifying Lab: GIA, IGI, AGS).
   - Grid Card and Tabular view toggling with instant multi-parameter filtering.

3. **Valuation & Real-Time Bullion Engine**:
   - Purity-adjusted valuation formulas across 24K (100%), 22K (91.67%), 18K (75%), 14K (58.33%) gold, 999 & 925 silver, and PT950 platinum.
   - Non-linear rarity attribute valuation for diamonds.
   - Real-time bullion spot ticker with periodic auto-synchronization and manual refresh.
   - Built-in interactive Purity & Weight calculator tool.

4. **Profit/Loss & ROI Engine (Realized vs. Unrealized)**:
   - Distinguishes between **Unrealized P&L** (open active holdings) and **Realized P&L** (liquidated assets).
   - Accurate total acquisition cost tracking (`Purchase Price + Making Charges + Wastage + Taxes`).

5. **Scenario Simulator ("What-If" Stress Testing)**:
   - Interactive sliders for Gold, Silver, Platinum, and Diamonds (-50% to +100%).
   - One-click presets (Gold Bull Rally, Market Crash, Precious Metal Supercycle).
   - Real-time recalculation of simulated portfolio value, total P&L, ROI%, and asset sensitivity impact.

6. **Lifecycle & Transaction Ledger**:
   - Complete audit trail of acquisitions, sales, transfers, gifts, and archival events.
   - Liquidation workflow that captures sale amount, buyer counterparty, and locks in realized profits.

7. **Document & Certificate Manager**:
   - Store assay certificates, purchase invoices, GIA/IGI reports, and photographs linked to assets.

8. **Price Alerts & Notification Triggers**:
   - Configurable price target rules (e.g. Gold rises above ₹7,600/g) and portfolio milestone notifications.

9. **Multi-Format Reporting & Export**:
   - **PDF Statement**: Formatted executive report generated via Python `reportlab`.
   - **Excel Workbook**: Multi-sheet formatted workbook (.XLSX) powered by `openpyxl`.
   - **CSV Export**: Clean spreadsheet data dump.

---

## Technology Stack

- **Backend**: Python 3.13 + Flask REST API + SQLite Relational Database
- **Analytics & Valuation**: NumPy, Pandas, custom mathematical bullion & diamond matrix
- **Reporting**: ReportLab (PDF Engine) + OpenPyXL (Excel Engine)
- **Frontend**: Responsive Single Page Application (SPA), Vanilla CSS with luxury dark/light glassmorphic theme, Chart.js, Lucide Icons

---

## Quick Start Instructions

1. **Navigate to the project directory**:
   ```bash
   cd "c:\Users\khada\assetvault"
   ```

2. **Activate the Virtual Environment** (or run directly with the venv python):
   - **PowerShell**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     python run.py
     ```
   - **Command Prompt (CMD)**:
     ```cmd
     .\.venv\Scripts\activate.bat
     python run.py
     ```
   - **Direct Execution**:
     ```powershell
     .\.venv\Scripts\python.exe run.py
     ```

3. **Open in Browser**:
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000)

4. **Default Demo Credentials**:
   - **Email**: `demo@assetvault.com`
   - **Password**: `demo123`
