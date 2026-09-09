import sqlite3
import os
from config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        currency TEXT DEFAULT 'INR',
        target_portfolio_value REAL DEFAULT 1000000.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'gem'
    );
    """)

    # 3. Market Rates Table
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

    # 4. Assets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        asset_name TEXT NOT NULL,
        category_id INTEGER,
        asset_type TEXT NOT NULL,
        metal TEXT,
        purity TEXT,
        purity_factor REAL DEFAULT 1.0,
        quantity INTEGER DEFAULT 1,
        gross_weight REAL DEFAULT 0.0,
        net_weight REAL DEFAULT 0.0,
        stone_weight REAL DEFAULT 0.0,
        purchase_date DATE NOT NULL,
        purchase_price REAL NOT NULL,
        making_charges REAL DEFAULT 0.0,
        wastage REAL DEFAULT 0.0,
        taxes REAL DEFAULT 0.0,
        total_acquisition_cost REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Active', -- Active, Sold, Transferred, Gifted, Archived
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );
    """)

    # 5. Asset Valuations Table (Historical valuations snapshot)
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

    # 6. Transactions Table (Lifecycle: Buy, Sell, Transfer, Gift, Archive)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL, -- PURCHASE, SALE, TRANSFER, GIFT, ARCHIVE
        transaction_date DATE NOT NULL,
        amount REAL NOT NULL,
        realized_profit REAL DEFAULT 0.0,
        counterparty TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)

    # 7. Documents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        document_type TEXT NOT NULL, -- Invoice, Certificate, Hallmark, Photograph, Other
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)

    # 8. Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL, -- PRICE_TARGET, PORTFOLIO_TARGET, PERCENT_CHANGE
        target_metal TEXT,
        target_value REAL NOT NULL,
        condition TEXT NOT NULL, -- GREATER_THAN, LESS_THAN
        is_triggered INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)

    # 9. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Database initialized successfully at {DB_PATH}")
