#!/usr/bin/env python3
"""
SQL to JSON Converter for HisabKitab-Pro Migration
Converts SQL database dumps or CSV exports to HisabKitab-Pro JSON format
"""

import json
import re
import csv
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
import sqlite3
import mysql.connector
from mysql.connector import Error
import argparse

# Field mappings from common SQL column names to HisabKitab-Pro format
FIELD_MAPPINGS = {
    'products': {
        'id': ['id', 'product_id', 'item_id', 'pid'],
        'name': ['name', 'product_name', 'item_name', 'title', 'product_title'],
        'sku': ['sku', 'code', 'product_code', 'item_code', 'product_sku'],
        'barcode': ['barcode', 'barcode_no', 'ean', 'barcode_number'],
        'category_id': ['category_id', 'cat_id', 'group_id', 'category'],
        'purchase_price': ['cost', 'purchase_price', 'buy_price', 'cp', 'cost_price'],
        'selling_price': ['price', 'selling_price', 'sale_price', 'sp', 'mrp', 'retail_price'],
        'stock_quantity': ['stock', 'quantity', 'qty', 'stock_qty', 'inventory', 'available_stock'],
        'min_stock_level': ['min_stock', 'reorder_level', 'alert_level', 'min_qty'],
        'hsn_code': ['hsn', 'hsn_code', 'hsn_no'],
        'gst_rate': ['gst', 'gst_rate', 'tax_rate', 'gst_percentage'],
        'unit': ['unit', 'uom', 'unit_of_measure'],
        'description': ['description', 'desc', 'details', 'product_description']
    },
    'customers': {
        'id': ['id', 'customer_id', 'client_id', 'cid'],
        'name': ['name', 'customer_name', 'client_name', 'company_name'],
        'email': ['email', 'email_id', 'email_address'],
        'phone': ['phone', 'phone_no', 'mobile', 'contact_no', 'phone_number'],
        'address': ['address', 'addr', 'full_address'],
        'city': ['city'],
        'state': ['state'],
        'pincode': ['pincode', 'pin_code', 'postal_code', 'zip'],
        'gstin': ['gstin', 'gst_no', 'gst_number'],
        'credit_limit': ['credit_limit', 'credit', 'max_credit']
    },
    'suppliers': {
        'id': ['id', 'supplier_id', 'vendor_id', 'sid'],
        'name': ['name', 'supplier_name', 'vendor_name'],
        'email': ['email', 'email_id', 'email_address'],
        'phone': ['phone', 'phone_no', 'mobile', 'contact_no'],
        'address': ['address', 'addr', 'full_address'],
        'city': ['city'],
        'state': ['state'],
        'pincode': ['pincode', 'pin_code', 'postal_code'],
        'gstin': ['gstin', 'gst_no', 'gst_number'],
        'is_registered': ['is_registered', 'gst_registered', 'registered']
    },
    'categories': {
        'id': ['id', 'category_id', 'cat_id'],
        'name': ['name', 'category_name', 'cat_name'],
        'description': ['description', 'desc'],
        'parent_id': ['parent_id', 'parent_category_id', 'parent_cat_id']
    }
}

def find_matching_field(sql_column: str, entity_type: str) -> Optional[str]:
    """Find matching HisabKitab-Pro field for SQL column name"""
    mappings = FIELD_MAPPINGS.get(entity_type, {})
    sql_lower = sql_column.lower().strip()
    
    for hk_field, possible_names in mappings.items():
        if sql_lower in [n.lower() for n in possible_names]:
            return hk_field
    
    return None

def convert_product(row: Dict, headers: List[str], company_id: int = 1) -> Dict:
    """Convert SQL product row to HisabKitab-Pro format"""
    product = {
        'id': int(row.get('id', 0)) or None,
        'name': str(row.get('name', '')).strip() or 'Unnamed Product',
        'sku': str(row.get('sku', '')).strip() or '',
        'barcode': str(row.get('barcode', '')).strip() or '',
        'category_id': int(row['category_id']) if row.get('category_id') else None,
        'description': str(row.get('description', '')).strip() or '',
        'unit': str(row.get('unit', 'pcs')).strip() or 'pcs',
        'purchase_price': float(row.get('purchase_price', 0)) or 0,
        'selling_price': float(row.get('selling_price', 0)) or 0,
        'stock_quantity': int(row.get('stock_quantity', 0)) or 0,
        'min_stock_level': int(row.get('min_stock_level', 0)) or 0,
        'hsn_code': str(row.get('hsn_code', '')).strip() or '',
        'gst_rate': float(row.get('gst_rate', 18)) or 18,
        'tax_type': 'exclusive',
        'cgst_rate': None,
        'sgst_rate': None,
        'igst_rate': None,
        'is_active': True,
        'status': 'active',
        'barcode_status': 'inactive',
        'company_id': company_id,
        'created_at': datetime.now().isoformat() + 'Z',
        'updated_at': datetime.now().isoformat() + 'Z'
    }
    
    # Map fields from SQL column names
    for header in headers:
        hk_field = find_matching_field(header, 'products')
        if hk_field and header in row:
            value = row[header]
            if hk_field in ['id', 'category_id', 'stock_quantity', 'min_stock_level']:
                try:
                    product[hk_field] = int(value) if value else None
                except:
                    pass
            elif hk_field in ['purchase_price', 'selling_price', 'gst_rate']:
                try:
                    product[hk_field] = float(value) if value else 0
                except:
                    pass
            else:
                product[hk_field] = str(value).strip() if value else ''
    
    return product

def convert_customer(row: Dict, headers: List[str], company_id: int = 1) -> Dict:
    """Convert SQL customer row to HisabKitab-Pro format"""
    customer = {
        'id': int(row.get('id', 0)) or None,
        'name': str(row.get('name', '')).strip() or 'Unnamed Customer',
        'email': str(row.get('email', '')).strip() or '',
        'phone': str(row.get('phone', '')).strip() or '',
        'gstin': str(row.get('gstin', '')).strip() or '',
        'address': str(row.get('address', '')).strip() or '',
        'city': str(row.get('city', '')).strip() or '',
        'state': str(row.get('state', '')).strip() or '',
        'pincode': str(row.get('pincode', '')).strip() or '',
        'contact_person': str(row.get('contact_person', '')).strip() or '',
        'credit_limit': float(row.get('credit_limit', 0)) or 0,
        'credit_balance': 0,
        'is_active': True,
        'company_id': company_id,
        'created_at': datetime.now().isoformat() + 'Z',
        'updated_at': datetime.now().isoformat() + 'Z'
    }
    
    # Map fields from SQL column names
    for header in headers:
        hk_field = find_matching_field(header, 'customers')
        if hk_field and header in row:
            value = row[header]
            if hk_field in ['id', 'credit_limit']:
                try:
                    customer[hk_field] = int(value) if value else (0 if hk_field == 'credit_limit' else None)
                except:
                    pass
            else:
                customer[hk_field] = str(value).strip() if value else ''
    
    return customer

def convert_supplier(row: Dict, headers: List[str], company_id: int = 1) -> Dict:
    """Convert SQL supplier row to HisabKitab-Pro format"""
    supplier = {
        'id': int(row.get('id', 0)) or None,
        'name': str(row.get('name', '')).strip() or 'Unnamed Supplier',
        'email': str(row.get('email', '')).strip() or '',
        'phone': str(row.get('phone', '')).strip() or '',
        'gstin': str(row.get('gstin', '')).strip() or '',
        'address': str(row.get('address', '')).strip() or '',
        'city': str(row.get('city', '')).strip() or '',
        'state': str(row.get('state', '')).strip() or '',
        'pincode': str(row.get('pincode', '')).strip() or '',
        'contact_person': str(row.get('contact_person', '')).strip() or '',
        'is_registered': bool(row.get('is_registered', False)),
        'company_id': company_id,
        'created_at': datetime.now().isoformat() + 'Z',
        'updated_at': datetime.now().isoformat() + 'Z'
    }
    
    # Map fields from SQL column names
    for header in headers:
        hk_field = find_matching_field(header, 'suppliers')
        if hk_field and header in row:
            value = row[header]
            if hk_field == 'id':
                try:
                    supplier[hk_field] = int(value) if value else None
                except:
                    pass
            elif hk_field == 'is_registered':
                supplier[hk_field] = bool(value) if value else False
            else:
                supplier[hk_field] = str(value).strip() if value else ''
    
    return supplier

def convert_category(row: Dict, headers: List[str], company_id: int = 1) -> Dict:
    """Convert SQL category row to HisabKitab-Pro format"""
    category = {
        'id': int(row.get('id', 0)) or None,
        'name': str(row.get('name', '')).strip() or 'Unnamed Category',
        'description': str(row.get('description', '')).strip() or '',
        'parent_id': int(row['parent_id']) if row.get('parent_id') else None,
        'is_subcategory': bool(row.get('parent_id')),
        'company_id': company_id,
        'created_at': datetime.now().isoformat() + 'Z',
        'updated_at': datetime.now().isoformat() + 'Z'
    }
    
    # Map fields from SQL column names
    for header in headers:
        hk_field = find_matching_field(header, 'categories')
        if hk_field and header in row:
            value = row[header]
            if hk_field in ['id', 'parent_id']:
                try:
                    category[hk_field] = int(value) if value else None
                except:
                    pass
            elif hk_field == 'is_subcategory':
                category[hk_field] = bool(value) if value else False
            else:
                category[hk_field] = str(value).strip() if value else ''
    
    return category

def read_csv_file(file_path: str) -> List[Dict]:
    """Read CSV file and return list of dictionaries"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data

def read_sqlite_db(db_path: str, table_name: str) -> List[Dict]:
    """Read data from SQLite database"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    data = []
    for row in rows:
        data.append(dict(row))
    
    conn.close()
    return data

def parse_sql_dump(file_path: str) -> Dict[str, List[Dict]]:
    """Parse SQL dump file and extract INSERT statements"""
    # This is a simplified parser - may need enhancement for complex SQL files
    data = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find INSERT statements
    insert_pattern = r'INSERT\s+INTO\s+`?(\w+)`?\s*\([^)]+\)\s*VALUES\s*\([^)]+\);'
    matches = re.finditer(insert_pattern, content, re.IGNORECASE | re.MULTILINE)
    
    for match in matches:
        table_name = match.group(1)
        # Extract values (simplified - may need more robust parsing)
        # This is a placeholder - full implementation would parse VALUES properly
    
    return data

def create_backup_json(
    products: List[Dict] = None,
    customers: List[Dict] = None,
    suppliers: List[Dict] = None,
    categories: List[Dict] = None,
    sales: List[Dict] = None,
    purchases: List[Dict] = None,
    company_id: int = 1
) -> Dict:
    """Create HisabKitab-Pro backup JSON structure"""
    return {
        'version': '1.0.0',
        'export_date': datetime.now().isoformat() + 'Z',
        'export_by': 'sql_migration',
        'data': {
            'companies': [],
            'users': [],
            'products': products or [],
            'categories': categories or [],
            'sales': sales or [],
            'purchases': purchases or [],
            'suppliers': suppliers or [],
            'customers': customers or [],
            'sales_persons': [],
            'category_commissions': [],
            'sub_categories': [],
            'sales_person_category_assignments': [],
            'stock_adjustments': [],
            'settings': {}
        }
    }

def main():
    parser = argparse.ArgumentParser(description='Convert SQL database to HisabKitab-Pro JSON format')
    parser.add_argument('--input', '-i', required=True, help='Input file (CSV, SQL, or SQLite DB)')
    parser.add_argument('--type', '-t', choices=['csv', 'sql', 'sqlite'], required=True, help='Input file type')
    parser.add_argument('--table', help='Table name (for SQLite)')
    parser.add_argument('--entity', '-e', choices=['products', 'customers', 'suppliers', 'categories'], required=True, help='Entity type')
    parser.add_argument('--output', '-o', default='migration_output.json', help='Output JSON file')
    parser.add_argument('--company-id', type=int, default=1, help='Company ID for imported data')
    
    args = parser.parse_args()
    
    # Read data based on input type
    if args.type == 'csv':
        data = read_csv_file(args.input)
    elif args.type == 'sqlite':
        if not args.table:
            print("Error: --table required for SQLite input")
            sys.exit(1)
        data = read_sqlite_db(args.input, args.table)
    else:
        print("SQL dump parsing not fully implemented yet. Please export to CSV first.")
        sys.exit(1)
    
    # Convert data
    converted = []
    headers = list(data[0].keys()) if data else []
    
    for row in data:
        if args.entity == 'products':
            converted.append(convert_product(row, headers, args.company_id))
        elif args.entity == 'customers':
            converted.append(convert_customer(row, headers, args.company_id))
        elif args.entity == 'suppliers':
            converted.append(convert_supplier(row, headers, args.company_id))
        elif args.entity == 'categories':
            converted.append(convert_category(row, headers, args.company_id))
    
    # Create backup JSON
    backup = create_backup_json(
        products=converted if args.entity == 'products' else None,
        customers=converted if args.entity == 'customers' else None,
        suppliers=converted if args.entity == 'suppliers' else None,
        categories=converted if args.entity == 'categories' else None,
        company_id=args.company_id
    )
    
    # Write output
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(backup, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Conversion complete!")
    print(f"   Converted {len(converted)} {args.entity}")
    print(f"   Output file: {args.output}")
    print(f"\n📝 Next steps:")
    print(f"   1. Review the JSON file: {args.output}")
    print(f"   2. Import into HisabKitab-Pro (Backup & Restore page)")
    print(f"   3. Verify imported data")

if __name__ == '__main__':
    main()




