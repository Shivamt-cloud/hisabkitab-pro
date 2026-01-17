# Sync Behavior with Deleted Records - Explanation

## Current Behavior

### Scenario: Record Deleted in Supabase but Exists in IndexedDB

**What Happens:**
1. User deletes a record in Supabase (or it gets deleted somehow)
2. Record still exists in IndexedDB (local storage)
3. When sync runs, the count-based sync detects IndexedDB has more records
4. **The deleted record will be recreated in Supabase** ✅

### Impact Analysis

**Positive Impact (Recovery Feature):**
- ✅ **Data Recovery**: If records were accidentally deleted in Supabase, they can be recovered from IndexedDB
- ✅ **Offline Safety**: Users working offline won't lose data if something gets deleted in cloud
- ✅ **Backup Function**: IndexedDB acts as a backup - deleted cloud data can be restored

**Potential Issues:**
- ⚠️ **Unintended Recreation**: If a record was intentionally deleted in Supabase, it will be recreated
- ⚠️ **Sync Conflicts**: If user intentionally deleted something in Supabase, it comes back after sync
- ⚠️ **No Two-Way Deletion**: Local deletions don't delete in Supabase (one-way sync for deletes)

## Current Sync Logic

The sync service:
1. ✅ Only syncs records FROM IndexedDB TO Supabase (one-way)
2. ✅ Checks if record exists in Supabase before creating
3. ✅ Uses unique identifiers (SKU, email, invoice number, etc.) to prevent duplicates
4. ❌ Does NOT check if record was deleted in Supabase
5. ❌ Does NOT delete records from IndexedDB if deleted in Supabase

## Solutions

### Option A: Current Behavior (Keep as-is)
**Pros:**
- Acts as data recovery mechanism
- Prevents accidental data loss
- Simple and safe

**Cons:**
- Deleted records will be recreated
- No two-way sync for deletions

### Option B: Two-Way Sync (Recommended for Production)
**How it works:**
1. Sync new records FROM IndexedDB TO Supabase (current behavior)
2. ALSO sync deletions FROM Supabase TO IndexedDB
3. If record exists in IndexedDB but not in Supabase, delete from IndexedDB

**Implementation:**
- Get all record IDs from Supabase
- Delete records from IndexedDB that don't exist in Supabase
- This ensures IndexedDB matches Supabase exactly

### Option C: Soft Delete Flag (Best Practice)
**How it works:**
1. Add `is_deleted` or `deleted_at` flag to all records
2. Instead of hard delete, mark records as deleted
3. Sync respects the deleted flag
4. Deleted records won't be recreated

**Implementation:**
- Add `is_deleted: boolean` or `deleted_at: timestamp` field
- Filter deleted records during sync
- Never recreate records marked as deleted

### Option D: User Choice (Flexible)
**How it works:**
- Add sync options in UI:
  - "Sync new records only" (current behavior - recreates deleted)
  - "Two-way sync" (deletes local records if deleted in cloud)
  - "Full sync" (syncs everything both ways)

## Recommendation

**For Production Use:**
I recommend **Option B (Two-Way Sync)** because:
1. ✅ Prevents unintended record recreation
2. ✅ Keeps IndexedDB and Supabase in sync
3. ✅ Users see the same data everywhere
4. ✅ Handles deletions properly

**Implementation Steps:**
1. Get all record IDs from Supabase
2. Get all record IDs from IndexedDB
3. Find records in IndexedDB that don't exist in Supabase
4. Delete those records from IndexedDB (or mark as deleted)
5. Then sync new records from IndexedDB to Supabase

Would you like me to implement Option B (Two-Way Sync)?
