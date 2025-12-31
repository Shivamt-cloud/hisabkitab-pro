#!/usr/bin/env python3
"""
SQL Structure Analyzer
Analyzes SQL files or databases to identify tables and columns for migration mapping
"""

import re
import sys
import sqlite3
import argparse
from typing import Dict, List, Set

def analyze_sql_file(file_path: str) -> Dict[str, List[str]]:
    """Analyze SQL dump file to extract table structures"""
    tables = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find CREATE TABLE statements
    create_table_pattern = r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\((.*?)\);'
    matches = re.finditer(create_table_pattern, content, re.IGNORECASE | re.MULTILINE | re.DOTALL)
    
    for match in matches:
        table_name = match.group(1)
        table_def = match.group(2)
        
        # Extract column definitions
        columns = []
        # Match column definitions (simplified)
        column_pattern = r'`?(\w+)`?\s+(\w+(?:\([^)]+\))?)'
        col_matches = re.finditer(column_pattern, table_def, re.IGNORECASE)
        
        for col_match in col_matches:
            col_name = col_match.group(1)
            col_type = col_match.group(2)
            columns.append(f"{col_name} ({col_type})")
        
        tables[table_name] = columns
    
    return tables

def analyze_sqlite_db(db_path: str) -> Dict[str, List[str]]:
    """Analyze SQLite database to extract table structures"""
    tables = {}
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    table_names = [row[0] for row in cursor.fetchall()]
    
    for table_name in table_names:
        # Get column information
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = []
        for row in cursor.fetchall():
            col_name = row[1]
            col_type = row[2]
            columns.append(f"{col_name} ({col_type})")
        tables[table_name] = columns
    
    conn.close()
    return tables

def suggest_mapping(table_name: str, columns: List[str]) -> Dict[str, str]:
    """Suggest mapping from SQL table to HisabKitab-Pro entity"""
    table_lower = table_name.lower()
    suggestions = {}
    
    # Identify entity type
    if any(word in table_lower for word in ['product', 'item', 'inventory', 'stock']):
        entity_type = 'products'
    elif any(word in table_lower for word in ['customer', 'client', 'buyer']):
        entity_type = 'customers'
    elif any(word in table_lower for word in ['supplier', 'vendor', 'seller']):
        entity_type = 'suppliers'
    elif any(word in table_lower for word in ['categor', 'group', 'type']):
        entity_type = 'categories'
    elif any(word in table_lower for word in ['sale', 'invoice', 'bill', 'transaction']):
        entity_type = 'sales'
    elif any(word in table_lower for word in ['purchase', 'po', 'buy']):
        entity_type = 'purchases'
    else:
        entity_type = 'unknown'
    
    # Map columns
    column_mappings = {
        'products': {
            'id': ['id', 'product_id', 'item_id'],
            'name': ['name', 'product_name', 'item_name'],
            'sku': ['sku', 'code', 'product_code'],
            'price': ['price', 'selling_price', 'sale_price'],
            'cost': ['cost', 'purchase_price', 'buy_price'],
            'stock': ['stock', 'quantity', 'qty']
        },
        'customers': {
            'id': ['id', 'customer_id'],
            'name': ['name', 'customer_name'],
            'email': ['email'],
            'phone': ['phone', 'mobile']
        }
    }
    
    return {
        'entity_type': entity_type,
        'table_name': table_name,
        'columns': columns
    }

def print_analysis(tables: Dict[str, List[str]]):
    """Print analysis results"""
    print("\n" + "="*80)
    print("SQL DATABASE STRUCTURE ANALYSIS")
    print("="*80)
    
    print(f"\n📊 Found {len(tables)} table(s):\n")
    
    for table_name, columns in tables.items():
        print(f"📋 Table: {table_name}")
        print(f"   Columns ({len(columns)}):")
        for col in columns[:10]:  # Show first 10 columns
            print(f"      - {col}")
        if len(columns) > 10:
            print(f"      ... and {len(columns) - 10} more columns")
        print()
    
    print("\n" + "="*80)
    print("MIGRATION SUGGESTIONS")
    print("="*80)
    
    for table_name, columns in tables.items():
        suggestion = suggest_mapping(table_name, columns)
        print(f"\n📌 {table_name}")
        print(f"   Suggested Entity Type: {suggestion['entity_type']}")
        print(f"   Columns to map: {len(columns)}")
        print()

def main():
    parser = argparse.ArgumentParser(description='Analyze SQL database structure for migration')
    parser.add_argument('--input', '-i', required=True, help='Input file (SQL dump or SQLite DB)')
    parser.add_argument('--type', '-t', choices=['sql', 'sqlite'], required=True, help='Input file type')
    parser.add_argument('--output', '-o', help='Output analysis file (optional)')
    
    args = parser.parse_args()
    
    try:
        if args.type == 'sql':
            tables = analyze_sql_file(args.input)
        else:
            tables = analyze_sqlite_db(args.input)
        
        print_analysis(tables)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write("SQL Database Analysis\n")
                f.write("="*80 + "\n\n")
                for table_name, columns in tables.items():
                    f.write(f"Table: {table_name}\n")
                    f.write(f"Columns: {len(columns)}\n")
                    for col in columns:
                        f.write(f"  - {col}\n")
                    f.write("\n")
            print(f"\n✅ Analysis saved to: {args.output}")
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()



