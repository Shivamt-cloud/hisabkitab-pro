# Backup & Restore Format Documentation

## File Format

Backup files are in **JSON format** and must follow this structure:

```json
{
  "version": "1.0.0",
  "export_date": "2024-01-15T10:30:00.000Z",
  "export_by": "user_id_or_email",
  "data": {
    "products": [...],
    "categories": [...],
    "sales": [...],
    "purchases": [...],
    "suppliers": [...],
    "customers": [...],
    "sales_persons": [...],
    "category_commissions": [...],
    "sub_categories": [...],
    "sales_person_category_assignments": [...],
    "stock_adjustments": [...],
    "settings": {...}
  }
}
```

## Import Process

When you import a backup file:

1. **Validation**: The system checks if the file has the correct structure (version, export_date, data)
2. **Import Order**:
   - Categories (needed for products)
   - Products (needed for purchases)
   - Suppliers & Customers (needed for purchases/sales)
   - Purchases
   - Settings
3. **Duplicate Prevention**: Records with existing IDs are skipped (not overwritten)
4. **Stock Updates**: When importing purchases, product stock is automatically updated

## Supported Data Types

✅ **Products** - Full product information including stock, prices, barcodes
✅ **Categories** - Product categories
✅ **Suppliers** - Supplier details
✅ **Customers** - Customer information
✅ **Purchases** - Both GST and Simple purchases
✅ **Settings** - System configuration

⚠️ **Sales** - Coming soon
⚠️ **Sales Persons** - Coming soon
⚠️ **Stock Adjustments** - Coming soon

## How to Use

1. **Export Backup**:
   - Click "Export Full Backup" button
   - JSON file will be downloaded automatically
   - File name: `hisabkitab_backup_YYYY-MM-DD_timestamp.json`

2. **Import Backup**:
   - Click "Import Backup File" button
   - Select the JSON backup file
   - System will validate and import the data
   - You'll see a success message with the number of records imported

## Important Notes

- ⚠️ **Always backup before importing** - Import merges with existing data
- ⚠️ **Duplicates are skipped** - Records with existing IDs won't be overwritten
- ⚠️ **Import order matters** - Categories must exist before products, products before purchases
- ✅ **Stock is updated** - Importing purchases automatically updates product stock quantities
- ✅ **Safe to re-import** - You can import the same file multiple times safely

