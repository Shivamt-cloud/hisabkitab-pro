# HisabKitab-Pro Application Architecture & How It Works

**A Comprehensive Guide to Understanding the Inventory Management System**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Storage](#data-storage)
4. [User Flow](#user-flow)
5. [Key Features Explained](#key-features-explained)
6. [Technical Stack](#technical-stack)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## 1. Overview

**HisabKitab-Pro** is an offline-first inventory management system designed for small to medium businesses. It helps manage:
- Products and inventory
- Sales and purchases
- Customers and suppliers
- Stock tracking and adjustments
- Reports and analytics
- Multi-company support

### Key Characteristics:
- ✅ **Offline-First** - Works without internet
- ✅ **Multi-Company** - Supports multiple companies
- ✅ **Role-Based Access** - Admin, Manager, Staff, Viewer roles
- ✅ **Cloud Sync** - Users and companies sync to cloud
- ✅ **Automatic Backups** - Daily backups at 12 PM & 6 PM

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         React Application (Frontend)              │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │   Pages      │  │  Components  │              │  │
│  │  │  (UI Views)  │  │  (Reusable)  │              │  │
│  │  └──────────────┘  └──────────────┘              │  │
│  │           │                │                      │  │
│  │           └────────┬────────┘                      │  │
│  │                    │                               │  │
│  │  ┌─────────────────▼─────────────────┐            │  │
│  │  │      Services Layer                │            │  │
│  │  │  (Business Logic)                  │            │  │
│  │  └─────────────────┬─────────────────┘            │  │
│  │                    │                               │  │
│  │  ┌─────────────────▼─────────────────┐            │  │
│  │  │      Database Layer                 │            │  │
│  │  │  (IndexedDB Wrapper)                │            │  │
│  │  └─────────────────┬─────────────────┘            │  │
│  └────────────────────┼───────────────────────────────┘  │
│                       │                                    │
│  ┌────────────────────▼────────────────────┐             │
│  │         IndexedDB (Browser)              │             │
│  │  (Local Database - All Business Data)   │             │
│  └─────────────────────────────────────────┘             │
│                                                             │
│  ┌─────────────────────────────────────────┐             │
│  │      localStorage (Session Only)         │             │
│  │  (User Session, Migration Flags)        │             │
│  └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ (Internet Connection)
                        │
┌───────────────────────▼───────────────────────────────────┐
│              Supabase (Cloud)                              │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  PostgreSQL DB   │  │  Storage Buckets │             │
│  │  - users         │  │  - backups-admin │             │
│  │  - companies     │  │  - backups-*     │             │
│  └──────────────────┘  └──────────────────┘             │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Data Storage

### 3.1 Local Storage (IndexedDB)

**What is stored locally:**
- ✅ All business data (products, sales, purchases, customers, etc.)
- ✅ Settings and configurations
- ✅ Audit logs and notifications
- ✅ Automatic backups

**Why IndexedDB:**
- Fast performance
- Large storage capacity (much more than localStorage)
- Works offline
- Structured data storage (like a database)

**Storage Structure:**
```
IndexedDB (hisabkitab_db)
├── companies (Company information)
├── products (Product catalog)
├── categories (Product categories)
├── customers (Customer database)
├── suppliers (Supplier database)
├── sales (Sales transactions)
├── purchases (Purchase transactions)
├── stock_adjustments (Inventory adjustments)
├── users (User accounts - local cache)
├── audit_logs (Activity tracking)
├── notifications (System notifications)
├── settings (System settings)
├── payment_records (Payment tracking)
├── payment_transactions (Payment history)
├── sales_persons (Sales team)
├── category_commissions (Commission rates)
├── sales_commissions (Calculated commissions)
├── sales_person_category_assignments (Team assignments)
├── user_permissions (Custom permissions)
└── automatic_backups (Local backup copies)
```

### 3.2 Cloud Storage (Supabase)

**What is stored in cloud:**
- ✅ **Users** - All user accounts (for multi-device access)
- ✅ **Companies** - All company information (for admin management)
- ✅ **Backups** - Automatic backups (for disaster recovery)

**Why Cloud for Users/Companies:**
- Access from multiple devices
- Admin can manage users/companies from anywhere
- Data survives PC format/corruption
- Automatic sync between devices

**Why Cloud for Backups:**
- Protection against PC failure
- Can restore after PC format
- 3-day rolling retention
- Automatic cleanup

### 3.3 Session Storage (localStorage)

**What is stored in localStorage:**
- ✅ Current user session (`hisabkitab_user`)
- ✅ Migration flags (`hisabkitab_migration_complete`)
- ✅ License information (if applicable)

**Why localStorage:**
- Simple key-value storage
- Persists across page refreshes
- Perfect for session data
- Not used for business data

---

## 4. User Flow

### 4.1 Application Startup

```
1. User opens application
   ↓
2. DatabaseProvider initializes
   ├── Opens IndexedDB connection
   ├── Runs migration (if needed)
   ├── Initializes admin user (if first time)
   └── Starts time-based backup service
   ↓
3. AuthContext loads
   ├── Checks localStorage for user session
   ├── If found: Loads user from IndexedDB
   └── If not: Shows login page
   ↓
4. User logs in
   ├── Validates credentials (IndexedDB)
   ├── Loads user permissions
   ├── Sets company context
   └── Redirects to Dashboard
   ↓
5. Dashboard loads
   ├── Fetches sales data (async)
   ├── Fetches purchase data (async)
   ├── Fetches product data (async)
   ├── Calculates statistics
   └── Displays summary cards
```

### 4.2 Typical User Workflow

#### Scenario: Creating a Sale

```
1. User clicks "New Sale" button
   ↓
2. SaleForm component loads
   ├── Loads products (async from IndexedDB)
   ├── Loads customers (async from IndexedDB)
   ├── Loads sales persons (async from IndexedDB)
   └── Displays empty form
   ↓
3. User adds items
   ├── Searches for product (by name/barcode/article)
   ├── Selects product from list
   ├── Enters quantity
   ├── System calculates:
   │   ├── Unit price (from product)
   │   ├── Purchase price (from purchase history)
   │   ├── Discount (if any)
   │   └── Total (quantity × unit_price - discount)
   └── Adds item to cart
   ↓
4. User completes sale
   ├── Selects customer (optional)
   ├── Selects sales person (optional)
   ├── Chooses payment method(s)
   └── Clicks "Complete Sale"
   ↓
5. System processes sale
   ├── Validates data
   ├── Generates invoice number
   ├── Calculates totals
   ├── Updates stock (reduces quantity)
   ├── Creates sale record in IndexedDB
   ├── Creates payment record
   ├── Creates audit log entry
   └── Generates notification (if low stock)
   ↓
6. Success
   ├── Shows invoice
   ├── Updates dashboard statistics
   └── Redirects to invoice view
```

#### Scenario: Making a Purchase

```
1. User clicks "New Purchase" (GST or Simple)
   ↓
2. PurchaseForm loads
   ├── Loads suppliers (async)
   ├── Loads products (async)
   └── Displays form
   ↓
3. User adds items
   ├── Selects supplier
   ├── Adds products with:
   │   ├── Purchase price
   │   ├── Quantity
   │   ├── HSN code
   │   ├── GST rate
   │   └── Article code (optional)
   ├── System generates barcodes (if needed)
   └── Calculates totals
   ↓
4. User completes purchase
   ├── Enters invoice number
   ├── Selects payment status
   └── Clicks "Save Purchase"
   ↓
5. System processes purchase
   ├── Validates data
   ├── Creates purchase record
   ├── Updates stock (increases quantity)
   ├── Creates payment record
   ├── Generates barcodes (if needed)
   └── Creates audit log
   ↓
6. Success
   └── Redirects to purchase history
```

---

## 5. Key Features Explained

### 5.1 Multi-Company Support

**How it works:**
- Each company has a unique ID
- All business data (products, sales, purchases) is tagged with `company_id`
- Users are assigned to a company
- Admin users can switch between companies
- Data is isolated by company

**Example:**
```
Company 1 (ID: 1)
├── Products (company_id: 1)
├── Sales (company_id: 1)
└── Purchases (company_id: 1)

Company 2 (ID: 2)
├── Products (company_id: 2)
├── Sales (company_id: 2)
└── Purchases (company_id: 2)
```

### 5.2 Role-Based Access Control

**Roles:**
- **Admin** - Full access, can manage companies and users
- **Manager** - Can manage products, sales, purchases
- **Staff** - Can create sales and purchases
- **Viewer** - Read-only access

**How it works:**
- Each user has a role
- Permissions are checked before each action
- Custom permissions can override role permissions
- Protected routes check permissions

### 5.3 Stock Management

**FIFO/LIFO Tracking:**
- Each purchase item has a unique article code
- Sales track which purchase item was sold
- System maintains accurate stock levels
- Supports multiple batches of same product

**Stock Updates:**
- **On Purchase:** Stock increases
- **On Sale:** Stock decreases
- **On Return:** Stock increases
- **On Adjustment:** Stock manually adjusted

### 5.4 Automatic Backups

**Schedule:**
- 12:00 PM daily
- 6:00 PM daily

**Process:**
```
1. Time-based backup service triggers
   ↓
2. Creates backup of all data
   ├── Exports all companies
   ├── Exports all users
   ├── Exports all business data
   └── Compresses data (gzip)
   ↓
3. Saves locally (IndexedDB)
   ↓
4. Uploads to cloud (Supabase Storage)
   ├── Admin backups → backups-admin bucket
   └── Company backups → backups-company-{id} bucket
   ↓
5. Cleans up old backups (3-day retention)
   └── Deletes backups older than 3 days
```

### 5.5 Offline Support

**How it works:**
- All data stored in IndexedDB (browser database)
- No server required for normal operations
- Works completely offline
- Cloud sync happens when online

**Offline Capabilities:**
- ✅ Create/edit/delete products
- ✅ Create sales and purchases
- ✅ View reports
- ✅ Manage customers/suppliers
- ✅ All CRUD operations

**Online Requirements:**
- User login (first time, then cached)
- Cloud backup upload
- User/company sync

---

## 6. Technical Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation

### Data Storage
- **IndexedDB** - Local database (via wrapper)
- **Supabase** - Cloud database & storage
- **localStorage** - Session storage

### Services
- **Supabase Client** - Cloud API
- **IndexedDB Wrapper** - Database operations
- **Service Layer** - Business logic

---

## 7. Data Flow Diagrams

### 7.1 Creating a Sale

```
User Input
    ↓
SaleForm Component
    ↓
saleService.create()
    ↓
IndexedDB (sales store)
    ├── Stock Update (productService.updateStock)
    ├── Payment Record (paymentService.create)
    ├── Audit Log (auditService.log)
    └── Notification (notificationService.create)
    ↓
UI Update (Dashboard, Reports)
```

### 7.2 Backup Process

```
Time-Based Scheduler (12 PM / 6 PM)
    ↓
backupService.createAutomaticBackup()
    ↓
Export All Data
    ├── Companies
    ├── Users
    ├── Products
    ├── Sales
    └── ... (all data)
    ↓
Compress (gzip)
    ↓
Save Locally (IndexedDB - automatic_backups)
    ↓
Upload to Cloud (Supabase Storage)
    ├── backups-admin (for admin data)
    └── backups-company-{id} (for company data)
    ↓
Cleanup Old Backups (3-day retention)
```

### 7.3 User Login Flow

```
Login Page
    ↓
User enters credentials
    ↓
userService.verifyLogin()
    ↓
IndexedDB (users store)
    ├── Find user by email
    ├── Verify password (hashed)
    └── Return user data
    ↓
AuthContext
    ├── Store user in state
    ├── Save session (localStorage)
    ├── Load permissions
    └── Set company context
    ↓
Redirect to Dashboard
```

---

## 8. Key Concepts

### 8.1 Company Isolation

**Why:** Multi-tenant architecture - each company's data is separate

**How:**
- All queries filter by `company_id`
- Admin can see all companies
- Regular users only see their company
- Data is physically separated in database

### 8.2 Offline-First

**Why:** Works without internet, better user experience

**How:**
- All data in IndexedDB (browser database)
- No API calls for normal operations
- Cloud sync happens in background
- Graceful degradation when offline

### 8.3 Automatic Backups

**Why:** Protect against data loss

**How:**
- Scheduled backups (12 PM & 6 PM)
- Compressed storage (60-70% reduction)
- 3-day rolling retention
- Cloud storage for safety

### 8.4 Stock Tracking

**Why:** Accurate inventory management

**How:**
- FIFO/LIFO tracking via article codes
- Real-time stock updates
- Purchase history linked to sales
- Stock adjustments for corrections

---

## 9. Common Operations

### Adding a Product
1. Navigate to Products → Add New
2. Enter product details (name, SKU, category, etc.)
3. Save → Stored in IndexedDB
4. Product appears in product list

### Making a Sale
1. Navigate to Sales → New Sale
2. Add products to cart
3. Select customer (optional)
4. Complete payment
5. Sale saved → Stock updated → Invoice generated

### Viewing Reports
1. Navigate to Reports
2. Select time period
3. System queries IndexedDB
4. Calculates statistics
5. Displays charts and tables

---

## 10. Security & Permissions

### Authentication
- Users log in with email/password
- Passwords are hashed (not stored in plain text)
- Session stored in localStorage
- Auto-logout after inactivity

### Authorization
- Role-based permissions
- Custom permissions per user
- Protected routes check permissions
- API calls validate user context

---

## 11. Performance Optimizations

### Data Loading
- Parallel loading with `Promise.all()`
- Lazy loading for large lists
- Caching frequently accessed data
- IndexedDB indexes for fast queries

### UI Optimizations
- React component memoization
- Virtual scrolling for large lists
- Debounced search inputs
- Optimistic UI updates

---

## 12. Error Handling

### Offline Scenarios
- Graceful degradation
- Queue operations for retry
- Show offline indicators
- Cache data for offline use

### Error Recovery
- Try-catch blocks everywhere
- User-friendly error messages
- Automatic retry for network errors
- Log errors for debugging

---

## Summary

**HisabKitab-Pro** is a modern, offline-first inventory management system that:
- ✅ Stores all business data locally (IndexedDB)
- ✅ Syncs users/companies to cloud (Supabase)
- ✅ Works completely offline
- ✅ Supports multiple companies
- ✅ Has role-based access control
- ✅ Automatically backs up data
- ✅ Tracks inventory accurately
- ✅ Provides comprehensive reports

**The application is production-ready and designed for reliability, performance, and ease of use.**

---

**Questions?** Refer to the codebase or contact support! 🚀

