import sqlite3
import os
import secrets
import datetime
from config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

# Ordered Versioned Migrations
def run_migrations(conn):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    cursor.execute("SELECT version FROM schema_migrations")
    applied = set(row[0] for row in cursor.fetchall())

    # Migration 1: Baseline Schema
    if 1 not in applied:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            currency TEXT DEFAULT 'INR',
            target_portfolio_value REAL DEFAULT 1000000.0,
            encryption_salt TEXT DEFAULT 'assetvault_salt_v1',
            target_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT UNIQUE NOT NULL,
            description TEXT,
            icon TEXT DEFAULT 'gem'
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metal TEXT NOT NULL,
            purity TEXT NOT NULL,
            rate_per_gram REAL NOT NULL,
            unit TEXT DEFAULT 'gram',
            currency TEXT DEFAULT 'INR',
            source TEXT DEFAULT 'Live Market Data',
            rate_date DATE NOT NULL,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            encrypted_data TEXT,
            iv TEXT,
            asset_name TEXT DEFAULT '',
            category_id INTEGER,
            asset_type TEXT DEFAULT 'Jewellery',
            metal TEXT DEFAULT 'Gold',
            purity TEXT DEFAULT '22K',
            purity_factor REAL DEFAULT 1.0,
            quantity INTEGER DEFAULT 1,
            gross_weight REAL DEFAULT 0.0,
            net_weight REAL DEFAULT 0.0,
            stone_weight REAL DEFAULT 0.0,
            purchase_date DATE DEFAULT (DATE('now')),
            purchase_price REAL DEFAULT 0.0,
            making_charges REAL DEFAULT 0.0,
            wastage REAL DEFAULT 0.0,
            taxes REAL DEFAULT 0.0,
            total_acquisition_cost REAL DEFAULT 0.0,
            description TEXT DEFAULT '',
            status TEXT DEFAULT 'Active',
            hallmark_huid TEXT,
            jeweller_name TEXT,
            invoice_number TEXT,
            diamond_carat REAL DEFAULT 0.0,
            diamond_cut TEXT,
            diamond_color TEXT,
            diamond_clarity TEXT,
            diamond_shape TEXT,
            diamond_cert_lab TEXT,
            diamond_cert_number TEXT,
            photo_url TEXT,
            owner_name TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS asset_valuations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            market_rate_used REAL NOT NULL,
            estimated_value REAL NOT NULL,
            profit_loss REAL NOT NULL,
            roi REAL NOT NULL,
            valuation_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER DEFAULT 0,
            user_id INTEGER NOT NULL,
            encrypted_data TEXT,
            iv TEXT,
            transaction_type TEXT DEFAULT 'PURCHASE',
            transaction_date DATE DEFAULT (DATE('now')),
            amount REAL DEFAULT 0.0,
            realized_profit REAL DEFAULT 0.0,
            selling_charges REAL DEFAULT 0.0,
            counterparty TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER DEFAULT 0,
            user_id INTEGER NOT NULL,
            encrypted_data TEXT,
            iv TEXT,
            is_encrypted INTEGER DEFAULT 0,
            encryption_meta TEXT,
            mime_type TEXT,
            photo_category TEXT DEFAULT 'general',
            document_type TEXT DEFAULT 'Certificate',
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            encrypted_data TEXT,
            iv TEXT,
            alert_type TEXT DEFAULT 'PRICE_TARGET',
            target_metal TEXT,
            target_value REAL DEFAULT 0.0,
            condition TEXT DEFAULT 'GREATER_THAN',
            is_enabled INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            is_triggered INTEGER DEFAULT 0,
            triggered_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            entity TEXT DEFAULT '',
            entity_id INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_rate_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metal TEXT NOT NULL,
            purity TEXT NOT NULL,
            rate_per_gram REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            source TEXT NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS portfolio_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT '',
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0.0,
            target_date DATE,
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """)
        cursor.execute("INSERT INTO schema_migrations (version, name) VALUES (1, 'v1_baseline_schema')")
        conn.commit()

    # Migration 2: Authentication Hardening & Session Revocation
    if 2 not in applied:
        cursor.execute("PRAGMA table_info(users)")
        cols = [r[1] for r in cursor.fetchall()]
        if "token_version" not in cols:
            cursor.execute("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1")
        if "failed_logins" not in cols:
            cursor.execute("ALTER TABLE users ADD COLUMN failed_logins INTEGER DEFAULT 0")
        if "locked_until" not in cols:
            cursor.execute("ALTER TABLE users ADD COLUMN locked_until TIMESTAMP")
        cursor.execute("INSERT INTO schema_migrations (version, name) VALUES (2, 'v2_auth_hardening')")
        conn.commit()

    # Migration 3: Document Client-Side Encryption & Photo Gallery
    if 3 not in applied:
        cursor.execute("PRAGMA table_info(documents)")
        cols = [r[1] for r in cursor.fetchall()]
        if "is_encrypted" not in cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN is_encrypted INTEGER DEFAULT 0")
        if "encryption_meta" not in cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN encryption_meta TEXT")
        if "mime_type" not in cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN mime_type TEXT")
        if "photo_category" not in cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN photo_category TEXT DEFAULT 'general'")
        cursor.execute("INSERT INTO schema_migrations (version, name) VALUES (3, 'v3_document_encryption_and_photos')")
        conn.commit()

    # Migration 4: Secure QR Certificate Tokens
    if 4 not in applied:
        cursor.execute("PRAGMA table_info(assets)")
        cols = [r[1] for r in cursor.fetchall()]
        if "certificate_token" not in cols:
            cursor.execute("ALTER TABLE assets ADD COLUMN certificate_token TEXT")
        
        # Populate certificate_token for any existing assets
        cursor.execute("SELECT id, certificate_token FROM assets WHERE certificate_token IS NULL OR certificate_token = ''")
        for row in cursor.fetchall():
            tok = secrets.token_urlsafe(24)
            cursor.execute("UPDATE assets SET certificate_token = ? WHERE id = ?", (tok, row["id"]))
        
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_cert_token ON assets (certificate_token);")
        cursor.execute("INSERT INTO schema_migrations (version, name) VALUES (4, 'v4_secure_qr_certificates')")
        conn.commit()

    # Migration 5: Audit Hardening & High Performance Indexes
    if 5 not in applied:
        cursor.execute("PRAGMA table_info(audit_logs)")
        cols = [r[1] for r in cursor.fetchall()]
        if "ip_address" not in cols:
            cursor.execute("ALTER TABLE audit_logs ADD COLUMN ip_address TEXT")
        
        # Indexes for fast pagination and user scoping
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_user_status ON assets (user_id, status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_user_asset ON transactions (user_id, asset_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions (user_id, transaction_date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_user_asset ON documents (user_id, asset_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_user_type ON documents (user_id, document_type);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts (user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_goals_user ON portfolio_goals (user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs (user_id, created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mrh_lookup ON market_rate_history (metal, purity, recorded_at);")
        
        cursor.execute("INSERT INTO schema_migrations (version, name) VALUES (5, 'v5_audit_and_indexes')")
        conn.commit()

    # Migration 6: Privacy Controls & Audit Hardening
    if 6 not in applied:
        cursor.execute("PRAGMA table_info(users)")
        user_cols = [r[1] for r in cursor.fetchall()]
        if "public_certificate_verification" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN public_certificate_verification INTEGER DEFAULT 0")
        if "public_owner_name" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN public_owner_name INTEGER DEFAULT 0")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_amount ON transactions (user_id, amount);")

        cursor.execute("INSERT INTO schema_migrations (version, name) VALUES (6, 'v6_privacy_and_audit_hardening')")
        conn.commit()

    # Migration 7: Multi-Device & Browser Session Tracking
    if 7 not in applied:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            browser TEXT,
            os TEXT,
            device_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_revoked INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id, is_revoked);")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_sid ON user_sessions (session_id);")
        cursor.execute("INSERT INTO schema_migrations (version, name) VALUES (7, 'v7_user_sessions')")
        conn.commit()

def init_db():
    conn = get_db_connection()
    run_migrations(conn)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(alerts)")
    alert_cols = [r[1] for r in cursor.fetchall()]
    if "is_active" not in alert_cols:
        cursor.execute("ALTER TABLE alerts ADD COLUMN is_active INTEGER DEFAULT 1")
        conn.commit()
    # Ensure baseline reference categories exist
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
            INSERT OR IGNORE INTO categories (id, category_name, description, icon) VALUES (?, ?, ?, ?)
        """, [
            (1, "Precious Metals", "Bullion, coins, bars, and ingots in pure gold, silver, and platinum.", "coins"),
            (2, "Jewellery", "Necklaces, bangles, rings, chains, earrings, and traditional bridal sets.", "gem"),
            (3, "Digital Gold & ETFs", "Sovereign Gold Bonds (SGB), 24K Digital Gold, and Gold ETFs.", "smartphone"),
            (4, "Diamonds & Solitaires", "Certified loose diamonds, solitaire engagement rings, and diamond jewelry.", "sparkles"),
            (5, "Luxury Watches & Collectibles", "High-end luxury timepieces, heirloom antiquities, and rare collectibles.", "watch"),
        ])
        conn.commit()

    # Ensure baseline reference rates exist
    cursor.execute("SELECT COUNT(*) FROM market_rates")
    if cursor.fetchone()[0] == 0:
        today_str = datetime.date.today().isoformat()
        now_str = datetime.datetime.now().isoformat()
        rates_data = [
            ("Gold", "24K", 15535.0, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
            ("Gold", "22K", 14240.0, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
            ("Gold", "18K", 11651.0, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
            ("Gold", "14K", 9063.0, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
            ("Silver", "999", 250.0, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
            ("Silver", "925", 231.25, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
            ("Platinum", "950", 5379.0, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
            ("Platinum", "900", 5096.0, "gram", "INR", "Sample/Demo Historical Data", today_str, now_str),
        ]
        cursor.executemany("""
            INSERT INTO market_rates (metal, purity, rate_per_gram, unit, currency, source, rate_date, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, rates_data)
        conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Database initialized and migrations applied successfully at {DB_PATH}")

