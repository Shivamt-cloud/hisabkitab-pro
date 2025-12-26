# Database Migration Strategy

## ✅ Completed Infrastructure

1. **IndexedDB Database Wrapper** (`src/database/db.ts`)
   - Generic CRUD operations (getAll, getById, add, put, deleteById)
   - Index support for efficient queries
   - Database schema with all object stores (tables)

2. **Migration Script** (`src/database/migration.ts`)
   - Automatic migration from localStorage to IndexedDB
   - Migrates all data types (products, categories, customers, sales, etc.)
   - Tracks migration status to prevent duplicate migrations

3. **Database Provider Component** (`src/components/DatabaseProvider.tsx`)
   - Initializes database on app startup
   - Runs migration automatically
   - Shows loading state during migration
   - Handles errors gracefully

4. **Integration**
   - DatabaseProvider wraps the app in `App.tsx`
   - Migration runs automatically on first load
   - Data is migrated from localStorage to IndexedDB

## 📋 Current Status

### What Works Now:
- ✅ Database infrastructure is in place
- ✅ Migration runs automatically on app startup
- ✅ Data is copied from localStorage to IndexedDB
- ✅ Existing localStorage-based services still work (backward compatible)

### What Still Uses localStorage:
All services still use localStorage for read/write operations:
- `productService`
- `categoryService`
- `customerService`
- `supplierService`
- `saleService`
- `purchaseService`
- `stockAdjustmentService`
- `userService`
- `auditService`
- `notificationService`
- `settingsService`
- `paymentService`
- `salespersonService`
- `backupService`

## 🔄 Next Steps: Service Migration

To fully migrate to IndexedDB, each service needs to be updated. Here's the migration strategy:

### Option 1: Gradual Migration (Recommended)

**Pros:**
- Less risk
- Can test each service independently
- Maintains backward compatibility

**Process:**
1. Pick one service (start with `productService`)
2. Create async versions of all methods
3. Update the service to use IndexedDB operations
4. Update all components that use that service to handle async
5. Test thoroughly
6. Move to next service

**Example Migration Pattern:**

```typescript
// Before (localStorage - synchronous)
export const productService = {
  getAll: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  },
}

// After (IndexedDB - asynchronous)
import { getAll, put, getById, deleteById } from '../database/db'
import { STORES } from '../database/db'

export const productService = {
  getAll: async (includeArchived: boolean = false): Promise<Product[]> => {
    const products = await getAll<Product>(STORES.PRODUCTS)
    // Apply filters...
    return filtered
  },
}
```

### Option 2: Hybrid Approach (Alternative)

Create a sync wrapper that caches data in memory:

```typescript
// Cache data in memory, sync with IndexedDB in background
let productCache: Product[] | null = null

export const productService = {
  getAll: (): Product[] => {
    if (!productCache) {
      // Load from IndexedDB synchronously (using a sync adapter)
      // Or load on app startup and cache
    }
    return productCache || []
  },
  
  // Background sync
  sync: async () => {
    productCache = await getAll<Product>(STORES.PRODUCTS)
  }
}
```

**Pros:**
- Maintains synchronous interface
- Less code changes needed

**Cons:**
- More complex
- Potential data inconsistency
- Memory usage increases

### Option 3: Create Async Service Layer

Create new async services alongside existing ones:

- Keep `productService` (localStorage) working
- Create `productServiceDB` (IndexedDB) 
- Gradually migrate components to use `productServiceDB`
- Eventually remove `productService`

## 📝 Migration Checklist

### Phase 1: Core Services (Priority)
- [ ] `productService` & `categoryService`
- [ ] `customerService`
- [ ] `supplierService`

### Phase 2: Transaction Services
- [ ] `saleService`
- [ ] `purchaseService`
- [ ] `stockAdjustmentService`

### Phase 3: System Services
- [ ] `userService`
- [ ] `auditService`
- [ ] `notificationService`
- [ ] `settingsService`

### Phase 4: Advanced Services
- [ ] `paymentService`
- [ ] `salespersonService`
- [ ] `backupService`

## 🔧 Helper Functions Available

The database wrapper provides these functions:

```typescript
// Get all items
const items = await getAll<ItemType>(STORES.PRODUCTS)

// Get by ID
const item = await getById<ItemType>(STORES.PRODUCTS, id)

// Add new item
await add(STORES.PRODUCTS, newItem)

// Update item (adds if doesn't exist)
await put(STORES.PRODUCTS, updatedItem)

// Delete item
await deleteById(STORES.PRODUCTS, id)

// Get by index
const items = await getByIndex<ItemType>(STORES.PRODUCTS, 'category_id', categoryId)

// Clear all items
await clear(STORES.PRODUCTS)
```

## ⚠️ Important Notes

1. **Async/Await Required**: All IndexedDB operations are asynchronous, so services will need to use `async/await`

2. **Component Updates**: Components using services will need to handle async:
   ```typescript
   // Before
   const products = productService.getAll()
   
   // After
   useEffect(() => {
     async function loadProducts() {
       const products = await productService.getAll()
       setProducts(products)
     }
     loadProducts()
   }, [])
   ```

3. **Data Migration**: Migration only copies data once. After migration, localStorage can be cleared (optional).

4. **Backward Compatibility**: Currently, both localStorage and IndexedDB contain the same data. Services read from localStorage. Once a service is migrated to IndexedDB, it should write to both (during transition) or just IndexedDB.

5. **Testing**: Test each migrated service thoroughly before moving to the next one.

## 🚀 Quick Start: Migrating a Service

1. **Choose a service** (e.g., `productService`)

2. **Update imports**:
   ```typescript
   import { getAll, put, getById, deleteById, getByIndex } from '../database/db'
   import { STORES } from '../database/db'
   ```

3. **Convert methods to async**:
   - Add `async` to function signatures
   - Change return types to `Promise<T>`
   - Use `await` for database operations

4. **Update call sites**:
   - Find all places that use the service
   - Update to handle async/await
   - Usually in `useEffect` hooks or event handlers

5. **Test thoroughly**:
   - Create, read, update, delete operations
   - Verify data persists
   - Check performance

## 📊 Migration Progress

- **Infrastructure**: ✅ 100% Complete
- **Data Migration**: ✅ 100% Complete (automatic)
- **Service Migration**: ⏳ 0% Complete (ready to start)

## 💡 Recommendations

1. **Start Small**: Begin with `categoryService` (simpler, less dependencies)

2. **Test Incrementally**: Migrate one service, test it thoroughly, then move to the next

3. **Keep localStorage as Backup**: During migration, consider writing to both localStorage and IndexedDB for safety

4. **Monitor Performance**: IndexedDB should be faster for large datasets, but test to confirm

5. **Document Changes**: Update this document as you migrate each service




