// Preload script - runs in renderer process before page loads
// Provides secure bridge between Electron and web content

const { contextBridge, ipcRenderer } = require('electron')

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
  },

  // Printing helpers (Electron only)
  printers: {
    list: () => ipcRenderer.invoke('printers:list'),
  },
  print: {
    html: (payload) => ipcRenderer.invoke('print:html', payload),
  },

  // Menu shortcut forwarding (Mac Cmd+S / Cmd+P, Alt+S / Alt+P are handled by OS; main sends IPC)
  subscribeAppSave: (callback) => {
    if (typeof callback === 'function') _appSaveCallback = callback
  },
  subscribeAppPrint: (callback) => {
    if (typeof callback === 'function') _appPrintCallback = callback
  },
  subscribeNavigateTo: (callback) => {
    if (typeof callback === 'function') _navigateToCallback = callback
  },
})

let _appSaveCallback = null
let _appPrintCallback = null
let _navigateToCallback = null
ipcRenderer.on('app-save', () => { if (_appSaveCallback) _appSaveCallback() })
ipcRenderer.on('app-print', () => { if (_appPrintCallback) _appPrintCallback() })
ipcRenderer.on('navigate-to', (_event, path) => { if (_navigateToCallback && path) _navigateToCallback(path) })

// Log that preload script loaded
console.log('[Preload] Electron preload script loaded')


