# Multi-Sheet Excel Import

## ✅ Yes! All Sheets Are Now Processed

**When you upload the Universal Template Excel file with all sheets (Purchases, Products, Customers, Suppliers, Categories), ALL data will be imported into the application!**

---

## 📋 Supported Sheets

The XLSX converter now automatically processes **all sheets** in your Excel file:

### ✅ Purchases Sheet
- **Sheet Names Detected:** `Purchases`, `Purchase`, `Bills`, `Bills Data`, `Data`
- **Data Imported:**
  - Purchase records (GST purchases)
  - Purchase items with article and barcode
  - Suppliers (extracted from purchase data)

### ✅ Products Sheet
- **Sheet Names Detected:** `Products`, `Product`
- **Data Imported:**
  - Product name, SKU, barcode
  - Category (by name - will be matched during import)
  - Description, unit, prices
  - Stock quantity, min stock level
  - HSN code, GST rate, tax type

### ✅ Customers Sheet
- **Sheet Names Detected:** `Customers`, `Customer`
- **Data Imported:**
  - Name, email, phone
  - GSTIN, address, city, state, pincode
  - Contact person, credit limit

### ✅ Suppliers Sheet
- **Sheet Names Detected:** `Suppliers`, `Supplier`, `Vendors`, `Vendor`
- **Data Imported:**
  - Name, email, phone
  - GSTIN, address, city, state, pincode
  - Contact person, registration status
  - **Note:** Suppliers from Purchases sheet are merged with Suppliers sheet

### ✅ Categories Sheet
- **Sheet Names Detected:** `Categories`, `Category`
- **Data Imported:**
  - Main categories (no parent)
  - Sub-categories (with parent category name)
  - Category descriptions

---

## 🔄 How It Works

### Step 1: Upload Excel File
User uploads Universal Template with all sheets:
```
📄 sample-universal-template.xlsx
  ├── 📊 Purchases (with Article & Barcode)
  ├── 📊 Products
  ├── 📊 Customers
  ├── 📊 Suppliers
  └── 📊 Categories
```

### Step 2: Converter Processes All Sheets
- ✅ Scans all sheet names
- ✅ Identifies sheet type by name
- ✅ Converts each sheet to JSON format
- ✅ Merges related data (e.g., suppliers from purchases + suppliers sheet)

### Step 3: All Data Imported
```json
{
  "version": "1.0.0",
  "data": {
    "products": [...],      // ✅ From Products sheet
    "categories": [...],    // ✅ From Categories sheet
    "sub_categories": [...], // ✅ From Categories sheet
    "suppliers": [...],     // ✅ From Suppliers + Purchases sheets
    "customers": [...],     // ✅ From Customers sheet
    "purchases": [...]      // ✅ From Purchases sheet
  }
}
```

### Step 4: Import to Application
- ✅ Categories imported first (needed for products)
- ✅ Products imported (needed for purchases)
- ✅ Suppliers & Customers imported
- ✅ Purchases imported (links to products & suppliers)

---

## 📊 Import Statistics

After conversion, you'll see a summary like:
```
Successfully converted: 10 products, 5 categories, 3 suppliers, 8 customers, 15 purchases
```

---

## ✅ Complete Data Flow

### Universal Template → Excel File → JSON → Application

1. **Download Universal Template**
   - Contains all 5 sheets with sample data
   - Includes Article and Barcode columns

2. **Fill Your Data**
   - Add your products, customers, suppliers, categories
   - Add your purchases with articles and barcodes

3. **Upload Excel File**
   - System detects all sheets automatically
   - Converts all data to JSON format

4. **Import to Application**
   - All data imported in correct order
   - Relationships maintained (products → categories, purchases → suppliers/products)

---

## 🎯 Key Features

### Automatic Sheet Detection
- ✅ Detects sheet type by name (case-insensitive)
- ✅ Processes all sheets in one file
- ✅ Handles missing sheets gracefully

### Data Merging
- ✅ Suppliers from Purchases sheet merged with Suppliers sheet
- ✅ No duplicate suppliers created

### Relationship Handling
- ✅ Products linked to categories by name
- ✅ Purchases linked to products and suppliers
- ✅ Sub-categories linked to parent categories

### Backward Compatibility
- ✅ Still works with single Purchases sheet
- ✅ Falls back to first sheet if no named sheets found

---

## 📝 Example

### Excel File Structure:
```
Sheet: Products
| Name | SKU | Barcode | Category | Purchase Price | Selling Price |
|------|-----|---------|----------|----------------|---------------|
| Product 1 | P001 | 123456 | Electronics | 100 | 120 |

Sheet: Categories
| Name | Description | Parent Category | Is Subcategory |
|------|-------------|----------------|----------------|
| Electronics | Electronic items | | No |
| Mobile Phones | Phones | Electronics | Yes |

Sheet: Purchases
| Desc | Article | Barcode | Qty | ... |
|------|--------|---------|-----|-----|
| Product 1 | ART-001 | 123456 | 10 | ... |

Sheet: Customers
| Name | Email | Phone | ... |
|------|-------|-------|-----|
| ABC Company | abc@example.com | 1234567890 | ... |

Sheet: Suppliers
| Name | Email | Phone | ... |
|------|-------|-------|-----|
| XYZ Suppliers | xyz@example.com | 9876543210 | ... |
```

### Result:
- ✅ 1 Product imported
- ✅ 2 Categories imported (1 main, 1 sub)
- ✅ 1 Customer imported
- ✅ 1 Supplier imported
- ✅ 1 Purchase imported (linked to product and supplier)

---

## ✅ Summary

**All Sheets Supported:**
- ✅ Purchases (with Article & Barcode)
- ✅ Products
- ✅ Customers
- ✅ Suppliers
- ✅ Categories (main + sub-categories)

**When you share all sheets, ALL details will be available in the application!** 🎉



