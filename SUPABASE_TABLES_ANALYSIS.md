# Supabase Tables Analysis & Requirements

## Current Status

### ✅ Tables Already in Supabase:
1. **`companies`** - ✅ EXISTS
   - Cloud service: `cloudCompanyService.ts`
   - Used for company management
   - Synced between cloud and IndexedDB

2. **`users`** - ✅ EXISTS
   - Cloud service: `cloudUserService.ts`
   - Used for user management
   - Synced between cloud and IndexedDB

3. **`registration_requests`** - ✅ EXISTS
   - Cloud service: `cloudRegistrationRequestService.ts`
   - Used for user registration workflow
   - Synced between cloud and IndexedDB

### ❌ Tables NOT in Supabase (Only in IndexedDB):
1. **`products`** - ❌ NOT IN SUPABASE
   - Service: `productService.ts` (IndexedDB only)
   - Storage: Only local browser storage
   - Impact: No cloud sync, no multi-device access

2. **`purchases`** - ❌ NOT IN SUPABASE
   - Service: `purchaseService.ts` (IndexedDB only)
   - Storage: Only local browser storage
   - Impact: No cloud sync, no multi-device access

3. **`customers`** - ❌ NOT IN SUPABASE
   - Service: `customerService.ts` (IndexedDB only)
   - Storage: Only local browser storage
   - Impact: No cloud sync, no multi-device access

4. **`suppliers`** - ❌ NOT IN SUPABASE
   - Service: `supplierService.ts` (IndexedDB only)
   - Storage: Only local browser storage
   - Impact: No cloud sync, no multi-device access

5. **`sales`** - ❌ NOT IN SUPABASE
   - Service: `saleService.ts` (IndexedDB only)
   - Storage: Only local browser storage
   - Impact: No cloud sync, no multi-device access

6. **`expenses`** - ❌ NOT IN SUPABASE
   - Service: `expenseService.ts` (IndexedDB only)
   - Storage: Only local browser storage
   - Impact: No cloud sync, no multi-device access

## Recommendation: CREATE ALL TABLES IN SUPABASE

### Why We Need Supabase Tables:

1. **Multi-Device Sync**: Users can access data from multiple devices (phone, tablet, desktop)
2. **Data Persistence**: Data survives browser data clearing
3. **Cloud Backup**: Automatic cloud backup (in addition to manual backups)
4. **Better Reliability**: Reduced risk of data loss
5. **Scalability**: Better performance for large datasets
6. **Team Collaboration**: Multiple users can access the same company data
7. **Offline Support**: Data syncs when connection is restored

### Required Tables to Create:

#### 1. **`products` Table**
- **Priority**: HIGH
- **Usage**: Core inventory data
- **Key Fields**: id, name, sku, barcode, category_id, company_id, purchase_price, selling_price, stock_quantity, hsn_code, gst_rate, etc.
- **Relationships**: 
  - `company_id` → `companies.id`
  - `category_id` → `categories.id` (if categories table exists)

#### 2. **`purchases` Table**
- **Priority**: HIGH
- **Usage**: Purchase transactions
- **Key Fields**: id, invoice_number, purchase_date, supplier_id, company_id, items (JSONB), subtotal, total_tax, grand_total, type (gst/simple), etc.
- **Relationships**:
  - `company_id` → `companies.id`
  - `supplier_id` → `suppliers.id`
  - `created_by` → `users.id`

#### 3. **`customers` Table**
- **Priority**: HIGH
- **Usage**: Customer management
- **Key Fields**: id, name, email, phone, gstin, address, company_id, credit_limit, is_active, etc.
- **Relationships**:
  - `company_id` → `companies.id`

#### 4. **`suppliers` Table**
- **Priority**: HIGH
- **Usage**: Supplier management
- **Key Fields**: id, name, email, phone, gstin, address, company_id, is_registered, etc.
- **Relationships**:
  - `company_id` → `companies.id`

#### 5. **`sales` Table**
- **Priority**: HIGH
- **Usage**: Sales transactions
- **Key Fields**: id, invoice_number, sale_date, customer_id, company_id, items (JSONB), subtotal, discount, tax_amount, grand_total, payment_status, etc.
- **Relationships**:
  - `company_id` → `companies.id`
  - `customer_id` → `customers.id`
  - `sales_person_id` → `sales_persons.id` (if exists)

#### 6. **`expenses` Table**
- **Priority**: MEDIUM-HIGH
- **Usage**: Expense tracking and analysis
- **Key Fields**: id, expense_date, amount, description, expense_type, company_id, sales_person_id, category, etc.
- **Relationships**:
  - `company_id` → `companies.id`
  - `sales_person_id` → `sales_persons.id` (if exists)
- **Analysis Features**:
  - Expense tracking by date range
  - Expense analysis by sales person
  - Daily expense reports
  - Expense categorization

### Additional Supporting Tables (May Already Exist in IndexedDB):

7. **`categories`** - Product categories
8. **`sales_persons`** - Sales person management
9. **`stock_adjustments`** - Stock adjustment tracking
10. **`settings`** - Company settings

## Implementation Approach

### Option 1: Create Cloud Services (Recommended)
- Create `cloudProductService.ts`, `cloudPurchaseService.ts`, etc.
- Similar pattern to `cloudCompanyService.ts` and `cloudUserService.ts`
- Sync between Supabase and IndexedDB
- Fallback to IndexedDB when offline

### Option 2: Direct Supabase Integration
- Modify existing services to use Supabase directly
- Less flexible, harder to maintain offline support

## Next Steps

1. **Create SQL scripts** for all required tables
2. **Create cloud services** for each entity (products, purchases, customers, suppliers, sales, expenses)
3. **Update existing services** to use cloud services
4. **Test data sync** between cloud and local storage
5. **Implement migration strategy** for existing IndexedDB data

## Priority Order

1. **Phase 1 (Critical)**: products, purchases, sales, customers, suppliers
2. **Phase 2 (Important)**: expenses
3. **Phase 3 (Nice to Have)**: categories, sales_persons, stock_adjustments, settings
