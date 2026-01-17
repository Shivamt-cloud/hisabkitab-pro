# Clear Purchases - Browser Console Method

**IMPORTANT:** You must run this script from the browser console **WHILE ON YOUR APP PAGE** (http://localhost:5173), not from a standalone HTML file.

## Steps:

1. Open your app at **http://localhost:5173**
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Copy and paste this entire script:

```javascript
(async function() {
  console.log('🚀 Starting purchase clearing process...');
  
  const confirmed = confirm('⚠️ Are you absolutely sure you want to delete ALL purchase history? This cannot be undone!');
  if (!confirmed) {
    console.log('❌ Cancelled');
    return;
  }
  
  const finalConfirm = confirm('🔴 FINAL CONFIRMATION: This will delete ALL purchases. Click OK to proceed.');
  if (!finalConfirm) {
    console.log('❌ Cancelled');
    return;
  }
  
  try {
    const DB_NAME = 'hisabkitab_db';
    const DB_VERSION = 9;
    const STORE_NAME = 'purchases';
    
    console.log('Opening database...');
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('✅ Database opened');
    
    // Get all purchases first
    const tx1 = db.transaction([STORE_NAME], 'readonly');
    const store1 = tx1.objectStore(STORE_NAME);
    const getAllRequest = store1.getAll();
    
    const allPurchases = await new Promise((resolve, reject) => {
      getAllRequest.onsuccess = () => {
        console.log('✅ Retrieved purchases');
        resolve(getAllRequest.result || []);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
    
    console.log(`📊 Found ${allPurchases.length} purchase(s) to delete`);
    console.log('Purchases:', allPurchases);
    
    if (allPurchases.length === 0) {
      console.log('✅ Database is already empty');
      db.close();
      alert('✅ Database is already empty. No purchases to delete.');
      return;
    }
    
    // Delete all individually
    console.log('🗑️ Deleting purchases individually...');
    const tx2 = db.transaction([STORE_NAME], 'readwrite');
    const store2 = tx2.objectStore(STORE_NAME);
    
    let deletedCount = 0;
    const deletePromises = allPurchases.map((purchase, index) => {
      return new Promise((resolve, reject) => {
        const deleteRequest = store2.delete(purchase.id);
        deleteRequest.onsuccess = () => {
          deletedCount++;
          if ((index + 1) % 10 === 0) {
            console.log(`Deleted ${deletedCount}/${allPurchases.length}...`);
          }
          resolve();
        };
        deleteRequest.onerror = () => {
          console.error(`Failed to delete purchase ${purchase.id}:`, deleteRequest.error);
          reject(deleteRequest.error);
        };
      });
    });
    
    try {
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${deletedCount} purchases individually`);
      
      // Wait for transaction to complete
      await new Promise((resolve) => {
        tx2.oncomplete = () => {
          console.log('✅ Delete transaction completed');
          resolve();
        };
        tx2.onerror = () => {
          console.error('❌ Transaction error:', tx2.error);
          resolve();
        };
      });
    } catch (deleteError) {
      console.warn('⚠️ Some deletions failed, trying clear method...', deleteError);
      
      // Fallback: Use clear()
      const tx3 = db.transaction([STORE_NAME], 'readwrite');
      const store3 = tx3.objectStore(STORE_NAME);
      const clearRequest = store3.clear();
      
      await new Promise((resolve, reject) => {
        clearRequest.onsuccess = () => {
          console.log('✅ Clear successful');
          resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
      });
      
      await new Promise((resolve) => {
        tx3.oncomplete = () => resolve();
        tx3.onerror = () => resolve();
      });
    }
    
    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const tx4 = db.transaction([STORE_NAME], 'readonly');
    const store4 = tx4.objectStore(STORE_NAME);
    const countRequest = store4.count();
    
    const remainingCount = await new Promise((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });
    
    console.log(`📊 Remaining purchases: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.warn(`⚠️ ${remainingCount} purchases still remain. Trying final clear...`);
      
      const tx5 = db.transaction([STORE_NAME], 'readwrite');
      const store5 = tx5.objectStore(STORE_NAME);
      const finalClearRequest = store5.clear();
      
      await new Promise((resolve, reject) => {
        finalClearRequest.onsuccess = () => {
          console.log('✅ Final clear successful');
          resolve();
        };
        finalClearRequest.onerror = () => reject(finalClearRequest.error);
      });
      
      await new Promise((resolve) => {
        tx5.oncomplete = () => resolve();
        tx5.onerror = () => resolve();
      });
    }
    
    db.close();
    console.log('✅ Database closed');
    
    alert(`✅ Successfully cleared ${allPurchases.length} purchase(s)! Refreshing page...`);
    location.reload();
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message + '\n\nCheck console for details.');
  }
})();
```

5. Press **Enter**
6. Confirm when prompted (twice)
7. Wait for the success message
8. The page will refresh automatically

## Verify Purchases Exist (Before Clearing):

Run this to see how many purchases exist:

```javascript
(async function() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('hisabkitab_db', 9);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const tx = db.transaction(['purchases'], 'readonly');
  const store = tx.objectStore('purchases');
  const request = store.getAll();
  
  request.onsuccess = () => {
    const purchases = request.result || [];
    console.log(`📊 Found ${purchases.length} purchase(s)`);
    console.log('Purchases:', purchases);
    alert(`Found ${purchases.length} purchase(s) in database`);
    db.close();
  };
  
  request.onerror = () => {
    console.error('Error:', request.error);
    db.close();
  };
})();
```


