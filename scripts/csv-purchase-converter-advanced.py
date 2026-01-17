#!/usr/bin/env python3
"""
Advanced CSV Purchase Data Converter
Handles CSV files and array data from various sources
"""

import json
import csv
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

def parse_date(date_str: str) -> str:
    """Convert various date formats to ISO format"""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    date_str = str(date_str).strip()
    
    formats = [
        "%d-%b-%Y",      # 07-Apr-2025
        "%d/%b/%Y",      # 08/Apr/2025
        "%d-%B-%Y",      # 07-April-2025
        "%d/%B/%Y",      # 08/April/2025
        "%d-%m-%Y",      # 07-04-2025
        "%d/%m/%Y",      # 07/04/2025
        "%Y-%m-%d",      # 2025-04-07
        "%d.%m.%Y",      # 07.04.2025
        "%d %b %Y",      # 07 Apr 2025
        "%d %B %Y",      # 07 April 2025
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        except:
            continue
    
    print(f"⚠️  Warning: Could not parse date '{date_str}', using current date")
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")

def clean_string(value: Any) -> str:
    """Clean and strip string values"""
    if value is None:
        return ""
    return str(value).strip()

def clean_number(value: Any) -> float:
    """Clean and convert to number"""
    if value is None:
        return 0.0
    try:
        cleaned = str(value).replace(",", "").replace(" ", "").strip()
        return float(cleaned)
    except:
        return 0.0

def clean_int(value: Any) -> int:
    """Clean and convert to integer"""
    if value is None:
        return 0
    try:
        cleaned = str(value).replace(",", "").replace(" ", "").strip()
        return int(float(cleaned))
    except:
        return 0

def find_column_index(headers: List[str], keywords: List[str]) -> Optional[int]:
    """Find column index by matching keywords"""
    headers_lower = [h.lower().strip() for h in headers]
    for keyword in keywords:
        for i, header in enumerate(headers_lower):
            if keyword in header:
                return i
    return None

def convert_purchase_data(data_rows: List[List[str]], headers: List[str]) -> Dict:
    """Convert purchase data rows to HisabKitab-Pro format"""
    
    # Find column indices
    supplier_name_idx = find_column_index(headers, ['customer name', 'supplier name', 'vendor name', 'supplier'])
    gstin_idx = find_column_index(headers, ['gst number', 'gstin', 'gst no', 'gst'])
    invoice_number_idx = find_column_index(headers, ['bill no', 'invoice no', 'invoice number', 'bill number'])
    invoice_date_idx = find_column_index(headers, ['bill date', 'invoice date', 'date', 'purchase date'])
    hsn_code_idx = find_column_index(headers, ['hsn', 'hsn code', 'hsn_code'])
    description_idx = find_column_index(headers, ['desc', 'description', 'product', 'item'])
    gst_rate_idx = find_column_index(headers, ['gst%', 'gst rate', 'gst_percent', 'tax rate'])
    quantity_idx = find_column_index(headers, ['qty', 'quantity', 'qty'])
    unit_idx = find_column_index(headers, ['unit', 'uom', 'unit of measure'])
    taxable_amount_idx = find_column_index(headers, ['taxable amt', 'taxable amount', 'subtotal', 'base amount'])
    sgst_idx = find_column_index(headers, ['sgst'])
    cgst_idx = find_column_index(headers, ['cgst'])
    igst_idx = find_column_index(headers, ['igst'])
    total_amount_idx = find_column_index(headers, ['bill amt', 'total', 'grand total', 'bill amount'])
    
    print(f"📊 Column Mapping:")
    print(f"   Supplier Name: Column {supplier_name_idx}")
    print(f"   Invoice Number: Column {invoice_number_idx}")
    print(f"   Invoice Date: Column {invoice_date_idx}")
    print(f"   Quantity: Column {quantity_idx}")
    print(f"   Total Amount: Column {total_amount_idx}")
    
    # Group purchases by invoice
    purchases_dict = {}
    suppliers_dict = {}
    purchase_id = 1
    
    for row_idx, row in enumerate(data_rows, 1):
        if not row or len(row) < max(filter(None, [
            supplier_name_idx, invoice_number_idx, invoice_date_idx
        ]), default=0) + 1:
            print(f"⚠️  Skipping row {row_idx}: Insufficient columns")
            continue
        
        try:
            # Extract data
            supplier_name = clean_string(row[supplier_name_idx]) if supplier_name_idx is not None else ""
            gstin = clean_string(row[gstin_idx]) if gstin_idx is not None else ""
            invoice_number = clean_string(row[invoice_number_idx]) if invoice_number_idx is not None else ""
            invoice_date = parse_date(row[invoice_date_idx]) if invoice_date_idx is not None else datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")
            
            # Skip if essential data is missing
            if not supplier_name or not invoice_number:
                print(f"⚠️  Skipping row {row_idx}: Missing supplier name or invoice number")
                continue
            
            # Extract item data
            hsn_code = clean_string(row[hsn_code_idx]) if hsn_code_idx is not None else ""
            description = clean_string(row[description_idx]) if description_idx is not None else hsn_code or "Unknown Product"
            gst_rate = clean_number(row[gst_rate_idx]) if gst_rate_idx is not None else 0
            quantity = clean_int(row[quantity_idx]) if quantity_idx is not None else 0
            unit = clean_string(row[unit_idx]) if unit_idx is not None else "pcs"
            taxable_amount = clean_number(row[taxable_amount_idx]) if taxable_amount_idx is not None else 0
            sgst_amount = clean_number(row[sgst_idx]) if sgst_idx is not None else 0
            cgst_amount = clean_number(row[cgst_idx]) if cgst_idx is not None else 0
            igst_amount = clean_number(row[igst_idx]) if igst_idx is not None else 0
            total_amount = clean_number(row[total_amount_idx]) if total_amount_idx is not None else 0
            
            # Create supplier if not exists
            supplier_key = supplier_name.upper().strip()
            if supplier_key not in suppliers_dict:
                supplier_id = len(suppliers_dict) + 1
                suppliers_dict[supplier_key] = {
                    "id": supplier_id,
                    "name": supplier_name.strip(),
                    "gstin": gstin,
                    "email": "",
                    "phone": "",
                    "address": "",
                    "city": "",
                    "state": "",
                    "pincode": "",
                    "contact_person": "",
                    "is_registered": bool(gstin),
                    "company_id": 1,
                    "created_at": invoice_date,
                    "updated_at": invoice_date
                }
            
            supplier_id = suppliers_dict[supplier_key]["id"]
            
            # Create purchase key (supplier + invoice + date)
            purchase_key = f"{supplier_key}_{invoice_number}_{invoice_date[:10]}"
            
            if purchase_key not in purchases_dict:
                purchases_dict[purchase_key] = {
                    "id": purchase_id,
                    "type": "gst",
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name.strip(),
                    "invoice_number": invoice_number,
                    "purchase_date": invoice_date,
                    "items": [],
                    "subtotal": 0,
                    "total_tax": 0,
                    "grand_total": 0,
                    "payment_status": "pending",
                    "payment_method": "cash",
                    "notes": "",
                    "company_id": 1,
                    "created_by": 1,
                    "created_at": invoice_date,
                    "updated_at": invoice_date
                }
                purchase_id += 1
            
            purchase = purchases_dict[purchase_key]
            
            # Calculate unit price
            unit_price = taxable_amount / quantity if quantity > 0 else 0
            
            # Calculate tax rates
            cgst_rate = (cgst_amount / taxable_amount * 100) if taxable_amount > 0 else 0
            sgst_rate = (sgst_amount / taxable_amount * 100) if taxable_amount > 0 else 0
            igst_rate = (igst_amount / taxable_amount * 100) if taxable_amount > 0 else 0
            
            # Use provided GST rate or calculate from tax amounts
            if gst_rate == 0:
                gst_rate = cgst_rate + sgst_rate + igst_rate
            
            # Create purchase item
            item = {
                "product_id": None,
                "product_name": description,
                "quantity": quantity,
                "unit_price": unit_price,
                "purchase_price": unit_price,
                "hsn_code": hsn_code,
                "gst_rate": round(gst_rate, 2),
                "cgst_rate": round(cgst_rate, 2) if cgst_rate > 0 else None,
                "sgst_rate": round(sgst_rate, 2) if sgst_rate > 0 else None,
                "igst_rate": round(igst_rate, 2) if igst_rate > 0 else None,
                "tax_amount": round(cgst_amount + sgst_amount + igst_amount, 2),
                "total": round(total_amount, 2),
                "article": "",
                "barcode": ""
            }
            
            purchase["items"].append(item)
            purchase["subtotal"] = round(purchase["subtotal"] + taxable_amount, 2)
            purchase["total_tax"] = round(purchase["total_tax"] + (cgst_amount + sgst_amount + igst_amount), 2)
            purchase["grand_total"] = round(purchase["grand_total"] + total_amount, 2)
            
        except Exception as e:
            print(f"❌ Error processing row {row_idx}: {e}")
            print(f"   Row data: {row[:5]}...")
            continue
    
    # Convert to lists
    suppliers = list(suppliers_dict.values())
    purchases = list(purchases_dict.values())
    
    return {
        "suppliers": suppliers,
        "purchases": purchases
    }

def read_csv_file(file_path: str) -> tuple[List[str], List[List[str]]]:
    """Read CSV file and return headers and rows"""
    headers = []
    rows = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader, [])
        rows = list(reader)
    
    return headers, rows

def create_backup_json(suppliers: List[Dict], purchases: List[Dict], company_id: int = 1) -> Dict:
    """Create HisabKitab-Pro backup JSON structure"""
    return {
        "version": "1.0.0",
        "export_date": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "export_by": "csv_purchase_converter",
        "data": {
            "companies": [],
            "users": [],
            "products": [],
            "categories": [],
            "sales": [],
            "purchases": purchases,
            "suppliers": suppliers,
            "customers": [],
            "sales_persons": [],
            "category_commissions": [],
            "sub_categories": [],
            "sales_person_category_assignments": [],
            "stock_adjustments": [],
            "settings": {}
        }
    }

def main():
    parser = argparse.ArgumentParser(description='Convert CSV purchase data to HisabKitab-Pro format')
    parser.add_argument('--input', '-i', help='Input CSV file path')
    parser.add_argument('--output', '-o', default='purchase_migration.json', help='Output JSON file')
    parser.add_argument('--company-id', type=int, default=1, help='Company ID for imported data')
    
    args = parser.parse_args()
    
    if args.input:
        # Read from CSV file
        print(f"📂 Reading CSV file: {args.input}")
        headers, data_rows = read_csv_file(args.input)
        print(f"   Found {len(headers)} columns, {len(data_rows)} rows")
    else:
        # Use example data
        print("📝 Using example data from user")
        headers = [
            "SrNo", "Customer Name", "GST Number", "Bill No", "Bill Date",
            "HSN", "Desc", "GST%", "Qty", "UNIT",
            "Taxable Amt", "SGST", "CGST", "IGST", "Oth Amt", "Bill Amt"
        ]
        data_rows = [
            [
                "1", "V P TRADERS", "09ABPPA6876Q1ZN", "VPT/25-26/11", "07-Apr-2025",
                "6107", "61079110", "5.00", "60.00", "PCS",
                "15736.17", "393.41", "393.41", "0.00", "0.01", "16523.00"
            ],
            [
                "2", "Pragati Traders", "09ABDFP5746L1ZO", "2025-26/017", "08/Apr/2025",
                "6107", "61079110", "5.00", "50.00", "PCS",
                "4357.13", "108.93", "108.93", "0.00", "0.01", "4575.00"
            ]
        ]
    
    print("\n🔄 Converting purchase data...")
    
    # Convert data
    result = convert_purchase_data(data_rows, headers)
    
    print(f"\n✅ Conversion complete!")
    print(f"   📦 Suppliers: {len(result['suppliers'])}")
    print(f"   📋 Purchases: {len(result['purchases'])}")
    
    # Create backup JSON
    backup = create_backup_json(result['suppliers'], result['purchases'], args.company_id)
    
    # Save to file
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(backup, f, indent=2, ensure_ascii=False)
    
    print(f"\n📁 Output saved to: {args.output}")
    print(f"\n📝 Purchase Summary:")
    for purchase in result['purchases']:
        print(f"   • {purchase['supplier_name']}")
        print(f"     Invoice: {purchase['invoice_number']}")
        print(f"     Date: {purchase['purchase_date'][:10]}")
        print(f"     Items: {len(purchase['items'])}")
        print(f"     Total: ₹{purchase['grand_total']:,.2f}")
        print()
    
    print(f"✅ Ready to import into HisabKitab-Pro!")
    print(f"   1. Open Backup & Restore page")
    print(f"   2. Click 'Import Data'")
    print(f"   3. Select: {args.output}")
    print(f"   4. Choose: ✅ Suppliers and ✅ Purchases")
    print(f"   5. Click 'Import'")

if __name__ == '__main__':
    main()




