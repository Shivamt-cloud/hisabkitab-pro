#!/usr/bin/env python3
"""
CSV Purchase Data Converter for HisabKitab-Pro
Converts purchase data from CSV/array format to HisabKitab-Pro JSON format
"""

import json
import csv
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

def parse_date(date_str: str) -> str:
    """Convert various date formats to ISO format"""
    date_str = date_str.strip()
    
    # Try different date formats
    formats = [
        "%d-%b-%Y",      # 07-Apr-2025
        "%d/%b/%Y",      # 08/Apr/2025
        "%d-%m-%Y",      # 07-04-2025
        "%d/%m/%Y",      # 07/04/2025
        "%Y-%m-%d",      # 2025-04-07
        "%d-%B-%Y",      # 07-April-2025
        "%d/%B/%Y",      # 08/April/2025
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        except:
            continue
    
    # If no format matches, return current date
    print(f"Warning: Could not parse date '{date_str}', using current date")
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")

def clean_string(value: str) -> str:
    """Clean and strip string values"""
    if not value:
        return ""
    return str(value).strip()

def clean_number(value: str) -> float:
    """Clean and convert to number"""
    if not value:
        return 0.0
    try:
        # Remove commas and spaces
        cleaned = str(value).replace(",", "").replace(" ", "").strip()
        return float(cleaned)
    except:
        return 0.0

def clean_int(value: str) -> int:
    """Clean and convert to integer"""
    if not value:
        return 0
    try:
        cleaned = str(value).replace(",", "").replace(" ", "").strip()
        return int(float(cleaned))  # Handle decimal strings
    except:
        return 0

def convert_purchase_data(data_rows: List[List[str]], headers: List[str]) -> Dict:
    """Convert purchase data rows to HisabKitab-Pro format"""
    
    # Create mapping from header names to indices
    header_map = {}
    for i, header in enumerate(headers):
        header_lower = header.lower().strip()
        if 'srno' in header_lower or 'serial' in header_lower:
            header_map['srno'] = i
        elif 'customer' in header_lower and 'name' in header_lower:
            header_map['supplier_name'] = i
        elif 'gst' in header_lower and 'number' in header_lower:
            header_map['gstin'] = i
        elif 'bill' in header_lower and 'no' in header_lower:
            header_map['invoice_number'] = i
        elif 'bill' in header_lower and 'date' in header_lower:
            header_map['invoice_date'] = i
        elif 'hsn' in header_lower and header_map.get('hsn_code') is None:
            header_map['hsn_code'] = i
        elif 'desc' in header_lower:
            header_map['description'] = i
        elif 'gst' in header_lower and '%' in header_lower:
            header_map['gst_rate'] = i
        elif 'qty' in header_lower or 'quantity' in header_lower:
            header_map['quantity'] = i
        elif 'unit' in header_lower:
            header_map['unit'] = i
        elif 'taxable' in header_lower and 'amt' in header_lower:
            header_map['taxable_amount'] = i
        elif 'sgst' in header_lower:
            header_map['sgst'] = i
        elif 'cgst' in header_lower:
            header_map['cgst'] = i
        elif 'igst' in header_lower:
            header_map['igst'] = i
        elif 'oth' in header_lower and 'amt' in header_lower:
            header_map['other_amount'] = i
        elif 'bill' in header_lower and 'amt' in header_lower:
            header_map['total_amount'] = i
    
    print(f"Header mapping: {header_map}")
    
    # Group purchases by invoice (supplier + invoice number + date)
    purchases_dict = {}
    suppliers_dict = {}
    purchase_id = 1
    
    for row in data_rows:
        if not row or len(row) < len(headers):
            continue
        
        try:
            # Extract data using header map
            supplier_name = clean_string(row[header_map.get('supplier_name', 0)])
            gstin = clean_string(row[header_map.get('gstin', 1)])
            invoice_number = clean_string(row[header_map.get('invoice_number', 2)])
            invoice_date = parse_date(row[header_map.get('invoice_date', 3)])
            hsn_code = clean_string(row[header_map.get('hsn_code', 4)]) or clean_string(row[header_map.get('description', 5)])
            description = clean_string(row[header_map.get('description', 5)) or hsn_code
            gst_rate = clean_number(row[header_map.get('gst_rate', 6)])
            quantity = clean_int(row[header_map.get('quantity', 7)])
            unit = clean_string(row[header_map.get('unit', 8)]) or "pcs"
            taxable_amount = clean_number(row[header_map.get('taxable_amount', 9)])
            sgst_amount = clean_number(row[header_map.get('sgst', 10)])
            cgst_amount = clean_number(row[header_map.get('cgst', 11)])
            igst_amount = clean_number(row[header_map.get('igst', 12)])
            other_amount = clean_number(row[header_map.get('other_amount', 13)])
            total_amount = clean_number(row[header_map.get('total_amount', 14)])
            
            # Skip if essential data is missing
            if not supplier_name or not invoice_number:
                print(f"Skipping row: Missing supplier name or invoice number")
                continue
            
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
            
            # Calculate unit price from taxable amount and quantity
            unit_price = taxable_amount / quantity if quantity > 0 else 0
            
            # Calculate tax rates from amounts
            cgst_rate = (cgst_amount / taxable_amount * 100) if taxable_amount > 0 else 0
            sgst_rate = (sgst_amount / taxable_amount * 100) if taxable_amount > 0 else 0
            igst_rate = (igst_amount / taxable_amount * 100) if taxable_amount > 0 else 0
            
            # If GST rate is provided, use it; otherwise calculate from tax amounts
            if gst_rate == 0:
                gst_rate = cgst_rate + sgst_rate + igst_rate
            
            # Create purchase item
            item = {
                "product_id": None,  # Will need to be mapped to actual products
                "product_name": description or "Unknown Product",
                "quantity": quantity,
                "unit_price": unit_price,
                "purchase_price": unit_price,
                "hsn_code": hsn_code,
                "gst_rate": gst_rate,
                "cgst_rate": cgst_rate if cgst_rate > 0 else None,
                "sgst_rate": sgst_rate if sgst_rate > 0 else None,
                "igst_rate": igst_rate if igst_rate > 0 else None,
                "tax_amount": cgst_amount + sgst_amount + igst_amount,
                "total": total_amount,
                "article": "",
                "barcode": ""
            }
            
            purchase["items"].append(item)
            purchase["subtotal"] += taxable_amount
            purchase["total_tax"] += (cgst_amount + sgst_amount + igst_amount)
            purchase["grand_total"] += total_amount
            
        except Exception as e:
            print(f"Error processing row: {e}")
            print(f"Row data: {row}")
            continue
    
    # Convert to lists
    suppliers = list(suppliers_dict.values())
    purchases = list(purchases_dict.values())
    
    return {
        "suppliers": suppliers,
        "purchases": purchases
    }

def create_backup_json(suppliers: List[Dict], purchases: List[Dict], company_id: int = 1) -> Dict:
    """Create HisabKitab-Pro backup JSON structure"""
    return {
        "version": "1.0.0",
        "export_date": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "export_by": "csv_converter",
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
    # Example data from user
    headers = [
        "SrNo",
        "Customer Name",
        "GST Number",
        "Bill No",
        "Bill Date",
        "HSN",
        "Desc",
        "GST%",
        "Qty",
        "UNIT",
        "Taxable Amt",
        "SGST",
        "CGST",
        "IGST",
        "Oth Amt",
        "Bill Amt"
    ]
    
    data_rows = [
        [
            "1",
            "V P TRADERS",
            "09ABPPA6876Q1ZN",
            "VPT/25-26/11",
            "07-Apr-2025",
            "6107",
            "61079110",
            "5.00",
            "60.00",
            "PCS",
            "15736.17",
            "393.41",
            "393.41",
            "0.00",
            "0.01",
            "16523.00"
        ],
        [
            "2",
            "Pragati Traders",
            "09ABDFP5746L1ZO",
            "2025-26/017",
            "08/Apr/2025",
            "6107",
            "61079110",
            "5.00",
            "50.00",
            "PCS",
            "4357.13",
            "108.93",
            "108.93",
            "0.00",
            "0.01",
            "4575.00"
        ]
    ]
    
    print("Converting purchase data...")
    print(f"Found {len(data_rows)} rows")
    
    # Convert data
    result = convert_purchase_data(data_rows, headers)
    
    print(f"\n✅ Conversion complete!")
    print(f"   Suppliers: {len(result['suppliers'])}")
    print(f"   Purchases: {len(result['purchases'])}")
    
    # Create backup JSON
    backup = create_backup_json(result['suppliers'], result['purchases'])
    
    # Save to file
    output_file = "purchase_migration.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(backup, f, indent=2, ensure_ascii=False)
    
    print(f"\n📁 Output saved to: {output_file}")
    print(f"\n📝 Summary:")
    for purchase in result['purchases']:
        print(f"   - {purchase['supplier_name']}: {purchase['invoice_number']} ({len(purchase['items'])} items, ₹{purchase['grand_total']:,.2f})")
    
    print(f"\n✅ Ready to import into HisabKitab-Pro!")
    print(f"   1. Open Backup & Restore page")
    print(f"   2. Click 'Import Data'")
    print(f"   3. Select: {output_file}")
    print(f"   4. Choose: Suppliers and Purchases")
    print(f"   5. Click 'Import'")

if __name__ == '__main__':
    main()




