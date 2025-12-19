# Login & Permission System

## Demo Accounts

The application includes 4 demo accounts with different permission levels:

### 1. Admin Account (Full Access)
- **Email:** `admin@hisabkitab.com`
- **Password:** `admin123`
- **Permissions:**
  - ✅ All Sales operations (create, read, update, delete)
  - ✅ All Purchase operations (create, read, update, delete)
  - ✅ All Product operations (create, read, update, delete)
  - ✅ All Reports (read, export)
  - ✅ User Management (create, read, update, delete)
  - ✅ Settings (read, update)

### 2. Manager Account
- **Email:** `manager@hisabkitab.com`
- **Password:** `manager123`
- **Permissions:**
  - ✅ Sales (create, read, update)
  - ✅ Purchases (create, read, update)
  - ✅ Products (create, read, update)
  - ✅ Reports (read, export)
  - ✅ Settings (read)
  - ❌ No delete permissions
  - ❌ No user management

### 3. Staff Account
- **Email:** `staff@hisabkitab.com`
- **Password:** `staff123`
- **Permissions:**
  - ✅ Sales (create, read)
  - ✅ Purchases (create, read)
  - ✅ Products (read, update)
  - ✅ Reports (read)
  - ❌ No delete permissions
  - ❌ No settings access
  - ❌ No user management

### 4. Viewer Account (Read-Only)
- **Email:** `viewer@hisabkitab.com`
- **Password:** `viewer123`
- **Permissions:**
  - ✅ Sales (read only)
  - ✅ Purchases (read only)
  - ✅ Products (read only)
  - ✅ Reports (read only)
  - ❌ No create/update/delete permissions
  - ❌ No settings access

## How It Works

1. **Login Page:** Users must authenticate before accessing the dashboard
2. **Protected Routes:** All routes are protected and require authentication
3. **Role-Based Access:** Features are shown/hidden based on user role
4. **Permission System:** Uses granular permissions (resource:action format)
   - Example: `sales:create`, `reports:read`, `products:delete`

## Testing Different Roles

1. Log in with any demo account
2. Notice how the dashboard shows/hides features based on permissions
3. Try logging out and logging in with a different role to see the differences
4. Viewer role will see the least options, Admin will see everything

## Features

- 🔐 Secure login with email/password
- 👤 User menu with profile info and logout
- 🔒 Protected routes (auto-redirect to login if not authenticated)
- ⚙️ Permission-based UI (buttons/features hidden if no permission)
- 💾 Session persistence (user stays logged in after page refresh)
- 🎨 Beautiful login UI matching the dashboard design

