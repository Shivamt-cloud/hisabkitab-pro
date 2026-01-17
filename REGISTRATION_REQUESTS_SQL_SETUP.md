# 📋 Registration Requests SQL Setup Guide

## ✅ SQL Script to Execute in Supabase

Copy and paste this SQL script in your Supabase SQL Editor:

---

## 📝 **Step-by-Step Instructions**

### **Step 1: Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New query"** button (top right)

### **Step 2: Copy SQL Script**

Copy the entire SQL script from `UPDATE_REGISTRATION_REQUESTS_STATUS_FIELDS.sql` file

### **Step 3: Paste and Run**

1. Paste the SQL script into the SQL Editor
2. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
3. Wait for success message

### **Step 4: Verify Changes**

1. Go to **"Table Editor"** (left sidebar)
2. Select **`registration_requests`** table
3. Check that new columns are added:
   - `communication_initiated` (boolean)
   - `agreement_done` (boolean)
   - `payment_done` (boolean)
4. Verify status column constraint is updated

---

## 📊 **What This SQL Does**

1. ✅ Adds 3 status tracking flags:
   - `communication_initiated` (default: false)
   - `agreement_done` (default: false)
   - `payment_done` (default: false)

2. ✅ Updates status constraint to include professional status values:
   - `pending` - Initial status
   - `under_review` - Registration is being reviewed
   - `registration_accepted` - Registration accepted
   - `agreement_pending` - Waiting for agreement
   - `payment_pending` - Waiting for payment
   - `completed` - All steps completed
   - `rejected` - Registration rejected

3. ✅ Creates indexes for faster queries

4. ✅ Migrates existing 'approved' records to 'completed'

---

## ✅ **After Running SQL**

Once you've run the SQL script successfully, let me know and I'll proceed with:
1. Updating TypeScript interfaces
2. Updating services
3. Adding "Registration Requests" tab to System Settings
4. Creating email template generator
5. Adding UI for managing registration requests

---

**Ready to execute?** Copy the SQL from `UPDATE_REGISTRATION_REQUESTS_STATUS_FIELDS.sql` and run it in Supabase! 🚀
