# Role-Based Feature List – Basic / Standard / Premium

This document lists **all application functionality** and proposes which **subscription plan** (Basic, Standard, Premium) gets access. Use it to implement plan-based feature gating across the app.

---

## Plan summary (proposed)

| Plan      | Devices              | Target user           | Feature scope                    |
|-----------|----------------------|------------------------|----------------------------------|
| **Basic** | 1 device + 1 mobile  | Single user / small shop | Core sales, purchases, products, basic reports |
| **Standard** | 3 devices + 1 mobile | Small team            | Basic + expenses, daily report, more reports, customers/suppliers full |
| **Premium** | Unlimited            | Multi-location / full team | All features including advanced reports, business overview, automation, backup, audit |

---

## 1. Products & inventory

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| View products list | `/products` | products:read | ✅ | ✅ | ✅ |
| Add product | `/products/new` | products:create | ✅ | ✅ | ✅ |
| Edit product | `/products/:id/edit` | products:update | ✅ | ✅ | ✅ |
| Delete product | (Products list) | products:delete | ❌ | ✅ | ✅ |
| Bulk operations | `/products/bulk-operations` | products:update | ✅ | ✅ | ✅ |
| Price lists | `/settings/price-lists` | products:read | ✅ | ✅ | ✅ |
| Stock alerts | `/stock/alerts` | products:read | ✅ | ✅ | ✅ |
| Reorder list (low stock) | `/stock/reorder` | products:read | ✅ | ✅ | ✅ |
| Stock adjustment | `/stock/adjust` | products:update | ✅ | ✅ | ✅ |
| Stock adjustment history | `/stock/adjustments` | products:read | ✅ | ✅ | ✅ |
| Categories & sub-categories | `/sub-categories`, `/sub-categories/new`, `/:id/edit` | products:read, create, update | ✅ | ✅ | ✅ |

**Scenarios:**  
- Basic: full product and stock management except delete (reduce accidental data loss).  
- Standard/Premium: full CRUD including delete.

---

## 2. Sales

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| New sale | `/sales/new` | sales:create | ✅ | ✅ | ✅ |
| Quick sale | `/sales/quick` | sales:create | ✅ | ✅ | ✅ |
| Sales returns | `/sales/returns` | sales:update | ✅ | ✅ | ✅ |
| Sales history | `/sales/history` | sales:read (admin role in code) | ❌ | ✅ | ✅ |
| View invoice | `/invoice/:id` | sales:read | ✅ | ✅ | ✅ |
| Customers list | `/customers` | sales:read | ✅ | ✅ | ✅ |
| Add/Edit customer | `/customers/new`, `/customers/:id/edit` | sales:create, sales:update | ✅ | ✅ | ✅ |
| Customer insights | `/customers/insights` | sales:read | ❌ | ✅ | ✅ |
| Outstanding payments | `/payments/outstanding` | sales:read | ❌ | ✅ | ✅ |

**Scenarios:**  
- Basic: do sales and view invoices; no sales history, customer insights, or outstanding.  
- Standard/Premium: full sales + history + insights + outstanding.

---

## 3. Purchases & suppliers

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| Purchase history | `/purchases/history` | purchases:read | ✅ | ✅ | ✅ |
| New GST purchase | `/purchases/new-gst` | purchases:create | ✅ | ✅ | ✅ |
| New simple purchase | `/purchases/new-simple` | purchases:create | ✅ | ✅ | ✅ |
| Edit purchase (GST/Simple) | `/purchases/:id/edit-gst`, `edit-simple` | purchases:update | ✅ | ✅ | ✅ |
| Delete purchase | (Purchase history) | purchases:delete | ❌ | ✅ | ✅ |
| Suppliers list | `/suppliers` | purchases:read | ✅ | ✅ | ✅ |
| Add/Edit supplier | `/suppliers/new`, `/:id/edit` | purchases:create, purchases:update | ✅ | ✅ | ✅ |
| Supplier account | `/suppliers/:id/account` | purchases:read | ✅ | ✅ | ✅ |
| Supplier payment (new/edit) | `/suppliers/:supplierId/payment/new`, `/:id/edit` | purchases:create, update | ✅ | ✅ | ✅ |
| Supplier check (new/edit) | `/suppliers/:supplierId/check/new`, `/:id/edit` | purchases:create, update | ✅ | ✅ | ✅ |
| Purchase reorders | `/purchases/reorders` | purchases:read | ❌ | ✅ | ✅ |
| Reorder form / edit | `/purchases/reorder`, `reorder/:id/edit` | purchases:create | ❌ | ✅ | ✅ |
| Upcoming checks | `/checks/upcoming` | purchases:read | ✅ | ✅ | ✅ |

**Scenarios:**  
- Basic: core purchase entry, suppliers, payments, checks; no delete, no reorder workflow.  
- Standard/Premium: full purchases including delete and reorder module.

---

## 4. Expenses & daily report

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| Expenses list | `/expenses` | expenses:read | ❌ | ✅ | ✅ |
| Add expense | `/expenses/new` | expenses:create | ❌ | ✅ | ✅ |
| Edit expense | `/expenses/:id/edit` | expenses:update | ❌ | ✅ | ✅ |
| Delete expense | (Expenses list) | expenses:delete | ❌ | ✅ | ✅ |
| Daily report | `/daily-report` | expenses:read | ❌ | ✅ | ✅ |

**Scenarios:**  
- Basic: no expenses module (keep plan simple).  
- Standard/Premium: full expenses + opening/closing + daily report.

---

## 5. Users, sales persons & commissions

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| Sales persons list | `/sales-persons` | users:read | ❌ | ✅ | ✅ |
| Add/Edit sales person | `/sales-persons/new`, `/:id/edit` | users:create, users:update | ❌ | ✅ | ✅ |
| Category commissions | `/category-commissions`, new, edit | users:read, create, update | ❌ | ✅ | ✅ |
| Category assignments | `/sales-person-category-assignments`, new, edit | users:read, create, update | ❌ | ✅ | ✅ |
| Sales category management | `/sales-category-management` | users:read | ❌ | ✅ | ✅ |
| User management | `/users` (via System Settings or nav) | users:read | ❌ | ❌ | ✅ |
| Add/Edit user | `/users/new`, `/:id/edit` | users:create, users:update | ❌ | ❌ | ✅ |
| Company management | `/company` (admin only in code) | users:read, admin role | ❌ | ❌ | ✅ (admin) |

**Scenarios:**  
- Basic: single user only; no sales persons, no user management.  
- Standard: sales persons + commissions + assignments; still single “company” user (no multi-user).  
- Premium: full user management + company (admin) where applicable.

---

## 6. Reports

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| Sales reports | `/reports/sales` | reports:read | ✅ | ✅ | ✅ |
| Purchase reports | `/reports/purchases` | reports:read | ✅ | ✅ | ✅ |
| Profit analysis | `/reports/profit-analysis` | reports:read | ✅ | ✅ | ✅ |
| Expense reports | `/reports/expenses` | reports:read | ❌ | ✅ | ✅ |
| Comparative reports | `/reports/comparative` | reports:read | ❌ | ✅ | ✅ |
| CA reports | `/reports/ca` | reports:read | ❌ | ❌ | ✅ |
| Commission reports | `/reports/commissions` | reports:read | ❌ | ✅ | ✅ |
| Daily activity | `/reports/daily-activity` | reports:read | ❌ | ✅ | ✅ |
| Analytics dashboard | `/analytics` | reports:read | ❌ | ✅ | ✅ |
| Audit logs | `/audit-logs` | reports:read | ❌ | ❌ | ✅ |

**Scenarios:**  
- Basic: sales, purchase, profit only.  
- Standard: + expense, comparative, commission, daily activity, analytics.  
- Premium: + CA reports, audit logs.

---

## 7. Settings & automation

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| System settings | `/settings` | settings:update | ✅ (limited*) | ✅ | ✅ |
| Automated exports | `/settings/automated-exports` | settings:update | ❌ | ❌ | ✅ |
| Barcode label settings | `/settings/barcode-label` | barcode_label_settings:read/update | ✅ | ✅ | ✅ |
| Receipt printer settings | `/settings/receipt-printer` | receipt_printer_settings:read/update | ✅ | ✅ | ✅ |
| Business overview | `/business-overview` | business_overview:read | ❌ | ❌ | ✅ |
| Backup & restore | `/backup-restore` | products:update | ❌ | ❌ | ✅ |
| IndexedDB debug | `/debug/indexeddb` | settings:update | ❌ | ❌ | ✅ (dev/support) |

*Basic: e.g. company name, basic options; no sensitive or bulk operations.

**Scenarios:**  
- Basic: essential settings + barcode + receipt.  
- Standard: full system settings, no automation/business overview.  
- Premium: automated exports, business overview, backup/restore.

---

## 8. Other

| Feature | Route / area | Permission(s) | Basic | Standard | Premium |
|--------|---------------|---------------|-------|----------|---------|
| Dashboard | `/` | (authenticated) | ✅ | ✅ | ✅ |
| Notifications | `/notifications` | (authenticated) | ✅ | ✅ | ✅ |
| Subscription payments | `/subscription/payments` | (authenticated) | ✅ | ✅ | ✅ |
| User manual | `/user-manual` | (public) | ✅ | ✅ | ✅ |

---

## 9. Permission-to-plan mapping (for implementation)

Map each **permission** to the **minimum plan** that grants it (so you can gate by `subscription_tier` + permission).

| Permission | Minimum plan |
|-----------|--------------|
| products:read, products:create, products:update | Basic |
| products:delete | Standard |
| sales:create, sales:read, sales:update | Basic |
| sales:delete | Standard (if used) |
| purchases:read, purchases:create, purchases:update | Basic |
| purchases:delete | Standard |
| reports:read (sales, purchase, profit only) | Basic |
| reports:read (all reports) | Standard |
| reports:read (CA, audit) | Premium |
| reports:export | Standard |
| expenses:read, expenses:create, expenses:update, expenses:delete | Standard |
| users:read, users:create, users:update, users:delete | Standard (sales persons only); Premium (full user/company) |
| settings:update (full) | Standard |
| settings:update (automated exports, backup, debug) | Premium |
| barcode_label_settings:read, barcode_label_settings:update | Basic |
| receipt_printer_settings:read, receipt_printer_settings:update | Basic |
| business_overview:read | Premium |

---

## 10. Scenarios to handle in code

1. **Route guard**  
   For each protected route, check:  
   - User has required **permission** (existing).  
   - Company `subscription_tier` allows that **feature/plan** (new).  
   - If plan is lower, redirect to upgrade or show “Upgrade to Standard/Premium” message.

2. **Dashboard / nav**  
   - Hide or disable menu items and dashboard cards for features not in current plan.  
   - Same list as above (e.g. Basic: no Expenses, no Daily Report, no Customer Insights, no Purchase Reorders, no User Management).

3. **Sales history**  
   - Currently `requiredRole="admin"`; consider aligning with plan (e.g. Standard+ can see sales history) and keep admin-only for company/sensitive actions.

4. **Company vs user**  
   - Company management and full user management only for Premium (and optionally admin role).  
   - Standard can have sales persons and commissions without full user/company management.

5. **Export**  
   - reports:export can be Standard+; restrict CA/audit export to Premium if needed.

6. **Device limit**  
   - Keep existing: Basic 1+1, Standard 3+1, Premium unlimited. No change in this doc.

---

## 11. Checklist before implementation

- [ ] Confirm Basic: no expenses, no daily report, no sales history, no customer insights, no outstanding, no reorders, no user/sales person management.
- [ ] Confirm Standard: everything in Basic + expenses, daily report, sales history, customer insights, outstanding, reorders, sales persons & commissions; no full user/company management, no CA reports, no audit, no automated exports, no business overview, no backup.
- [ ] Confirm Premium: all features including user/company management, CA reports, audit, automated exports, business overview, backup.
- [ ] Add `subscription_tier` (or plan) to auth context / company and use in `ProtectedRoute` or a new `PlanGuard`.
- [ ] Update dashboard and navigation to show/hide by plan.
- [ ] Add upgrade prompts (e.g. “This feature is available on Standard plan”) where access is denied by plan.

---

*Document generated from current codebase (App.tsx routes, permissionService, RolePermissions, PERMISSION_MODULES). Adjust Yes/No per product decisions and then implement.*
