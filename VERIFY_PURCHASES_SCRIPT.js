// Copy and paste this entire script into the browser console (F12 -> Console tab)
// This will show you how many purchases exist in the database

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
    alert('Error: ' + request.error);
    db.close();
  };
})();


