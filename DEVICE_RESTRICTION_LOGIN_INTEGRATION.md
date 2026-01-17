# Device Restriction - Login Integration Guide

## Summary

Device restriction functionality has been implemented with the following components:

### ✅ Completed:
1. **Database Schema** - SQL executed in Supabase
   - `users` table updated with subscription fields
   - `user_devices` table created
   
2. **Device ID Utility** (`src/utils/deviceId.ts`)
   - Generates unique device IDs
   - Stores device information
   - Detects device type

3. **Cloud Device Service** (`src/services/cloudDeviceService.ts`)
   - Register devices
   - Get user devices
   - Remove devices
   - Check device registration
   - Update last accessed

4. **IndexedDB Schema** - Updated
   - `USER_DEVICES` store added
   - DB_VERSION incremented to 13

5. **Pricing Display** - Updated
   - Shows "1 Device Access (Basic Plan)" message
   - Mentions upgrade options

### 🔄 Next Steps for Login Integration:

#### 1. Create Device Service Wrapper
Create `src/services/deviceService.ts` that wraps `cloudDeviceService` and adds business logic.

#### 2. Update AuthContext Login Function
Modify `src/context/AuthContext.tsx` `login` function to:
- Get current device ID
- Check if device is registered
- If not registered:
  - Get user's active device count
  - Get user's max_devices limit
  - If under limit: Register device
  - If at limit: Return error/special status for device management UI

#### 3. Create Device Management Modal
Create a modal component that shows:
- List of active devices
- Remove device option
- Message when limit is reached

#### 4. Update Login Page
Update `src/pages/Login.tsx` to:
- Handle device limit errors
- Show device management modal when needed
- Register device after successful login

## Implementation Notes

- Device restriction checks happen AFTER successful authentication
- Users can manage devices from Settings page (future)
- Device registration happens automatically on first login from new device
- If at limit, user must remove an old device before adding a new one

## Testing Checklist

- [ ] Login from new device (should auto-register)
- [ ] Login from registered device (should work normally)
- [ ] Login when at device limit (should show device management)
- [ ] Remove device and login from new device
- [ ] Verify device count matches subscription tier
