// Script to clear all purchases from IndexedDB
// Run this in browser console (F12 -> Console tab)

(async function() {
  console.log('Starting to clear all purchases...');
  
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
    // Open the database
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
        resolve(); // Still resolve to continue
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

