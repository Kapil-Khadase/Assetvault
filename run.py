import os
import sys

# Ensure backend directory is in python search path
current_dir = os.path.abspath(os.path.dirname(__file__))
backend_dir = os.path.join(current_dir, "backend")
sys.path.insert(0, backend_dir)

from database import init_db
from seed_data import seed_database
from app import app

if __name__ == "__main__":
    print("==================================================")
    print("  [*] AssetVault - Physical Asset Valuation System  ")
    print("==================================================")
    print("Initializing SQLite Relational Database...")
    init_db()
    print("Seeding initial live market rates & sample holdings...")
    seed_database()
    print("\nStarting AssetVault Web Server on http://127.0.0.1:5000")
    print("Press CTRL+C to terminate.")
    print("==================================================")
    app.run(host="127.0.0.1", port=5000, debug=False)