import os
import sys

# Ensure backend directory is in python search path
current_dir = os.path.abspath(os.path.dirname(__file__))
backend_dir = os.path.join(current_dir, "backend")
sys.path.insert(0, backend_dir)

from database import init_db
from seed_data import seed_database
from services.market_data_service import sync_live_market_rates
from app import app

if __name__ == "__main__":
    print("==================================================")
    print("  [*] AssetVault - Physical Asset Valuation System  ")
    print("==================================================")
    print("Initializing SQLite Relational Database...")
    init_db()
    print("Seeding initial database state & sample holdings...")
    seed_database()
    print("Synchronizing real-time market spot rates...")
    try:
        synced = sync_live_market_rates()
        if synced:
            print(f"  [OK] Live rates ready (Gold 24K: INR {synced.get('GOLD_24K', 'N/A')}/g)")
    except Exception as e:
        print(f"  [!] Live rate sync fallback to cache: {e}")
    print("\nStarting AssetVault Web Server on http://127.0.0.1:5000")
    print("Press CTRL+C to terminate.")
    print("==================================================")
    app.run(host="127.0.0.1", port=5000, debug=True)