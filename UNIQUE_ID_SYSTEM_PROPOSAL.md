# Unique Company ID System - Comprehensive Proposal

## Overview
This document outlines a comprehensive unique ID system that will be used across all functionalities in the application to easily manage and identify company-specific data.

## 1. Company Unique Code System

### Format
- **Auto-generated Format**: `COMP001`, `COMP002`, `COMP003`, etc.
- **Custom Format**: Allow admin to set a custom 3-6 character code (e.g., "ABC", "XYZ", "SHOP1")
- **Validation**: 
  - Must be unique across all companies
  - 3-6 alphanumeric characters
  - Uppercase only
  - No spaces or special characters

### Implementation
```typescript
interface Company {
  id: number
  unique_code: string  // NEW: Unique company identifier
  name: string
  // ... other fields
}
```

### Generation Logic
1. Auto-generate: `COMP` + 3-digit zero-padded number (001, 002, etc.)
2. Check for conflicts
3. Allow manual override during creation
4. Once set, cannot be changed (immutable)

## 2. User Username Formatting

### Format Options
**Option A**: `{username}_{company_code}`
- Example: `john_doe_COMP001`, `manager_COMP002`
- Simple concatenation

**Option B**: `{username}@{company_code}`
- Example: `john_doe@COMP001`, `manager@COMP002`
- Email-like format, clearer separation

**Option C**: `{company_code}_{username}`
- Example: `COMP001_john_doe`, `COMP002_manager`
- Company code first, better for sorting

**Recommendation**: Option B (`{username}@{company_code}`) - Clear, readable, and familiar format

### Display
- In user lists: Show both username and company code separately
- In login: Users login with their email, system handles company association
- In UI: Display as "John Doe (COMP001)" or "John Doe @ COMP001"

## 3. Invoice Number Format

### Format
`{COMP_CODE}-INV-{YYYY}-{NNNN}`

### Examples
- `COMP001-INV-2024-0001`
- `COMP002-INV-2024-0001`
- `ABC-INV-2024-0001` (if custom code)

### Benefits
- Instantly identify which company the invoice belongs to
- Sequential numbering per company
- Year-based organization

## 4. Purchase Invoice Number Format

### Format
`{COMP_CODE}-PUR-{YYYY}-{NNNN}`

### Examples
- `COMP001-PUR-2024-0001`
- `COMP002-PUR-2024-0001`

## 5. Product SKU/Code Format

### Format
`{COMP_CODE}-PROD-{NNNN}` (auto-generated) OR `{COMP_CODE}-{CUSTOM_SKU}` (manual)

### Examples
- `COMP001-PROD-0001`
- `COMP001-LAPTOP001` (if custom SKU provided)

### Benefits
- Products are easily identifiable by company
- Prevents SKU conflicts across companies
- Better organization in product listings

## 6. Barcode Format Enhancement

### Current Format
Various formats (EAN13, CODE128, etc.)

### Enhanced Format
Include company code as prefix:
- `{COMP_CODE}{PRODUCT_CODE}` or
- Keep existing format but ensure uniqueness per company

## 7. Customer Code Format (Optional)

### Format
`{COMP_CODE}-CUST-{NNNN}`

### Examples
- `COMP001-CUST-0001`
- `COMP002-CUST-0001`

## 8. Supplier Code Format (Optional)

### Format
`{COMP_CODE}-SUP-{NNNN}`

## 9. Implementation Strategy

### Phase 1: Company Unique Code
1. Add `unique_code` field to Company type
2. Auto-generate on company creation
3. Allow manual override with validation
4. Display in company list and forms

### Phase 2: User Username Formatting
1. When creating user for a company, append company code to username
2. Display formatted username in user lists
3. Update login system if needed (users still login with email)

### Phase 3: Invoice Numbers
1. Update invoice generation to include company code
2. Update existing invoices (optional - only new ones)
3. Update invoice display and search

### Phase 4: Product Codes
1. Update product creation to include company code in SKU
2. Update product listings to show company code
3. Ensure barcode generation considers company code

### Phase 5: Purchase Invoices
1. Update purchase invoice generation
2. Update purchase listings

### Phase 6: Optional Enhancements
1. Customer codes
2. Supplier codes
3. Stock adjustment codes

## 10. Database Schema Changes

```typescript
// Company
interface Company {
  id: number
  unique_code: string        // NEW - Unique company identifier
  name: string
  // ... existing fields
}

// User (optional - we can derive from company_code if needed)
interface User {
  id: string
  name: string
  email: string
  username?: string         // NEW - Formatted username with company code
  display_username: string  // NEW - For display purposes
  company_id?: number
  company_code?: string     // NEW - Denormalized for quick access
  // ... existing fields
}

// Sale
interface Sale {
  // ... existing fields
  invoice_number: string    // Format: {COMP_CODE}-INV-{YYYY}-{NNNN}
  company_code?: string     // NEW - For quick filtering
}

// Purchase
interface Purchase {
  // ... existing fields
  invoice_number: string    // Format: {COMP_CODE}-PUR-{YYYY}-{NNNN}
  company_code?: string     // NEW
}

// Product
interface Product {
  // ... existing fields
  sku: string              // Format: {COMP_CODE}-PROD-{NNNN} or custom
  company_code?: string     // NEW
}
```

## 11. Benefits

1. **Easy Identification**: Instantly know which company any record belongs to
2. **Better Organization**: Data is naturally organized by company
3. **Unique Identification**: No conflicts across companies
4. **Better UX**: Users can quickly identify their company's data
5. **Scalability**: System can handle unlimited companies easily
6. **Audit Trail**: Company code in every transaction for better tracking

## 12. Migration Strategy

### For Existing Data
1. Generate unique codes for existing companies
2. For existing records, add company_code based on company_id
3. For new records, automatically include company code
4. Optional: Update existing invoice numbers (can leave as-is for historical data)

## 13. UI/UX Considerations

1. **Company Selector**: Show company code alongside company name
2. **Display Format**: Always show company code in brackets or with separator
3. **Search/Filter**: Allow filtering by company code
4. **Reports**: Group by company code
5. **Breadcrumbs**: Include company code in navigation

## 14. Code Examples

### Company Creation
```typescript
// Auto-generate unique code
const nextCode = await getNextCompanyCode() // "COMP001", "COMP002", etc.
// Or allow custom
const uniqueCode = customCode || nextCode
```

### User Creation
```typescript
const companyCode = await getCompanyCode(companyId)
const displayUsername = `${username}@${companyCode}`
```

### Invoice Generation
```typescript
const companyCode = await getCompanyCode(companyId)
const invoiceNumber = `${companyCode}-INV-${year}-${sequentialNumber}`
```

### Product SKU Generation
```typescript
const companyCode = await getCompanyCode(companyId)
const sku = customSku ? `${companyCode}-${customSku}` : `${companyCode}-PROD-${sequentialNumber}`
```


