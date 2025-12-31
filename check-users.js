// Run this in the browser console on http://localhost:5173
// Copy and paste this entire script into the browser console

(async () => {
  try {
    // Import the user service (this will work in the browser context)
    const { userService } = await import('./src/services/userService.ts')
    
    const users = await userService.getAll()
    
    console.log('='.repeat(50))
    console.log(`Total Users in System: ${users.length}`)
    console.log('='.repeat(50))
    console.log('\nUser Details:')
    console.log('-'.repeat(50))
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   User Code: ${user.user_code || 'Not set'}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Company ID: ${user.company_id || 'None (Admin)'}`)
      console.log(`   User ID: ${user.id}`)
    })
    
    console.log('\n' + '='.repeat(50))
    console.log(`Summary:`)
    console.log(`  - Total Users: ${users.length}`)
    console.log(`  - Admin Users: ${users.filter(u => u.role === 'admin').length}`)
    console.log(`  - Manager Users: ${users.filter(u => u.role === 'manager').length}`)
    console.log(`  - Staff Users: ${users.filter(u => u.role === 'staff').length}`)
    console.log(`  - Viewer Users: ${users.filter(u => u.role === 'viewer').length}`)
    console.log(`  - Users with Company: ${users.filter(u => u.company_id).length}`)
    console.log(`  - Users without Company: ${users.filter(u => !u.company_id).length}`)
    console.log('='.repeat(50))
    
    return users
  } catch (error) {
    console.error('Error fetching users:', error)
    console.log('\nAlternative: Go to System Settings → Users tab to see all users')
  }
})()




