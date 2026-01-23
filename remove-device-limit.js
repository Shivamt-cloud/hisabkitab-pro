// Run this in the browser console to remove old devices when device limit is reached
// This allows you to login even when device limit is exceeded

(async () => {
  try {
    console.log('🔧 Device Limit Removal Tool');
    console.log('='.repeat(60));
    
    // Get company ID from prompt or use 2 (from the error)
    const companyId = parseInt(prompt('Enter Company ID (from error message):') || '2');
    
    if (!companyId) {
      console.log('❌ Company ID required');
      return;
    }
    
    console.log(`\n📋 Checking devices for Company ID: ${companyId}`);
    
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('hisabkitab_db', 13);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Get all users for the company
    const usersTx = db.transaction('users', 'readonly');
    const usersStore = usersTx.objectStore('users');
    const usersRequest = usersStore.getAll();
    
    const users = await new Promise((resolve, reject) => {
      usersRequest.onsuccess = () => resolve(usersRequest.result);
      usersRequest.onerror = () => reject(usersRequest.error);
    });
    
    const companyUsers = users.filter(u => u.company_id === companyId);
    const companyUserIds = companyUsers.map(u => u.id);
    
    console.log(`\n👥 Found ${companyUsers.length} user(s) in company:`);
    companyUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    
    // Get all devices
    const devicesTx = db.transaction('user_devices', 'readonly');
    const devicesStore = devicesTx.objectStore('user_devices');
    const devicesRequest = devicesStore.getAll();
    
    const allDevices = await new Promise((resolve, reject) => {
      devicesRequest.onsuccess = () => resolve(devicesRequest.result);
      devicesRequest.onerror = () => reject(devicesRequest.error);
    });
    
    const companyDevices = allDevices.filter(d => 
      companyUserIds.includes(d.user_id) && d.is_active
    );
    
    console.log(`\n📱 Found ${companyDevices.length} active device(s):`);
    companyDevices.forEach((d, index) => {
      console.log(`${index + 1}. ${d.device_name || d.device_type || 'Unknown'} (User: ${d.user_id})`);
      console.log(`   Last accessed: ${d.last_accessed || 'Never'}`);
      console.log(`   Device ID: ${d.device_id}`);
    });
    
    if (companyDevices.length === 0) {
      console.log('\n✅ No active devices found. You should be able to login now.');
      db.close();
      return;
    }
    
    // Sort by last accessed (oldest first)
    companyDevices.sort((a, b) => {
      const dateA = a.last_accessed ? new Date(a.last_accessed).getTime() : 0;
      const dateB = b.last_accessed ? new Date(b.last_accessed).getTime() : 0;
      return dateA - dateB;
    });
    
    console.log('\n🗑️  Removing oldest device...');
    const oldestDevice = companyDevices[0];
    console.log(`Removing: ${oldestDevice.device_name || oldestDevice.device_type || 'Unknown Device'}`);
    
    // Deactivate the device
    const updateTx = db.transaction('user_devices', 'readwrite');
    const updateStore = updateTx.objectStore('user_devices');
    const deviceToUpdate = { ...oldestDevice, is_active: false };
    
    await new Promise((resolve, reject) => {
      const updateRequest = updateStore.put(deviceToUpdate);
      updateRequest.onsuccess = () => resolve(updateRequest.result);
      updateRequest.onerror = () => reject(updateRequest.error);
    });
    
    console.log('✅ Device removed successfully!');
    console.log('\n💡 You can now try logging in again.');
    console.log('   Refresh the page and attempt login.');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
