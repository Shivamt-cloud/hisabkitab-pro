# Purchase Data Converter Guide

**Convert your purchase data (CSV/Array format) to HisabKitab-Pro JSON format**

---

## 📋 Your Data Format

Based on your example, your data has:
- **Customer Name** → Maps to **Supplier Name**
- **Bill No** → Maps to **Invoice Number**
- **Bill Date** → Maps to **Invoice Date**
- **GST Number** → Maps to **Supplier GSTIN**
- **HSN** → Maps to **HSN Code**
- **Desc** → Maps to **Product Description**
- **GST%** → Maps to **GST Rate**
- **Qty** → Maps to **Quantity**
- **Taxable Amt** → Maps to **Subtotal**
- **SGST, CGST, IGST** → Maps to **Tax Amounts**
- **Bill Amt** → Maps to **Grand Total**

---

## ✅ Yes, This Can Be Converted!

I've created a converter script that will:
1. ✅ Read your CSV/array data
2. ✅ Map "Customer Name" to "Supplier Name"
3. ✅ Convert dates to ISO format
4. ✅ Calculate unit prices from taxable amounts
5. ✅ Group items by invoice (supplier + invoice number + date)
6. ✅ Create suppliers automatically
7. ✅ Generate HisabKitab-Pro JSON format

---

## 🚀 How to Use

### Option 1: Use the Script with Your Data

1. **Save your data as CSV file** (e.g., `purchases.csv`)

2. **Run the converter:**
   ```bash
   python3 scripts/csv-purchase-converter-advanced.py --input purchases.csv --output purchase_migration.json
   ```

3. **Import into HisabKitab-Pro:**
   - Open Backup & Restore page
   - Click "Import Data"
   - Select `purchase_migration.json`
   - Choose: ✅ Suppliers and ✅ Purchases
   - Click "Import"

### Option 2: Use with Array Data (Like Your Example)

If you have data in array format (like your example), you can:

1. **Save as CSV first:**
   ```csv
   SrNo,Customer Name,GST Number,Bill No,Bill Date,HSN,Desc,GST%,Qty,UNIT,Taxable Amt,SGST,CGST,IGST,Oth Amt,Bill Amt
   1,V P TRADERS,09ABPPA6876Q1ZN,VPT/25-26/11,07-Apr-2025,6107,61079110,5.00,60.00,PCS,15736.17,393.41,393.41,0.00,0.01,16523.00
   2,Pragati Traders,09ABDFP5746L1ZO,2025-26/017,08/Apr/2025,6107,61079110,5.00,50.00,PCS,4357.13,108.93,108.93,0.00,0.01,4575.00
   ```

2. **Run the converter** (same as Option 1)

---

## 📊 What Gets Converted

### Your Data → HisabKitab-Pro Format

**Suppliers:**
- Customer Name → Supplier Name
- GST Number → GSTIN
- Automatically created for each unique supplier

**Purchases:**
- Bill No → Invoice Number
- Bill Date → Purchase Date (converted to ISO format)
- Items grouped by invoice

**Purchase Items:**
- Desc → Product Name
- HSN → HSN Code
- Qty → Quantity
- Taxable Amt → Unit Price (calculated)
- SGST, CGST, IGST → Tax Rates (calculated)
- Bill Amt → Total Amount

---

## 📝 Example Output

Based on your data, the converter will create:

```json
{
  "version": "1.0.0",
  "export_date": "2025-01-15T10:30:00.000Z",
  "data": {
    "suppliers": [
      {
        "id": 1,
        "name": "V P TRADERS",
        "gstin": "09ABPPA6876Q1ZN",
        "is_registered": true
      },
      {
        "id": 2,
        "name": "Pragati Traders",
        "gstin": "09ABDFP5746L1ZO",
        "is_registered": true
      }
    ],
    "purchases": [
      {
        "id": 1,
        "type": "gst",
        "supplier_id": 1,
        "supplier_name": "V P TRADERS",
        "invoice_number": "VPT/25-26/11",
        "purchase_date": "2025-04-07T00:00:00.000Z",
        "items": [
          {
            "product_name": "61079110",
            "quantity": 60,
            "unit_price": 262.27,
            "hsn_code": "6107",
            "gst_rate": 5.0,
            "cgst_rate": 2.5,
            "sgst_rate": 2.5,
            "total": 16523.00
          }
        ],
        "subtotal": 15736.17,
        "total_tax": 786.82,
        "grand_total": 16523.00
      }
    ]
  }
}
```

---

## 🔧 Customization

If your column names are different, the script will automatically detect them by matching keywords:

- **Supplier Name**: "customer name", "supplier name", "vendor name"
- **Invoice Number**: "bill no", "invoice no", "invoice number"
- **Invoice Date**: "bill date", "invoice date", "date"
- **Quantity**: "qty", "quantity"
- **Total Amount**: "bill amt", "total", "grand total"

---

## ⚠️ Important Notes

1. **Product Mapping**: The converter uses `product_name` from "Desc" field. You may need to:
   - Create products first, OR
   - Map descriptions to existing products after import

2. **Date Formats**: The script handles multiple date formats:
   - `07-Apr-2025`
   - `08/Apr/2025`
   - `07-04-2025`
   - `08/04/2025`

3. **Grouping**: Items with the same supplier, invoice number, and date are grouped into one purchase

4. **Tax Calculation**: Tax rates are calculated from SGST/CGST/IGST amounts if GST% is not provided

---

## 📋 Step-by-Step Process

1. **Prepare your CSV file:**
   - Save your data as CSV
   - Ensure headers are in first row
   - Check date formats

2. **Run the converter:**
   ```bash
   python3 scripts/csv-purchase-converter-advanced.py \
     --input your_purchases.csv \
     --output purchase_migration.json \
     --company-id 1
   ```

3. **Review the output:**
   - Check `purchase_migration.json`
   - Verify suppliers and purchases are correct

4. **Import into HisabKitab-Pro:**
   - Go to Backup & Restore page
   - Click "Import Data"
   - Select the JSON file
   - Choose what to import
   - Click "Import"

5. **Verify imported data:**
   - Check Suppliers page
   - Check Purchase History
   - Verify amounts and dates

---

## 🆘 Troubleshooting

### Issue: "Could not parse date"
- **Solution**: Check date format in your CSV
- Supported formats: `DD-MMM-YYYY`, `DD/MMM/YYYY`, `DD-MM-YYYY`, `DD/MM/YYYY`

### Issue: "Missing supplier name or invoice number"
- **Solution**: Ensure these columns exist and have data
- Check column names match expected keywords

### Issue: "Insufficient columns"
- **Solution**: Ensure all required columns are present
- Check CSV has headers in first row

---

## ✅ Ready to Convert?

1. **Save your data as CSV** (with headers)
2. **Run the converter script**
3. **Import the JSON file** into HisabKitab-Pro

**Your data format is fully supported!** 🎉

---

## 📞 Need Help?

If your data format is slightly different:
1. Share a sample of your data
2. I'll customize the converter for you
3. Or modify the script to match your exact format



