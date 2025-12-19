import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import PurchaseHistory from './pages/PurchaseHistory'
import GSTPurchaseForm from './pages/GSTPurchaseForm'
import SimplePurchaseForm from './pages/SimplePurchaseForm'
import SalesHistory from './pages/SalesHistory'
import SaleForm from './pages/SaleForm'
import Suppliers from './pages/Suppliers'
import SupplierForm from './pages/SupplierForm'
import SalesPersons from './pages/SalesPersons'
import SalesPersonForm from './pages/SalesPersonForm'
import CategoryCommissions from './pages/CategoryCommissions'
import CategoryCommissionForm from './pages/CategoryCommissionForm'
import SubCategories from './pages/SubCategories'
import SubCategoryForm from './pages/SubCategoryForm'
import SalesPersonCategoryAssignments from './pages/SalesPersonCategoryAssignments'
import SalesPersonCategoryAssignmentForm from './pages/SalesPersonCategoryAssignmentForm'
import CommissionReports from './pages/CommissionReports'
import SalesPersonManagement from './pages/SalesPersonManagement'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import InvoiceView from './pages/InvoiceView'
import StockAlerts from './pages/StockAlerts'
import StockAdjustmentForm from './pages/StockAdjustmentForm'
import StockAdjustmentHistory from './pages/StockAdjustmentHistory'
import SalesReports from './pages/SalesReports'
import OutstandingPayments from './pages/OutstandingPayments'
import SystemSettings from './pages/SystemSettings'
import BackupRestore from './pages/BackupRestore'
import UserManagement from './pages/UserManagement'
import UserForm from './pages/UserForm'
import AuditLogs from './pages/AuditLogs'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import Notifications from './pages/Notifications'
import IndexedDBInspector from './pages/IndexedDBInspector'
import { DatabaseProvider } from './components/DatabaseProvider'
import { LicenseGuard } from './components/LicenseGuard'
import { LicenseExpiredBanner } from './components/LicenseExpiredBanner'

// Lazy load to prevent import errors from breaking the app
// const BackupRestore = lazy(() => import('./pages/BackupRestore'))

function App() {
  return (
    <DatabaseProvider>
      <AuthProvider>
        <LicenseGuard>
          <Router>
            <LicenseExpiredBanner />
          <LicenseExpiredBanner />
          <Routes>
            <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute requiredPermission="products:read">
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/new"
            element={
              <ProtectedRoute requiredPermission="products:create">
                <ProductForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <ProtectedRoute requiredPermission="products:update">
                <ProductForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/history"
            element={
              <ProtectedRoute requiredPermission="purchases:read">
                <PurchaseHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/new-gst"
            element={
              <ProtectedRoute requiredPermission="purchases:create">
                <GSTPurchaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/new-simple"
            element={
              <ProtectedRoute requiredPermission="purchases:create">
                <SimplePurchaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/:id/edit-gst"
            element={
              <ProtectedRoute requiredPermission="purchases:update">
                <GSTPurchaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/:id/edit-simple"
            element={
              <ProtectedRoute requiredPermission="purchases:update">
                <SimplePurchaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/new"
            element={
              <ProtectedRoute requiredPermission="sales:create">
                <SaleForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/quick"
            element={
              <ProtectedRoute requiredPermission="sales:create">
                <SaleForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/history"
            element={
              <ProtectedRoute requiredPermission="sales:read" requiredRole="admin">
                <SalesHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/returns"
            element={
              <ProtectedRoute requiredPermission="sales:update">
                <SaleForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute requiredPermission="purchases:read">
                <Suppliers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/new"
            element={
              <ProtectedRoute requiredPermission="purchases:create">
                <SupplierForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id/edit"
            element={
              <ProtectedRoute requiredPermission="purchases:update">
                <SupplierForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-persons"
            element={
              <ProtectedRoute requiredPermission="users:read">
                <SalesPersons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-persons/new"
            element={
              <ProtectedRoute requiredPermission="users:create">
                <SalesPersonForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-persons/:id/edit"
            element={
              <ProtectedRoute requiredPermission="users:update">
                <SalesPersonForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/category-commissions"
            element={
              <ProtectedRoute requiredPermission="users:read">
                <CategoryCommissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/category-commissions/new"
            element={
              <ProtectedRoute requiredPermission="users:create">
                <CategoryCommissionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/category-commissions/:id/edit"
            element={
              <ProtectedRoute requiredPermission="users:update">
                <CategoryCommissionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sub-categories"
            element={
              <ProtectedRoute requiredPermission="products:read">
                <SubCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sub-categories/new"
            element={
              <ProtectedRoute requiredPermission="products:create">
                <SubCategoryForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sub-categories/:id/edit"
            element={
              <ProtectedRoute requiredPermission="products:update">
                <SubCategoryForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-person-category-assignments"
            element={
              <ProtectedRoute requiredPermission="users:read">
                <SalesPersonCategoryAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-person-category-assignments/new"
            element={
              <ProtectedRoute requiredPermission="users:create">
                <SalesPersonCategoryAssignmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-person-category-assignments/:id/edit"
            element={
              <ProtectedRoute requiredPermission="users:update">
                <SalesPersonCategoryAssignmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/commissions"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <CommissionReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-category-management"
            element={
              <ProtectedRoute requiredPermission="users:read">
                <SalesPersonManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute requiredPermission="sales:read">
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/new"
            element={
              <ProtectedRoute requiredPermission="sales:create">
                <CustomerForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id/edit"
            element={
              <ProtectedRoute requiredPermission="sales:update">
                <CustomerForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoice/:id"
            element={
              <ProtectedRoute requiredPermission="sales:read">
                <InvoiceView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock/alerts"
            element={
              <ProtectedRoute requiredPermission="products:read">
                <StockAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock/adjust"
            element={
              <ProtectedRoute requiredPermission="products:update">
                <StockAdjustmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock/adjustments"
            element={
              <ProtectedRoute requiredPermission="products:read">
                <StockAdjustmentHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/sales"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <SalesReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/outstanding"
            element={
              <ProtectedRoute requiredPermission="sales:read">
                <OutstandingPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPermission="settings:update">
                <SystemSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/backup-restore"
            element={
              <ProtectedRoute requiredPermission="products:update">
                <BackupRestore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug/indexeddb"
            element={
              <ProtectedRoute requiredPermission="settings:update">
                <IndexedDBInspector />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredPermission="users:read">
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/new"
            element={
              <ProtectedRoute requiredPermission="users:create">
                <UserForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id/edit"
            element={
              <ProtectedRoute requiredPermission="users:update">
                <UserForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LicenseGuard>
        </Router>
      </AuthProvider>
    </DatabaseProvider>
  )
}

export default App
