# SQL Database Migration Guide

**How to migrate data from a SQL database (MySQL, PostgreSQL, SQLite) to HisabKitab-Pro**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Step 1: Analyze Your SQL File](#step-1-analyze-your-sql-file)
3. [Step 2: Understand Table Structure](#step-2-understand-table-structure)
4. [Step 3: Map SQL Tables to HisabKitab-Pro Format](#step-3-map-sql-tables-to-hisabkitab-pro-format)
5. [Step 4: Convert SQL to JSON](#step-4-convert-sql-to-json)
6. [Step 5: Import into HisabKitab-Pro](#step-5-import-into-hisabkitab-pro)
7. [Common SQL Table Mappings](#common-sql-table-mappings)
8. [Troubleshooting](#troubleshooting)

---

## 1. Overview

### What You Need

1. **SQL Database File** (`.sql`, `.db`, `.sqlite`, or database dump)
2. **Database Access** (if connecting directly)
3. **Conversion Script** (Python/Node.js) - We'll provide this
4. **HisabKitab-Pro** application

### Supported SQL Formats

- ✅ MySQL/MariaDB (`.sql` dump files)
- ✅ PostgreSQL (`.sql` dump files)
- ✅ SQLite (`.db`, `.sqlite` files)
- ✅ CSV exports from SQL databases

---

## 2. Step 1: Analyze Your SQL File

### Option A: If You Have a SQL Dump File

1. **Open the SQL file** in a text editor
2. **Look for table structures** (CREATE TABLE statements)
3. **Identify key tables:**
   - Products/Items table
   - Customers table
   - Suppliers table
   - Sales/Invoices table
   - Purchases table
   - Categories table

### Option B: If You Have Database Access

1. **Connect to your database**
2. **List all tables:**
   ```sql
   -- MySQL
   SHOW TABLES;
   
   -- PostgreSQL
   \dt
   
   -- SQLite
   .tables
   ```

3. **Examine table structure:**
   ```sql
   -- MySQL
   DESCRIBE table_name;
   
   -- PostgreSQL
   \d table_name
   
   -- SQLite
   .schema table_name
   ```

### Option C: Use Our Analysis Script

We'll create a script that automatically analyzes your SQL file and identifies tables and columns.

---

## 3. Step 2: Understand Table Structure

### Common Table Names in Inventory Systems

| Common Name | Possible Variations | Maps To |
|------------|-------------------|---------|
| Products | `items`, `products`, `inventory`, `stock` | `products` |
| Customers | `customers`, `clients`, `buyers` | `customers` |
| Suppliers | `suppliers`, `vendors`, `sellers` | `suppliers` |
| Sales | `sales`, `invoices`, `bills`, `transactions` | `sales` |
| Purchases | `purchases`, `purchase_orders`, `po` | `purchases` |
| Categories | `categories`, `groups`, `types` | `categories` |

### Common Column Names

**Products Table:**
- `id`, `product_id`, `item_id`
- `name`, `product_name`, `item_name`
- `sku`, `code`, `product_code`
- `price`, `selling_price`, `sale_price`
- `cost`, `purchase_price`, `buy_price`
- `stock`, `quantity`, `qty`, `stock_qty`
- `category_id`, `cat_id`, `group_id`

**Sales Table:**
- `id`, `invoice_id`, `sale_id`
- `invoice_number`, `invoice_no`, `bill_no`
- `date`, `sale_date`, `invoice_date`
- `customer_id`, `client_id`
- `total`, `grand_total`, `amount`
- `items` (usually in separate `sale_items` table)

---

## 4. Step 3: Map SQL Tables to HisabKitab-Pro Format

### Example Mapping

**Your SQL Structure:**
```sql
CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  code VARCHAR(50),
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  stock INT,
  category_id INT
);
```

**Maps to HisabKitab-Pro:**
```json
{
  "id": 1,
  "name": "Product Name",
  "sku": "code_value",
  "selling_price": price,
  "purchase_price": cost,
  "stock_quantity": stock,
  "category_id": category_id,
  "unit": "pcs",
  "is_active": true,
  "status": "active"
}
```

### Field Mapping Reference

| HisabKitab-Pro Field | Common SQL Column Names | Data Type |
|---------------------|------------------------|-----------|
| `id` | `id`, `product_id`, `item_id` | Integer |
| `name` | `name`, `product_name`, `item_name`, `title` | String |
| `sku` | `sku`, `code`, `product_code`, `item_code` | String |
| `barcode` | `barcode`, `barcode_no`, `ean` | String |
| `category_id` | `category_id`, `cat_id`, `group_id` | Integer |
| `purchase_price` | `cost`, `purchase_price`, `buy_price`, `cp` | Decimal |
| `selling_price` | `price`, `selling_price`, `sale_price`, `sp`, `mrp` | Decimal |
| `stock_quantity` | `stock`, `quantity`, `qty`, `stock_qty`, `inventory` | Integer |
| `min_stock_level` | `min_stock`, `reorder_level`, `alert_level` | Integer |
| `hsn_code` | `hsn`, `hsn_code`, `hsn_no` | String |
| `gst_rate` | `gst`, `gst_rate`, `tax_rate` | Decimal |
| `unit` | `unit`, `uom`, `unit_of_measure` | String |

---

## 5. Step 4: Convert SQL to JSON

### Method 1: Using Python Script (Recommended)

We'll provide a Python script that:
1. Reads your SQL file
2. Parses table structures
3. Extracts data
4. Maps to HisabKitab-Pro format
5. Generates JSON file

### Method 2: Export to CSV First

1. **Export each table to CSV:**
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

2. **Use CSV to JSON converter** (we'll provide script)

### Method 3: Direct Database Connection

If you have database credentials, we can create a script that connects directly and exports data.

---

## 6. Step 5: Import into HisabKitab-Pro

1. **Open HisabKitab-Pro**
2. **Navigate to:** Backup & Restore page
3. **Click:** "Import Data" or "Restore from File"
4. **Select:** Your converted JSON file
5. **Choose import options:**
   - ✅ Import Products
   - ✅ Import Customers
   - ✅ Import Suppliers
   - ✅ Import Sales (optional)
   - ✅ Import Purchases (optional)
6. **Click:** "Import"
7. **Verify:** Check imported data

---

## 7. Common SQL Table Mappings

### Products/Items Table

**Common SQL Structure:**
```sql
CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  code VARCHAR(50),
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  stock INT,
  category_id INT,
  hsn VARCHAR(20),
  gst DECIMAL(5,2)
);
```

**HisabKitab-Pro JSON:**
```json
{
  "id": 1,
  "name": "Product Name",
  "sku": "code_value",
  "selling_price": 100.00,
  "purchase_price": 80.00,
  "stock_quantity": 50,
  "category_id": 1,
  "hsn_code": "8517",
  "gst_rate": 18,
  "unit": "pcs",
  "is_active": true,
  "status": "active",
  "company_id": 1,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

### Customers Table

**Common SQL Structure:**
```sql
CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  gstin VARCHAR(20)
);
```

**HisabKitab-Pro JSON:**
```json
{
  "id": 1,
  "name": "Customer Name",
  "email": "customer@email.com",
  "phone": "+91-1234567890",
  "address": "Full Address",
  "gstin": "27AAAAA0000A1Z5",
  "is_active": true,
  "company_id": 1,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

### Sales/Invoices Table

**Common SQL Structure:**
```sql
CREATE TABLE sales (
  id INT PRIMARY KEY,
  invoice_no VARCHAR(50),
  date DATE,
  customer_id INT,
  total DECIMAL(10,2),
  tax DECIMAL(10,2),
  grand_total DECIMAL(10,2)
);

CREATE TABLE sale_items (
  id INT PRIMARY KEY,
  sale_id INT,
  product_id INT,
  quantity INT,
  price DECIMAL(10,2),
  total DECIMAL(10,2)
);
```

**HisabKitab-Pro JSON:**
```json
{
  "id": 1,
  "invoice_number": "INV-001",
  "sale_date": "2025-01-15T10:30:00.000Z",
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 100.00,
      "total": 200.00,
      "sale_type": "sale"
    }
  ],
  "subtotal": 200.00,
  "tax_amount": 36.00,
  "grand_total": 236.00,
  "payment_status": "paid",
  "payment_method": "cash",
  "company_id": 1,
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

---

## 8. Troubleshooting

### Issue: SQL File Too Large

**Solution:**
- Split into smaller files by table
- Use streaming parser
- Export only necessary tables

### Issue: Date Format Mismatch

**Solution:**
- Convert dates to ISO format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2025-01-15T10:30:00.000Z`

### Issue: Missing Required Fields

**Solution:**
- Add default values in conversion script
- Map similar fields
- Use placeholder values

### Issue: Foreign Key Relationships

**Solution:**
- Import in order: Categories → Products → Customers/Suppliers → Purchases → Sales
- Map old IDs to new IDs during conversion
- Handle missing references gracefully

---

## 9. Next Steps

1. **Share your SQL file** (or table structure)
2. **We'll analyze it** and create a custom mapping
3. **We'll provide conversion script** tailored to your structure
4. **Test with sample data** first
5. **Import full dataset**

---

## 10. Quick Start

1. **Identify your SQL file location**
2. **Note down table names** you want to migrate
3. **Share the information** and we'll create a custom converter
4. **Run the converter** to generate JSON
5. **Import into HisabKitab-Pro**

---

**Ready to start? Share your SQL file or table structure, and we'll create a custom migration script for you!** 🚀



