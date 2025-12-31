// Preload script - runs in renderer process before page loads
// Provides secure bridge between Electron and web content

const { contextBridge } = require('electron')

// Expose protected methods that allow the renderer process
// to use Node.js APIs safely
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // App info
  app: {
    getName: () => 'HisabKitab-Pro',
    getVersion: () => '1.0.0'
  }
})

// Log that preload script loaded
console.log('[Preload] Electron preload script loaded')

