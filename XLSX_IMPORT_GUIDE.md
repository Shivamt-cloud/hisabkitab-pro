# XLSX Import Feature - Complete Guide

## ✅ Yes, It's Now Possible!

**You can now upload XLSX (Excel) files directly and the system will:**
1. ✅ Accept XLSX files in the browser
2. ✅ Read and parse Excel data automatically
3. ✅ Convert to JSON format
4. ✅ Import into HisabKitab-Pro

**No manual conversion needed!** 🎉

---

## 🚀 How to Use

### Step 1: Prepare Your Excel File

Your Excel file should have the following columns (headers in first row):

| Customer Name | GST Number | Bill No | Bill Date | HSN | Desc | GST% | Qty | UNIT | Taxable Amt | SGST | CGST | IGST | Bill Amt |
|---------------|------------|---------|-----------|-----|------|------|-----|------|-------------|------|------|------|----------|

**Important Notes:**
- ✅ Headers must be in the **first row**
- ✅ Column names can vary (see mapping below)
- ✅ Dates can be in various formats (07-Apr-2025, 08/Apr/2025, etc.)
- ✅ Supports both `.xlsx` and `.xls` files

### Step 2: Upload Excel File

1. **Open HisabKitab-Pro**
2. **Navigate to:** Backup & Restore page
3. **Click:** "Select Backup File" button
4. **Choose:** Your Excel file (`.xlsx` or `.xls`)
5. **Wait:** System will automatically convert it
6. **Review:** Check the conversion message
7. **Click:** "Import Data" button
8. **Select:** What to import (Suppliers, Purchases, etc.)
9. **Click:** "Import"

---

## 📊 Column Mapping

The system automatically detects columns by matching keywords:

| Your Column Name | Maps To | Keywords Detected |
|-----------------|---------|-------------------|
| Customer Name | Supplier Name | "customer name", "supplier name", "vendor name" |
| GST Number | GSTIN | "gst number", "gstin", "gst no" |
| Bill No | Invoice Number | "bill no", "invoice no", "invoice number" |
| Bill Date | Purchase Date | "bill date", "invoice date", "date" |
| HSN | HSN Code | "hsn", "hsn code" |
| Desc | Product Name | "desc", "description", "product", "item" |
| GST% | GST Rate | "gst%", "gst rate", "tax rate" |
| Qty | Quantity | "qty", "quantity" |
| UNIT | Unit | "unit", "uom" |
| Taxable Amt | Subtotal | "taxable amt", "taxable amount", "subtotal" |
| SGST | SGST Amount | "sgst" |
| CGST | CGST Amount | "cgst" |
| IGST | IGST Amount | "igst" |
| Bill Amt | Grand Total | "bill amt", "total", "grand total" |

---

## 📝 Example Excel File

### Sheet 1 (or any sheet name):

| SrNo | Customer Name | GST Number | Bill No | Bill Date | HSN | Desc | GST% | Qty | UNIT | Taxable Amt | SGST | CGST | IGST | Oth Amt | Bill Amt |
|------|---------------|------------|---------|-----------|-----|------|------|-----|------|-------------|------|------|------|---------|----------|
| 1 | V P TRADERS | 09ABPPA6876Q1ZN | VPT/25-26/11 | 07-Apr-2025 | 6107 | 61079110 | 5.00 | 60.00 | PCS | 15736.17 | 393.41 | 393.41 | 0.00 | 0.01 | 16523.00 |
| 2 | Pragati Traders | 09ABDFP5746L1ZO | 2025-26/017 | 08/Apr/2025 | 6107 | 61079110 | 5.00 | 50.00 | PCS | 4357.13 | 108.93 | 108.93 | 0.00 | 0.01 | 4575.00 |

---

## 🔄 What Happens During Conversion

1. **File Detection**: System detects it's an Excel file
2. **Sheet Reading**: Reads the first sheet (or finds purchase-related sheet)
3. **Header Detection**: Identifies column headers
4. **Data Mapping**: Maps columns to HisabKitab-Pro format
5. **Supplier Creation**: Creates suppliers from "Customer Name" column
6. **Purchase Grouping**: Groups items by supplier + invoice number + date
7. **JSON Generation**: Creates backup JSON format
8. **Import Ready**: File is ready to import

---

## ✅ What Gets Created

### Suppliers
- Created automatically from "Customer Name" column
- GSTIN from "GST Number" column
- Each unique supplier gets an ID

### Purchases
- Grouped by: Supplier + Invoice Number + Date
- Each purchase contains items from that invoice
- Tax calculations preserved (SGST, CGST, IGST)

### Purchase Items
- Product name from "Desc" column
- HSN code from "HSN" column
- Quantity, unit price, tax rates calculated
- All amounts preserved

---

## 📋 Supported File Formats

- ✅ `.xlsx` (Excel 2007+)
- ✅ `.xls` (Excel 97-2003)
- ✅ `.json` (Existing backup files)

---

## ⚠️ Important Notes

### 1. Column Names
- Column names are case-insensitive
- Partial matches work (e.g., "Customer Name" matches "customer name")
- First matching column is used

### 2. Date Formats
Supported date formats:
- `07-Apr-2025`
- `08/Apr/2025`
- `07-04-2025`
- `08/04/2025`
- `2025-04-07`
- Excel date numbers (automatically converted)

### 3. Required Columns
Minimum required:
- Supplier Name (Customer Name)
- Invoice Number (Bill No)
- Invoice Date (Bill Date)

### 4. Optional Columns
- All other columns are optional
- Missing values default to 0 or empty string

### 5. Multiple Sheets
- System reads the first sheet by default
- Or looks for sheets named: "purchases", "purchase", "bills", "data"

---

## 🆘 Troubleshooting

### Issue: "Failed to convert Excel file"
**Solutions:**
- Check file is not corrupted
- Ensure file is `.xlsx` or `.xls` format
- Try opening file in Excel and saving again

### Issue: "Excel file must have at least a header row"
**Solutions:**
- Ensure first row contains column headers
- Remove any empty rows before headers

### Issue: "Missing supplier name or invoice number"
**Solutions:**
- Check column names match expected keywords
- Ensure data rows have values in these columns
- Check for empty rows

### Issue: "Invalid converted file format"
**Solutions:**
- This is rare - contact support
- Try converting manually using Python script first

---

## 📊 Conversion Statistics

After conversion, you'll see:
- ✅ Number of suppliers created
- ✅ Number of purchases created
- ✅ Success message

Example:
```
✅ Successfully converted Excel file. 2 suppliers, 2 purchases found.
```

---

## 🎯 Next Steps After Import

1. **Verify Suppliers:**
   - Go to Suppliers page
   - Check all suppliers are created correctly

2. **Verify Purchases:**
   - Go to Purchase History
   - Check invoices are imported correctly
   - Verify amounts and dates

3. **Map Products (if needed):**
   - If products don't exist, create them
   - Or map descriptions to existing products

---

## 💡 Tips

1. **Test First**: Import a small sample (5-10 rows) first
2. **Backup**: Always backup current data before importing
3. **Column Names**: Use exact column names from the mapping table
4. **Date Format**: Use consistent date format in your Excel file
5. **Clean Data**: Remove empty rows and columns before importing

---

## ✅ Summary

**You can now:**
- ✅ Upload XLSX files directly
- ✅ No manual conversion needed
- ✅ Automatic column mapping
- ✅ Automatic supplier creation
- ✅ Automatic purchase grouping
- ✅ Same import process as JSON files

**Just upload your Excel file and click Import!** 🚀

---

## 📞 Need Help?

If your Excel format is different:
1. Share a sample of your Excel file structure
2. I'll customize the converter for you
3. Or modify the column mapping

**The feature is ready to use!** 🎉




