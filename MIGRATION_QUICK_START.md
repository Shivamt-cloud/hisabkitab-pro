# Quick Start: Migrating Data from Another Software

**Simple 3-step process to import your data**

---

## 🎯 Quick Overview

To import data from another software, you need to:
1. **Export** your data (usually CSV/Excel)
2. **Convert** to JSON format (match our structure)
3. **Import** into HisabKitab-Pro

---

## 📋 Step 1: Export from Your Software

### Common Export Formats:
- ✅ CSV (Comma Separated Values)
- ✅ Excel (.xlsx, .xls)
- ✅ JSON (if available)
- ✅ Database export (SQL)

### What to Export:
- Products/Items
- Customers
- Suppliers
- Sales/Invoices (optional)
- Purchases (optional)

---

## 📋 Step 2: Convert to JSON

### Option A: Use Our Template

1. **Open:** `migration-template.json`
2. **Replace** sample data with your data
3. **Keep** the structure exactly the same
4. **Save** as `my-migration-data.json`

### Option B: Use Conversion Script

If you have many records, use a script:

**Python Example:**
```python
import csv
import json

# Read your CSV
products = []
with open('products.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        products.append({
            "id": int(row['id']),
            "name": row['name'],
            "sku": row.get('sku', ''),
            "unit": "pcs",
            "purchase_price": float(row.get('price', 0)),
            "selling_price": float(row.get('selling_price', 0)),
            "stock_quantity": int(row.get('stock', 0)),
            "gst_rate": 18,
            "is_active": True,
            "status": "active",
            "company_id": 1,
            "created_at": "2025-01-15T10:30:00.000Z",
            "updated_at": "2025-01-15T10:30:00.000Z"
        })

# Create JSON structure
backup = {
    "version": "1.0.0",
    "export_date": "2025-01-15T10:30:00.000Z",
    "data": {
        "companies": [{
            "id": 1,
            "name": "My Company",
            "unique_code": "COMP001",
            "is_active": True
        }],
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

# Save
with open('migration-data.json', 'w') as f:
    json.dump(backup, f, indent=2)
```

---

## 📋 Step 3: Import into HisabKitab-Pro

1. **Open** HisabKitab-Pro application
2. **Navigate to:** Backup & Restore page (`/backup-restore`)
3. **Click:** "Import Data" or "Restore from File" button
4. **Select:** Your JSON file (`my-migration-data.json`)
5. **Choose options:**
   - ✅ Import Products
   - ✅ Import Customers
   - ✅ Import Suppliers
   - ⚠️ Import Sales (only if you have sales data)
   - ⚠️ Import Purchases (only if you have purchase data)
   - ✅ Merge with existing (or uncheck to replace)
6. **Click:** "Import" or "Restore"
7. **Wait** for import to complete
8. **Verify** your data appears correctly

---

## ✅ Minimum Required Fields

### For Products:
```json
{
  "id": 1,
  "name": "Product Name",
  "unit": "pcs"
}
```

### For Customers:
```json
{
  "id": 1,
  "name": "Customer Name"
}
```

### For Suppliers:
```json
{
  "id": 1,
  "name": "Supplier Name"
}
```

**All other fields are optional!**

---

## 🔍 Field Mapping Cheat Sheet

| Your Software Field | Our Field | Example |
|---------------------|-----------|---------|
| Item Name | `name` | "Samsung Phone" |
| Item Code | `sku` | "SAM-001" |
| Price | `selling_price` | 50000 |
| Stock | `stock_quantity` | 10 |
| Customer Name | `name` | "ABC Traders" |
| Phone | `phone` | "+91-1234567890" |
| Email | `email` | "contact@abc.com" |

---

## ⚠️ Important Notes

1. **Date Format:** Must be ISO format: `"2025-01-15T10:30:00.000Z"`
2. **ID Format:** Use numbers for most IDs (1, 2, 3...)
3. **Required Fields:** Only `id` and `name` are required for most entities
4. **JSON Syntax:** Must be valid JSON (use jsonlint.com to validate)

---

## 🐛 Troubleshooting

### "Invalid backup file format"
- Check JSON syntax
- Ensure `version` and `data` fields exist
- Validate JSON at jsonlint.com

### "Some data not imported"
- Check console for errors
- Verify field names match exactly
- Ensure IDs are unique numbers

### "Date format error"
- Convert dates to ISO format: `"2025-01-15T10:30:00.000Z"`
- Use date conversion tool if needed

---

## 📚 Full Documentation

For detailed information, see:
- **DATA_MIGRATION_GUIDE.md** - Complete guide with all field details
- **migration-template.json** - Sample template file

---

## 🚀 Quick Test

1. **Start small:** Import 5-10 products first
2. **Verify:** Check if they appear correctly
3. **Then import:** Rest of your data

---

**Ready to migrate?** Follow the 3 steps above! 🎉




