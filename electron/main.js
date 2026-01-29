const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

// Keep a global reference of the window object
let mainWindow

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    icon: path.join(__dirname, '../public/icons/icon-512x512.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // Don't show until ready
  })

  // Load the app
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Focus on window
    if (isDev) {
      mainWindow.focus()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    if (isDev) {
      // Allow localhost in dev
      if (parsedUrl.origin !== 'http://localhost:5173') {
        event.preventDefault()
      }
    } else {
      // In production, only allow file:// protocol
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault()
      }
    }
  })
}

// IPC: list printers
ipcMain.handle('printers:list', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow() || mainWindow
    if (!win) return []
    const printers = await win.webContents.getPrintersAsync()
    // Return only safe fields
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName,
      isDefault: p.isDefault,
      status: p.status,
      description: p.description,
      options: p.options,
    }))
  } catch (e) {
    console.error('[IPC] printers:list failed', e)
    return []
  }
})

// IPC: print HTML to a selected printer
ipcMain.handle('print:html', async (_event, payload) => {
  try {
    const { html, silent, deviceName, pageSize } = payload || {}
    if (!html || typeof html !== 'string') {
      return { ok: false, error: 'Missing html' }
    }

    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    await printWin.loadURL(dataUrl)

    // Wait until window load handlers run (e.g., JsBarcode rendering), then a short delay.
    try {
      await printWin.webContents.executeJavaScript(
        `new Promise(resolve => {
           if (document.readyState === 'complete') return resolve(true);
           window.addEventListener('load', () => resolve(true), { once: true });
         })`
      )
      await new Promise(r => setTimeout(r, 350))
    } catch (e) {
      // Best effort; continue to print even if waiting fails
      console.warn('[IPC] print:html wait-for-load failed', e)
    }

    const printOptions = {
      silent: !!silent,
      printBackground: true,
    }
    if (deviceName && typeof deviceName === 'string') {
      printOptions.deviceName = deviceName
    }
    // Optional: Electron supports pageSize in some environments; keep best-effort
    if (pageSize) {
      printOptions.pageSize = pageSize
    }

    return await new Promise((resolve) => {
      printWin.webContents.print(printOptions, (success, failureReason) => {
        printWin.close()
        if (!success) {
          resolve({ ok: false, error: failureReason || 'Print failed' })
        } else {
          resolve({ ok: true })
        }
      })
    })
  } catch (e) {
    console.error('[IPC] print:html failed', e)
    return { ok: false, error: e?.message || String(e) }
  }
})

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Fullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HisabKitab-Pro',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HisabKitab-Pro',
              message: 'HisabKitab-Pro',
              detail: 'Comprehensive Inventory Management System\nVersion 1.0.0'
            })
          }
        }
      ]
    }
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'About ' + app.getName() },
        { type: 'separator' },
        { role: 'services', label: 'Services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide ' + app.getName() },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Show All' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit ' + app.getName() }
      ]
    })

    // Window menu
    template[4].submenu = [
      { role: 'close', label: 'Close' },
      { role: 'minimize', label: 'Minimize' },
      { role: 'zoom', label: 'Zoom' },
      { type: 'separator' },
      { role: 'front', label: 'Bring All to Front' }
    ]
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App event handlers
app.whenReady().then(() => {
  createWindow()
  createMenu()

  // Check for updates (only in production)
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...')
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version)
})

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available')
})

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err)
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version)
  // Optionally show notification to user
})


