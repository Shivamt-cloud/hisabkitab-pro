# Registration Requests - Complete Implementation Plan

## Requirements

1. **Status Flags:**
   - Communication Initiated
   - Agreement Done  
   - Payment Done

2. **Professional Status Tracking:**
   - pending
   - under_review
   - registration_accepted
   - agreement_pending
   - payment_pending
   - completed
   - rejected

3. **Email Templates:**
   - Registration Received (pending/under_review)
   - Registration Accepted (registration_accepted)
   - Agreement Pending (agreement_pending)
   - Payment Pending (payment_pending)
   - Welcome/Completed (completed)
   - Rejection (rejected)

4. **UI in System Settings:**
   - "Registration Requests" tab
   - View all registration requests
   - Update status flags
   - Update status
   - Generate email templates
   - Once all flags complete, create company/user manually

## Database Schema Changes

Add to `registration_requests` table:
- `communication_initiated` (BOOLEAN)
- `agreement_done` (BOOLEAN)
- `payment_done` (BOOLEAN)
- Update `status` to include new values

## Implementation Steps

1. Update database schema (SQL)
2. Update TypeScript interfaces
3. Update services (cloudRegistrationRequestService)
4. Add "Registration Requests" tab to SystemSettings
5. Create email template utility
6. Add UI for viewing/managing requests
7. Add email template generator
