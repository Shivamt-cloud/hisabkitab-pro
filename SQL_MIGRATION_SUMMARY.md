# SQL Migration Summary

## 📦 What We've Created

### 1. **SQL_MIGRATION_GUIDE.md** - Complete Guide
   - Step-by-step instructions
   - Table structure analysis
   - Field mapping reference
   - Troubleshooting tips

### 2. **SQL_MIGRATION_QUICK_START.md** - Quick Reference
   - Fast 5-step process
   - Common column mappings
   - Example commands

### 3. **scripts/sql-to-json-converter.py** - Conversion Tool
   - Converts CSV/SQLite to JSON
   - Automatic field mapping
   - Supports: products, customers, suppliers, categories

### 4. **scripts/analyze-sql-structure.py** - Analysis Tool
   - Analyzes SQL files/databases
   - Identifies tables and columns
   - Suggests mappings

---

## 🚀 How to Use

### Step 1: Analyze Your SQL File

```bash
# For SQL dump file
python scripts/analyze-sql-structure.py --input your_database.sql --type sql

# For SQLite database
python scripts/analyze-sql-structure.py --input your_database.db --type sqlite
```

**This will show:**
- All tables in your database
- Column names and types
- Suggested entity mappings

---

### Step 2: Export Data to CSV

Export each table you want to migrate:

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

---

### Step 3: Convert to JSON

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
```

---

### Step 4: Import into HisabKitab-Pro

1. Open **Backup & Restore** page
2. Click **"Import Data"**
3. Select your JSON file
4. Choose what to import
5. Click **"Import"**

---

## 📋 What Gets Mapped Automatically

The converter automatically maps common column names:

### Products
- `id`, `product_id`, `item_id` → `id`
- `name`, `product_name`, `item_name` → `name`
- `code`, `sku`, `product_code` → `sku`
- `price`, `selling_price`, `sale_price` → `selling_price`
- `cost`, `purchase_price`, `buy_price` → `purchase_price`
- `stock`, `quantity`, `qty` → `stock_quantity`

### Customers
- `id`, `customer_id` → `id`
- `name`, `customer_name` → `name`
- `email` → `email`
- `phone`, `mobile` → `phone`
- `gstin`, `gst_no` → `gstin`

### Suppliers
- Similar mapping as customers
- `is_registered`, `gst_registered` → `is_registered`

### Categories
- `id`, `category_id` → `id`
- `name`, `category_name` → `name`
- `parent_id` → `parent_id`

---

## ⚠️ Important Notes

1. **Test First**: Import a small sample (10-20 records) to verify
2. **Backup**: Always backup current data before importing
3. **Date Format**: Dates must be ISO format: `2025-01-15T10:30:00.000Z`
4. **IDs**: Must be unique integers
5. **Required Fields**: 
   - Products: `id`, `name`, `unit`
   - Customers: `id`, `name`
   - Suppliers: `id`, `name`

---

## 🆘 Need Custom Mapping?

If your SQL structure is different:

1. **Share your SQL file** or table structure
2. **We'll create a custom mapping** for you
3. **Or modify the scripts** to match your structure

---

## 📁 Files Created

```
inventory-system/
├── SQL_MIGRATION_GUIDE.md          # Complete guide
├── SQL_MIGRATION_QUICK_START.md    # Quick reference
├── SQL_MIGRATION_SUMMARY.md        # This file
└── scripts/
    ├── sql-to-json-converter.py    # Conversion tool
    └── analyze-sql-structure.py    # Analysis tool
```

---

## ✅ Next Steps

1. **Run the analysis script** on your SQL file
2. **Review the suggested mappings**
3. **Export your data to CSV**
4. **Convert to JSON** using the converter
5. **Import into HisabKitab-Pro**

---

**Ready to migrate? Start with the analysis script!** 🚀




