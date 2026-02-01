import { Link } from 'react-router-dom'
import { Home, FileText, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const UserManual = () => {
  const { user, isLoading } = useAuth()
  // Show "Home" when logged in OR when still loading (avoids flashing "Back to Login" when opened from app/new tab)
  const showHomeLink = !!user || isLoading

  const handlePrintOrPdf = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print: hide header and show title */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .manual-content { max-width: 100%; padding: 0; }
          a[href] { text-decoration: none; color: inherit; }
        }
      `}</style>

      <header className="no-print bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {showHomeLink ? (
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900" title="Back to main page">
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
          ) : (
            <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-gray-900" title="Back to Login">
              <Home className="w-5 h-5" />
              <span>Back to Login</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handlePrintOrPdf}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 no-print"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 manual-content">
        <div className="bg-white rounded-xl shadow-sm border p-8 md:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            HisabKitab-Pro User Manual
          </h1>
          <p className="text-gray-600 mb-8">A simple, clear, step-by-step guide for daily users</p>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">About This Manual</h2>
            <p className="text-gray-700 leading-relaxed">
              This document is written for business owners, managers, and staff using HisabKitab-Pro for the first time or daily operations. You do not need accounting or technical knowledge to use this software. Each section explains what the feature is, why it is used, and how to use it step-by-step.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              HisabKitab-Pro is a complete inventory, billing, and business management system designed for small to medium businesses.
            </p>
            <h3 className="font-semibold text-gray-800 mb-2">What You Can Do</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
              <li>Manage products & stock</li>
              <li>Create sales bills (invoices)</li>
              <li>Record purchases (GST & non-GST)</li>
              <li>Manage customers & suppliers</li>
              <li>Track payments, expenses & profit</li>
              <li>View daily & monthly reports</li>
              <li>Use offline, sync to cloud when internet is available</li>
            </ul>
            <h3 className="font-semibold text-gray-800 mb-2">Subscription Plans (Summary)</h3>
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 border-b">Plan</th>
                  <th className="text-left px-4 py-2 border-b">Devices</th>
                  <th className="text-left px-4 py-2 border-b">Users</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr><td className="px-4 py-2 border-b">Basic</td><td className="px-4 py-2 border-b">1 Desktop + 1 Mobile</td><td className="px-4 py-2 border-b">3</td></tr>
                <tr><td className="px-4 py-2 border-b">Standard</td><td className="px-4 py-2 border-b">3 Desktops + 1 Mobile</td><td className="px-4 py-2 border-b">10</td></tr>
                <tr><td className="px-4 py-2">Premium</td><td className="px-4 py-2">Unlimited</td><td className="px-4 py-2">Unlimited</td></tr>
              </tbody>
            </table>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Login & Registration</h2>
            <h3 className="font-semibold text-gray-800 mb-2">2.1 Login</h3>
            <ol className="list-decimal pl-6 text-gray-700 space-y-1 mb-4">
              <li>Open the application URL</li>
              <li>Enter Email and Password</li>
              <li>Click Sign In</li>
              <li>You will be taken to the Dashboard</li>
            </ol>
            <p className="text-gray-600 mb-4">If Google login is enabled, you may use Sign in with Google.</p>
            <h3 className="font-semibold text-gray-800 mb-2">2.2 New Registration</h3>
            <ol className="list-decimal pl-6 text-gray-700 space-y-1">
              <li>Click Register / Request Access</li>
              <li>Fill business & contact details</li>
              <li>Select a subscription plan</li>
              <li>Submit the request</li>
              <li>After admin approval, login using provided credentials</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Dashboard (Your Home Screen)</h2>
            <h3 className="font-semibold text-gray-800 mb-2">What the Dashboard Shows</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
              <li>Total Sales, Purchases, Profit</li>
              <li>Low stock / Out of stock alerts</li>
              <li>Quick buttons for New Sale, Purchase, Customers</li>
              <li>Subscription status & validity</li>
              <li>Data Sync status</li>
            </ul>
            <h3 className="font-semibold text-gray-800 mb-2">Common Actions from Dashboard</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Click New Sale → Create bill</li>
              <li>Click Products → Manage stock</li>
              <li>Click Daily Report → View today&apos;s summary</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Products (Item Master)</h2>
            <p className="text-gray-700 mb-4">Purpose: Stores all items you sell or purchase.</p>
            <h3 className="font-semibold text-gray-800 mb-2">4.2 Add Product – Step by Step</h3>
            <ol className="list-decimal pl-6 text-gray-700 space-y-2 mb-4">
              <li><strong>Open Products</strong> – From Dashboard, click Products</li>
              <li><strong>Open Add Product Form</strong> – Click Add Product / New Product</li>
              <li><strong>Fill Product Details</strong> – Product Name (required), SKU, Barcode, Category, Purchase Price, Selling Price, Stock, Min Stock, Unit, HSN Code, GST Rate, Description, Image</li>
              <li><strong>Save</strong> – Click Save. Fix red-highlighted errors if any.</li>
              <li><strong>Next</strong> – Edit product, Use in Sale, Use in Purchase, Adjust stock later</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Sales (Billing)</h2>
            <p className="text-gray-700 mb-4">Purpose: Create sales invoices, record payments, and manage returns.</p>
            <h3 className="font-semibold text-gray-800 mb-2">5.1 Create a New Sale – Step by Step</h3>
            <p className="text-gray-600 mb-2">Before You Start: Products must be added; ensure stock is available; Customer optional (Walk-in allowed).</p>
            <ol className="list-decimal pl-6 text-gray-700 space-y-1 mb-4">
              <li>Open New Sale from Dashboard</li>
              <li>Select Customer or Walk-in</li>
              <li>Add Items: Search product → Select → Enter quantity → Click Add (Repeat)</li>
              <li>Review totals, add discount / notes if needed</li>
              <li>Enter Payment (Cash / UPI / Card)</li>
              <li>Click Complete Sale</li>
              <li>Print / Download Invoice</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Purchases</h2>
            <p className="text-gray-700 mb-4">Purpose: Record purchases, update stock, and track supplier payments.</p>
            <h3 className="font-semibold text-gray-800 mb-2">6.1 GST Purchase – Step by Step</h3>
            <p className="text-gray-600 mb-2">Before You Start: Products added; at least one supplier added.</p>
            <ol className="list-decimal pl-6 text-gray-700 space-y-1 mb-4">
              <li>Open GST Purchase</li>
              <li>Select Supplier, Date, Invoice No.</li>
              <li>Add Items (Product, Qty, Price, HSN, GST %, Article/Color/Size)</li>
              <li>Verify Subtotal, Tax, Total</li>
              <li>Select Payment Status & add notes</li>
              <li>Click Save Purchase</li>
              <li>Next: View/Edit, Pay Supplier, Create Return</li>
            </ol>
            <h3 className="font-semibold text-gray-800 mb-2">6.2 Simple Purchase – Step by Step</h3>
            <ol className="list-decimal pl-6 text-gray-700 space-y-1 mb-4">
              <li>Open Simple Purchase</li>
              <li>Select Supplier, Date, Invoice No.</li>
              <li>Add Items (Product, Qty, Price)</li>
              <li>Select Payment Status & Save</li>
              <li>Stock updates & purchase saved</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Customers</h2>
            <p className="text-gray-700 mb-4">Purpose: Maintain customer list for sales and credit.</p>
            <h3 className="font-semibold text-gray-800 mb-2">7.2 Add Customer – Step by Step</h3>
            <ol className="list-decimal pl-6 text-gray-700 space-y-1 mb-4">
              <li>From Dashboard, click Customers</li>
              <li>Click Add Customer</li>
              <li>Fill Name, Phone, Email, Address, GSTIN, Credit Limit, Outstanding</li>
              <li>Click Save</li>
              <li>Next: Edit details, Use in Sales, Track outstanding dues</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Suppliers</h2>
            <p className="text-gray-700 mb-4">Purpose: Maintain supplier list and track purchases & payments.</p>
            <h3 className="font-semibold text-gray-800 mb-2">Add a Supplier – Step by Step</h3>
            <ol className="list-decimal pl-6 text-gray-700 space-y-1 mb-4">
              <li>From Dashboard, click Suppliers</li>
              <li>Click Add Supplier</li>
              <li>Fill Name, Phone, Email, Address, GSTIN</li>
              <li>Click Save</li>
              <li>Next: Edit supplier, Use in GST/Simple Purchase, View Supplier Account, Record payment</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Sales Persons & Commission</h2>
            <p className="text-gray-700 mb-4">Use Case: For businesses paying commission to staff. Features: Add sales persons, Assign categories, Auto-calculate commission, View commission reports.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Expenses & Daily Report</h2>
            <p className="text-gray-700 mb-2"><strong>Daily Expenses:</strong> Opening cash, Closing cash, Transport / office expenses.</p>
            <p className="text-gray-700 mb-4"><strong>Daily Report:</strong> Sales, Purchases, Expenses, Net cash position.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Stock Management</h2>
            <p className="text-gray-700 mb-2"><strong>Stock Alerts:</strong> Low stock, Out of stock.</p>
            <p className="text-gray-700 mb-4"><strong>Stock Adjustment:</strong> Used when: Damage, Manual correction.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. Payments</h2>
            <p className="text-gray-700 mb-2"><strong>Outstanding Payments:</strong> Customer dues, Supplier dues.</p>
            <p className="text-gray-700 mb-4"><strong>Record Payment:</strong> Open sale or purchase → Add payment → Outstanding reduces automatically.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">13. Reports & Analytics</h2>
            <p className="text-gray-700 mb-4">Available Reports: Sales report, Product-wise profit, Daily activity, Commission report. Use filters for date & company.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">14. Backup & Restore</h2>
            <p className="text-gray-700 mb-2"><strong>Why Backup Is Important:</strong> Protects your business data.</p>
            <p className="text-gray-700 mb-4">Options: Cloud backup, Export JSON backup, Restore anytime.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">15. Notifications</h2>
            <p className="text-gray-700 mb-4">System alerts for: Low stock, Payment overdue. Access from bell icon.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">17. Subscription & Printer Settings</h2>
            <p className="text-gray-700 mb-2"><strong>Subscription:</strong> View validity, Recharge plan, Download payment receipts.</p>
            <p className="text-gray-700 mb-4"><strong>Barcode & Receipt Printer:</strong> Configure label size, Configure receipt format.</p>
          </section>

          <section className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Final Tip for Users</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Always sync data when internet is available</li>
              <li>Take regular backups</li>
              <li>Use Daily Report to track cash</li>
              <li>Check low-stock alerts daily</li>
            </ul>
          </section>

          <p className="text-center text-gray-600 font-medium">HisabKitab-Pro – Simple. Reliable. Business-Ready.</p>
        </div>
      </main>

      <div className="no-print max-w-4xl mx-auto px-4 py-6 text-center">
        <button
          type="button"
          onClick={handlePrintOrPdf}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-5 h-5" />
          Download PDF
        </button>
        <p className="text-sm text-gray-500 mt-2">Use &quot;Save as PDF&quot; or &quot;Print to PDF&quot; in the print dialog</p>
      </div>
    </div>
  )
}

export default UserManual
