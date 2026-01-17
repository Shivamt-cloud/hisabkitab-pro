# Data Migration Guide - Importing from Other Software

**How to migrate data from another inventory/billing software to HisabKitab-Pro**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Required File Format](#required-file-format)
3. [Data Structure Details](#data-structure-details)
4. [Step-by-Step Migration Process](#step-by-step-migration-process)
5. [Field Mapping Guide](#field-mapping-guide)
6. [Sample JSON Template](#sample-json-template)
7. [Common Migration Scenarios](#common-migration-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## 1. Overview

### What You Need

To import data from another software, you need to:
1. **Export data** from your current software (usually CSV or Excel)
2. **Convert to JSON format** matching HisabKitab-Pro structure
3. **Import** into HisabKitab-Pro using Backup & Restore feature

### Supported Format

- **File Type:** JSON (JavaScript Object Notation)
- **Encoding:** UTF-8
- **Structure:** Must match HisabKitab-Pro backup format

---

## 2. Required File Format

### Basic Structure

```json
{
  "version": "1.0.0",
  "export_date": "2025-01-15T10:30:00.000Z",
  "export_by": "user_id_or_email",
  "data": {
    "companies": [],
    "users": [],
    "products": [],
    "categories": [],
    "sales": [],
    "purchases": [],
    "suppliers": [],
    "customers": [],
    "sales_persons": [],
    "category_commissions": [],
    "sub_categories": [],
    "sales_person_category_assignments": [],
    "stock_adjustments": [],
    "settings": {}
  }
}
```

### Required Fields

- ✅ `version` - Must be "1.0.0"
- ✅ `export_date` - ISO date string
- ✅ `data` - Object containing all data arrays

### Optional Fields

- `export_by` - User ID or email who exported
- Individual data arrays can be empty `[]` if you don't have that data

---

## 3. Data Structure Details

### 3.1 Companies

```json
{
  "companies": [
    {
      "id": 1,
      "name": "My Company",
      "unique_code": "COMP001",
      "email": "contact@company.com",
      "phone": "+91-1234567890",
      "address": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "gstin": "27AAAAA0000A1Z5",
      "pan": "AAAAA0000A",
      "website": "https://company.com",
      "valid_from": "2025-01-01",
      "valid_to": "2025-12-31",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique number
- `name` - Company name
- `unique_code` - Unique identifier (e.g., "COMP001")

**Optional Fields:**
- All other fields can be empty strings or omitted

---

### 3.2 Users

```json
{
  "users": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@company.com",
      "password": "hashed_password_or_plain_text",
      "role": "admin",
      "company_id": 1,
      "user_code": "USR001",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique string ID
- `name` - User's full name
- `email` - Unique email address
- `password` - Hashed or plain text (will be hashed on import)
- `role` - One of: "admin", "manager", "staff", "viewer"

**Optional Fields:**
- `company_id` - Number (links user to company)
- `user_code` - User code/ID

---

### 3.3 Categories

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Electronics",
      "description": "Electronic products",
      "parent_id": null,
      "is_subcategory": false,
      "company_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Mobile Phones",
      "description": "Mobile phones and accessories",
      "parent_id": 1,
      "is_subcategory": true,
      "company_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique number
- `name` - Category name

**Optional Fields:**
- `description` - Category description
- `parent_id` - Parent category ID (for subcategories)
- `is_subcategory` - Boolean (true if subcategory)
- `company_id` - Company ID

---

### 3.4 Products

```json
{
  "products": [
    {
      "id": 1,
      "name": "Samsung Galaxy S21",
      "sku": "SAM-GAL-S21",
      "barcode": "1234567890123",
      "category_id": 2,
      "description": "Latest Samsung smartphone",
      "unit": "pcs",
      "purchase_price": 50000,
      "selling_price": 55000,
      "stock_quantity": 10,
      "min_stock_level": 5,
      "hsn_code": "8517",
      "gst_rate": 18,
      "tax_type": "exclusive",
      "cgst_rate": 9,
      "sgst_rate": 9,
      "igst_rate": 18,
      "is_active": true,
      "status": "active",
      "barcode_status": "active",
      "company_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique number
- `name` - Product name
- `unit` - Unit of measurement (e.g., "pcs", "kg", "liters")

**Optional Fields:**
- `sku` - Stock Keeping Unit
- `barcode` - Barcode number
- `category_id` - Category ID
- `description` - Product description
- `purchase_price` - Purchase price
- `selling_price` - Selling price
- `stock_quantity` - Current stock
- `min_stock_level` - Minimum stock alert level
- `hsn_code` - HSN code for GST
- `gst_rate` - GST rate (0-100)
- `tax_type` - "exclusive" or "inclusive"
- `is_active` - Boolean
- `status` - "active" or "archived"
- `company_id` - Company ID

---

### 3.5 Customers

```json
{
  "customers": [
    {
      "id": 1,
      "name": "ABC Traders",
      "email": "contact@abctraders.com",
      "phone": "+91-9876543210",
      "gstin": "27AAAAA0000A1Z5",
      "address": "456 Business Street",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "contact_person": "Mr. XYZ",
      "credit_limit": 100000,
      "is_active": true,
      "company_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique number
- `name` - Customer name

**Optional Fields:**
- `email` - Email address
- `phone` - Phone number
- `gstin` - GSTIN number
- `address` - Full address
- `city` - City name
- `state` - State name
- `pincode` - PIN code
- `contact_person` - Contact person name
- `credit_limit` - Credit limit amount
- `is_active` - Boolean
- `company_id` - Company ID

---

### 3.6 Suppliers

```json
{
  "suppliers": [
    {
      "id": 1,
      "name": "XYZ Suppliers",
      "email": "contact@xyzsuppliers.com",
      "phone": "+91-9876543210",
      "gstin": "27AAAAA0000A1Z5",
      "address": "789 Supplier Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "contact_person": "Mr. ABC",
      "is_registered": true,
      "company_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique number
- `name` - Supplier name

**Optional Fields:**
- Same as customers (email, phone, gstin, address, etc.)
- `is_registered` - Boolean (GST registered or not)
- `company_id` - Company ID

---

### 3.7 Sales

```json
{
  "sales": [
    {
      "id": 1,
      "invoice_number": "INV-2025-0001",
      "customer_id": 1,
      "customer_name": "ABC Traders",
      "sales_person_id": 1,
      "sales_person_name": "John Sales",
      "sale_date": "2025-01-15T10:30:00.000Z",
      "items": [
        {
          "product_id": 1,
          "product_name": "Samsung Galaxy S21",
          "barcode": "1234567890123",
          "quantity": 2,
          "unit_price": 55000,
          "purchase_price": 50000,
          "sale_type": "sale",
          "mrp": 60000,
          "discount": 5000,
          "discount_percentage": 8.33,
          "total": 110000,
          "purchase_id": 1,
          "purchase_item_id": 1,
          "purchase_item_article": "ART001",
          "purchase_item_barcode": "1234567890123"
        }
      ],
      "subtotal": 110000,
      "tax_amount": 19800,
      "grand_total": 129800,
      "payment_status": "paid",
      "payment_method": "cash",
      "payment_methods": [
        {
          "method": "cash",
          "amount": 129800
        }
      ],
      "company_id": 1,
      "created_by": 1,
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique number
- `sale_date` - ISO date string
- `items` - Array of sale items
- `grand_total` - Total amount

**Optional Fields:**
- `invoice_number` - Invoice number
- `customer_id` - Customer ID
- `customer_name` - Customer name
- `sales_person_id` - Sales person ID
- `items[].product_id` - Product ID
- `items[].quantity` - Quantity sold
- `items[].unit_price` - Unit price
- `payment_status` - "paid", "pending", "partial"
- `payment_method` - "cash", "card", "upi", "other"
- `company_id` - Company ID

---

### 3.8 Purchases

```json
{
  "purchases": [
    {
      "id": 1,
      "type": "gst",
      "supplier_id": 1,
      "supplier_name": "XYZ Suppliers",
      "invoice_number": "PUR-2025-0001",
      "purchase_date": "2025-01-10T10:30:00.000Z",
      "items": [
        {
          "product_id": 1,
          "product_name": "Samsung Galaxy S21",
          "quantity": 10,
          "unit_price": 50000,
          "purchase_price": 50000,
          "hsn_code": "8517",
          "gst_rate": 18,
          "cgst_rate": 9,
          "sgst_rate": 9,
          "igst_rate": 18,
          "tax_amount": 90000,
          "total": 590000,
          "article": "ART001",
          "barcode": "1234567890123"
        }
      ],
      "subtotal": 500000,
      "total_tax": 90000,
      "grand_total": 590000,
      "payment_status": "pending",
      "payment_method": "cash",
      "notes": "Bulk purchase",
      "company_id": 1,
      "created_by": 1,
      "created_at": "2025-01-10T10:30:00.000Z",
      "updated_at": "2025-01-10T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` - Unique number
- `type` - "gst" or "simple"
- `purchase_date` - ISO date string
- `items` - Array of purchase items
- `grand_total` or `total_amount` - Total amount

**For GST Purchase:**
- `subtotal` - Subtotal before tax
- `total_tax` - Total tax amount
- `grand_total` - Grand total

**For Simple Purchase:**
- `total_amount` - Total amount

**Optional Fields:**
- `supplier_id` - Supplier ID
- `invoice_number` - Invoice number
- `items[].product_id` - Product ID
- `items[].quantity` - Quantity
- `items[].purchase_price` - Purchase price
- `payment_status` - "paid", "pending", "partial"
- `company_id` - Company ID

---

## 4. Step-by-Step Migration Process

### Step 1: Export from Your Current Software

1. **Export data** from your current software
   - Usually: File → Export → CSV or Excel
   - Export: Products, Customers, Suppliers, Sales, Purchases

2. **Save files** in a folder
   - Example: `migration_data/`

### Step 2: Convert to JSON Format

#### Option A: Manual Conversion (Small Data)

1. Open CSV/Excel files
2. Create JSON file following the structure above
3. Manually map fields

#### Option B: Script Conversion (Large Data)

1. Use a script (Python, Node.js) to convert CSV to JSON
2. Map fields according to field mapping guide below
3. Generate JSON file

#### Option C: Use Online Converter

1. Use CSV to JSON converter
2. Adjust structure manually
3. Add required wrapper fields

### Step 3: Prepare JSON File

1. **Create main structure:**
   ```json
   {
     "version": "1.0.0",
     "export_date": "2025-01-15T10:30:00.000Z",
     "data": {
       "companies": [],
       "users": [],
       "products": [],
       ...
     }
   }
   ```

2. **Fill in data arrays:**
   - Add your exported data to respective arrays
   - Ensure all required fields are present

3. **Validate JSON:**
   - Use JSON validator (jsonlint.com)
   - Fix any syntax errors

### Step 4: Import into HisabKitab-Pro

1. **Open HisabKitab-Pro**
2. **Navigate to:** Backup & Restore page
3. **Click:** "Import Data" or "Restore from File"
4. **Select:** Your JSON file
5. **Choose import options:**
   - ✅ Import Products
   - ✅ Import Customers
   - ✅ Import Suppliers
   - ✅ Import Sales (optional)
   - ✅ Import Purchases (optional)
   - ✅ Merge with existing data (or replace)
6. **Click:** "Import" or "Restore"
7. **Wait:** For import to complete
8. **Verify:** Check imported data

---

## 5. Field Mapping Guide

### Common Field Mappings

| Your Software | HisabKitab-Pro | Notes |
|--------------|----------------|-------|
| Item Name | `products[].name` | Product name |
| Item Code | `products[].sku` | SKU code |
| Barcode | `products[].barcode` | Barcode number |
| Category | `products[].category_id` | Need to map to category ID |
| Purchase Price | `products[].purchase_price` | Buying price |
| Selling Price | `products[].selling_price` | Selling price |
| Stock Qty | `products[].stock_quantity` | Current stock |
| Min Stock | `products[].min_stock_level` | Alert level |
| HSN Code | `products[].hsn_code` | HSN code |
| GST % | `products[].gst_rate` | GST rate (0-100) |
| Customer Name | `customers[].name` | Customer name |
| Customer Email | `customers[].email` | Email address |
| Customer Phone | `customers[].phone` | Phone number |
| Customer GSTIN | `customers[].gstin` | GSTIN number |
| Invoice No | `sales[].invoice_number` | Invoice number |
| Sale Date | `sales[].sale_date` | ISO date format |
| Total Amount | `sales[].grand_total` | Total sale amount |

---

## 6. Sample JSON Template

```json
{
  "version": "1.0.0",
  "export_date": "2025-01-15T10:30:00.000Z",
  "export_by": "admin@company.com",
  "data": {
    "companies": [
      {
        "id": 1,
        "name": "My Company",
        "unique_code": "COMP001",
        "email": "contact@company.com",
        "phone": "+91-1234567890",
        "address": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "country": "India",
        "gstin": "",
        "pan": "",
        "website": "",
        "valid_from": "",
        "valid_to": "",
        "is_active": true,
        "created_at": "2025-01-15T10:30:00.000Z",
        "updated_at": "2025-01-15T10:30:00.000Z"
      }
    ],
    "users": [],
    "products": [
      {
        "id": 1,
        "name": "Sample Product",
        "sku": "PROD-001",
        "barcode": "",
        "category_id": null,
        "description": "",
        "unit": "pcs",
        "purchase_price": 100,
        "selling_price": 120,
        "stock_quantity": 50,
        "min_stock_level": 10,
        "hsn_code": "",
        "gst_rate": 18,
        "tax_type": "exclusive",
        "cgst_rate": null,
        "sgst_rate": null,
        "igst_rate": null,
        "is_active": true,
        "status": "active",
        "barcode_status": "inactive",
        "company_id": 1,
        "created_at": "2025-01-15T10:30:00.000Z",
        "updated_at": "2025-01-15T10:30:00.000Z"
      }
    ],
    "categories": [],
    "sales": [],
    "purchases": [],
    "suppliers": [],
    "customers": [],
    "sales_persons": [],
    "category_commissions": [],
    "sub_categories": [],
    "sales_person_category_assignments": [],
    "stock_adjustments": [],
    "settings": {}
  }
}
```

---

## 7. Common Migration Scenarios

### Scenario 1: Excel/CSV Export

**From:** Excel file with columns
**To:** JSON format

**Steps:**
1. Export Excel to CSV
2. Use script to convert CSV to JSON
3. Map columns to JSON fields
4. Import JSON

### Scenario 2: Database Export

**From:** SQL database (MySQL, PostgreSQL)
**To:** JSON format

**Steps:**
1. Export tables to CSV/JSON
2. Transform data structure
3. Combine into single JSON file
4. Import JSON

### Scenario 3: Another Inventory Software

**From:** Tally, Busy, Zoho, etc.
**To:** JSON format

**Steps:**
1. Export data (usually CSV/Excel)
2. Map fields according to guide
3. Convert to JSON
4. Import JSON

---

## 8. Troubleshooting

### Issue: Import Fails

**Solution:**
- Check JSON syntax (use jsonlint.com)
- Verify required fields are present
- Check date formats (must be ISO format)
- Ensure IDs are unique numbers

### Issue: Some Data Not Imported

**Solution:**
- Check console for error messages
- Verify field names match exactly
- Check data types (numbers vs strings)
- Ensure required fields are not null

### Issue: Duplicate Data

**Solution:**
- Use `merge: false` option to replace data
- Or manually remove duplicates before import
- Check if IDs conflict with existing data

### Issue: Date Format Errors

**Solution:**
- Dates must be ISO format: `"2025-01-15T10:30:00.000Z"`
- Convert dates from your format to ISO
- Use date conversion tool if needed

---

## 9. Quick Reference

### Minimum Required Fields

**Products:**
- `id`, `name`, `unit`

**Customers:**
- `id`, `name`

**Suppliers:**
- `id`, `name`

**Sales:**
- `id`, `sale_date`, `items[]`, `grand_total`

**Purchases:**
- `id`, `type`, `purchase_date`, `items[]`, `grand_total` or `total_amount`

### Date Format

**Always use ISO format:**
```
"2025-01-15T10:30:00.000Z"
```

### ID Format

- **Numbers:** Use integers (1, 2, 3, ...)
- **Strings:** Use strings for user IDs ("user_123")

---

## 10. Example Conversion Script (Python)

```python
import csv
import json
from datetime import datetime

# Read CSV
products = []
with open('products.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        products.append({
            "id": int(row['id']),
            "name": row['name'],
            "sku": row.get('sku', ''),
            "unit": row.get('unit', 'pcs'),
            "purchase_price": float(row.get('purchase_price', 0)),
            "selling_price": float(row.get('selling_price', 0)),
            "stock_quantity": int(row.get('stock_quantity', 0)),
            "gst_rate": float(row.get('gst_rate', 18)),
            "is_active": True,
            "status": "active",
            "company_id": 1,
            "created_at": datetime.now().isoformat() + "Z",
            "updated_at": datetime.now().isoformat() + "Z"
        })

# Create backup structure
backup = {
    "version": "1.0.0",
    "export_date": datetime.now().isoformat() + "Z",
    "data": {
        "companies": [],
        "users": [],
        "products": products,
        "categories": [],
        "sales": [],
        "purchases": [],
        "suppliers": [],
        "customers": [],
        "sales_persons": [],
        "category_commissions": [],
        "sub_categories": [],
        "sales_person_category_assignments": [],
        "stock_adjustments": [],
        "settings": {}
    }
}

# Save JSON
with open('migration_data.json', 'w') as f:
    json.dump(backup, f, indent=2)

print("JSON file created: migration_data.json")
```

---

## Summary

**To migrate data from another software:**

1. ✅ Export data (CSV/Excel)
2. ✅ Convert to JSON format (match structure above)
3. ✅ Import into HisabKitab-Pro (Backup & Restore page)
4. ✅ Verify imported data

**Key Points:**
- Use JSON format
- Match field names exactly
- Use ISO date format
- Ensure required fields are present
- Test with small dataset first

---

**Need Help?** Check the sample template or create a test import first! 🚀




