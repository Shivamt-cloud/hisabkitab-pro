# Permission Check for Admin User

## Admin Role Permissions

The admin role has the following permissions configured:

```typescript
admin: [
  { resource: 'sales', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'purchases', actions: ['create', 'read', 'update', 'delete'] }, ✅
  { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'reports', actions: ['read', 'export'] },
  { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'settings', actions: ['read', 'update'] },
  { resource: 'expenses', actions: ['create', 'read', 'update', 'delete'] }, ✅
]
```

## Required Permissions for New Features

### 1. Upcoming Checks
- **Route**: `/checks/upcoming`
- **Required Permission**: `purchases:read` ✅
- **Status**: Admin has this permission

### 2. Supplier Account Management
- **Routes**: 
  - `/suppliers/:id/account`
  - `/suppliers/:supplierId/payment/new`
  - `/suppliers/:supplierId/check/new`
- **Required Permission**: `purchases:read`, `purchases:create`, `purchases:update` ✅
- **Status**: Admin has all these permissions

### 3. Daily Expenses
- **Routes**: `/expenses`, `/expenses/new`, `/expenses/:id/edit`
- **Required Permission**: `expenses:read`, `expenses:create`, `expenses:update` ✅
- **Status**: Admin has all these permissions

### 4. Daily Report
- **Route**: `/daily-report`
- **Required Permission**: `expenses:read` ✅
- **Status**: Admin has this permission

## Dashboard Visibility

The following options should appear in the Dashboard for admin users:

1. **Upcoming Checks** - In "Sales & Purchase Options" section (requires `purchases:read`)
2. **Daily Expenses** - In "Daily Expenses & Reports" section (requires `expenses:read`)
3. **Daily Report** - In "Daily Expenses & Reports" section (requires `expenses:read`)
4. **Upcoming Checks Count** - In "Report Summary" cards (requires `purchases:read`)

## Troubleshooting

If admin user cannot see these features in production:

1. **Check if latest code is deployed**: 
   - Verify Netlify build completed successfully
   - Check deployment logs for any errors

2. **Clear browser cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

3. **Check browser console**:
   - Open DevTools (F12)
   - Look for any JavaScript errors
   - Check if routes are accessible

4. **Verify user role**:
   - Ensure user role is exactly 'admin' (case-sensitive)
   - Check user object in browser console: `localStorage.getItem('hisabkitab_user')`

5. **Check permissions**:
   - Verify permission check is working
   - In browser console: The `hasPermission` function should return `true` for `purchases:read` and `expenses:read`

## Conclusion

**Admin user has all necessary permissions** to access:
- ✅ Upcoming Checks
- ✅ Supplier Account Management
- ✅ Daily Expenses
- ✅ Daily Report

If features are not visible, it's likely a deployment/caching issue, not a permissions issue.




