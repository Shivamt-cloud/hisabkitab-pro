# Clear Purchase History

This guide shows you how to clear all purchase history from the database.

## Method: Using Browser Console (Recommended)

1. Open your application in the browser (http://localhost:5173)
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Copy and paste this entire code block and press Enter:

```javascript
(async function() {
  console.log('Starting to clear all purchases...');
  
  const confirmed = confirm('⚠️ Are you absolutely sure you want to delete ALL purchase history? This cannot be undone!');
  if (!confirmed) {
    console.log('❌ Cancelled by user');
    return;
  }
  
  const finalConfirm = confirm('🔴 FINAL CONFIRMATION: This will delete ALL purchases. Click OK to proceed.');
  if (!finalConfirm) {
    console.log('❌ Cancelled by user');
    return;
  }
  
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('hisabkitab_db', 9);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('✅ Database opened successfully');
    
    // Get all purchases first to count them
    const tx1 = db.transaction(['purchases'], 'readonly');
    const store1 = tx1.objectStore('purchases');
    const getAllRequest = store1.getAll();
    
    const allPurchases = await new Promise((resolve, reject) => {
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
    
    console.log(`📊 Found ${allPurchases.length} purchases to delete`);
    
    if (allPurchases.length === 0) {
      console.log('ℹ️ No purchases found. Database is already empty.');
      db.close();
      alert('No purchases found. Database is already empty.');
      return;
    }
    
    // Clear the store
    const tx2 = db.transaction(['purchases'], 'readwrite');
    const store2 = tx2.objectStore('purchases');
    const clearRequest = store2.clear();
    
    await new Promise((resolve, reject) => {
      clearRequest.onsuccess = () => {
        console.log(`✅ Successfully cleared ${allPurchases.length} purchases!`);
        resolve();
      };
      clearRequest.onerror = () => {
        console.error('❌ Error clearing:', clearRequest.error);
        reject(clearRequest.error);
      };
    });
    
    // Wait for transaction to complete
    await new Promise((resolve) => {
      tx2.oncomplete = () => {
        console.log('✅ Transaction completed');
        resolve();
      };
      tx2.onerror = () => {
        console.error('❌ Transaction error:', tx2.error);
        resolve();
      };
    });
    
    db.close();
    console.log('✅ Database closed');
    
    alert(`✅ Successfully cleared ${allPurchases.length} purchases! Page will refresh now.`);
    location.reload();
    
  } catch (error) {
    console.error('❌ Error clearing purchases:', error);
    alert('❌ Error: ' + error.message + '\n\nCheck console for details.');
  }
})();
```

5. Confirm the deletion when prompted (twice for safety)
6. The page will automatically refresh after clearing

## Alternative: Delete via Browser DevTools

If the console method doesn't work, you can also delete via DevTools:

1. Press **F12** → Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
2. Expand **IndexedDB** → **hisabkitab_db** → **purchases**
3. Right-click on **purchases** store
4. Select **Clear** or **Delete database** (to delete everything)

## Important Notes

⚠️ **WARNING**: 
- This will permanently delete ALL purchase records
- This action cannot be undone
- Make sure you have a backup before clearing if you need to restore data
- Only purchases are deleted - products, suppliers, and other data remain intact

## After Clearing

After clearing purchases:
1. The purchase history page will show no purchases
2. You can now import your backup file again
3. The new import will use the improved logic that creates products from articles/barcodes
4. Search by article/barcode should work correctly after re-import
