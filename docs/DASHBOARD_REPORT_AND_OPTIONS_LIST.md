# Dashboard – Report Summary & Sales / Purchase Options List

Lists taken from the Dashboard: **Report summary cards** and **Sales & Purchase options** (as shown on the report summary side and the Sales & Purchase options side).

---

## 1. Report summary (summary cards on Dashboard)

These are the cards that show key numbers. Visibility is controlled by permissions (sales:read, purchases:read, products:read, reports:read).

| # | Title | Description / Link | Permission to see |
|---|--------|---------------------|--------------------|
| 1 | **Total Sales** | Today’s sales value, % change vs last period | sales:read |
| 2 | **Total Purchases** | Today’s purchases value, % change | purchases:read |
| 3 | **Total Profit** | Profit value, margin % | sales:read |
| 4 | **Total Products** | Count of products | products:read |
| 5 | **Low Stock Alert** | Count of low-stock products; click → `/stock/alerts` | products:read |
| 6 | **Out of Stock** | Count of out-of-stock products; click → `/stock/alerts` | products:read |
| 7 | **Upcoming Checks** | Count and total of upcoming supplier checks; click → `/checks/upcoming` | purchases:read (reports:read for card) |

---

## 2. Sales options (Sales side)

From `allSalesOptions`; filtered by permission and (for Sales History) admin role.

| # | Title | Description | Link | Permission |
|---|--------|--------------|------|------------|
| 1 | **Quick Sale** | Scan barcode → auto-add → pay (fast checkout) | `/sales/quick` | sales:create |
| 2 | **New Sale** | Create a new sales invoice (full form) | `/sales/new` | sales:create |
| 3 | **New Sale Tab** | Open sale form in new tab (for multiple customers) | `/sales/new` (new tab) | sales:create |
| 4 | **Sales History** | View all sales *(Admin Only)* | `/sales/history` | sales:read + admin role |

---

## 3. Purchase options (Purchase side)

From `allPurchaseOptions`; filtered by permission (Sales & Category Management also checks users:read / sales_persons:read).

| # | Title | Description | Link | Permission |
|---|--------|--------------|------|------------|
| 1 | **Customers** | Manage customer database | `/customers` | sales:read |
| 2 | **Suppliers** | Manage supplier contacts | `/suppliers` | purchases:read |
| 3 | **Sales & Category Management** | Manage sales persons, categories, commissions & assignments | `/sales-category-management` | users:read or sales_persons:read |
| 4 | **GST Purchase** | Create purchase with GST details | `/purchases/new-gst` | purchases:create |
| 5 | **Simple Purchase** | Create purchase without GST | `/purchases/new-simple` | purchases:create |
| 6 | **Purchase History** | View all purchase records | `/purchases/history` | purchases:read |
| 7 | **Upcoming Checks** | View and manage upcoming supplier checks | `/checks/upcoming` | purchases:read |

---

## 4. Expense options (Expenses side)

From `allExpenseOptions`; filtered by permission.

| # | Title | Description | Link | Permission |
|---|--------|--------------|------|------------|
| 1 | **Daily Expenses** | Manage and track daily business expenses | `/expenses` | expenses:read |
| 2 | **Daily Report** | View comprehensive daily business summary | `/daily-report` | expenses:read |

---

## 5. Report links (under Report summary / Reports section)

Buttons shown when user has `reports:read` (and `sales:read` where noted). These are the “report” links on the report summary side.

| # | Label | Link |
|---|--------|------|
| 1 | Daily Activity Report | `/reports/daily-activity` |
| 2 | View Sales Reports | `/reports/sales` |
| 3 | View Purchase Reports | `/reports/purchases` |
| 4 | Profit Analysis | `/reports/profit-analysis` |
| 5 | Expense Reports | `/reports/expenses` |
| 6 | Comparative Reports (Month vs Month, Year vs Year) | `/reports/comparative` |
| 7 | Customer Insights | `/customers/insights` *(requires sales:read)* |
| 8 | View Commission Reports | `/reports/commissions` |
| 9 | CA Reports (GSTR-1, GSTR-2, GSTR-3B) | `/reports/ca` |
| 10 | Outstanding Payments | `/payments/outstanding` *(requires sales:read)* |

---

## 6. Cash Flow Overview (Dashboard)

| Metric | Example | Note |
|--------|---------|------|
| CASH | ₹1,25,518 | |
| UPI | ₹1,500 | |
| CARD | ₹1,900 | |
| OTHER | ₹200 | |
| CREDIT | ₹0 | |
| **TOTAL SALE** | ₹1,29,108 | |
| **TOTAL EXPENSES** | ₹500 | |
| **NET CASH** | ₹64,540 | (outflow) |

---

## 7. Top 5 Products (Period)

| # | Product Name | Amount (₹) |
|---|--------------|------------|
| 1 | demoProduct | 1,14,000 |
| 2 | Saroj Saree | 13,000 |
| 3 | Sample Product 2 | 2,185 |
| 4 | (slot 4) | — |
| 5 | (slot 5) | — |

---

## 8. Top 5 Customers (Period)

| # | Customer Name | Amount (₹) |
|---|---------------|------------|
| 1 | Walk-in Customer | 1,24,485 |
| 2 | Shalini | 3,790 |
| 3 | muskan | 833 |
| 4 | (slot 4) | — |
| 5 | (slot 5) | — |

---

## 9. Outstanding Summary (Dashboard)

| Type | Amount | Invoices | Link |
|------|--------|----------|------|
| Receivables (from customers) | ₹0 | 0 invoice(s) | View lists |
| Payables (to suppliers) | ₹1,45,710 | 5 invoice(s) | View lists |

---

## 10. Sales Target (Dashboard)

| Action | Link |
|--------|------|
| Set goal | Settings / Dashboard |

| Period | Current | Goal |
|--------|---------|------|
| Daily | ₹0 | ₹400 |
| Monthly | ₹1,26,808 | ₹4,000 |

---

## 11. Plain list (copy-paste)

### Report summary cards
- Total Sales  
- Total Purchases  
- Total Profit  
- Total Products  
- Low Stock Alert  
- Out of Stock  
- Upcoming Checks  

### Sales options
- Quick Sale  
- New Sale  
- New Sale Tab  
- Sales History (Admin Only)  

### Purchase options
- Customers  
- Suppliers  
- Sales & Category Management  
- GST Purchase  
- Simple Purchase  
- Purchase History  
- Upcoming Checks  

### Expense options
- Daily Expenses  
- Daily Report  

### Report links
- Daily Activity Report
- View Sales Reports
- View Purchase Reports
- Profit Analysis
- Expense Reports
- Comparative Reports (Month vs Month, Year vs Year)
- Customer Insights
- View Commission Reports
- CA Reports (GSTR-1, GSTR-2, GSTR-3B)
- Outstanding Payments

### Cash Flow Overview
- CASH, UPI, CARD, OTHER, CREDIT
- TOTAL SALE, TOTAL EXPENSES, NET CASH (inflow/outflow)

### Top 5 Products (Period)
- Product name, Amount (₹)

### Top 5 Customers (Period)
- Customer name, Amount (₹)

### Outstanding Summary
- Receivables (from customers): amount, invoice(s), View lists
- Payables (to suppliers): amount, invoice(s), View lists

### Sales Target
- Set goal
- Daily: current of goal
- Monthly: current of goal

---

*Source: `src/pages/Dashboard.tsx` (report summary: `reportsData`; Sales: `allSalesOptions`; Purchase: `allPurchaseOptions`; Expense: `allExpenseOptions`; report links: inline buttons).*
