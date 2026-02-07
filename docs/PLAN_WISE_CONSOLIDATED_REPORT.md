# Plan-wise consolidated report – Basic / Standard / Premium

Single reference for what each plan **includes** and what is **removed/not available**. Basic is the cheapest and most restricted; Premium has everything.

---

## Quick comparison

| | Basic (cheapest) | Standard | Premium |
|---|------------------|----------|---------|
| **Devices** | 1 device + 1 mobile | 3 devices + 1 mobile | Unlimited |
| **Users** | Single user only | Single login; sales persons supported | Multi-user + company admin |
| **Focus** | Sell, buy, stock, basic reports | + Expenses, daily report, team features | + Full reports, automation, backup |

---

# BASIC PLAN (cheapest)

## Included

### Products & inventory
- View products list
- Add product
- Edit product
- Bulk operations (import/export products)
- Price lists
- Stock alerts
- Reorder list (low stock view)
- Stock adjustment
- Stock adjustment history
- Categories & sub-categories (view, add, edit)

### Sales
- New sale
- Quick sale
- Sales returns
- View invoice
- Customers list
- Add / Edit customer

### Purchases & suppliers
- Purchase history (view)
- New GST purchase
- New simple purchase
- Edit purchase (GST / Simple)
- Suppliers list
- Add / Edit supplier
- Supplier account view
- Supplier payment (new / edit)
- Supplier check (new / edit)
- Upcoming checks

### Reports
- Sales reports
- Purchase reports
- Profit analysis

### Settings & tools
- System settings (basic: company name, essential options)
- Barcode label settings
- Receipt printer settings
- Dashboard
- Notifications
- Subscription payments
- User manual

---

## Not included (removed / restricted in Basic)

### Products
- Delete product (use edit to deactivate or hide instead)

### Sales
- Sales history (full list of past sales)
- Customer insights (analytics)
- Outstanding payments (customer dues)

### Purchases
- Delete purchase
- Purchase reorders (reorder workflow)
- Reorder form / Edit reorder

### Expenses & daily report
- Expenses list
- Add / Edit / Delete expense
- Opening / Closing balance (cash denominations)
- Daily report

### Users & team
- Sales persons
- Category commissions
- Category assignments
- Sales category management
- User management
- Company management

### Reports
- Expense reports
- Comparative reports
- Commission reports
- Daily activity report
- Analytics dashboard
- CA reports
- Audit logs

### Settings & automation
- Automated exports
- Business overview
- Backup & restore
- IndexedDB / debug tools

---

# STANDARD PLAN

## Included

**Everything in Basic, plus:**

### Products
- Delete product

### Sales
- Sales history
- Customer insights
- Outstanding payments

### Purchases
- Delete purchase
- Purchase reorders (list)
- Reorder form / Edit reorder

### Expenses & daily report
- Expenses list
- Add / Edit / Delete expense
- Opening / Closing balance (cash denominations, manual extra, remark)
- Daily report (with manual entries and remarks)

### Users & team (sales persons only)
- Sales persons list
- Add / Edit sales person
- Category commissions
- Category assignments
- Sales category management

### Reports
- Expense reports
- Comparative reports
- Commission reports
- Daily activity report
- Analytics dashboard
- Report export

### Settings
- Full system settings (no automation / backup)

---

## Not included (removed / restricted in Standard)

### Users & company
- User management (add / edit app users)
- Company management (admin)

### Reports
- CA reports
- Audit logs

### Settings & automation
- Automated exports
- Business overview
- Backup & restore
- IndexedDB / debug tools

---

# PREMIUM PLAN

## Included

**Everything in Standard, plus:**

### Users & company
- User management (add / edit / delete app users)
- Company management (admin only)

### Reports
- CA reports
- Audit logs

### Settings & automation
- Automated exports
- Business overview
- Backup & restore
- IndexedDB / debug (for support)

---

## Not included

- None; all listed features are available on Premium.

---

# Summary tables (plan-wise)

## Basic – Included vs removed

| Area | Included | Removed |
|------|----------|---------|
| **Products** | List, add, edit, bulk, price lists, stock alerts, reorder list, stock adjust, adjustments history, categories | Delete product |
| **Sales** | New sale, quick sale, returns, view invoice, customers, add/edit customer | Sales history, customer insights, outstanding payments |
| **Purchases** | History, new GST/simple, edit, suppliers, account, payment, check, upcoming checks | Delete purchase, reorders (workflow) |
| **Expenses** | — | Entire module (list, add, edit, delete, daily report) |
| **Users/team** | — | Sales persons, commissions, assignments, user/company management |
| **Reports** | Sales, purchase, profit | Expense, comparative, commission, daily activity, analytics, CA, audit |
| **Settings** | Basic settings, barcode, receipt printer | Automated exports, business overview, backup, debug |

---

## Standard – Extra over Basic / Removed vs Premium

| Area | Added over Basic | Still removed (vs Premium) |
|------|------------------|----------------------------|
| **Products** | Delete product | — |
| **Sales** | Sales history, customer insights, outstanding payments | — |
| **Purchases** | Delete purchase, reorders (list + form + edit) | — |
| **Expenses** | Full module + daily report | — |
| **Users/team** | Sales persons, commissions, assignments, category management | User management, company management |
| **Reports** | Expense, comparative, commission, daily activity, analytics, export | CA reports, audit logs |
| **Settings** | Full system settings | Automated exports, business overview, backup, debug |

---

## Premium – Extra over Standard

| Area | Added over Standard |
|------|---------------------|
| **Users/company** | User management, company management (admin) |
| **Reports** | CA reports, audit logs |
| **Settings** | Automated exports, business overview, backup & restore, debug |

---

# Implementation checklist (plan-wise)

- [ ] **Basic:** Gate by plan: no expenses routes, no daily report, no sales history, no customer insights, no outstanding, no reorders, no sales persons / commissions / assignments, no expense/comparative/commission/daily/analytics/CA/audit reports, no product delete, no purchase delete, no automated exports / business overview / backup.
- [ ] **Standard:** Allow all Basic features + the “Added over Basic” list; keep User management, Company management, CA reports, Audit logs, Automated exports, Business overview, Backup restricted.
- [ ] **Premium:** Allow all features; no plan-based restrictions.
- [ ] **UI:** Dashboard and navigation show/hide menu items and cards by plan (Basic / Standard / Premium).
- [ ] **Upgrade prompts:** Show “Available in Standard” or “Available in Premium” when a restricted feature is accessed.

---

*Use this document to confirm what to provide and what to remove per plan, then implement plan checks (e.g. subscription_tier) in routes and nav.*
