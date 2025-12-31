// ROBUST Script to clear all purchases from IndexedDB
// This script tries multiple methods to ensure all purchases are deleted
// Run this in browser console (F12 -> Console tab) while on your app page

(async function() {
  console.log('🚀 Starting robust purchase clearing process...');
  
  // Double confirmation
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
    // Method 1: Use the app's service method if available
    try {
      console.log('📋 Method 1: Trying to use app service methods...');
      
      // Try to access the purchase service through the window object or import
      // First, let's try the database clear method directly
      const dbModule = await import('./src/database/db.js');
      const { clear, STORES } = dbModule;
      
      console.log('✅ Database module imported successfully');
      await clear(STORES.PURCHASES);
      console.log('✅ Method 1: Clear via service successful');
      
      alert('✅ Successfully cleared all purchases! Page will refresh now.');
      location.reload();
      return;
    } catch (serviceError) {
      console.warn('⚠️ Method 1 failed:', serviceError);
      console.log('📋 Trying Method 2: Direct IndexedDB access...');
    }
    
    // Method 2: Direct IndexedDB access with delete all
    const DB_NAME = 'hisabkitab_db';
    const DB_VERSION = 9;
    const STORE_NAME = 'purchases';
    
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('✅ Database opened successfully');
    
    // First, get all purchases to delete them individually
    const tx1 = db.transaction([STORE_NAME], 'readonly');
    const store1 = tx1.objectStore(STORE_NAME);
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
    
    // Method 2a: Delete all individually
    console.log('🗑️ Deleting purchases individually...');
    const tx2 = db.transaction([STORE_NAME], 'readwrite');
    const store2 = tx2.objectStore(STORE_NAME);
    
    let deletedCount = 0;
    const deletePromises = allPurchases.map(purchase => {
      return new Promise((resolve, reject) => {
        const deleteRequest = store2.delete(purchase.id);
        deleteRequest.onsuccess = () => {
          deletedCount++;
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
      console.log(`✅ Method 2a: Deleted ${deletedCount} purchases individually`);
      
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
    } catch (deleteError) {
      console.warn('⚠️ Individual delete failed, trying clear method...', deleteError);
      
      // Method 2b: Use clear() as fallback
      const tx3 = db.transaction([STORE_NAME], 'readwrite');
      const store3 = tx3.objectStore(STORE_NAME);
      const clearRequest = store3.clear();
      
      await new Promise((resolve, reject) => {
        clearRequest.onsuccess = () => {
          console.log(`✅ Method 2b: Clear successful`);
          resolve();
        };
        clearRequest.onerror = () => {
          console.error('❌ Clear error:', clearRequest.error);
          reject(clearRequest.error);
        };
      });
      
      await new Promise((resolve) => {
        tx3.oncomplete = () => {
          console.log('✅ Clear transaction completed');
          resolve();
        };
        tx3.onerror = () => {
          console.error('❌ Clear transaction error:', tx3.error);
          resolve();
        };
      });
    }
    
    // Verify deletion
    const tx4 = db.transaction([STORE_NAME], 'readonly');
    const store4 = tx4.objectStore(STORE_NAME);
    const verifyRequest = store4.count();
    
    const remainingCount = await new Promise((resolve, reject) => {
      verifyRequest.onsuccess = () => resolve(verifyRequest.result);
      verifyRequest.onerror = () => reject(verifyRequest.error);
    });
    
    console.log(`📊 Remaining purchases: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.warn(`⚠️ Warning: ${remainingCount} purchases still remain. Trying one more clear...`);
      
      const tx5 = db.transaction([STORE_NAME], 'readwrite');
      const store5 = tx5.objectStore(STORE_NAME);
      const finalClearRequest = store5.clear();
      
      await new Promise((resolve, reject) => {
        finalClearRequest.onsuccess = () => {
          console.log(`✅ Final clear successful`);
          resolve();
        };
        finalClearRequest.onerror = () => {
          console.error('❌ Final clear error:', finalClearRequest.error);
          reject(finalClearRequest.error);
        };
      });
      
      await new Promise((resolve) => {
        tx5.oncomplete = () => resolve();
        tx5.onerror = () => resolve();
      });
    }
    
    db.close();
    console.log('✅ Database closed');
    
    alert(`✅ Successfully cleared ${allPurchases.length} purchase(s)! Page will refresh now.`);
    location.reload();
    
  } catch (error) {
    console.error('❌ Error clearing purchases:', error);
    alert('❌ Error: ' + error.message + '\n\nCheck browser console for details.');
  }
})();

