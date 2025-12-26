# How to Grant Access to Daily Expenses and Daily Report

## Quick Summary

**Both Daily Expenses and Daily Report require `expenses:read` permission.**

## Method 1: Change User Role (Easiest)

The simplest way is to assign the user a role that already has expense access:

### Roles with Expense Access:

1. **Admin** - Full access (create, read, update, delete expenses)
2. **Manager** - Full access (create, read, update, delete expenses)
3. **Staff** - Can create and read expenses (view daily report)
4. **Viewer** - Can only read expenses (view daily report)

### Steps to Change User Role:

1. **Go to User Management:**
   - Navigate to **Dashboard** → **System Settings** → **User Management** tab
   - OR go directly to `/users` (if you have admin access)

2. **Edit the User:**
   - Find the user you want to give access to
   - Click the **Edit** button (pencil icon) next to their name

3. **Change Role:**
   - In the user form, find the **Role** dropdown
   - Select one of these roles:
     - **Manager** (recommended for sales persons - full expense management)
     - **Staff** (can add expenses and view reports)
     - **Viewer** (can only view reports, cannot add expenses)

4. **Save Changes:**
   - Click **Save User** button
   - The user will need to log out and log back in for changes to take effect

## Method 2: Custom Permissions (Advanced)

If you want to keep the user's current role but add expense access:

1. **Go to User Management:**
   - Navigate to **Dashboard** → **System Settings** → **User Management** tab
   - OR go directly to `/users`

2. **Edit the User:**
   - Click **Edit** on the user you want to modify

3. **Enable Custom Permissions:**
   - Scroll down to the **Custom Permissions** section
   - Click the toggle button to enable **Custom Permissions**
   - This will show all available modules

4. **Add Expense Permissions:**
   - Look for the **Expenses** module (if available in the list)
   - Check the following actions:
     - ✅ **Read** (required for viewing Daily Report and Daily Expenses list)
     - ✅ **Create** (if you want them to add expenses)
     - ✅ **Update** (if you want them to edit expenses)
     - ✅ **Delete** (if you want them to delete expenses)

5. **Save Changes:**
   - Click **Save User**
   - User needs to log out and log back in

## Access Points

Once a user has `expenses:read` permission, they can access:

1. **Daily Expenses Page:**
   - Direct URL: `/expenses`
   - From Dashboard: **Sales & Category Management** → **Daily Expenses** tab

2. **Daily Report Page:**
   - Direct URL: `/daily-report`
   - From Dashboard: **Sales & Category Management** → **Daily Report** tab

## Recommended Setup

### For Sales Persons:
- **Role:** Manager
- **Why:** They need to add expenses (payments to them, etc.) and view reports

### For Accountants/Managers:
- **Role:** Manager or Admin
- **Why:** Full access to manage all expenses and view comprehensive reports

### For Viewers/Report Viewers:
- **Role:** Viewer
- **Why:** Can view reports and expense lists but cannot modify data

## Troubleshooting

### User still can't see Daily Expenses/Daily Report:

1. **Check Permission:**
   - User must have `expenses:read` permission
   - Check their role in User Management

2. **Log Out and Log Back In:**
   - Permissions are cached in the session
   - User needs to log out completely and log back in

3. **Check Role:**
   - Verify the user's role was saved correctly
   - Check if custom permissions are enabled (might override role permissions)

4. **Clear Browser Cache:**
   - Sometimes browser cache can cause permission issues
   - Clear cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Current Role Permissions Summary

| Role | Expenses Access | Can Add Expenses | Can Edit Expenses | Can Delete Expenses | Can View Daily Report |
|------|----------------|------------------|-------------------|---------------------|----------------------|
| Admin | ✅ Full | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Manager | ✅ Full | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Staff | ✅ Read/Create | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| Viewer | ✅ Read Only | ❌ No | ❌ No | ❌ No | ✅ Yes |

## Notes

- **Daily Report** requires only `expenses:read` permission (all roles have this)
- **Daily Expenses** list requires `expenses:read` permission
- **Adding expenses** requires `expenses:create` permission
- **Editing expenses** requires `expenses:update` permission
- **Deleting expenses** requires `expenses:delete` permission

