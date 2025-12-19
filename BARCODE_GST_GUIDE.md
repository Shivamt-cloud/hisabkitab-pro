# Barcode & GST/Tax Implementation Guide

## 🏷️ Barcode Auto-Generation

### Available Formats

1. **Sequential** (Default)
   - Format: `PROD-000001`, `PROD-000002`, etc.
   - Based on timestamp + random number
   - Example: `PROD-1234567890`

2. **SKU Based**
   - Format: `BAR-{SKU}`
   - Uses the product's SKU if available
   - Example: If SKU is `SKU123`, barcode becomes `BAR-SKU123`

3. **EAN-13 Format**
   - Format: 13-digit barcode (standard retail format)
   - Includes country code (890 for India) + product code + check digit
   - Example: `8901234567890`
   - Validated with check digit algorithm

4. **UUID Based**
   - Format: `UUID-{12 characters from UUID}`
   - Unique identifier format
   - Example: `UUID-A1B2C3D4E5F6`

### How to Use

1. Check "Auto-generate barcode" checkbox
2. Select desired format from dropdown
3. Click refresh button to regenerate if needed
4. Uncheck to manually enter barcode

### Features
- ✅ Automatic uniqueness check (prevents duplicates)
- ✅ Multiple regeneration attempts if duplicate found
- ✅ Format validation
- ✅ Manual override option

---

## 💰 GST & Tax System

### GST Rates Supported
- 0% - Exempt
- 5%
- 12%
- 18% (Default)
- 28%

### Tax Types

#### 1. GST Exclusive (Default)
- GST is **added on top** of the selling price
- Example:
  - Base Price: ₹100
  - GST (18%): ₹18
  - **Total: ₹118**

#### 2. GST Inclusive
- GST is **already included** in the selling price
- Example:
  - Selling Price: ₹118 (includes GST)
  - Base Price: ₹100 (calculated)
  - GST (18%): ₹18 (calculated)

### Tax Breakdown

The system automatically calculates:

#### For Intrastate (Within State):
- **CGST** (Central GST) = GST Rate / 2
- **SGST** (State GST) = GST Rate / 2
- Example: 18% GST = 9% CGST + 9% SGST

#### For Interstate:
- **IGST** (Integrated GST) = Full GST Rate
- Example: 18% GST = 18% IGST

### HSN Code

- **Format**: 4, 6, or 8 digits
- **Purpose**: Harmonized System of Nomenclature for GST classification
- **Example**: `8517` (Electronic goods), `6109` (T-shirts)
- **Validation**: Automatically validated for correct format

### Tax Calculation Display

Click "Show Tax Breakdown" to see:
- Base Price
- GST Amount
- CGST/SGST (for intrastate)
- IGST (for interstate)
- Total Price

### Use Cases

**Scenario 1: Retail Store (GST Exclusive)**
- Set Selling Price: ₹100
- GST Rate: 18%
- Tax Type: Exclusive
- Customer pays: ₹118

**Scenario 2: Restaurant (GST Inclusive)**
- Set Selling Price: ₹118 (includes GST)
- GST Rate: 18%
- Tax Type: Inclusive
- Base Price shown: ₹100
- GST shown: ₹18

**Scenario 3: E-commerce (Interstate)**
- Set Selling Price: ₹100
- GST Rate: 18%
- Tax Type: Exclusive
- IGST: 18%
- Customer pays: ₹118

---

## 🔧 Implementation Details

### Database Fields Added

```typescript
{
  hsn_code?: string        // 4-8 digit HSN code
  gst_rate: number         // GST percentage (0-100)
  tax_type: 'inclusive' | 'exclusive'
  cgst_rate?: number       // Central GST (auto-calculated)
  sgst_rate?: number       // State GST (auto-calculated)
  igst_rate?: number       // Integrated GST (for interstate)
}
```

### Files Created

1. `src/utils/barcodeGenerator.ts` - Barcode generation utilities
2. `src/utils/taxCalculator.ts` - GST/Tax calculation utilities

### Integration Points

- Product Form - Auto barcode generation & GST fields
- Product Service - Storage of barcode and tax data
- Future: Sales/Purchase modules will use tax calculations

---

## 📋 Recommendations

### For Barcode:
1. **Use EAN-13** for retail products (standard format)
2. **Use Sequential** for internal inventory tracking
3. **Use SKU Based** if you already have SKU system
4. **Always validate** barcode uniqueness

### For GST:
1. **Set default GST rate** per category (future enhancement)
2. **Use Exclusive** for B2B transactions
3. **Use Inclusive** for B2C transactions (customer sees one price)
4. **Store HSN codes** for proper GST compliance
5. **Consider state-based** CGST/SGST vs IGST logic (future enhancement)

### Best Practices:
- ✅ Always enter HSN code for GST compliance
- ✅ Choose appropriate GST rate based on product category
- ✅ Set tax type based on your business model
- ✅ Review tax breakdown before saving
- ✅ Keep barcodes unique across all products

---

## 🚀 Future Enhancements

1. **Barcode Scanning** - Integrate barcode scanner support
2. **QR Code Generation** - Generate QR codes for products
3. **GST Invoice Generation** - Auto-generate GST-compliant invoices
4. **State-based Tax Logic** - Auto-determine CGST/SGST vs IGST
5. **Tax Reports** - GST filing reports and summaries
6. **Category-wise GST** - Default GST rate per category

