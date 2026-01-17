# Registration Requests in System Settings - Implementation Plan

## Overview

Add "Registration Requests" tab to System Settings page where admin can:
1. View all registration requests
2. See registration details
3. Track status with flags: Communication Initiated, Agreement Done, Payment Done
4. Once all flags complete, manually create company and user using existing forms

## Database Changes

Add status tracking fields to `registration_requests` table:
- `communication_initiated` (BOOLEAN, default false)
- `agreement_done` (BOOLEAN, default false)
- `payment_done` (BOOLEAN, default false)

## Code Changes

1. **Update RegistrationRequest interface** - Add status flags
2. **Update cloudRegistrationRequestService** - Handle flag updates
3. **Add "Registration Requests" tab** to SystemSettings
4. **Display registration requests** with details
5. **Add checkboxes/toggles** for status flags
6. **Show "Create Company & User" option** when all flags complete

## Workflow

1. Admin views registration requests in System Settings
2. Admin sees request details
3. Admin updates status flags as progress happens:
   - Communication Initiated ✓
   - Agreement Done ✓
   - Payment Done ✓
4. Once all flags are complete, admin manually creates:
   - Company (using existing company form)
   - User (using existing user form)
5. Admin uses registration request details to fill forms
