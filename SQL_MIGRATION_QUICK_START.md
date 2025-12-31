# SQL Migration Quick Start Guide

**Quick guide to migrate your SQL database to HisabKitab-Pro**

---

## 🚀 Quick Steps

### Step 1: Analyze Your SQL File

```bash
# If you have a SQL dump file
python scripts/analyze-sql-structure.py --input your_database.sql --type sql

# If you have a SQLite database
python scripts/analyze-sql-structure.py --input your_database.db --type sqlite
```

This will show you:
- All tables in your database
- Column names and types
- Suggested mappings to HisabKitab-Pro

---

### Step 2: Export Your Data to CSV

**Option A: Export from Database**

```sql
-- MySQL
SELECT * FROM products INTO OUTFILE 'products.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '"';

-- PostgreSQL
\copy products TO 'products.csv' CSV HEADER;

-- SQLite
.mode csv
.output products.csv
SELECT * FROM products;
```

**Option B: Use Database Tool**
- phpMyAdmin, DBeaver, or any SQL client
- Export each table to CSV

---

### Step 3: Convert CSV to JSON

```bash
# Convert products
python scripts/sql-to-json-converter.py \
  --input products.csv \
  --type csv \
  --entity products \
  --output products.json \
  --company-id 1

# Convert customers
python scripts/sql-to-json-converter.py \
  --input customers.csv \
  --type csv \
  --entity customers \
  --output customers.json \
  --company-id 1

# Convert suppliers
python scripts/sql-to-json-converter.py \
  --input suppliers.csv \
  --type csv \
  --entity suppliers \
  --output suppliers.json \
  --company-id 1

# Convert categories
python scripts/sql-to-json-converter.py \
  --input categories.csv \
  --type csv \
  --entity categories \
  --output categories.json \
  --company-id 1
```

---

### Step 4: Combine JSON Files (Optional)

If you have multiple JSON files, you can combine them:

```python
import json

# Load all JSON files
with open('products.json') as f:
    products_data = json.load(f)

with open('customers.json') as f:
    customers_data = json.load(f)

# Combine
combined = {
    "version": "1.0.0",
    "export_date": products_data['export_date'],
    "data": {
        "products": products_data['data']['products'],
        "customers": customers_data['data']['customers'],
        "suppliers": customers_data['data'].get('suppliers', []),
        "categories": products_data['data'].get('categories', []),
        "sales": [],
        "purchases": [],
        "sales_persons": [],
        "category_commissions": [],
        "sub_categories": [],
        "sales_person_category_assignments": [],
        "stock_adjustments": [],
        "settings": {}
    }
}

# Save
with open('combined_migration.json', 'w') as f:
    json.dump(combined, f, indent=2)
```

---

### Step 5: Import into HisabKitab-Pro

1. Open HisabKitab-Pro
2. Go to **Backup & Restore** page
3. Click **"Import Data"** or **"Restore from File"**
4. Select your JSON file
5. Choose what to import:
   - ✅ Products
   - ✅ Customers
   - ✅ Suppliers
   - ✅ Categories
6. Click **"Import"**
7. Verify imported data

---

## 📋 Common Column Mappings

### Products Table

| Your Column | Maps To | Example |
|------------|---------|---------|
| `id` | `id` | 1 |
| `name` or `product_name` | `name` | "Samsung Phone" |
| `code` or `sku` | `sku` | "SAM-001" |
| `price` or `selling_price` | `selling_price` | 50000 |
| `cost` or `purchase_price` | `purchase_price` | 40000 |
| `stock` or `quantity` | `stock_quantity` | 50 |
| `category_id` | `category_id` | 1 |

### Customers Table

| Your Column | Maps To | Example |
|------------|---------|---------|
| `id` | `id` | 1 |
| `name` or `customer_name` | `name` | "ABC Traders" |
| `email` | `email` | "abc@email.com" |
| `phone` or `mobile` | `phone` | "+91-1234567890" |
| `address` | `address` | "123 Street" |
| `gstin` | `gstin` | "27AAAAA0000A1Z5" |

---

## ⚠️ Important Notes

1. **Date Format**: All dates must be in ISO format: `2025-01-15T10:30:00.000Z`
2. **IDs**: Must be unique integers
3. **Required Fields**: 
   - Products: `id`, `name`, `unit`
   - Customers: `id`, `name`
   - Suppliers: `id`, `name`
4. **Test First**: Import a small sample (10-20 records) first to verify mapping
5. **Backup**: Always backup your current data before importing

---

## 🆘 Need Help?

1. **Share your SQL file structure** - We'll create a custom mapping
2. **Share sample data** - We'll verify the conversion
3. **Check the full guide**: See `SQL_MIGRATION_GUIDE.md` for detailed instructions

---

## 📝 Example Workflow

```bash
# 1. Analyze structure
python scripts/analyze-sql-structure.py -i database.sql -t sql

# 2. Export to CSV (using database tool or SQL commands)

# 3. Convert each table
python scripts/sql-to-json-converter.py -i products.csv -t csv -e products -o products.json
python scripts/sql-to-json-converter.py -i customers.csv -t csv -e customers -o customers.json

# 4. Combine JSON files (if needed)

# 5. Import into HisabKitab-Pro
```

---

**Ready to start? Run the analysis script first to see your database structure!** 🚀



