import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Products from './pages/Products'
import BulkOperations from './pages/BulkOperations'
import ProductForm from './pages/ProductForm'
import PurchaseHistory from './pages/PurchaseHistory'
import GSTPurchaseForm from './pages/GSTPurchaseForm'
import SimplePurchaseForm from './pages/SimplePurchaseForm'
import SalesHistory from './pages/SalesHistory'
import SaleForm from './pages/SaleForm'
import QuickSale from './pages/QuickSale'
import Rentals from './pages/Rentals'
import RentForm from './pages/RentForm'
import RentalView from './pages/RentalView'
import RentReports from './pages/RentReports'
import Suppliers from './pages/Suppliers'
import SupplierForm from './pages/SupplierForm'
import SupplierAccount from './pages/SupplierAccount'
import SupplierPaymentForm from './pages/SupplierPaymentForm'
import SupplierCheckForm from './pages/SupplierCheckForm'
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
import CustomerInsights from './pages/CustomerInsights'
import CustomerForm from './pages/CustomerForm'
import InvoiceView from './pages/InvoiceView'
import StockAlerts from './pages/StockAlerts'
import ReorderList from './pages/ReorderList'
import ReorderForm from './pages/ReorderForm'
import ReorderEditForm from './pages/ReorderEditForm'
import PurchaseReorders from './pages/PurchaseReorders'
import StockAdjustmentForm from './pages/StockAdjustmentForm'
import StockAdjustmentHistory from './pages/StockAdjustmentHistory'
import SalesReports from './pages/SalesReports'
import PurchaseReports from './pages/PurchaseReports'
import ProfitAnalysis from './pages/ProfitAnalysis'
import ExpenseReports from './pages/ExpenseReports'
import ComparativeReports from './pages/ComparativeReports'
import PriceLists from './pages/PriceLists'
import AutomatedExports from './pages/AutomatedExports'
import CAReports from './pages/CAReports'
import OutstandingPayments from './pages/OutstandingPayments'
import SystemSettings from './pages/SystemSettings'
import BackupRestore from './pages/BackupRestore'
import AuditLogs from './pages/AuditLogs'
import BarcodeLabelSettings from './pages/BarcodeLabelSettings'
import ReceiptPrinterSettings from './pages/ReceiptPrinterSettings'
import BusinessOverview from './pages/BusinessOverview'
import SubscriptionPayments from './pages/SubscriptionPayments'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import Notifications from './pages/Notifications'
import IndexedDBInspector from './pages/IndexedDBInspector'
import DailyActivity from './pages/DailyActivity'
import Expenses from './pages/Expenses'
import ExpenseForm from './pages/ExpenseForm'
import DailyReport from './pages/DailyReport'
import UpcomingChecks from './pages/UpcomingChecks'
import UserManual from './pages/UserManual'
import { DatabaseProvider } from './components/DatabaseProvider'
import { LicenseGuard } from './components/LicenseGuard'
import { LicenseExpiredBanner } from './components/LicenseExpiredBanner'
import { UpdateBanner } from './components/UpdateBanner'
import { UpgradeBanner } from './components/UpgradeBanner'
import { OfflineBanner } from './components/OfflineBanner'
import { GlobalSearch } from './components/GlobalSearch'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { ToastProvider } from './context/ToastContext'
import { PlanUpgradeProvider } from './context/PlanUpgradeContext'
import { Toast } from './components/Toast'

// Lazy load to prevent import errors from breaking the app
// const BackupRestore = lazy(() => import('./pages/BackupRestore'))

function App() {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <ToastProvider>
        <PlanUpgradeProvider>
        <Router>
          <LicenseGuard>
            <LicenseExpiredBanner />
            <UpdateBanner />
            <UpgradeBanner />
            <OfflineBanner />
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/user-manual" element={<UserManual />} />
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
            path="/products/bulk-operations"
            element={
              <ProtectedRoute requiredPermission="products:update">
                <BulkOperations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/price-lists"
            element={
              <ProtectedRoute requiredPermission="products:read">
                <PriceLists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/automated-exports"
            element={
              <ProtectedRoute requiredPermission="settings:update" requiredRole="admin">
                <AutomatedExports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/history"
            element={
              <ProtectedRoute requiredPermission="purchases:read" requiredPlanFeature="purchase_history">
                <PurchaseHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/new-gst"
            element={
              <ProtectedRoute requiredPermission="purchases:create" requiredPlanFeature="purchase_gst">
                <GSTPurchaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/reorder/:id/edit"
            element={
              <ProtectedRoute requiredPermission="purchases:create" requiredPlanFeature="purchase_reorder">
                <ReorderEditForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/reorder"
            element={
              <ProtectedRoute requiredPermission="purchases:create" requiredPlanFeature="purchase_reorder">
                <ReorderForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/reorders"
            element={
              <ProtectedRoute requiredPlanFeature="purchase_reorder">
                <PurchaseReorders />
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
                <QuickSale />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rentals"
            element={
              <ProtectedRoute requiredPermission="sales:read" requiredPlanFeature="sales_rent">
                <Rentals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rentals/new"
            element={
              <ProtectedRoute requiredPermission="sales:create" requiredPlanFeature="sales_rent">
                <RentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rentals/:id/edit"
            element={
              <ProtectedRoute requiredPermission="sales:create" requiredPlanFeature="sales_rent">
                <RentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rentals/:id"
            element={
              <ProtectedRoute requiredPermission="sales:read" requiredPlanFeature="sales_rent">
                <RentalView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rentals/report"
            element={
              <ProtectedRoute requiredPermission="sales:read" requiredPlanFeature="sales_rent">
                <RentReports />
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
            path="/subscription/payments"
            element={
              <ProtectedRoute>
                <SubscriptionPayments />
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
            path="/suppliers/:id/account"
            element={
              <ProtectedRoute requiredPermission="purchases:read">
                <SupplierAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:supplierId/payment/new"
            element={
              <ProtectedRoute requiredPermission="purchases:create">
                <SupplierPaymentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:supplierId/payment/:id/edit"
            element={
              <ProtectedRoute requiredPermission="purchases:update">
                <SupplierPaymentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:supplierId/check/new"
            element={
              <ProtectedRoute requiredPermission="purchases:create">
                <SupplierCheckForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:supplierId/check/:id/edit"
            element={
              <ProtectedRoute requiredPermission="purchases:update">
                <SupplierCheckForm />
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
              <ProtectedRoute requiredPermission="users:read" requiredPlanFeature="purchase_sales_category_mgmt">
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
            path="/customers/insights"
            element={
              <ProtectedRoute requiredPermission="sales:read">
                <CustomerInsights />
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
            path="/stock/reorder"
            element={
              <ProtectedRoute requiredPermission="products:read" requiredPlanFeature="purchase_reorder">
                <ReorderList />
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
            path="/reports/purchases"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <PurchaseReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/profit-analysis"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <ProfitAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/expenses"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <ExpenseReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/comparative"
            element={
              <ProtectedRoute requiredPermission="reports:read" requiredPlanFeature="report_comparative">
                <ComparativeReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/ca"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <CAReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/outstanding"
            element={
              <ProtectedRoute requiredPermission="sales:read" requiredPlanFeature="report_outstanding">
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
              <ProtectedRoute requiredPermission="settings:update" requiredRole="admin">
                <IndexedDBInspector />
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
            path="/settings/barcode-label"
            element={
              <ProtectedRoute requiredPermission="barcode_label_settings:read" requiredRole="admin">
                <BarcodeLabelSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/receipt-printer"
            element={
              <ProtectedRoute requiredPermission="receipt_printer_settings:read" requiredRole="admin">
                <ReceiptPrinterSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business-overview"
            element={
              <ProtectedRoute requiredPermission="business_overview:read">
                <BusinessOverview />
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
            path="/reports/daily-activity"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <DailyActivity />
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
          <Route
            path="/expenses"
            element={
              <ProtectedRoute requiredPermission="expenses:read">
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/new"
            element={
              <ProtectedRoute requiredPermission="expenses:create">
                <ExpenseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/:id/edit"
            element={
              <ProtectedRoute requiredPermission="expenses:update">
                <ExpenseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-report"
            element={
              <ProtectedRoute requiredPermission="expenses:read" requiredPlanFeature="expense_daily_report">
                <DailyReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checks/upcoming"
            element={
              <ProtectedRoute requiredPermission="purchases:read" requiredPlanFeature="purchase_upcoming_checks">
                <UpcomingChecks />
              </ProtectedRoute>
            }
          />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <GlobalSearch />
            <KeyboardShortcuts />
            <Toast />
          </LicenseGuard>
        </Router>
        </PlanUpgradeProvider>
        </ToastProvider>
      </DatabaseProvider>
    </AuthProvider>
  )
}

export default App
