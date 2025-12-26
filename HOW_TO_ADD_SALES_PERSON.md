# How to Add Sales Person Details - Step by Step Guide

## 📋 Overview

Sales persons are team members who handle sales transactions. You can add their details including name, contact information, employee ID, and commission rates.

---

## 🚀 Steps to Add Sales Person

### **Step 1: Navigate to Sales Persons Page**

1. **From Dashboard:**
   - Go to your Dashboard
   - Look for "Sales Persons" or "Sales & Category Management" option
   - Or directly navigate to: `/sales-persons`

2. **Alternative Route:**
   - You can also access via: **System Settings → Sales & Category Management → Sales Persons tab**

---

### **Step 2: Click "Add Sales Person" Button**

1. On the Sales Persons page, you'll see a button: **"Add Sales Person"** (top right)
2. Click this button
3. You'll be taken to the Sales Person form

---

### **Step 3: Fill in Sales Person Details**

Fill in the following information:

#### **Required Fields:**
- **Name** * (Required)
  - Enter the full name of the sales person
  - Example: "John Doe"

#### **Optional Fields:**
- **Email**
  - Enter email address
  - Example: "john.doe@company.com"
  - Used for communication and reports

- **Phone**
  - Enter phone number
  - Example: "+91 1234567890"
  - Used for contact and WhatsApp

- **Employee ID**
  - Enter unique employee identifier
  - Example: "EMP001", "SP001"
  - Helps track employees

- **Default Commission Rate (%)**
  - Enter commission percentage (0-100)
  - Example: "5.00" for 5%
  - Can be overridden by category-specific commissions
  - Leave empty if no default commission

- **Active** (Checkbox)
  - ✅ Checked = Active (can be assigned to sales)
  - ☐ Unchecked = Inactive (cannot be assigned)
  - Default: Active

---

### **Step 4: Save Sales Person**

1. Click **"Create Sales Person"** button (bottom right)
2. You'll see a success message: "Sales person created successfully!"
3. You'll be redirected to the Sales Persons list page

---

## 📝 Example Sales Person Entry

```
Name: Rajesh Kumar
Email: rajesh.kumar@company.com
Phone: +91 9876543210
Employee ID: SP001
Default Commission Rate: 5.00%
Active: ✅ (Checked)
```

---

## ✏️ Edit Sales Person

To edit an existing sales person:

1. Go to Sales Persons page
2. Find the sales person in the list
3. Click the **Edit** icon (pencil) next to their name
4. Update the information
5. Click **"Update Sales Person"**

---

## 🗑️ Delete Sales Person

To delete a sales person:

1. Go to Sales Persons page
2. Find the sales person in the list
3. Click the **Delete** icon (trash) next to their name
4. Confirm deletion

**Note:** Make sure the sales person is not assigned to any active sales before deleting.

---

## 🔍 Search Sales Persons

On the Sales Persons page, you can:
- Search by name
- Search by email
- Search by phone
- Search by employee ID

Just type in the search box at the top.

---

## 📊 What Sales Persons Are Used For

1. **Sales Assignment**
   - Assign sales person to each sale transaction
   - Track who made which sale

2. **Commission Calculation**
   - Calculate commissions based on sales
   - Use default commission rate or category-specific rates

3. **Reports**
   - Generate sales reports by sales person
   - Track performance and commissions

4. **Invoice Display**
   - Sales person name appears on invoices/receipts

---

## ⚙️ Permissions Required

- **View Sales Persons:** `users:read` permission
- **Create Sales Person:** `users:create` permission
- **Edit Sales Person:** `users:update` permission
- **Delete Sales Person:** `users:delete` permission

---

## 💡 Tips

1. **Employee ID:** Use a consistent format (e.g., SP001, SP002) for easy tracking
2. **Commission Rate:** Set default rate if most categories use the same rate
3. **Active Status:** Keep inactive if sales person is on leave or no longer working
4. **Contact Info:** Add phone and email for better communication and reports

---

## 🎯 Quick Access

**Direct URL:** `/sales-persons/new`

**From Dashboard:**
- Look for "Sales Persons" option
- Or go to System Settings → Sales & Category Management

---

**That's it! You can now add and manage sales persons in your system.** 🎉

