import io
import csv
import openpyxl
import datetime
import secrets
from database import get_db_connection
from services.valuation_engine import get_metal_purity_factor

VALID_METALS = {"GOLD", "SILVER", "PLATINUM", "DIAMOND"}
VALID_PURITIES = {
    "GOLD": {"24K", "22K", "18K", "14K", "10K", "999", "916", "750", "585"},
    "SILVER": {"999", "925", "900", "STERLING"},
    "PLATINUM": {"950", "900", "999", "PT950", "PT900"}
}

def parse_and_validate_file(file_stream, filename: str, user_id: int):
    """
    Parses CSV or Excel file, validates every row, detects duplicates against existing records,
    and returns detailed row-level errors and warnings.
    """
    ext = (filename or "").rsplit(".", 1)[-1].lower()
    raw_rows = []

    if ext == "csv":
        try:
            content = file_stream.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(content))
            raw_rows = list(reader)
        except Exception as e:
            return {"error": f"Failed to parse CSV file: {str(e)}"}, 400
    elif ext in ["xlsx", "xls"]:
        try:
            wb = openpyxl.load_workbook(file_stream, data_only=True)
            ws = wb.active
            rows_iter = ws.iter_rows(values_only=True)
            headers = [str(h or "").strip() for h in next(rows_iter, [])]
            for r in rows_iter:
                if any(r):
                    raw_rows.append(dict(zip(headers, r)))
        except Exception as e:
            return {"error": f"Failed to parse Excel file: {str(e)}"}, 400
    else:
        return {"error": f"Unsupported file format '.{ext}'. Please upload CSV or XLSX."}, 400

    if not raw_rows:
        return {"error": "The uploaded file is empty."}, 400

    # Fetch user's existing identifiers to detect duplicates
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, asset_name, LOWER(COALESCE(hallmark_huid, '')) as huid,
               LOWER(COALESCE(invoice_number, '')) as invoice
        FROM assets WHERE user_id = ?
    """, (user_id,))
    existing_assets = cursor.fetchall()
    conn.close()

    existing_huids = {r["huid"]: r["asset_name"] for r in existing_assets if r["huid"]}
    existing_invoices = {r["invoice"]: r["asset_name"] for r in existing_assets if r["invoice"]}

    normalized_rows = []
    valid_count = 0
    error_count = 0

    for idx, raw in enumerate(raw_rows, start=1):
        # Normalize keys (case-insensitive mapping)
        row_map = {str(k).strip().lower().replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_"): v for k, v in raw.items() if k is not None}

        name = str(row_map.get("asset_name") or row_map.get("name") or row_map.get("holding") or "").strip()
        metal = str(row_map.get("metal") or "Gold").strip().capitalize()
        purity = str(row_map.get("purity") or "22K").strip().upper()
        raw_gross = row_map.get("gross_weight") or row_map.get("weight") or row_map.get("gross_wt") or 0.0
        raw_net = row_map.get("net_weight") or row_map.get("net_wt")
        raw_cost = row_map.get("purchase_price") or row_map.get("cost") or row_map.get("acquisition_cost") or row_map.get("total_acquisition_cost") or 0.0
        p_date = str(row_map.get("purchase_date") or row_map.get("date") or datetime.date.today().isoformat()).strip()
        huid = str(row_map.get("hallmark_huid") or row_map.get("huid") or "").strip()
        invoice = str(row_map.get("invoice_number") or row_map.get("invoice") or row_map.get("bill_no") or "").strip()
        jeweller = str(row_map.get("jeweller_name") or row_map.get("jeweller") or "").strip()
        owner = str(row_map.get("owner_name") or row_map.get("owner") or row_map.get("buyer_name") or "Self").strip()
        category = str(row_map.get("category") or "Jewellery").strip()

        row_errors = []
        row_warnings = []

        # Validate Name
        if not name:
            row_errors.append("Asset name is required")

        # Validate Metal
        metal_upper = metal.upper()
        if metal_upper not in VALID_METALS:
            row_errors.append(f"Invalid metal '{metal}'. Supported: Gold, Silver, Platinum, Diamond")

        # Validate Purity
        if metal_upper in VALID_PURITIES:
            matched_purity = any(p in purity for p in VALID_PURITIES[metal_upper])
            if not matched_purity:
                row_errors.append(f"Invalid purity '{purity}' for {metal}")

        # Validate Weights
        gross_wt = 0.0
        net_wt = 0.0
        try:
            gross_wt = float(raw_gross)
            if gross_wt <= 0:
                row_errors.append("Gross weight must be greater than zero")
        except (ValueError, TypeError):
            row_errors.append("Invalid gross weight numeric format")

        try:
            if raw_net is not None and str(raw_net).strip() != "":
                net_wt = float(raw_net)
                if net_wt < 0:
                    row_errors.append("Net weight cannot be negative")
                elif gross_wt > 0 and net_wt > gross_wt:
                    row_errors.append("Net weight cannot exceed gross weight")
            else:
                net_wt = gross_wt
        except (ValueError, TypeError):
            row_errors.append("Invalid net weight numeric format")

        # Validate Acquisition Cost
        total_cost = 0.0
        try:
            total_cost = float(raw_cost)
            if total_cost < 0:
                row_errors.append("Acquisition cost cannot be negative")
        except (ValueError, TypeError):
            row_errors.append("Invalid purchase price numeric format")

        # Validate Date
        try:
            parsed_date = datetime.date.fromisoformat(p_date.split()[0])
            p_date = parsed_date.isoformat()
        except Exception:
            try:
                # Try DD/MM/YYYY or DD-MM-YYYY
                parts = p_date.replace("/", "-").split("-")
                if len(parts) == 3:
                    if len(parts[0]) == 4: # YYYY-MM-DD
                        parsed_date = datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
                    else: # DD-MM-YYYY
                        parsed_date = datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
                    p_date = parsed_date.isoformat()
                else:
                    row_errors.append("Invalid purchase date format (expected YYYY-MM-DD)")
            except Exception:
                row_errors.append("Invalid purchase date format (expected YYYY-MM-DD)")

        # Duplicate Asset Detection (Non-blocking warning)
        if huid and huid.lower() in existing_huids:
            row_warnings.append(f"Possible duplicate: HUID '{huid}' matches existing asset '{existing_huids[huid.lower()]}'")
        if invoice and invoice.lower() in existing_invoices:
            row_warnings.append(f"Possible duplicate: Invoice '{invoice}' matches existing asset '{existing_invoices[invoice.lower()]}'")

        is_valid = len(row_errors) == 0
        if is_valid:
            valid_count += 1
        else:
            error_count += 1

        normalized_rows.append({
            "row_index": idx,
            "is_valid": is_valid,
            "errors": row_errors,
            "warnings": row_warnings,
            "data": {
                "asset_name": name,
                "metal": metal,
                "purity": purity,
                "gross_weight": gross_wt,
                "net_weight": net_wt,
                "total_acquisition_cost": total_cost,
                "purchase_price": total_cost,
                "purchase_date": p_date,
                "hallmark_huid": huid,
                "invoice_number": invoice,
                "jeweller_name": jeweller,
                "owner_name": owner,
                "category": category
            }
        })

    return {
        "total_rows": len(raw_rows),
        "valid_count": valid_count,
        "error_count": error_count,
        "rows": normalized_rows
    }, 200

def commit_valid_import_rows(user_id: int, valid_rows: list):
    """
    Inserts confirmed valid rows into the database under user_id,
    generates secure non-guessable certificate tokens, and logs acquisition transactions.
    """
    if not valid_rows:
        return {"error": "No valid rows provided for import."}, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Category map
    cursor.execute("SELECT id, LOWER(category_name) as cname FROM categories")
    cat_map = {row["cname"]: row["id"] for row in cursor.fetchall()}
    default_cat_id = list(cat_map.values())[0] if cat_map else 1

    imported_count = 0
    for r in valid_rows:
        d = r.get("data", r)
        name = d.get("asset_name")
        if not name:
            continue

        metal = d.get("metal", "Gold")
        purity = d.get("purity", "22K")
        factor = get_metal_purity_factor(metal, purity)
        gross_wt = float(d.get("gross_weight") or 0.0)
        net_wt = float(d.get("net_weight") or gross_wt)
        cost = float(d.get("total_acquisition_cost") or d.get("purchase_price") or 0.0)
        p_date = d.get("purchase_date") or datetime.date.today().isoformat()
        huid = d.get("hallmark_huid", "")
        invoice = d.get("invoice_number", "")
        jeweller = d.get("jeweller_name", "")
        owner = d.get("owner_name", "Self")
        cat_key = (d.get("category") or "Jewellery").lower()
        cat_id = cat_map.get(cat_key, default_cat_id)
        cert_token = secrets.token_urlsafe(24)

        cursor.execute("""
            INSERT INTO assets (
                user_id, asset_name, category_id, asset_type, metal, purity, purity_factor,
                quantity, gross_weight, net_weight, stone_weight, purchase_date, purchase_price,
                making_charges, wastage, taxes, total_acquisition_cost, description, status,
                hallmark_huid, jeweller_name, invoice_number, owner_name, certificate_token
            ) VALUES (
                ?, ?, ?, 'Jewellery', ?, ?, ?,
                1, ?, ?, 0.0, ?, ?,
                0.0, 0.0, 0.0, ?, '', 'Active',
                ?, ?, ?, ?, ?
            )
        """, (
            user_id, name, cat_id, metal, purity, factor,
            gross_wt, net_wt, p_date, cost,
            cost, huid, jeweller, invoice, owner, cert_token
        ))
        asset_id = cursor.lastrowid

        # Record acquisition transaction
        cursor.execute("""
            INSERT INTO transactions (user_id, asset_id, transaction_type, transaction_date, amount, realized_profit, counterparty, notes)
            VALUES (?, ?, 'PURCHASE', ?, ?, 0.0, ?, 'Imported via CSV/XLSX')
        """, (user_id, asset_id, p_date, cost, jeweller or "Acquisition"))

        imported_count += 1

    # Log audit event
    cursor.execute("""
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (?, 'BACKUP_IMPORTED', ?)
    """, (user_id, f"Imported {imported_count} assets via CSV/XLSX file"))

    conn.commit()
    conn.close()

    return {
        "message": f"Successfully imported {imported_count} assets into your vault.",
        "imported_count": imported_count
    }, 200
