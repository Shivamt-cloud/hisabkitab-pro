# Admin Panel Implementation Plan

## Requirements

Admin user (`hisabkitabpro@hisabkitab.com`) needs a page to:
1. View registration requests
2. View users and companies
3. Create user account from registration request (when approved and user is ready to pay)
4. User should be created in `users` table with details from registration request

## Implementation Steps

1. **Create AdminPanel page component** (`src/pages/AdminPanel.tsx`)
   - Protected route (admin only)
   - Tabs/Sections: Registration Requests, Users, Companies
   
2. **Display Registration Requests**
   - Show all registration requests with status (pending/approved/rejected)
   - Show all details from registration request
   - Actions: Approve, Reject, Create User Account
   
3. **Create User Account from Registration Request**
   - Button: "Create User Account"
   - Process:
     - Create Company from registration request (if not exists)
     - Create User account with details from registration request
     - Link user to company
     - Update registration request status to "approved"
   
4. **Display Users and Companies**
   - Show all users
   - Show all companies
   - Link users to companies

5. **Add Route**
   - Add route in `App.tsx`: `/admin-panel`
   - Protected with `requiredRole="admin"`
