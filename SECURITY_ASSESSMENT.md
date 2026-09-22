# AssetVault &mdash; Security Assessment & Posture Report

## Executive Summary

An external security assessment and architectural audit was conducted against the **AssetVault** precious asset portfolio depository and valuation platform. The assessment evaluated cryptographic implementations, authentication and session management controls, document encryption workflows, reporting pipelines, access controls, input sanitization, and database query safety.

- **Overall Risk Posture:** **Sound & Enterprise-Hardened**
- **Engagement Type:** Web application & cryptographic architecture assessment
- **Framework Compliance:** OWASP Web Security Testing Guide (WSTG), W3C Web Cryptography Standard, WCAG 2.1 AA
- **Zero-Backdoor Policy:** Formally audited; zero backdoor keys, escrow bypasses, or master access routes exist. The user's passphrase is the sole root of encryption.
- **Architectural Scope & Security Boundary:** AssetVault operates as a **Client-Side Encrypted Vault** with a **Server-Side Ciphertext Storage Layer**. It does not claim full zero-knowledge across all operations because PDF/Excel/CSV report generation temporarily processes decrypted report data in backend memory (**Transient In-Memory Decrypted Reporting**).

### Key Architectural & Cryptographic Findings
1. **Client-Side Document Encryption (AES-256-GCM):** Documents (invoices, certificates, assay cards) are validated (extensions, MIME types, magic bytes) and encrypted inside the client browser prior to transmission using AES-GCM with a unique, cryptographically random 12-byte IV per file. The server stores only ciphertext and safe metadata (`safe_file_size`, `document_type`, `photo_category`); plaintext documents are never stored or cached on the server.
2. **Transient In-Memory Decrypted Reporting:** PDF and Excel statements are generated strictly in temporary RAM buffers (`io.BytesIO`) using ReportLab and OpenPyXL. Decrypted financial payloads are never written to disk or logged, and HTTP response headers enforce `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
3. **Session Revocation via `token_version`:** Password change or `/api/auth/logout-all` immediately increments the user's `token_version` in the database, invalidating all previously issued JWT bearer tokens across all devices.
4. **Brute-Force Account Lockout:** 5 consecutive failed login attempts trigger a 15-minute account lockout with HTTP 429 and standard `Retry-After` headers.
5. **Public Provenance Verification Privacy & User Toggle:** Public QR certificate verification endpoint (`/api/verify/certificate/<token>`) strictly protects privacy by masking owner names (e.g. `K. Khadase`) and omitting all financial data (purchase prices, acquisition costs, valuations). Furthermore, a user-controlled privacy toggle allows owners to disable public verification entirely.
6. **Physical Disk Unlinking & Clean Audit on Deletion:** Account deletion requires user password and confirmation phrase (`DELETE MY ACCOUNT`), completely purging database records, physically unlinking all uploaded document files from disk, and recording a minimal `ACCOUNT_DELETED` audit event with `user_id = NULL` to avoid broken foreign keys or data remnants.

---

## Security Boundary Matrix

AssetVault enforces clear separation between client-side encryption and server-side operations:

| Data | Encrypted Before Server Storage? | Server Can Read? | Storage Mechanism |
| :--- | :---: | :---: | :--- |
| **Assets** | Yes | No, except transient report processing | Client-Side Encrypted Vault (AES-256-GCM ciphertext in SQLite) |
| **Transactions** | Yes | No, except transient report processing | Client-Side Encrypted Vault (AES-256-GCM ciphertext in SQLite) |
| **Documents** | Yes | No | Encrypted Ciphertext Storage (`uploads/*.enc`) with unique IVs |
| **Photos** | Yes | No | Encrypted Ciphertext Storage (`uploads/*.enc`) with unique IVs |
| **Backup (.vault)** | Yes | No | PBKDF2 (100k rounds) + AES-256-GCM envelope with SHA-256 checksum |
| **Password** | Hashed | No | Salted PBKDF2-HMAC-SHA256 (never stored in plaintext) |
| **API keys** | Server configuration only | Server may use configured API keys | Environment variables (`.env`) for spot price feeds |
| **Generated reports** | Temporary processing | Yes, transiently during generation | Streamed directly from volatile RAM (`io.BytesIO`); never persisted |

> [!NOTE]
> **Core Security Boundary Statement**: AssetVault provides client-side encrypted vault storage, but report generation temporarily processes decrypted report data in backend memory. Plaintext data exists solely in transient RAM during statement rendering and is discarded immediately upon HTTP transfer completion.

---

## Methodology & Audit Matrix

Conducted in accordance with **OWASP WSTG v4.2** and industry-standard security assessment frameworks.

| Control Area | Evaluated Vectors | Assessment Outcome | Status |
| :--- | :--- | :--- | :---: |
| **Authentication & Session** | Brute force, credential stuffing, session fixation, token revocation, multi-device logout | 5-attempt lockout enforced with `Retry-After`. Session revocation verified via `token_version`. | **PASS** |
| **Document Encryption** | Pre-encryption file validation, ciphertext storage, unique IV generation, magic-byte inspection | Pre-encryption client validation; browser-based AES-256-GCM with 12-byte unique IVs; UUID filename storage; opaque ciphertexts on disk. | **PASS** |
| **Transient Reporting** | Disk leakage, memory persistence, cache headers, formula injection, payload integrity | `io.BytesIO` in-memory streaming; zero disk writes; `Cache-Control: no-store`; ownership and server recalculation anti-tamper validation. | **PASS** |
| **Input Handling & SQLi** | SQL injection fuzzing on query parameters and JSON payloads (`/api/market-rates`, `/api/assets`, search) | Fully parameterized queries prevent injection; zero error disclosures or data leakages. | **PASS** |
| **Public QR Verification** | Privacy leakage, token enumeration, financial data exposure, user privacy controls | 32-byte non-guessable tokens; masked owner display; zero financial fields returned; owner enable/disable privacy toggle. | **PASS** |
| **Backup & Restore** | Bundle tampering, ciphertext integrity, version metadata, transactional rollback | Versioned format (`backup_version`, `schema_version`); SHA-256 checksum; AES-256-GCM envelope; atomic rollback on failure. | **PASS** |
| **Account Lifecycle** | Data lingering, physical file persistence, broken FKs, unlinked file remnants | Physical `os.remove()` of all user documents; `user_id = NULL` audit record; zero foreign-key violations. | **PASS** |

---

## Detailed Cryptographic Architecture

### 1. Document Vault Client-Side Encryption
```
[User Selects File]
        │
        ▼
[Browser: Pre-Encryption Validation]
  ├── Validates extension (.pdf, .png, .jpg, .jpeg, .webp)
  ├── Validates MIME type & inspects Magic Bytes (%PDF-, PNG, JPEG, WEBP)
  ├── Verifies image decoding & dimensions (rejects malformed images/executables)
  └── Enforces 25MB depository size ceiling
        │
        ▼
[Browser: Web Crypto API]
  ├── Derives/re-uses Master Key (PBKDF2-HMAC-SHA256, 100,000 rounds)
  ├── Generates unique 12-byte IV (window.crypto.getRandomValues)
  └── Encrypts file bytes via AES-256-GCM
        │
        ▼ (Ciphertext + IV + Safe Metadata uploaded over HTTPS)
[Server-Side Ciphertext Storage Layer (uploads/)]
  ├── Enforces MAX_CONTENT_LENGTH, authentication & asset ownership
  ├── Stores opaque ciphertext with randomized UUID filename (*.enc)
  └── Inserts metadata record (iv, is_encrypted=1, safe_file_size)
        │
        ▼ (Ciphertext + IV downloaded over HTTPS)
[Browser Decryption]
  └── Local AES-GCM decryption for preview/download (Zero Server Plaintext Persistence)
```

### 2. Transient In-Memory Reporting Architecture
```
[Client Sends Decrypted Financial Snapshot]
        │ (Encrypted HTTPS POST /api/reports/generate-*)
        ▼
[Server-Side Memory (RAM)]
  ├── Authenticates user & checks asset/transaction ownership
  ├── Validates data types, ranges, dates, and lifecycle statuses
  ├── Compares critical submitted values against trusted DB records
  ├── Recalculates derived totals (invested cost, market value, unrealized/realized P&L, ROI)
  ├── Renders PDF/Excel directly into io.BytesIO stream in RAM
  ├── Emits HTTP response with 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0'
  └── Discards io.BytesIO buffer and invokes garbage collection (Zero Disk Persistence)
```

---

## Implemented Security Controls Reference

### 1. Sliding Window Rate Limiting (`backend/services/rate_limiter.py`)
- **Authentication Routes (`/api/auth/login`, `/api/auth/register`):** 5 requests per 60-second window per client IP.
- **Financial Mutations (`/api/assets` POST/PUT/DELETE, `/api/transactions`, `/api/assets/<id>/sell`):** 30 requests per 60-second window per authenticated user or IP.
- **Vault Export/Restore (`/api/backup/*`):** 5 requests per 60-second window.
- **Document Uploads (`/api/documents/upload`):** 20 requests per 60-second window.
- **Standard RFC Headers Returned:**
  - `Retry-After: <seconds>` (on HTTP 429)
  - `X-RateLimit-Limit: <limit>`
  - `X-RateLimit-Remaining: <remaining>`
  - `X-RateLimit-Reset: <epoch>`

### 2. HTTP Defense-in-Depth Headers
- `X-Content-Type-Options: nosniff` &mdash; Prevents MIME-type sniffing exploits.
- `X-Frame-Options: DENY` &mdash; Blocks embedding in frames/iframes to prevent clickjacking.
- `X-XSS-Protection: 1; mode=block` &mdash; Legacy filter activation for older user agents.
- `Referrer-Policy: strict-origin-when-cross-origin` &mdash; Protects path and token leakage in referrer headers.
- `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()` &mdash; Disables unnecessary browser capabilities.
- `Content-Security-Policy` &mdash; Enforces strict origin execution for scripts, stylesheets, fonts, and assets.
- `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` &mdash; Enforced on all transient reporting and document endpoints.
