# Excel Templates Guide

**Download sample Excel templates to understand the required data format for importing into HisabKitab-Pro**

---

## 📥 How to Download Templates

1. **Go to Backup & Restore page**
2. **Scroll to "Restore Data" section**
3. **Find "Download Sample Excel Templates" section**
4. **Click any template button to download**

---

## 📋 Available Templates

### 1. Sample Purchases ⭐ (Most Common)
**File:** `sample-purchases.xlsx`

**Columns:**
- SrNo, Customer Name, GST Number, Bill No, Bill Date
- HSN, Desc, GST%, Qty, UNIT
- Taxable Amt, SGST, CGST, IGST, Oth Amt, Bill Amt

**Use Case:** Import purchase/bill data from suppliers

**Note:** "Customer Name" column = Supplier Name in the system

---

### 2. Sample Products
**File:** `sample-products.xlsx`

**Columns:**
- Name, SKU, Barcode, Category, Description
- Unit, Purchase Price, Selling Price
- Stock Quantity, Min Stock Level
- HSN Code, GST Rate, Tax Type

**Use Case:** Import product catalog

---

### 3. Sample Customers
**File:** `sample-customers.xlsx`

**Columns:**
- Name, Email, Phone, GSTIN
- Address, City, State, Pincode
- Contact Person, Credit Limit

**Use Case:** Import customer database

---

### 4. Sample Suppliers
**File:** `sample-suppliers.xlsx`

**Columns:**
- Name, Email, Phone, GSTIN
- Address, City, State, Pincode
- Contact Person, Is Registered

**Use Case:** Import supplier database

---

### 5. Sample Categories
**File:** `sample-categories.xlsx`

**Columns:**
- Name, Description
- Parent Category, Is Subcategory

**Use Case:** Import product categories

---

### 6. Universal Template ⭐⭐⭐ (Recommended)
**File:** `sample-universal-template.xlsx`

**Contains ALL data types in separate sheets:**
- **Purchases** sheet
- **Products** sheet
- **Customers** sheet
- **Suppliers** sheet
- **Categories** sheet

**Use Case:** 
- Complete reference for all data formats
- Import all data types at once
- Best starting point for new users

---

## 📊 Template Format Details

### Purchase Template Format

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Customer Name | Supplier name | ✅ Yes | V P TRADERS |
| GST Number | Supplier GSTIN | ❌ No | 09ABPPA6876Q1ZN |
| Bill No | Invoice number | ✅ Yes | VPT/25-26/11 |
| Bill Date | Invoice date | ✅ Yes | 07-Apr-2025 |
| HSN | HSN code | ❌ No | 6107 |
| Desc | Product description | ❌ No | 61079110 |
| GST% | GST rate | ❌ No | 5.00 |
| Qty | Quantity | ✅ Yes | 60.00 |
| UNIT | Unit of measure | ❌ No | PCS |
| Taxable Amt | Subtotal | ❌ No | 15736.17 |
| SGST | SGST amount | ❌ No | 393.41 |
| CGST | CGST amount | ❌ No | 393.41 |
| IGST | IGST amount | ❌ No | 0.00 |
| Bill Amt | Total amount | ✅ Yes | 16523.00 |

**Important Notes:**
- Headers must be in **first row**
- "Customer Name" = Supplier Name (this is purchase data)
- Dates can be: `07-Apr-2025`, `08/Apr/2025`, `07-04-2025`, etc.
- Multiple items with same supplier + invoice + date = grouped into one purchase

---

### Product Template Format

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Name | Product name | ✅ Yes | Samsung Galaxy S21 |
| SKU | Stock keeping unit | ❌ No | SAM-GAL-S21 |
| Barcode | Barcode number | ❌ No | 1234567890123 |
| Category | Category name | ❌ No | Electronics |
| Description | Product description | ❌ No | Latest smartphone |
| Unit | Unit of measure | ✅ Yes | pcs |
| Purchase Price | Buying price | ❌ No | 50000 |
| Selling Price | Selling price | ❌ No | 55000 |
| Stock Quantity | Current stock | ❌ No | 10 |
| Min Stock Level | Alert level | ❌ No | 5 |
| HSN Code | HSN code | ❌ No | 8517 |
| GST Rate | GST percentage | ❌ No | 18 |
| Tax Type | exclusive/inclusive | ❌ No | exclusive |

---

### Customer Template Format

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Name | Customer name | ✅ Yes | ABC Traders |
| Email | Email address | ❌ No | contact@abc.com |
| Phone | Phone number | ❌ No | +91-9876543210 |
| GSTIN | GST number | ❌ No | 27AAAAA0000A1Z5 |
| Address | Full address | ❌ No | 456 Business Street |
| City | City name | ❌ No | Delhi |
| State | State name | ❌ No | Delhi |
| Pincode | PIN code | ❌ No | 110001 |
| Contact Person | Contact name | ❌ No | Mr. XYZ |
| Credit Limit | Credit limit | ❌ No | 100000 |

---

### Supplier Template Format

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Name | Supplier name | ✅ Yes | V P TRADERS |
| Email | Email address | ❌ No | contact@vptraders.com |
| Phone | Phone number | ❌ No | +91-9876543200 |
| GSTIN | GST number | ❌ No | 09ABPPA6876Q1ZN |
| Address | Full address | ❌ No | 123 Supplier Street |
| City | City name | ❌ No | Mumbai |
| State | State name | ❌ No | Maharashtra |
| Pincode | PIN code | ❌ No | 400001 |
| Contact Person | Contact name | ❌ No | Mr. VP |
| Is Registered | GST registered (Yes/No) | ❌ No | Yes |

---

### Category Template Format

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Name | Category name | ✅ Yes | Electronics |
| Description | Category description | ❌ No | Electronic products |
| Parent Category | Parent category name | ❌ No | (leave empty for main category) |
| Is Subcategory | Yes/No | ❌ No | No |

**Note:** 
- Leave "Parent Category" empty for main categories
- Set "Is Subcategory" to "Yes" for subcategories
- "Parent Category" must match an existing category name

---

## 🚀 How to Use Templates

### Step 1: Download Template
1. Go to Backup & Restore page
2. Click on the template you need (e.g., "Sample Purchases")
3. File will download automatically

### Step 2: Fill Your Data
1. Open the downloaded Excel file
2. Keep the header row (first row) as is
3. Fill in your data starting from row 2
4. Follow the format shown in sample rows

### Step 3: Save and Upload
1. Save your Excel file
2. Go back to Backup & Restore page
3. Click "Select Backup File"
4. Choose your filled Excel file
5. System will convert and import automatically

---

## 💡 Tips

### For Purchase Data:
- ✅ Keep same supplier + invoice + date together (they'll be grouped)
- ✅ Use consistent date format
- ✅ Ensure "Customer Name" = Supplier Name
- ✅ "Bill No" = Invoice Number

### For Product Data:
- ✅ Use consistent unit (pcs, kg, liters, etc.)
- ✅ Ensure category names match existing categories
- ✅ HSN codes should be valid

### For Customer/Supplier Data:
- ✅ GSTIN format: 15 characters (e.g., 27AAAAA0000A1Z5)
- ✅ Phone format: +91-XXXXXXXXXX
- ✅ Credit Limit: numeric value only

### General Tips:
- ✅ Don't delete header row
- ✅ Don't add extra columns (they'll be ignored)
- ✅ Use consistent date formats
- ✅ Test with small sample first (5-10 rows)

---

## ⚠️ Common Mistakes to Avoid

1. **Deleting Header Row** ❌
   - Headers must be in first row
   - System uses headers to identify columns

2. **Wrong Column Names** ❌
   - Use exact column names from template
   - Or use keywords that match (e.g., "Customer Name" or "Supplier Name")

3. **Inconsistent Date Formats** ❌
   - Use one date format throughout
   - Supported: `DD-MMM-YYYY`, `DD/MMM/YYYY`, `DD-MM-YYYY`, `DD/MM/YYYY`

4. **Empty Required Fields** ❌
   - Required fields must have values
   - Check template for required vs optional columns

5. **Special Characters in Names** ❌
   - Avoid special characters in file names
   - Use simple names: `my-purchases.xlsx`

---

## 📝 Example Workflow

1. **Download Universal Template**
   - Click "Universal Template ⭐" button
   - File downloads: `sample-universal-template.xlsx`

2. **Open in Excel**
   - See all sheets: Purchases, Products, Customers, Suppliers, Categories
   - Each sheet has sample data and headers

3. **Fill Your Data**
   - Go to "Purchases" sheet
   - Keep headers, replace sample rows with your data
   - Repeat for other sheets if needed

4. **Save File**
   - Save as: `my-data.xlsx`
   - Keep Excel format (.xlsx)

5. **Upload to System**
   - Go to Backup & Restore
   - Click "Select Backup File"
   - Choose `my-data.xlsx`
   - System converts and imports

---

## ✅ Summary

**Available Templates:**
- ✅ Sample Purchases (most common)
- ✅ Sample Products
- ✅ Sample Customers
- ✅ Sample Suppliers
- ✅ Sample Categories
- ✅ Universal Template (all in one) ⭐

**All templates are:**
- ✅ Ready to download from Backup & Restore page
- ✅ Include sample data and headers
- ✅ Can be used as templates for your data
- ✅ Compatible with Excel import feature

**Just download, fill, and upload!** 🚀



