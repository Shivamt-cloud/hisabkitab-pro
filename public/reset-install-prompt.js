// Quick script to reset PWA install prompt
// Run this in browser console (F12 → Console tab)

(function() {
  console.log('🔄 Resetting PWA install prompt state...')
  
  // Clear dismissed state
  localStorage.removeItem('pwa-install-dismissed')
  console.log('✅ Cleared dismissed state')
  
  // Reload page to trigger install prompt check
  console.log('🔄 Reloading page...')
  location.reload()
})()

// Alternative: Just clear without reload
// localStorage.removeItem('pwa-install-dismissed')
// Then manually refresh the page


