# HisabKitab-Pro User Manual

**Complete step-by-step guide to using the software**

---

## Table of Contents

0. [Quick Start – How to Use This Software (New Users)](#0-quick-start--how-to-use-this-software-new-users)
1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard](#3-dashboard)
4. [Products](#4-products)
5. [Sales](#5-sales)
5b. [Rentals & Bookings](#5b-rentals--bookings)
6. [Purchases](#6-purchases)
7. [Customers](#7-customers)
8. [Suppliers](#8-suppliers)
9. [Sales Persons & Commissions](#9-sales-persons--commissions)
10. [Expenses & Daily Report](#10-expenses--daily-report)
11. [Stock Management](#11-stock-management)
12. [Payments](#12-payments)
13. [Reports & Analytics](#13-reports--analytics)
14. [Backup & Restore](#14-backup--restore)
15. [Notifications](#15-notifications)
16. [System Settings](#16-system-settings)
17. [Subscription & Other Settings](#17-subscription--other-settings)

---

## 0. Quick Start – How to Use This Software (New Users)

If you are new to HisabKitab-Pro, follow this **typical order** to use the software:

| Step | What to do | Why |
|------|------------|-----|
| **1** | [Add Products](#42-add-a-new-product-step-by-step) | You must have products in the system before you can sell or track stock. |
| **2** | [Add Customers](#72-add-a-customer-step-by-step) (optional) | For billing and credit; you can also sell to “Walk-in” without a customer. |
| **3** | [Add Suppliers](#82-add-a-supplier-step-by-step) | You need suppliers before recording purchases. |
| **4** | [Record a Purchase](#6-purchases) (GST or Simple) | Purchases add stock to your products and record what you bought. |
| **5** | [Record a Sale](#51-create-a-new-sale-invoice-step-by-step) | Sales create invoices, reduce stock, and record what you sold. |

**In short:**  
**Products** → **Customers** (optional) → **Suppliers** → **Purchase** (to get stock) → **Sale** (to sell and invoice).

Detailed step-by-step instructions for each are in the sections below.

---

## 1. Introduction

**HisabKitab-Pro** is an inventory and business management software for small and medium businesses. It helps you:

- Manage **products** and **stock**
- Record **sales** (invoices) and **purchases**
- Maintain **customers** and **suppliers**
- Track **expenses**, **payments**, and **commissions**
- View **reports** and **analytics**
- **Backup** and **restore** data
- Work **offline** with **cloud sync** when online

**Plans:**

| Plan     | Devices            | Max Users |
|----------|--------------------|-----------|
| Basic    | 1 device + 1 mobile | 3 users   |
| Standard | 3 devices + 1 mobile | 10 users |
| Premium  | Unlimited          | Unlimited |

---

## 2. Getting Started

### 2.1 Logging In

1. Open the application (e.g. **http://localhost:5173** or your deployed URL).
2. On the **Login** page, enter your **Email** and **Password**.
3. (Optional) Select **Country** for pricing if you see the option.
4. Click **Sign In**.
5. If credentials are correct, you are taken to the **Dashboard**.

**Google Sign-In (if enabled):**

1. Click **Sign in with Google**.
2. Choose your Google account.
3. You are logged in and taken to the Dashboard.

### 2.2 Registration (New Business)

If you don’t have an account:

1. On the Login page, click **Register** or **Request Access**.
2. Fill in:
   - Name, Email, Phone  
   - Business name, type, address  
   - **Subscription plan** (Basic / Standard / Premium)  
   - Additional details if asked  
3. Submit the form.
4. Wait for admin approval. You will be notified by email when your account is ready.
5. Then log in with the credentials provided.

### 2.3 First Time After Login

1. You land on the **Dashboard**.
2. If you are **Admin**, you can **switch company** (top bar) and manage multiple companies.
3. Use the **Dashboard cards** to open: New Sale, Products, Purchases, Customers, Suppliers, etc.
4. Complete your **profile** and **company** details under **System Settings** if needed.

---

## 3. Dashboard

**Purpose:** Overview of your business: totals, quick links, subscription, and sync status.

### 3.1 What You See

- **Summary cards:** Total Sales, Total Purchases, Total Profit, Total Products, Low Stock, Out of Stock, Upcoming Checks.
- **Quick actions:** New Sale, New Sale Tab, Sales History, Customers, Suppliers, GST Purchase, Simple Purchase, Purchase History, Upcoming Checks, Daily Expenses, Daily Report.
- **Subscription:** Current plan, status, days remaining, Recharge / Payment History.
- **Data Sync Status:** Last sync time, pending records, **Sync Now** (when online).

### 3.2 Common Steps

**To create a new sale**

1. From Dashboard, click **New Sale** (or **New Sale Tab** to open in a new tab).
2. Follow [Section 5 – Sales](#5-sales).

**To view sales history (Admin)**

1. Click **Sales History**.
2. You see the list of all sales; use filters and search as needed.

**To recharge subscription**

1. Click the **Subscription** area in the top bar (or the recharge link).
2. Click **Recharge** or **Renew Now**.
3. Choose duration (e.g. 1 Month, 1 Year) and payment method (e.g. UPI).
4. Complete payment; subscription and validity will update.

**To sync data**

1. Ensure you are **online**.
2. In **Data Sync Status**, click **Sync Now**.
3. Wait until sync completes; “Last Sync” and “Pending Records” will update.

---

## 4. Products

**Purpose:** Manage your product list, categories, stock levels, and barcodes.

### 4.1 View Products

1. From Dashboard, click **Products** (or go to **Products** in the menu).
2. You see a list of all products (name, SKU, category, stock, price, etc.).
3. Use **search** and **filters** (e.g. category, status) to find products.

### 4.2 Add a New Product (Step by Step)

Follow these steps to add a product so you can use it in sales and purchases.

**Step 1 – Open the Products page**

1. From the **Dashboard**, click **Products** (or use the menu: **Products**).
2. You will see the list of existing products (or an empty list if you are new).

**Step 2 – Open the Add Product form**

1. Click the **Add Product** or **New Product** button (usually at the top right).
2. A form will open with fields for product details.

**Step 3 – Fill in the product details**

| Field | Required? | What to enter | Tip |
|-------|-----------|---------------|-----|
| **Name** | Yes | Full product name (e.g. "Cotton Shirt Blue M") | Use a name you will search for at the time of sale. |
| **SKU** | No | Your internal code (e.g. SHIRT-B-M-001) | Must be unique if you use it. Helps in search and reports. |
| **Barcode** | No | Barcode number if you scan at sale | Leave blank if you don’t use barcode scanning. |
| **Category** | No | Category (e.g. Shirts, Grocery) | Select from list or create new if the app allows. |
| **Purchase price** | No | Cost at which you buy (per unit) | Used for profit calculation and purchase forms. |
| **Selling price** | No | Price at which you sell (per unit) | Default price on new sale; you can change per sale. |
| **Stock quantity** | No | Current stock (number of units) | You can set 0 and add stock via a purchase or adjustment. |
| **Min stock level** | No | Minimum quantity before low-stock alert | When stock goes at or below this, you get a notification. |
| **Unit** | No | Unit of measure (e.g. pcs, kg, L) | Shown on invoice and reports. |
| **HSN code** | No | HSN code for GST (e.g. 6105) | Needed for GST invoices. |
| **GST rate** | No | GST % (e.g. 12, 18) | Used in GST sales and purchases. |
| **Description** | No | Short description | For your reference. |
| **Image** | No | Product image (if supported) | Optional. |

**Step 4 – Save the product**

1. Click **Save** or **Create Product**.
2. If any required field is missing, the app will show an error; fix it and save again.
3. After saving, the product appears in the **Products** list.

**Step 5 – What you can do next**

- **Edit:** Click the product in the list and edit any field, then save.
- **Use in Sale:** When creating a [new sale](#51-create-a-new-sale-invoice-step-by-step), search by name, SKU, or barcode and add this product.
- **Use in Purchase:** When recording a [purchase](#6-purchases) (GST or Simple), select this product to add stock.
- **Set stock later:** If you left stock as 0, add stock by recording a purchase or via **Stock** → **Adjust**.

### 4.3 Edit a Product

1. Open **Products**.
2. Click the product row or **Edit**.
3. Change the fields you need.
4. Click **Save**.

### 4.4 Archive or Deactivate a Product

1. Edit the product.
2. Set **Status** to **Archived** (or **Inactive**, depending on the option).
3. Save. Archived products usually do not appear in normal sale/purchase flows but remain in history.

---

## 5. Sales

**Purpose:** Create sales invoices, record payments, and manage returns.

### 5.1 Create a New Sale (Invoice) – Step by Step

Follow these steps to create a sale (invoice), reduce stock, and record payment.

**Before you start**

- You should have [added at least one product](#42-add-a-new-product-step-by-step) and (optionally) [added customers](#72-add-a-customer-step-by-step).
- Stock will be reduced when you complete the sale; ensure products have sufficient stock (or allow negative stock if your settings permit).

**Step 1 – Open the New Sale page**

1. From the **Dashboard**, click **New Sale** (or **New Sale Tab** to open in a new tab).
2. You will see the **Sale Form** with: customer selection, item search, cart/list of items, totals, and payment section.

**Step 2 – Select customer (optional)**

1. In the **Customer** dropdown, either:
   - **Select a customer** from the list (if you [added customers](#72-add-a-customer-step-by-step)), or
   - Leave **Walk-in** or “No customer” if the sale is for a walk-in customer.
2. Customer name and address (if any) may appear on the printed invoice.

**Step 3 – Add items to the sale**

1. In the **search box** (often labeled “Search product”, “Add item”, or similar), type:
   - **Product name**, or  
   - **Barcode**, or  
   - **Article code / SKU**
2. A list of matching products will appear. **Click** the product you want (or use keyboard to select and press Enter).
3. Enter the **quantity** to sell (number of units).
4. If the app allows **discount per line**, enter discount (amount or %) for this line.
5. Click **Add** or press **Enter**. The line is added to the cart with **unit price**, **quantity**, and **line total**.
6. **Repeat** for every product you want to sell (search → select → quantity → Add).

**Tip:** Selling price usually comes from the product’s selling price; you can change it on the line if the app allows.

**Step 4 – Check totals and optional invoice-level options**

1. The form will show **Subtotal**, **Discount** (if any), **Tax** (GST if applicable), and **Grand Total**.
2. **Optional:** Add a **discount on the whole invoice** (amount or %) if the app has this field.
3. **Optional:** Add **Notes** (visible on invoice) or **Internal remarks** (for your use only, not printed).

**Step 5 – Enter payment**

1. Choose **Payment status**: usually **Paid** or **Pending** (sometimes **Partial**).
2. If **Paid**:
   - Select **Payment method(s)** (e.g. Cash, UPI, Card).
   - Enter the **amount** for each method so that the total matches the **Grand Total** (or as received).
3. If **Pending**:
   - You can leave payment amount as 0; the sale will appear in **Outstanding Payments** and you can [record payment later](#122-recording-payment-against-a-sale).

**Step 6 – Complete the sale**

1. Click **Complete Sale** or **Save** (or **Create Invoice**).
2. If validation fails (e.g. required field missing), the app will show an error; fix it and try again.
3. After success:
   - **Stock** is reduced for each product sold.
   - An **invoice** is generated with an invoice number.
   - You are usually taken to the **invoice view** or a success message.

**Step 7 – Print or download the invoice**

1. On the **invoice view**, use **Print** or **Download PDF** (if available) to get a copy for the customer or your records.
2. You can also open this sale later from **Sales History** and print from there.

**Summary – Sale flow at a glance**

| Step | Action |
|------|--------|
| 1 | Open **New Sale** from Dashboard. |
| 2 | Select **Customer** (or Walk-in). |
| 3 | **Search product** → Select → Enter **quantity** → **Add**; repeat for all items. |
| 4 | Add invoice **discount / notes** if needed. |
| 5 | Set **Payment** (Paid: method + amount; or Pending). |
| 6 | Click **Complete Sale**. |
| 7 | **Print** or **Download** invoice from the invoice view. |

### 5.2 View Sales History (Admin)

1. Go to **Sales History** from Dashboard or menu.
2. You see all sales with date, invoice number, customer, amount, payment status.
3. Use **date range**, **customer**, **payment status** filters if available.
4. Click a sale to **View** or **Edit** (if allowed).

### 5.3 View or Print an Invoice

1. From **Sales History**, click the sale (or use **View Invoice**).
2. The **Invoice** screen opens with full details.
3. Use **Print** or **Download PDF** (if available) to get a copy.

### 5.4 Record a Sale Return

1. Open **Sale Form** (New Sale).
2. There is usually an option to create a **Return** or **Credit** against an existing sale. Select the original sale/invoice.
3. Add items being returned and quantities.
4. Complete the return; stock will increase and a return amount may be applied (e.g. credit to customer).

### 5.5 Quick Sale

1. From Dashboard or menu, click **Quick Sale** (`/sales/quick`).
2. A simplified sale form for faster billing: search product, add quantity, complete.
3. Use when you need to create a bill quickly without full invoice details.

---

## 5b. Rentals & Bookings

**Purpose:** Manage rental/booking business – create bookings, track pick-up and return, collect payments, and view rent reports.

### 5b.1 Rentals List

1. Go to **Rentals** from Dashboard or menu (`/rentals`).
2. You see all rentals with status: **Booked**, **Picked up**, **Returned**, **Overdue**, **Cancelled**.
3. Filter by status. Click a rental to **View** details or **Edit**.

### 5b.2 Create a New Rental (Booking) – Step by Step

**Before you start**

- Products must be added. Customer can be Walk-in or select from Customers.

**Step 1 – Open New Rent**

1. From **Rentals**, click **New Rental** (or go to `/rentals/new`).
2. You see the **Rent Form** with: customer, products, booking date, return date, pricing, payment.

**Step 2 – Fill booking details**

1. **Customer:** Select from list or Walk-in.
2. **Products:** Add items being rented (quantity, rent price).
3. **Booking date** and **Return date** – set the rental period.
4. **Discount** (if any), **Notes**.

**Step 3 – Payment and save**

1. Set **Payment status** (Paid / Pending / Partial).
2. Enter payment method and amount if paid.
3. Click **Save** or **Create Rental**.

**Step 4 – Track status**

- Update status as: **Booked** → **Picked up** → **Returned** (or **Overdue** / **Cancelled**).
- Use the rental detail view to update status and record additional payments.

### 5b.3 View Rental Detail and Receipt

1. From **Rentals**, click a rental row.
2. You see full details: items, dates, payments, status.
3. Use **Print Receipt** or **Download PDF** to get a copy for the customer.

### 5b.4 Rent Reports

1. Go to **Rentals** → **Reports** (or `/rentals/report`).
2. View rent revenue, outstanding, and trends by date range.
3. Export to PDF or Excel if available.

---

## 6. Purchases

**Purpose:** Record purchases from suppliers (with or without GST), update stock, and track payables.

### 6.1 GST Purchase (Step by Step)

Use this when your supplier gives you a **GST invoice** (with tax). Stock and GST input are recorded.

**Before you start**

- You should have [added products](#42-add-a-new-product-step-by-step) and [added at least one supplier](#82-add-a-supplier).

**Step 1 – Open the GST Purchase form**

1. From the **Dashboard**, click **GST Purchase** (or go to **Purchases** → **New GST Purchase**).
2. You will see the **GST Purchase** form with: supplier, date, invoice number, item lines, totals, and payment.

**Step 2 – Enter purchase header**

1. **Select supplier:** Choose the supplier from the dropdown (the one who gave you the bill).
2. **Purchase date:** Select or enter the date of the supplier’s invoice.
3. **Invoice number:** Enter the **invoice number** from the supplier’s bill (for your reference and matching).

**Step 3 – Add items (products) to the purchase**

1. Click **Add item** or **Add line** (or similar).
2. For each line:
   - **Product:** Select the product from the list (search by name/SKU if available).
   - **Quantity:** Enter how many units you bought.
   - **Unit price:** Enter the price per unit (before tax) as on the supplier’s invoice.
   - **HSN code:** Enter or select the HSN code (often filled from product).
   - **GST rate:** Enter or select the GST % (e.g. 12, 18).
   - **Article / Color / Size:** Fill if your app supports these (optional).
3. The line **total** (quantity × unit price) and **tax** are usually calculated by the system.
4. Add more lines for all products on the supplier’s invoice.

**Step 4 – Check totals**

1. The form will show **Subtotal**, **Tax** (CGST/SGST or IGST), and **Grand Total**.
2. Match these with the supplier’s invoice if possible.

**Step 5 – Payment status and notes**

1. **Payment status:** Choose **Paid**, **Pending**, or **Partial** (if you paid some amount).
2. **Notes:** Add any note for your reference (e.g. “Bill no. XYZ from supplier”).
3. **Return remarks:** Use only if this purchase has a return; add remarks for the return (if the app supports it).

**Step 6 – Save the purchase**

1. Click **Save Purchase** or **Submit**.
2. After saving:
   - **Stock** of each product is **increased** by the quantity you entered.
   - The purchase appears in **Purchase History** and in the **supplier’s account** (outstanding if not fully paid).

**Step 7 – What you can do next**

- **View/Edit:** Open **Purchase History**, click this purchase to view or edit (if allowed).
- **Pay supplier:** Go to **Suppliers** → select supplier → **Account** → **Add Payment** to record payment against this purchase.
- **Return:** If the app supports purchase returns, use the return flow and add **Return remarks** as needed.

---

### 6.2 Simple Purchase (Step by Step)

Use this when there is **no GST** on the purchase (e.g. small vendor, non-GST bill). Stock is still updated.

**Before you start**

- You should have [added products](#42-add-a-new-product-step-by-step) and [added at least one supplier](#82-add-a-supplier).

**Step 1 – Open the Simple Purchase form**

1. From the **Dashboard**, click **Simple Purchase** (or **Purchases** → **New Simple Purchase**).
2. You will see the **Simple Purchase** form (no GST/tax fields).

**Step 2 – Enter purchase header**

1. **Select supplier:** Choose the supplier from the dropdown.
2. **Purchase date:** Enter or select the date of the bill.
3. **Invoice number:** Enter the bill/invoice number from the supplier (optional but recommended).

**Step 3 – Add items**

1. Click **Add item** or **Add line**.
2. For each line:
   - **Product:** Select the product.
   - **Quantity:** Enter the number of units bought.
   - **Price:** Enter the price per unit (or total for the line if the app uses that).
3. Add all lines as per the supplier’s bill.

**Step 4 – Payment status and save**

1. Set **Payment status:** **Paid** or **Pending** (and **Partial** if supported).
2. Add **Notes** if needed.
3. Click **Save Purchase** or **Submit**.

**Step 5 – After saving**

- **Stock** of each product is **increased** by the quantity entered.
- The purchase appears in **Purchase History** and in the supplier’s account.

**Summary – Purchase flow at a glance**

| Step | GST Purchase | Simple Purchase |
|------|--------------|-----------------|
| 1 | Open **GST Purchase**. | Open **Simple Purchase**. |
| 2 | Select **supplier**, **date**, **invoice number**. | Same. |
| 3 | Add lines: **product**, **quantity**, **unit price**, **HSN**, **GST rate**. | Add lines: **product**, **quantity**, **price**. |
| 4 | Check **subtotal**, **tax**, **grand total**. | Check **total**. |
| 5 | Set **payment status**, **notes**. | Same. |
| 6 | Click **Save Purchase**. Stock increases. | Same. |

### 6.3 View Purchase History

1. Go to **Purchase History** from Dashboard or menu.
2. You see all purchases (date, supplier, invoice number, amount, type, payment status).
3. Use filters (date, supplier, type). Click a row to **View** or **Edit** (if allowed).

### 6.4 Purchase Reorders (Reorder)

**Purpose:** Create reorder lists for low-stock products and convert them to purchases. Available on Standard and Premium plans.

**Step 1 – View Reorder List**

1. Go to **Purchase Reorders** from Dashboard or menu (`/purchases/reorders`).
2. You see all reorders with status: **Placed**, **Partial Received**, **Received**, **Cancelled**.

**Step 2 – Create a New Reorder**

1. Click **New Reorder** (or go to `/purchases/reorder`).
2. Add products (from low-stock list or manually) with **quantity** and **unit price**.
3. Select **supplier** (optional). Add notes if needed.
4. Click **Save**. The reorder is created with status **Placed**.

**Step 3 – Edit or Receive Reorder**

1. Click a reorder row to **View** or **Edit** (if status allows).
2. Use **Receive** to record received quantities. Update **Received Qty** for each line.
3. Status changes to **Partial Received** or **Received** when done.
4. You can convert the reorder to a GST or Simple Purchase if the app supports it.

**Step 4 – Export Reorder**

1. From the reorder list or detail view, use **Export PDF** or **Export Excel** to download the reorder for sending to supplier or your records.

---

## 7. Customers

**Purpose:** Maintain customer list for sales and credit.

### 7.1 View Customers

1. From Dashboard, click **Customers**.
2. You see name, contact, credit limit, outstanding amount, etc.

### 7.2 Add a Customer (Step by Step)

Follow these steps to add a customer so you can assign them to sales and track credit.

**Step 1 – Open the Customers page**

1. From the **Dashboard**, click **Customers** (or use the menu: **Customers**).
2. You will see the list of existing customers (or an empty list if you are new).

**Step 2 – Open the Add Customer form**

1. Click the **Add Customer** button (usually at the top right).
2. A form will open with fields for customer details.

**Step 3 – Fill in the customer details**

| Field | Required? | What to enter | Tip |
|-------|-----------|---------------|-----|
| **Name** | Yes (usually) | Full name or business name | Shown on invoice and in sale dropdown. |
| **Phone** | No | Mobile or landline | For contact and search. |
| **Email** | No | Email address | For sending invoices or reminders. |
| **Address** | No | Billing or delivery address | Printed on invoice if you use it. |
| **GSTIN** | No | Customer’s GST number (if registered) | Needed for B2B GST invoices. |
| **Credit limit** | No | Max credit you allow (amount) | Used for credit checks. |
| **Outstanding amount** | No | Current dues (if any) | Set when migrating old data; otherwise leave 0. |

**Step 4 – Save the customer**

1. Click **Save** or **Create Customer**.
2. If any required field is missing, the app will show an error; fix it and save again.
3. After saving, the customer appears in the **Customers** list.

**Step 5 – What you can do next**

- **Edit:** Click the customer in the list and edit any field, then save.
- **Use in Sale:** When creating a [new sale](#51-create-a-new-sale-invoice-step-by-step), select this customer from the dropdown. If you don’t select anyone, the sale is treated as “Walk-in”.
- **Track dues:** Outstanding and payments are tracked per customer; you can see dues in **Payments** → **Outstanding** or in the customer’s account view (if available).

### 7.3 Edit a Customer

1. Open **Customers**, click the customer or **Edit**.
2. Update fields and save.

---

## 8. Suppliers

**Purpose:** Maintain supplier list and track payables, payments, and cheques.

### 8.1 View Suppliers

1. Click **Suppliers** from Dashboard.
2. You see supplier list with contact and related info.

### 8.2 Add a Supplier (Step by Step)

Follow these steps to add a supplier so you can record purchases from them and track payables.

**Step 1 – Open the Suppliers page**

1. From the **Dashboard**, click **Suppliers** (or use the menu: **Suppliers**).
2. You will see the list of existing suppliers (or an empty list if you are new).

**Step 2 – Open the Add Supplier form**

1. Click the **Add Supplier** button (usually at the top right).
2. A form will open with fields for supplier details.

**Step 3 – Fill in the supplier details**

| Field | Required? | What to enter | Tip |
|-------|-----------|---------------|-----|
| **Name** | Yes (usually) | Supplier or business name | Shown when you select supplier in a purchase. |
| **Phone** | No | Mobile or landline | For contact and search. |
| **Email** | No | Email address | For sending orders or reminders. |
| **Address** | No | Supplier’s address | For your records and printed on purchase docs if used. |
| **GSTIN** | No | Supplier’s GST number (if registered) | Needed for GST purchases and input tax credit. |

**Step 4 – Save the supplier**

1. Click **Save** or **Create Supplier**.
2. If any required field is missing, the app will show an error; fix it and save again.
3. After saving, the supplier appears in the **Suppliers** list.

**Step 5 – What you can do next**

- **Edit:** Click the supplier in the list and edit any field, then save.
- **Use in Purchase:** When recording a [GST Purchase](#61-gst-purchase-step-by-step) or [Simple Purchase](#62-simple-purchase-step-by-step), select this supplier from the dropdown.
- **View account:** Open **Suppliers** → click this supplier → **Account** (or **Supplier Account**) to see purchases, payments, and outstanding.
- **Record payment:** From the supplier’s account, use **Add Payment** to record payments against purchases.

### 8.3 Supplier Account (Payables)

1. Open **Suppliers**, click a supplier.
2. Go to **Account** or **Supplier Account**.
3. You see **purchases**, **payments**, **outstanding** for that supplier.

### 8.4 Record a Payment to Supplier

1. From **Supplier Account**, click **Add Payment** (or **New Payment**).
2. Enter **amount**, **payment method**, **date**, **reference** (e.g. transaction ID).
3. Link to **purchase(s)** if the app supports it. Save.

### 8.5 Upcoming Cheques

1. From Dashboard, click **Upcoming Checks** (or menu).
2. You see cheques given to suppliers that are due. Use it to plan payments.

---

## 9. Sales Persons & Commissions

**Purpose:** Manage sales persons, category-wise commissions, and assignments.

### 9.1 Sales Persons

1. Go to **Sales & Category Management** or **Sales Persons** (from Dashboard or Settings).
2. **Add** a sales person: name, contact, etc.
3. **Edit** or **deactivate** as needed.

### 9.2 Category Commissions

1. Open **Category Commissions** (from Sales & Category Management or Settings).
2. **Create** or **Edit** commission: link to **category**, set **rate** (e.g. % of sale), **active**.
3. Save. These rates are used when a sale is made by a sales person in that category.

### 9.3 Assign Sales Person to Categories

1. Open **Sales Person Category Assignments**.
2. For each sales person, **assign** the categories they can sell in.
3. When creating a sale, you can select the sales person; commission is calculated from category commission rules.

### 9.4 Commission Reports

1. Go to **Commission Reports** (or **Reports** → Commissions).
2. View commission by sales person, period, or category as per the report layout.

---

## 10. Expenses & Daily Report

**Purpose:** Record daily expenses (opening/closing balance, other expenses) and see a daily summary.

### 10.1 Daily Expenses

1. Click **Daily Expenses** from Dashboard.
2. **Add expense:** Date, **Expense type** (e.g. opening balance, closing balance, transport, office), **Amount**, **Description**, **Payment method**.
3. For **opening/closing balance**, you may have **cash denominations** (if supported).
4. Save. Expenses are used in the Daily Report.

### 10.2 Daily Report

1. Click **Daily Report** from Dashboard.
2. Select **date** (default often today).
3. You see **sales**, **purchases**, **expenses**, **opening/closing balance**, and **device-wise** or **user-wise** breakdown if available.
4. Use **Print** or **Export** if the option exists.

---

## 11. Stock Management

**Purpose:** Monitor stock levels, low-stock alerts, and make manual adjustments.

### 11.1 Stock Alerts

1. Go to **Stock Alerts** (or click **Low Stock** / **Out of Stock** on Dashboard).
2. You see products at or below **min stock level** or **out of stock**.
3. Use this list to reorder or adjust stock.

### 11.2 Stock Adjustment

1. Go to **Stock** → **Adjust** (or **Stock Adjustment**).
2. Select **product**, enter **new quantity** or **adjustment (+ / −)** and **reason**.
3. Save. Stock is updated and an adjustment record is created.

### 11.3 Stock Adjustment History

1. Go to **Stock** → **Adjustments** (or **Stock Adjustment History**).
2. You see all past adjustments (date, product, change, reason). Use for audit.

---

## 12. Payments

**Purpose:** See outstanding receivables (sales) and payables (purchases), and track payments.

### 12.1 Outstanding Payments

1. Click **Outstanding Payments** from Dashboard or menu (or **Payments** → Outstanding).
2. You see **customer outstanding** (unpaid/partial sales) and **supplier outstanding** (unpaid/partial purchases).
3. Use filters (customer, supplier, overdue). Click a row to **View** or **Record payment** if the option is there.

### 12.2 Recording Payment Against a Sale

1. From **Outstanding Payments**, select the sale (or open the sale from Sales History).
2. Use **Add Payment** or **Record Payment**: amount, method, date. Save. Outstanding reduces.

### 12.3 Recording Payment to Supplier

1. From **Supplier Account** or **Outstanding Payments** (supplier side), open the supplier/purchase.
2. **Add Payment**: amount, method, date, reference. Save.

---

## 13. Reports & Analytics

**Purpose:** Sales reports, profit analysis, comparative reports, and analytics. Many reports support **Export to PDF** and **Export to Excel**.

### 13.1 Sales Reports

1. Go to **Sales Reports** (or **Reports** → Sales) (`/reports/sales`).
2. Select **date range**, **grouping** (e.g. by product, customer, date).
3. View **sales**, **revenue**, **quantity**. Export to PDF or Excel if available.

### 13.2 Purchase Reports

1. Go to **Purchase Reports** (or **Reports** → Purchases) (`/reports/purchases`).
2. Select **date range**, **supplier**, **type** (GST / Simple).
3. View purchase totals, supplier-wise summary. Export if available.

### 13.3 Profit Analysis

1. Go to **Profit Analysis** (or **Reports** → Profit Analysis) (`/reports/profit-analysis`).
2. View **profit by product**, **sale**, or **period**.
3. Use filters (date, company). Export to PDF or Excel.

### 13.4 Expense Reports

1. Go to **Expense Reports** (or **Reports** → Expenses) (`/reports/expenses`).
2. View expenses by **type** (salary, transport, etc.), **date**, **employee**.
3. Export if available. Standard/Premium plans.

### 13.5 Comparative Reports

1. Go to **Comparative Reports** (or **Reports** → Comparative) (`/reports/comparative`).
2. Compare **sales vs purchases**, **period-over-period**, or **category-wise**.
3. Use filters. Export to PDF or Excel. Standard/Premium plans.

### 13.6 CA Reports

1. Go to **CA Reports** (or **Reports** → CA) (`/reports/ca`).
2. Chartered Accountant–oriented reports: sales, purchases, expenses, GST summary.
3. Export for CA use. **Premium plan only**.

### 13.7 Commission Reports

1. Go to **Commission Reports** (or **Reports** → Commissions) (`/reports/commissions`).
2. View commission by **sales person**, **category**, **period**.
3. Export if available. Standard/Premium plans.

### 13.8 Daily Activity

1. Go to **Daily Activity** (or **Reports** → Daily Activity) (`/reports/daily-activity`).
2. View **activity** for a date: sales, purchases, expenses, by user/device if supported.
3. Standard/Premium plans.

### 13.9 Analytics Dashboard

1. Go to **Analytics** from Dashboard or menu (`/analytics`).
2. You see **charts and metrics**: sales over time, top products, profit, etc.
3. Use filters (date, company) as provided. Standard/Premium plans.

### 13.10 Business Overview

1. Go to **Business Overview** (`/business-overview`).
2. High-level summary: sales, purchases, expenses, profit, employees, COGS.
3. View by **period** (day, week, month, year). Export to PDF.
4. **Premium plan only**.

### 13.11 Rent Reports

1. Go to **Rentals** → **Reports** (or `/rentals/report`).
2. View rent revenue, outstanding, active rentals by period.
3. Export to PDF or Excel if available. Requires Rentals feature.

### 13.12 Audit Logs

1. Go to **Audit Logs** (`/audit-logs`) from Settings or menu.
2. View **audit trail** of key actions (who did what, when).
3. **Premium plan only**.

---

## 14. Backup & Restore

**Purpose:** Backup data to file or cloud and restore when needed.

### 14.1 Create Cloud Backup

1. Go to **Backup & Restore** from Dashboard or menu.
2. Under **Export** or **Backup**, click **Create Cloud Backup** (if available).
3. Follow the steps; backup is uploaded to your cloud (e.g. Supabase Storage). Note the date/name.

### 14.2 Export Full Backup (JSON)

1. In **Backup & Restore**, click **Export Full Backup** (or **Export as JSON**).
2. A JSON file is downloaded. Keep it safe (e.g. on Google Drive or PC).

### 14.3 Export Summary (CSV)

1. Click **Export Summary** (or **Export as CSV**).
2. A CSV file with summary of products, sales, purchases, etc. is downloaded.

### 14.4 Restore from Backup

1. In **Backup & Restore**, go to **Restore** or **Import**.
2. **Restore from cloud:** Select a cloud backup from the list and click **Restore**. Confirm.
3. **Restore from file:** Choose the backup file (JSON) you exported earlier, then **Upload** or **Restore**. Confirm.
4. After restore, data is replaced or merged as per the app logic; refresh and check data.

### 14.5 Data Sync (Cloud)

1. In **Backup & Restore**, see **Data Sync Status**.
2. When **online**, click **Sync Now** to sync local data with cloud (Supabase). Pending records are sent/received.

---

## 15. Notifications

**Purpose:** See system alerts (low stock, payment overdue, etc.) in one place.

### 15.1 View Notifications

1. Click the **bell icon** in the top bar (or go to **Notifications** from menu).
2. You see **unread** and **read** notifications (e.g. “Product X low stock”, “Payment overdue for Customer Y”).
3. Use **filters** (type, priority) if available.

### 15.2 Mark as Read / Delete

1. Click a notification to **mark as read** or open the related screen (e.g. product, payment).
2. Use **Mark all as read** or **Delete read** to clean the list.

---

## 16. System Settings

**Purpose:** Manage companies, users, invoice/tax/general settings, and devices (Admin).

### 16.1 Access Settings

1. Go to **Settings** (gear icon or **System Settings** from menu).  
2. You may need **Admin** or **Settings** permission.

### 16.2 Companies (Admin)

1. In Settings, open **Companies** (or **Company Management**).
2. **Add company:** Name, unique code, contact, address, etc.
3. **Edit** company details, **subscription tier**, **validity** (if you manage it here).
4. **Switch company** from the top bar to work with another company’s data.

### 16.3 Users (Admin)

1. Open **Users** (or **User Management**).
2. **Add user:** Name, email, password, **role** (Admin / Manager / Staff / Viewer), **company**.
3. **Edit** user (role, permissions, company). **Deactivate** if needed.
4. **Custom permissions** can be set per user (e.g. only products + sales, no purchases).

### 16.4 Invoice Settings

1. In Settings, open **Invoice** (or **Invoice Settings**).
2. Set **company name**, **logo**, **address**, **terms**, **footer** for the printed invoice.
3. Save. New invoices will use these settings.

### 16.5 Tax Settings

1. Open **Tax** (or **Tax Settings**).
2. Set **default GST rate**, **tax labels**, or other tax rules. Save.

### 16.6 General Settings

1. Open **General**. Configure **business name**, **currency**, **date format**, or other global options. Save.

### 16.7 Devices (Admin)

1. Open **Devices** (under Settings or Users).
2. Select a **user** to see their **registered devices** (e.g. Desktop, Mobile).
3. You see **device name**, **last accessed**, **browser**. Use **Remove** to revoke a device (user will need to log in again from that device).

### 16.8 Registration Requests (Admin)

1. Open **Registration Requests** (if available in Settings).
2. See **pending** requests from new businesses. **Approve** or **Reject**; approved users can then log in.

---

## 17. Subscription & Other Settings

**Purpose:** Manage subscription plan, payment history, barcode labels, and receipt printer.

### 17.1 Subscription & Payment History

1. **Subscription** in the top bar shows **plan**, **validity**, **days remaining**.
2. Click **Recharge** to extend (see [Section 3.2](#32-common-steps)).
3. Click **Payment History** (or go to **Subscription Payments**) to see past payments and **download receipts**.

### 17.2 Barcode Label Settings

1. Go to **Settings** → **Barcode Label** (or **Barcode Label Settings**).
2. **Supported printers** include **TSC TE244** (and similar TSC models). Install the printer driver (USB or LAN), then select your printer in the app.
3. Set **label size**, **printer**, **fields to print** (product name, barcode, price, etc.). Save. For TSC TE244, the app can auto-apply a 40×25mm label preset when you select the printer.
4. When you **print barcode labels** from products or purchase, these settings are used.

### 17.3 Receipt Printer Settings

1. Go to **Settings** → **Receipt Printer** (or **Receipt Printer Settings**).
2. Set **printer**, **paper size**, and **what to show** on the receipt (company name, items, total, etc.). Save.
3. When you **print receipt** from a sale, these settings are used.

---

## Quick Reference – Main Routes

| What you want           | Where to go                    |
|-------------------------|--------------------------------|
| Home / Overview          | Dashboard (`/`)                |
| Products                | Products (`/products`)          |
| New sale                | New Sale (`/sales/new`)        |
| Quick sale              | Quick Sale (`/sales/quick`)    |
| Sales list              | Sales History (`/sales/history`) |
| Rentals / Bookings      | Rentals (`/rentals`)           |
| New rental              | New Rental (`/rentals/new`)    |
| Rent reports            | Rent Reports (`/rentals/report`) |
| GST purchase            | GST Purchase (`/purchases/new-gst`) |
| Simple purchase         | Simple Purchase (`/purchases/new-simple`) |
| Purchase list           | Purchase History (`/purchases/history`) |
| Purchase reorders       | Purchase Reorders (`/purchases/reorders`) |
| New reorder             | New Reorder (`/purchases/reorder`) |
| Customers               | Customers (`/customers`)       |
| Customer insights       | Customer Insights (`/customers/insights`) |
| Suppliers               | Suppliers (`/suppliers`)       |
| Sales persons & commissions | Sales & Category Management (`/sales-category-management`) |
| Daily expenses          | Expenses (`/expenses`)         |
| Daily summary           | Daily Report (`/daily-report`) |
| Stock alerts            | Stock Alerts (`/stock/alerts`) |
| Stock adjustment        | Stock Adjust (`/stock/adjust`) |
| Outstanding payments    | Outstanding Payments (`/payments/outstanding`) |
| Upcoming cheques        | Upcoming Checks (`/checks/upcoming`) |
| Sales reports           | Sales Reports (`/reports/sales`) |
| Purchase reports        | Purchase Reports (`/reports/purchases`) |
| Profit analysis         | Profit Analysis (`/reports/profit-analysis`) |
| Expense reports         | Expense Reports (`/reports/expenses`) |
| Comparative reports     | Comparative Reports (`/reports/comparative`) |
| CA reports              | CA Reports (`/reports/ca`)     |
| Commission reports      | Commission Reports (`/reports/commissions`) |
| Daily activity          | Daily Activity (`/reports/daily-activity`) |
| Analytics               | Analytics (`/analytics`)       |
| Business overview       | Business Overview (`/business-overview`) |
| Audit logs              | Audit Logs (`/audit-logs`)     |
| Backup & restore        | Backup & Restore (`/backup-restore`) |
| Price lists             | Price Lists (`/settings/price-lists`) |
| Automated exports       | Automated Exports (`/settings/automated-exports`) |
| Notifications           | Notifications (`/notifications`) |
| Settings                | System Settings (`/settings`)   |
| Subscription payments   | Subscription Payments (`/subscription/payments`) |

---

## Support

- For **login or access** issues: check email/password, subscription validity, and device limit.
- For **sync** issues: ensure you are online and click **Sync Now** in Backup & Restore.
- For **permissions**: contact your Admin to assign the right role or custom permissions.
- For **subscription**: use **Recharge** from the Dashboard or **Subscription Payments** for history and receipts.
- **If data loads slowly or the app feels sluggish:** use **one tab** for the app; **close other tabs** that use the same app; **refresh the page** (F5) and try again. If it still happens, try **Incognito/Private** mode (no extensions) to see if it’s faster—then consider disabling browser extensions in normal mode. The app caches settings and reduces database checks to improve speed.

---

*HisabKitab-Pro User Manual – Covering all main features and steps. For technical architecture, see APPLICATION_ARCHITECTURE.md.*
