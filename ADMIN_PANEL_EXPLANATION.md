# Admin Panel - Implementation Explanation

## Overview

The Admin Panel will be a comprehensive page for the admin user (`hisabkitabpro@hisabkitab.com`) to:
1. **View Registration Requests** - See all pending/approved/rejected registration requests
2. **View Users & Companies** - See all users and companies in the system
3. **Create User Account from Registration Request** - When user is ready to pay, create account with one click

---

## Features

### 1. **Registration Requests Tab**
- Display all registration requests
- Filter by status (pending/approved/rejected)
- Show all registration details
- **Actions:**
  - **"Create User Account"** button - Creates:
    - Company from registration request data
    - User account from registration request data
    - Links user to company
    - Updates registration request status to "approved"

### 2. **Users Tab**
- Display all users
- Show user details (name, email, role, company)
- Filter/search users

### 3. **Companies Tab**
- Display all companies
- Show company details
- Filter/search companies

---

## Implementation Steps

1. Create `AdminPanel.tsx` component
2. Add route `/admin-panel` (protected with `requiredRole="admin"`)
3. Create function to create user from registration request
4. Create function to create company from registration request
5. Link user to company

---

## Data Flow

**When "Create User Account" is clicked:**

```
Registration Request Data
↓
1. Create Company (from business details)
   - name: business_name
   - email: email (from registration)
   - phone: phone
   - address: address
   - city: city
   - state: state
   - pincode: pincode
   - country: country
   - gstin: gstin
   - website: website
   - is_active: true
↓
2. Create User (from user details)
   - name: name
   - email: email
   - password: password (if direct registration) OR generate random password
   - role: 'manager' (default for new companies)
   - company_id: <newly created company id>
↓
3. Update Registration Request Status
   - status: 'approved'
↓
4. Refresh data
```

---

## Key Functions Needed

1. `createUserFromRegistrationRequest(requestId: number)` - Main function
2. `createCompanyFromRequest(request: RegistrationRequest)` - Create company
3. `createUserFromRequest(request: RegistrationRequest, companyId: number)` - Create user
4. `updateRequestStatus(requestId: number, status: 'approved')` - Update status

---

## UI Components

- Tabs (Registration Requests, Users, Companies)
- Tables to display data
- Buttons for actions
- Modals/Confirmation dialogs
- Status badges (pending/approved/rejected)
