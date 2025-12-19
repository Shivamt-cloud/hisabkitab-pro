import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { initDB, STORES, getAll } from '../database/db'
import { Home, Database, CheckCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const IndexedDBInspector = () => {
  const navigate = useNavigate()
  const [storeData, setStoreData] = useState<Record<string, { count: number; sample?: any[] }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await initDB()
      const data: Record<string, { count: number; sample?: any[] }> = {}
      
      // Check each store
      for (const storeName of Object.values(STORES)) {
        try {
          const items = await getAll(storeName)
          data[storeName] = {
            count: items.length,
            sample: items.slice(0, 3) // First 3 items as sample
          }
        } catch (err: any) {
          data[storeName] = {
            count: -1, // Error indicator
          }
          console.error(`Error loading ${storeName}:`, err)
        }
      }
      
      setStoreData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load IndexedDB data')
      console.error('Error initializing database:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalItems = Object.values(storeData).reduce((sum, store) => {
    return sum + (store.count > 0 ? store.count : 0)
  }, 0)

  return (
    <ProtectedRoute requiredPermission="settings:update">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title="Back to Dashboard"
                >
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">IndexedDB Inspector</h1>
                  <p className="text-sm text-gray-600 mt-1">View data stored in IndexedDB</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Important Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Important Information</h3>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li><strong>Incognito Mode:</strong> Data in IndexedDB is NOT visible in incognito/private browsing mode. This is expected browser behavior for privacy reasons.</li>
                  <li><strong>Browser Isolation:</strong> Each browser (Chrome, Firefox, Safari) has its own separate IndexedDB storage. Data in Chrome will not be visible in Firefox.</li>
                  <li><strong>Profile Specific:</strong> Data is stored per browser profile. Different user profiles in the same browser have separate IndexedDB databases.</li>
                  <li><strong>Persistence:</strong> Data persists across browser sessions, tabs, and even after closing the browser (unless manually cleared).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-6 border border-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Database Summary</h2>
                  <p className="text-sm text-gray-600">Total items across all stores: {totalItems}</p>
                </div>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-12 border border-white/50 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading IndexedDB data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(storeData).map(([storeName, data]) => (
                <div
                  key={storeName}
                  className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {storeName.replace(/_/g, ' ')}
                    </h3>
                    {data.count >= 0 ? (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        data.count > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {data.count} {data.count === 1 ? 'item' : 'items'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                        Error
                      </span>
                    )}
                  </div>

                  {data.count > 0 && data.sample && data.sample.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Sample data (first {Math.min(3, data.count)} items):</p>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(data.sample, null, 2)}
                      </pre>
                    </div>
                  )}

                  {data.count === 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                      <p className="text-sm text-gray-500">No data in this store</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              How to Verify IndexedDB Data in Browser DevTools
            </h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Open your browser's Developer Tools (F12 or Right-click → Inspect)</li>
              <li>Go to the <strong>"Application"</strong> tab (Chrome/Edge) or <strong>"Storage"</strong> tab (Firefox)</li>
              <li>In the left sidebar, expand <strong>"IndexedDB"</strong></li>
              <li>Look for <strong>"hisabkitab_db"</strong> database</li>
              <li>Expand it to see all object stores and their data</li>
            </ol>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default IndexedDBInspector

