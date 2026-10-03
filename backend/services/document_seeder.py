import os
import sqlite3
import datetime
import hashlib
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_document_pdf(output_path, doc_info):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'DocHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor(doc_info.get("primary_color", "#064E3B")),
        alignment=1
    )

    issuer_style = ParagraphStyle(
        'DocIssuer',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#B45309'),
        alignment=1
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#57534E'),
        alignment=1
    )

    cell_label = ParagraphStyle(
        'CellLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1C1917')
    )

    cell_val = ParagraphStyle(
        'CellVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#292524')
    )

    story = []

    # Top border line
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor(doc_info.get("primary_color", "#064E3B")), spaceAfter=8))
    
    # Official Issuer & Title
    story.append(Paragraph(doc_info["issuer"].upper(), issuer_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(doc_info["title"], header_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(doc_info.get("subtitle", "Official Custodial Vault Document & Registered Verification Dossier"), subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#D4AF37'), spaceAfter=14))

    # Meta reference banner table
    meta_banner = [
        [
            Paragraph("<b>Certificate / Reference:</b> " + doc_info.get("ref_number", "AV-DOC-001"), cell_label),
            Paragraph("<b>Date of Issue:</b> " + doc_info.get("issue_date", "2024-01-01"), cell_label),
            Paragraph("<b>Status:</b> <font color='#059669'><b>VERIFIED & ACTIVE</b></font>", cell_label)
        ]
    ]
    t_banner = Table(meta_banner, colWidths=[200, 160, 170])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F7F4EB')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5DFD2')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 14))

    # Specifications Table
    spec_data = []
    for row in doc_info.get("specs", []):
        spec_data.append([
            Paragraph(f"<b>{row[0]}</b>", cell_label),
            Paragraph(str(row[1]), cell_val),
            Paragraph(f"<b>{row[2]}</b>", cell_label),
            Paragraph(str(row[3]), cell_val)
        ])

    t_specs = Table(spec_data, colWidths=[130, 140, 130, 130])
    t_specs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FDFAF4')),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.HexColor('#FDFAF4'), colors.HexColor('#F9F6EE')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5DFD2')),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_specs)
    story.append(Spacer(1, 14))

    # Description & Legal Custody Clause
    legal_text = Paragraph(
        f"<b>Certification & Legal Guarantee:</b> {doc_info.get('notes', 'This document certifies the physical existence, weight, assay fineness, and custodial entitlement of the specified item. Registered in the AssetVault Relational Ledger with non-custodial cryptographic audit hash verification.')}",
        ParagraphStyle('Legal', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#57534E'))
    )
    story.append(legal_text)
    story.append(Spacer(1, 16))

    # Signatures & Hash Footer
    hash_digest = hashlib.sha256(f"{doc_info['ref_number']}-{doc_info['title']}".encode()).hexdigest().upper()[:32]
    footer_data = [
        [
            Paragraph("<b>Issuing Authority / Authorized Signatory:</b><br/>" + doc_info.get("signatory", "Chief Metallurgical Assayer"), cell_label),
            Paragraph("<b>Cryptographic Verification Hash:</b><br/><font face='Courier' size='7'>" + hash_digest + "</font>", cell_val),
            Paragraph("<b>AssetVault Ledger Seal:</b><br/><font color='#059669'>AUTHENTICATED</font>", cell_label)
        ]
    ]
    t_foot = Table(footer_data, colWidths=[180, 210, 140])
    t_foot.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F6F3EB')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D4AF37')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_foot)

    doc.build(story)
    return os.path.getsize(output_path)

def seed_documents_for_user(user_id=1):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    db_path = os.path.join(base_dir, "assetvault.db")
    upload_dir = os.path.join(base_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Find user assets
    cursor.execute("SELECT id, asset_name, metal, purity, category_id, jeweller_name, hallmark_huid, invoice_number FROM assets WHERE user_id = ?", (user_id,))
    assets = {r["asset_name"]: r for r in cursor.fetchall()}

    # Clear existing documents for this user
    cursor.execute("DELETE FROM documents WHERE user_id = ?", (user_id,))

    docs_definitions = [
        {
            "asset_match": "Gold Coins 10 g",
            "document_type": "Certificate",
            "file_name": "MMTC_PAMP_Gold_Coin_Assay_Cert.pdf",
            "issuer": "MMTC-PAMP India Private Limited (LBMA Good Delivery Refiner)",
            "title": "OFFICIAL 24K GOLD ASSAY CERTIFICATE",
            "subtitle": "London Bullion Market Association (LBMA) Accreditated Laboratory Assayer Report",
            "ref_number": "PAMP-AU-9999-CERT",
            "issue_date": "2021-08-15",
            "primary_color": "#064E3B",
            "signatory": "R. K. Sharma (Head of Metallurgy, NABL / LBMA)",
            "specs": [
                ["Asset Name:", "MMTC-PAMP 24K Gold Coin 10 g", "Serial Number:", "PAMP-AU-9999"],
                ["Precious Metal:", "Gold (Au)", "Assayed Purity:", "999.9 / 1000 (24 Karat Fine)"],
                ["Nominal Weight:", "10.000 grams", "Certified Net Weight:", "10.000 grams (Tolerance: ±0.001g)"],
                ["Assay Technique:", "X-Ray Fluorescence & Fire Assay", "Refining Origin:", "Rojka-Meo Industrial Estate, HR"]
            ],
            "notes": "Guaranteed fine gold purity by MMTC-PAMP India, joint venture of MMTC Ltd (Govt. of India) and PAMP Switzerland. Recognised worldwide under LBMA Good Delivery benchmarks."
        },
        {
            "asset_match": "Solitaire Engagement Ring",
            "document_type": "Diamond Certificate",
            "file_name": "GIA_Diamond_Report_2195847392.pdf",
            "issuer": "Gemological Institute of America (GIA World Headquarters)",
            "title": "GIA NATURAL DIAMOND GRADING REPORT",
            "subtitle": "Independent Gemological Laboratory Identification & 4Cs Quality Assessment",
            "ref_number": "GIA-2195847392",
            "issue_date": "2022-02-14",
            "primary_color": "#0369A1",
            "signatory": "Dr. E. J. Gübelin (Chief Gemological Director, GIA)",
            "specs": [
                ["Shape & Cutting Style:", "Round Brilliant", "Carat Weight:", "1.50 Carats"],
                ["Color Grade:", "E (Colorless)", "Clarity Grade:", "VVS1 (Very Very Slightly Included)"],
                ["Cut Grade:", "Excellent", "Polish / Symmetry:", "Excellent / Excellent"],
                ["Fluorescence:", "None", "Laser Inscription:", "GIA 2195847392 (Girdle Micro-Engraved)"]
            ],
            "notes": "Natural diamond graded under standardized lighting conditions using GIA Master Color stones, 10x gemological binocular microscope, and computerized non-contact optical measuring devices."
        },
        {
            "asset_match": "Antique Temple Necklace",
            "document_type": "Hallmark Record",
            "file_name": "BIS_Hallmark_HUID_Verification_TNQ88421.pdf",
            "issuer": "Bureau of Indian Standards (BIS Assaying & Hallmarking Centre)",
            "title": "GOVERNMENT BIS 22K (916) HALLMARK CERTIFICATE",
            "subtitle": "National Precious Metals Assaying & Unique 6-Digit HUID Registration Slip",
            "ref_number": "BIS-HUID-TNQ-88421",
            "issue_date": "2019-11-02",
            "primary_color": "#B45309",
            "signatory": "V. K. Mehta (Assaying Officer, BIS Center MH-01)",
            "specs": [
                ["Jewellery Article:", "Antique Temple Bridal Necklace", "Unique HUID:", "TNQ-22K-88421"],
                ["Metal & Fineness:", "Gold 22K (916 Parts per 1000)", "Purity Confirmed:", "91.67% Pure Gold"],
                ["Gross Weight:", "65.200 grams", "Certified Net Weight:", "65.200 grams"],
                ["Assaying Centre Code:", "AHC-MH-0104-MUMBAI", "Registered Jeweller:", "Titan Company Ltd (Tanishq)"]
            ],
            "notes": "Tested in accordance with Indian Standard IS 1417:2019. The six-digit alphanumeric HUID stamped on this article guarantees authenticity on the official BIS Care verification portal."
        },
        {
            "asset_match": "Antique Temple Necklace",
            "document_type": "Invoice",
            "file_name": "Tanishq_Jewellery_Tax_Invoice_2019.pdf",
            "issuer": "Titan Company Limited — Tanishq Fine Jewellery",
            "title": "TAX INVOICE & AUTHENTICITY PURCHASE MEMO",
            "subtitle": "Authorized Retail Purchase Receipt, GST Invoice & Lifetime Exchange Policy",
            "ref_number": "INV-2019-1102-TNQ",
            "issue_date": "2019-11-02",
            "primary_color": "#1C1917",
            "signatory": "Store Manager, Tanishq Flagship Boutiques",
            "specs": [
                ["Invoice Number:", "INV-2019-1102-TNQ", "Customer Name:", "Kapil Khadase"],
                ["Item Description:", "22K Antique Temple Gold Necklace", "Net Gold Weight:", "65.200 grams"],
                ["Gold Rate Applied:", "₹3,750 / gram", "Making Charges:", "₹23,900.00"],
                ["Subtotal:", "₹2,68,400.00", "Total Amount Paid:", "₹2,68,400.00 (Incl. 3% CGST/SGST)"]
            ],
            "notes": "Original tax receipt issued by Titan Company Limited. Includes Tanishq guarantee of 100% purity and buy-back valuation at prevailing daily board rates."
        },
        {
            "asset_match": "Platinum Wedding Band",
            "document_type": "Certificate",
            "file_name": "PGI_Platinum_950_Assay_Guarantee.pdf",
            "issuer": "Platinum Guild International (PGI)",
            "title": "PLATINUM 950 PURITY & ASSAY GUARANTEE",
            "subtitle": "Official Platinum Guild International Hallmark & Metallurgical Quality Passport",
            "ref_number": "PGI-PT-95011-AUTH",
            "issue_date": "2021-12-05",
            "primary_color": "#4A0E4E",
            "signatory": "Director of Quality Assurance, PGI Global",
            "specs": [
                ["Product Title:", "Platinum Wedding Band (Classic Finish)", "Alloy Classification:", "Pt 950 Fine Platinum"],
                ["Certified Fineness:", "950 Parts per 1000 Pure Platinum", "Alloy Composition:", "95% Platinum, 5% Ruthenium"],
                ["Total Weight:", "8.400 grams", "Manufacturer:", "Orra Platinum Luxury Jewels"],
                ["Quality Seal Number:", "PGI-IND-84729", "Durability Index:", "Hypoallergenic, Pure & Dense"]
            ],
            "notes": "Certified authentic platinum jewellery recognized under International Platinum Guild specifications. Does not tarnish, corrode, or lose metal volume over time."
        },
        {
            "asset_match": "Diamond Stud Earrings",
            "document_type": "Diamond Certificate",
            "file_name": "IGI_Diamond_Earrings_Report_482910384.pdf",
            "issuer": "International Gemological Institute (IGI Worldwide Labs)",
            "title": "IGI DIAMOND JEWELRY AUTHENTICITY REPORT",
            "subtitle": "Comprehensive Gemological Examination & Diamond Pairing Analysis",
            "ref_number": "IGI-482910384",
            "issue_date": "2023-01-18",
            "primary_color": "#0369A1",
            "signatory": "Senior Gemologist, IGI Antwerp / Mumbai",
            "specs": [
                ["Article Description:", "18K Gold Solitaire Stud Earrings (Pair)", "Total Diamond Weight:", "0.85 Carat (0.425 ct each)"],
                ["Diamond Shape:", "Princess Cut (Square Modified)", "Color Grade:", "F (Rare White)"],
                ["Clarity Grade:", "VS1 (Very Slightly Included)", "Setting Material:", "18K Solid White Gold (750)"],
                ["Laboratory Seal:", "IGI Diamond Laserscribe On Girdle", "Conflict Free Status:", "Kimberley Process Certified"]
            ],
            "notes": "Verified natural earth-mined diamonds. Color and clarity characteristics verified by optical spectroscopy and master stone comparison."
        },
        {
            "asset_match": "MMTC-PAMP 24K Digital Gold",
            "document_type": "Depository Deed",
            "file_name": "MMTC_PAMP_Digital_Gold_Custody_Deed.pdf",
            "issuer": "MMTC-PAMP India & IDBI Trusteeship Services Limited",
            "title": "DIGITAL GOLD PHYSICAL CUSTODY & VAULT TITLE DEED",
            "subtitle": "100% Fully Backed Physical Bullion Custodial Safekeeping Trust Deed",
            "ref_number": "MMTC-DG-VAULT-8419",
            "issue_date": "2022-06-20",
            "primary_color": "#064E3B",
            "signatory": "Independent Security Trustee, IDBI Trusteeship Services",
            "specs": [
                ["Account Holder:", "Kapil Khadase (AssetVault ID: AV-001)", "Allocated Bullion Weight:", "47.500 grams Fine Gold (24K)"],
                ["Physical Fineness:", "999.9 / 1000 Pure LBMA Cast Ingot", "Vault Depository:", "Secured Freezone Bullion Depository"],
                ["Insurance Coverage:", "100% Fully Insured by New India Assurance", "Inspection Audit:", "Bimonthly Physical Audit by Ernst & Young"],
                ["Redemption Right:", "Deliverable on Demand into Minted Coins", "Trust Deed Reference:", "IDBI-MMTC-TR-2022-8419"]
            ],
            "notes": "Certifies that 47.500 grams of 24K 999.9 physical gold is physically stored in secure vaults on behalf of the investor, free from any company claims or liens."
        },
        {
            "asset_match": "Sovereign Gold Bond (SGB 2021-22)",
            "document_type": "Certificate",
            "file_name": "RBI_SGB_Holding_Certificate_2021.pdf",
            "issuer": "Reserve Bank of India (Government of India Sovereign Debt)",
            "title": "SOVEREIGN GOLD BOND CERTIFICATE OF HOLDING",
            "subtitle": "Statutory Certificate Issued Under Government Securities Act, 2006",
            "ref_number": "RBI-SGB-2021-IX-84920",
            "issue_date": "2021-12-14",
            "primary_color": "#064E3B",
            "signatory": "Chief General Manager, Internal Debt Management Dept, RBI",
            "specs": [
                ["Investor Name:", "Kapil Khadase", "Bond Tranche / Series:", "SGB 2021-22 Series IX"],
                ["Number of Units (Grams):", "25 Grams of Fine Gold (999)", "Issue Price per Gram:", "₹4,791.00 per gram"],
                ["Total Investment:", "₹1,19,775.00", "Fixed Semi-Annual Interest:", "2.50% p.a. Payable Half-Yearly"],
                ["Tenor / Maturity Date:", "8 Years (Maturity: December 2029)", "Sovereign Guarantee:", "Principal & Capital Gains Tax Exempt"]
            ],
            "notes": "Issued by the Reserve Bank of India on behalf of the President of India. Backed by the Sovereign Guarantee of the Union Government of India."
        },
        {
            "asset_match": "Bangle Pair (Kada)",
            "document_type": "Invoice",
            "file_name": "Malabar_Gold_Bangles_Invoice_2021.pdf",
            "issuer": "Malabar Gold & Diamonds Pvt. Ltd.",
            "title": "TAX INVOICE & BIS 916 AUTHENTICITY CERTIFICATE",
            "subtitle": "Official Jewellery Purchase Invoice & Hallmark Certification Memo",
            "ref_number": "MGD-BGL-10923-INV",
            "issue_date": "2021-04-12",
            "primary_color": "#1C1917",
            "signatory": "Branch Manager, Malabar Gold & Diamonds",
            "specs": [
                ["Product Description:", "22K Traditional Gold Bangle Pair (Kada)", "HUID Code:", "MBR-22K-10923"],
                ["Gold Gross / Net Weight:", "48.000 grams / 48.000 grams", "Certified Purity:", "22K / 916.7 Fineness"],
                ["Purchase Value:", "₹1,98,400.00", "Making Charges & Taxes:", "Included in Total"],
                ["Jeweller GSTIN:", "27AABCM8821N1ZS", "Customer Name:", "Kapil Khadase"]
            ],
            "notes": "Original retail tax invoice. Valid for nationwide warranty, complimentary cleaning, and lifetime exchange at all Malabar Gold & Diamonds showrooms."
        },
        {
            "asset_match": "Silver Bars 100 g",
            "document_type": "Certificate",
            "file_name": "MMTC_PAMP_Fine_Silver_100g_Assay_Cert.pdf",
            "issuer": "MMTC-PAMP India Pvt. Ltd. (Precious Metals Refinery)",
            "title": "FINE SILVER 999.0 MINT BAR ASSAY CERTIFICATE",
            "subtitle": "Certified Purity & Weight Verification for 100g Pure Silver Cast Bar",
            "ref_number": "PAMP-AG-9990-CERT",
            "issue_date": "2022-01-10",
            "primary_color": "#475569",
            "signatory": "K. Sengupta (Chief Refiner, Precious Metals Division)",
            "specs": [
                ["Asset Name:", "MMTC-PAMP 999.0 Silver Bar 100 g", "Bar Serial Code:", "PAMP-AG-9990"],
                ["Metal / Fineness:", "Silver (Ag) / 999.0 Fine Silver", "Actual Weight:", "100.000 grams"],
                ["Packaging Standard:", "Tamper-Evident CertiPAMP Blister Pack", "Assaying Method:", "Potentiometric Titration"],
                ["Refinery Registration:", "BIS / NABL / LBMA Recognized", "Country of Origin:", "India (Swiss Technology)"]
            ],
            "notes": "Assayed to contain not less than 99.90% pure silver. Sealed in authenticated CertiPAMP packaging with anti-counterfeit holographic printing."
        },
        {
            "asset_match": "Gold Bar 50 g",
            "document_type": "Invoice",
            "file_name": "MMTC_PAMP_Gold_Bar_Sale_Settlement_Voucher.pdf",
            "issuer": "MMTC-PAMP Liquidation & Buy-Back Desk",
            "title": "ASSET LIQUIDATION & SETTLEMENT VOUCHER",
            "subtitle": "Official Physical Bullion Buy-Back Settlement Record & Funds Transfer Advice",
            "ref_number": "SL-2025-1103-AU",
            "issue_date": "2025-11-03",
            "primary_color": "#1C1917",
            "signatory": "Treasury Desk Officer, MMTC-PAMP India",
            "specs": [
                ["Sold Bullion Asset:", "MMTC-PAMP 24K Gold Bar 50 g", "Serial Number:", "PAMP-SOLD"],
                ["Sale Spot Rate Applied:", "₹7,970.00 / gram", "Net Proceeds Realized:", "₹3,98,500.00"],
                ["Acquisition Cost Baseline:", "₹1,46,000.00 (Apr 2020)", "Net Realized Capital Gain:", "+₹2,52,500.00 (+172.9%)"],
                ["Settlement Method:", "RTGS Bank Transfer", "Bank Reference:", "HDFC-RTGS-891024"]
            ],
            "notes": "Confirmed sale settlement. Physical custody transferred to MMTC-PAMP depository desk and net funds credited to client bank account."
        },
        {
            "asset_match": None, # General Portfolio
            "document_type": "Certificate",
            "file_name": "Lloyds_Syndicate_Vault_AllRisk_Insurance.pdf",
            "issuer": "Lloyd's Underwriters Syndicate — Specie & High-Value Cargo",
            "title": "PHYSICAL ASSET VAULT ALL-RISK INSURANCE POLICY",
            "subtitle": "Underwritten Physical Bullion, Vaulted Heirloom & High-Value Asset Schedule",
            "ref_number": "LL-VAULT-2025-09",
            "issue_date": "2025-01-01",
            "primary_color": "#064E3B",
            "signatory": "Lead Underwriter, Lloyd's Syndicate London",
            "specs": [
                ["Policy Holder:", "Kapil Khadase", "Insured Vault Location:", "Private Safe & Accredited Depository"],
                ["Aggregate Sum Insured:", "₹50,00,000.00 (Fifty Lakh Rupees)", "Policy Scope:", "All-Risk, Burglary, Transit & Natural Peril"],
                ["Policy Period:", "01-Jan-2025 to 31-Dec-2025", "Claim Settlement Protocol:", "Full Market Value Replacement on Loss Date"],
                ["Surveyor Inspection:", "Quarterly Verified by Bureau Veritas", "Deductible / Excess:", "Zero Deductible on Certified Bullion"]
            ],
            "notes": "Comprehensive all-risk physical property insurance policy covering all gold, platinum, silver, and diamond items recorded in the AssetVault register."
        }
    ]

    inserted_count = 0
    for item in docs_definitions:
        asset_name = item.get("asset_match")
        asset_id = 0
        if asset_name and asset_name in assets:
            asset_id = assets[asset_name]["id"]

        unique_storage_name = f"doc_{user_id}_{asset_id}_{item['file_name']}"
        full_file_path = os.path.join(upload_dir, unique_storage_name)

        # Generate the real PDF
        file_size = create_document_pdf(full_file_path, item)

        cursor.execute("""
            INSERT INTO documents (
                user_id, asset_id, document_type, file_name, file_path,
                file_size, uploaded_at, is_encrypted, mime_type, photo_category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'application/pdf', 'general')
        """, (
            user_id,
            asset_id,
            item["document_type"],
            item["file_name"],
            unique_storage_name,
            file_size,
            item["issue_date"] + " 10:30:00"
        ))
        inserted_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully generated and seeded {inserted_count} real PDF documents for user {user_id}!")

if __name__ == "__main__":
    seed_documents_for_user(1)
