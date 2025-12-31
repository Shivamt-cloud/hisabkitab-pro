// Run this in the browser console on http://localhost:5173
// Copy and paste this entire script into the browser console

(async () => {
  try {
    console.log('🔍 Checking for user: test@hisabkitab.com');
    console.log('='.repeat(60));
    
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('hisabkitab_db', 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Get all users
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const request = store.getAll();
    
    const users = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Find test user
    const testUser = users.find(u => 
      u.email && u.email.toLowerCase() === 'test@hisabkitab.com'
    );
    
    console.log('\n📊 Results:');
    console.log('-'.repeat(60));
    
    if (testUser) {
      console.log('✅ USER FOUND!');
      console.log('\nUser Details:');
      console.log({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
        company_id: testUser.company_id || 'None (Admin)',
        user_code: testUser.user_code || 'Not set',
        hasPassword: !!testUser.password,
      });
    } else {
      console.log('❌ USER NOT FOUND');
      console.log('\nThe user with email "test@hisabkitab.com" does not exist.');
    }
    
    console.log('\n📋 All Users in Database:');
    console.log('-'.repeat(60));
    console.log(`Total Users: ${users.length}`);
    console.log('\nUser List:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Company ID: ${user.company_id || 'None'}`);
      console.log(`   User Code: ${user.user_code || 'Not set'}`);
      console.log('');
    });
    
    console.log('='.repeat(60));
    
    return testUser || null;
  } catch (error) {
    console.error('❌ Error checking user:', error);
    console.log('\n💡 Alternative: Go to System Settings → Users tab to see all users');
    return null;
  }
})();


