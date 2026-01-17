# Cloud Services Implementation Plan

## Overview
Create cloud services for all tables to enable multi-device sync and cloud backup.

## Services to Create

### 1. cloudProductService.ts ✅ HIGH PRIORITY
- Sync products between Supabase and IndexedDB
- Filter by company_id
- Handle CRUD operations

### 2. cloudCustomerService.ts ✅ HIGH PRIORITY
- Sync customers between Supabase and IndexedDB
- Filter by company_id
- Handle CRUD operations

### 3. cloudSupplierService.ts ✅ HIGH PRIORITY
- Sync suppliers between Supabase and IndexedDB
- Filter by company_id
- Handle CRUD operations

### 4. cloudPurchaseService.ts ✅ HIGH PRIORITY
- Sync purchases between Supabase and IndexedDB
- Handle JSONB items array
- Filter by company_id

### 5. cloudSaleService.ts ✅ HIGH PRIORITY
- Sync sales between Supabase and IndexedDB
- Handle JSONB items and payment_methods arrays
- Filter by company_id

### 6. cloudExpenseService.ts ✅ MEDIUM PRIORITY
- Sync expenses between Supabase and IndexedDB
- Handle JSONB cash_denominations
- Filter by company_id

## Implementation Pattern

Each service follows this pattern (from cloudCompanyService.ts):

```typescript
export const cloudXService = {
  getAll: async (companyId?: number | null): Promise<X[]> => {
    // 1. Check if Supabase available and online
    // 2. If not, return from IndexedDB
    // 3. If yes, fetch from Supabase
    // 4. Sync to IndexedDB for offline access
    // 5. Return data
  },
  
  getById: async (id: number): Promise<X | undefined> => {
    // Similar pattern
  },
  
  create: async (data: Omit<X, 'id' | 'created_at' | 'updated_at'>): Promise<X> => {
    // 1. Save to IndexedDB first
    // 2. If Supabase available, save to cloud
    // 3. Sync back to IndexedDB
    // 4. Return created entity
  },
  
  update: async (id: number, data: Partial<X>): Promise<X | null> => {
    // 1. Update in IndexedDB
    // 2. If Supabase available, update in cloud
    // 3. Sync back to IndexedDB
  },
  
  delete: async (id: number): Promise<boolean> => {
    // 1. Delete from IndexedDB
    // 2. If Supabase available, delete from cloud
  }
}
```

## Integration Strategy

After creating cloud services, we need to:

1. **Update existing services** to use cloud services
2. **Maintain backward compatibility** with IndexedDB-only mode
3. **Handle sync conflicts** (last write wins, or timestamp-based)
4. **Test data sync** between devices

## Next Steps

1. Create cloud services (this step)
2. Update existing services to use cloud services
3. Test data sync
4. Handle edge cases and errors
