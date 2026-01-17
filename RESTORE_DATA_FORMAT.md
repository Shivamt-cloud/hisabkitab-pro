# Restore Data Format - Complete Reference

**Exact JSON format required for importing/restoring data into HisabKitab-Pro**

---

## 📋 Required Structure

### Top-Level Structure

```json
{
  "version": "1.0.0",
  "export_date": "2025-01-15T10:30:00.000Z",
  "export_by": "admin@company.com",
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

### Required Fields (Top Level)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | ✅ Yes | Must be `"1.0.0"` |
| `export_date` | string | ✅ Yes | ISO date format: `"2025-01-15T10:30:00.000Z"` |
| `export_by` | string | ❌ No | User ID or email (optional) |
| `data` | object | ✅ Yes | Contains all data arrays |

---

## 📦 Data Arrays

All arrays in `data` object can be empty `[]` if you don't have that data.

### 1. Companies

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
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique company ID
- `name` (string) - Company name
- `unique_code` (string) - Unique identifier

**Optional Fields:**
- `email`, `phone`, `address`, `city`, `state`, `pincode`, `country`
- `gstin`, `pan`, `website`
- `valid_from`, `valid_to` (date strings)
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (ISO date strings)

---

### 2. Users

```json
{
  "users": [
    {
      "id": "user_001",
      "name": "Admin User",
      "email": "admin@company.com",
      "password": "admin123",
      "role": "admin",
      "company_id": 1,
      "user_code": "USR001",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (string) - Unique user ID
- `name` (string) - User's full name
- `email` (string) - Unique email address
- `password` (string) - Plain text or hashed password
- `role` (string) - One of: `"admin"`, `"manager"`, `"staff"`, `"viewer"`

**Optional Fields:**
- `company_id` (number) - Links user to company
- `user_code` (string) - User code/ID
- `created_at`, `updated_at` (ISO date strings)

---

### 3. Categories

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
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Mobile Phones",
      "description": "Mobile phones and accessories",
      "parent_id": 1,
      "is_subcategory": true,
      "company_id": 1,
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique category ID
- `name` (string) - Category name

**Optional Fields:**
- `description` (string) - Category description
- `parent_id` (number | null) - Parent category ID (for subcategories)
- `is_subcategory` (boolean) - true if subcategory
- `company_id` (number) - Company ID
- `created_at`, `updated_at` (ISO date strings)

---

### 4. Products

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
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique product ID
- `name` (string) - Product name
- `unit` (string) - Unit of measurement (e.g., "pcs", "kg", "liters")

**Optional Fields:**
- `sku` (string) - Stock Keeping Unit
- `barcode` (string) - Barcode number
- `category_id` (number | null) - Category ID
- `description` (string) - Product description
- `purchase_price` (number) - Purchase price (default: 0)
- `selling_price` (number) - Selling price (default: 0)
- `stock_quantity` (number) - Current stock (default: 0)
- `min_stock_level` (number) - Minimum stock alert (default: 0)
- `hsn_code` (string) - HSN code for GST
- `gst_rate` (number) - GST rate 0-100 (default: 18)
- `tax_type` (string) - "exclusive" or "inclusive" (default: "exclusive")
- `cgst_rate` (number | null) - CGST rate
- `sgst_rate` (number | null) - SGST rate
- `igst_rate` (number | null) - IGST rate
- `is_active` (boolean) - Active status (default: true)
- `status` (string) - "active" or "archived" (default: "active")
- `barcode_status` (string) - "active" or "inactive" (default: "inactive")
- `company_id` (number) - Company ID
- `created_at`, `updated_at` (ISO date strings)

---

### 5. Customers

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
      "credit_balance": 0,
      "is_active": true,
      "company_id": 1,
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique customer ID
- `name` (string) - Customer name

**Optional Fields:**
- `email` (string) - Email address
- `phone` (string) - Phone number
- `gstin` (string) - GSTIN number
- `address` (string) - Full address
- `city` (string) - City name
- `state` (string) - State name
- `pincode` (string) - PIN code
- `contact_person` (string) - Contact person name
- `credit_limit` (number) - Credit limit amount (default: 0)
- `credit_balance` (number) - Current credit balance (default: 0)
- `is_active` (boolean) - Active status (default: true)
- `company_id` (number) - Company ID
- `created_at`, `updated_at` (ISO date strings)

---

### 6. Suppliers

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
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique supplier ID
- `name` (string) - Supplier name

**Optional Fields:**
- Same as customers (email, phone, gstin, address, etc.)
- `is_registered` (boolean) - GST registered or not (default: false)
- `company_id` (number) - Company ID
- `created_at`, `updated_at` (ISO date strings)

---

### 7. Sales

```json
{
  "sales": [
    {
      "id": 1,
      "invoice_number": "INV-2025-0001",
      "customer_id": 1,
      "customer_name": "ABC Traders",
      "sales_person_id": null,
      "sales_person_name": null,
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
          "purchase_item_unique_key": "P1-I1",
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
      "return_amount": 0,
      "credit_applied": 0,
      "credit_added": 0,
      "company_id": 1,
      "created_by": 1,
      "archived": false,
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique sale ID
- `sale_date` (string) - ISO date format
- `items` (array) - Array of sale items
- `grand_total` (number) - Total amount

**Sale Item Required Fields:**
- `product_id` (number) - Product ID
- `quantity` (number) - Quantity sold
- `unit_price` (number) - Unit price
- `total` (number) - Item total

**Optional Fields:**
- `invoice_number` (string) - Invoice number
- `customer_id` (number | null) - Customer ID
- `customer_name` (string) - Customer name
- `sales_person_id` (number | null) - Sales person ID
- `items[].product_name` (string) - Product name
- `items[].barcode` (string) - Barcode
- `items[].purchase_price` (number) - Purchase price
- `items[].sale_type` (string) - "sale" or "return"
- `items[].mrp` (number) - Maximum Retail Price
- `items[].discount` (number) - Discount amount
- `items[].discount_percentage` (number) - Discount percentage
- `items[].purchase_id` (number) - Purchase ID
- `items[].purchase_item_id` (number) - Purchase item ID
- `items[].purchase_item_unique_key` (string) - Unique key: "P{purchase_id}-I{purchase_item_id}"
- `items[].purchase_item_article` (string) - Article number
- `items[].purchase_item_barcode` (string) - Purchase item barcode
- `subtotal` (number) - Subtotal before tax
- `tax_amount` (number) - Tax amount
- `payment_status` (string) - "paid", "pending", "partial"
- `payment_method` (string) - "cash", "card", "upi", "other", "credit"
- `payment_methods` (array) - Array of payment methods with amounts
- `return_amount` (number) - Amount to return to customer
- `credit_applied` (number) - Credit amount applied
- `credit_added` (number) - Credit amount added
- `company_id` (number) - Company ID
- `created_by` (number) - User ID who created
- `archived` (boolean) - Archived status (default: false)
- `created_at`, `updated_at` (ISO date strings)

---

### 8. Purchases

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
- `id` (number) - Unique purchase ID
- `type` (string) - "gst" or "simple"
- `purchase_date` (string) - ISO date format
- `items` (array) - Array of purchase items

**For GST Purchase:**
- `subtotal` (number) - Subtotal before tax
- `total_tax` (number) - Total tax amount
- `grand_total` (number) - Grand total

**For Simple Purchase:**
- `total_amount` (number) - Total amount (instead of grand_total)

**Purchase Item Required Fields:**
- `product_id` (number) - Product ID
- `quantity` (number) - Quantity
- `unit_price` (number) - Unit price
- `total` (number) - Item total

**Optional Fields:**
- `supplier_id` (number | null) - Supplier ID
- `supplier_name` (string) - Supplier name
- `invoice_number` (string) - Invoice number
- `items[].product_name` (string) - Product name
- `items[].purchase_price` (number) - Purchase price
- `items[].hsn_code` (string) - HSN code
- `items[].gst_rate` (number) - GST rate
- `items[].cgst_rate` (number | null) - CGST rate
- `items[].sgst_rate` (number | null) - SGST rate
- `items[].igst_rate` (number | null) - IGST rate
- `items[].tax_amount` (number) - Tax amount
- `items[].article` (string) - Article number
- `items[].barcode` (string) - Barcode
- `payment_status` (string) - "paid", "pending", "partial"
- `payment_method` (string) - Payment method
- `notes` (string) - Notes
- `company_id` (number) - Company ID
- `created_by` (number) - User ID who created
- `created_at`, `updated_at` (ISO date strings)

---

### 9. Sales Persons

```json
{
  "sales_persons": [
    {
      "id": 1,
      "name": "John Sales",
      "email": "john@company.com",
      "phone": "+91-9876543210",
      "employee_id": "EMP001",
      "is_active": true,
      "company_id": 1,
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique sales person ID
- `name` (string) - Sales person name

**Optional Fields:**
- `email` (string) - Email address
- `phone` (string) - Phone number
- `employee_id` (string) - Employee ID
- `is_active` (boolean) - Active status (default: true)
- `company_id` (number) - Company ID
- `created_at`, `updated_at` (ISO date strings)

---

### 10. Category Commissions

```json
{
  "category_commissions": [
    {
      "id": 1,
      "category_id": 2,
      "category_name": "Mobile Phones",
      "commission_type": "percentage",
      "commission_value": 5,
      "is_active": true,
      "company_id": 1,
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique commission ID
- `category_id` (number) - Category ID
- `commission_type` (string) - "percentage" or "fixed"
- `commission_value` (number) - Commission value

**Optional Fields:**
- `category_name` (string) - Category name
- `is_active` (boolean) - Active status (default: true)
- `company_id` (number) - Company ID
- `created_at`, `updated_at` (ISO date strings)

---

### 11. Stock Adjustments

```json
{
  "stock_adjustments": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Samsung Galaxy S21",
      "adjustment_type": "increase",
      "quantity": 5,
      "reason": "Stock correction",
      "notes": "Found additional stock",
      "company_id": 1,
      "created_by": 1,
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Required Fields:**
- `id` (number) - Unique adjustment ID
- `product_id` (number) - Product ID
- `adjustment_type` (string) - "increase" or "decrease"
- `quantity` (number) - Adjustment quantity

**Optional Fields:**
- `product_name` (string) - Product name
- `reason` (string) - Reason for adjustment
- `notes` (string) - Additional notes
- `company_id` (number) - Company ID
- `created_by` (number) - User ID who created
- `created_at` (ISO date string)

---

### 12. Settings

```json
{
  "settings": {
    "company": {
      "company_name": "My Company",
      "company_address": "123 Main Street",
      "company_city": "Mumbai",
      "company_state": "Maharashtra",
      "company_pincode": "400001",
      "company_country": "India",
      "company_phone": "+91-1234567890",
      "company_email": "contact@company.com",
      "company_website": "https://company.com",
      "company_gstin": "27AAAAA0000A1Z5",
      "company_pan": "AAAAA0000A"
    },
    "invoice": {
      "invoice_prefix": "INV",
      "invoice_number_format": "INV-{YYYY}-{NNNN}",
      "invoice_footer_text": "Thank you for your business!",
      "invoice_terms_and_conditions": "",
      "show_tax_breakdown": true,
      "show_payment_instructions": false,
      "payment_instructions_text": "",
      "invoice_template": "standard"
    },
    "tax": {
      "default_gst_rate": 18,
      "default_tax_type": "exclusive",
      "enable_cgst_sgst": false,
      "default_cgst_rate": 9,
      "default_sgst_rate": 9,
      "default_igst_rate": 18,
      "tax_exempt_categories": []
    },
    "general": {
      "currency_symbol": "₹",
      "currency_code": "INR",
      "date_format": "DD-MMM-YYYY",
      "time_format": "12h",
      "default_unit": "pcs",
      "low_stock_threshold_percentage": 20,
      "auto_archive_products_after_sale": true,
      "enable_barcode_generation": true,
      "default_barcode_format": "EAN13"
    }
  }
}
```

All settings fields are optional.

---

## 📝 Important Notes

### Date Format
- **Always use ISO format**: `"2025-01-15T10:30:00.000Z"`
- Example: `"2025-01-15T10:30:00.000Z"`

### ID Format
- **Numbers**: Use integers (1, 2, 3, ...)
- **Strings**: Use strings for user IDs ("user_001")

### Empty Arrays
- All data arrays can be empty `[]` if you don't have that data
- Example: `"sales": []` if no sales data

### Required vs Optional
- **Required fields** must be present (can't be null or missing)
- **Optional fields** can be omitted or set to `null`/empty string/0

### Minimum Required Data

**Minimum to import:**
```json
{
  "version": "1.0.0",
  "export_date": "2025-01-15T10:30:00.000Z",
  "data": {
    "companies": [],
    "users": [],
    "products": [
      {
        "id": 1,
        "name": "Product Name",
        "unit": "pcs"
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

## ✅ Validation Checklist

Before importing, ensure:

- [ ] `version` is `"1.0.0"`
- [ ] `export_date` is in ISO format
- [ ] `data` object exists
- [ ] All required fields are present
- [ ] IDs are unique integers (or strings for users)
- [ ] Dates are in ISO format
- [ ] JSON is valid (use jsonlint.com to validate)
- [ ] No circular references
- [ ] Foreign keys (category_id, customer_id, etc.) reference existing records

---

## 🚀 Quick Example

```json
{
  "version": "1.0.0",
  "export_date": "2025-01-15T10:30:00.000Z",
  "data": {
    "companies": [
      {
        "id": 1,
        "name": "My Company",
        "unique_code": "COMP001",
        "is_active": true
      }
    ],
    "users": [],
    "products": [
      {
        "id": 1,
        "name": "Test Product",
        "unit": "pcs",
        "selling_price": 100,
        "purchase_price": 80,
        "stock_quantity": 50,
        "is_active": true,
        "status": "active"
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

**This format is ready to import into HisabKitab-Pro!** 🎉




