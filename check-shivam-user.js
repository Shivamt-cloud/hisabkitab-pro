// Run this in the browser console on http://localhost:5173
// Copy and paste this entire script into the browser console

(async () => {
  try {
    console.log('🔍 Checking for user: shivam@hisabkitab.com');
    console.log('='.repeat(60));
    
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('hisabkitab_db', 13);
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
    
    // Find shivam user
    const shivamUser = users.find(u => 
      u.email && u.email.toLowerCase() === 'shivam@hisabkitab.com'
    );
    
    console.log('\n📊 Results:');
    console.log('-'.repeat(60));
    
    if (shivamUser) {
      console.log('✅ USER FOUND!');
      console.log('\nUser Details:');
      console.log({
        id: shivamUser.id,
        name: shivamUser.name,
        email: shivamUser.email,
        role: shivamUser.role,
        company_id: shivamUser.company_id || 'None (Admin)',
        user_code: shivamUser.user_code || 'Not set',
        hasPassword: !!shivamUser.password,
        passwordLength: shivamUser.password ? shivamUser.password.length : 0,
        passwordSet: shivamUser.password ? 'Yes' : '❌ NO PASSWORD SET!',
      });
      
      // Test login verification
      console.log('\n🔐 Testing Login Verification:');
      console.log('-'.repeat(60));
      
      // Import userService (if available in window)
      if (window.userService) {
        const testPassword = prompt('Enter password to test:');
        if (testPassword) {
          const result = await window.userService.verifyLogin('shivam@hisabkitab.com', testPassword);
          console.log('Login test result:', result ? '✅ SUCCESS' : '❌ FAILED');
        }
      } else {
        console.log('⚠️ userService not available in window. Testing password match manually...');
        console.log('Password stored:', shivamUser.password ? `"${shivamUser.password}" (length: ${shivamUser.password.length})` : 'NOT SET');
      }
    } else {
      console.log('❌ USER NOT FOUND');
      console.log('\nThe user with email "shivam@hisabkitab.com" does not exist.');
    }
    
    console.log('\n📋 All Users in Database:');
    console.log('-'.repeat(60));
    console.log(`Total Users: ${users.length}`);
    console.log('\nUser List:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No name'} (${user.email}) - Role: ${user.role} - Has Password: ${!!user.password}`);
    });
    
    db.close();
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('-'.repeat(60));
    console.log('1. If password is NOT SET, you need to set it using User Management');
    console.log('2. If password is set but login fails, check for:');
    console.log('   - Password mismatch (case-sensitive)');
    console.log('   - Device limit reached (if user has company_id)');
    console.log('   - Check browser console for error messages');
    console.log('\n3. To reset password, use User Management page or run:');
    console.log('   await userService.update(userId, { password: "newpassword" })');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
