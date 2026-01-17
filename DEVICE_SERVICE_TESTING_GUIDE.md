# Device Service Testing Guide

## Current Status

✅ **Created:**
- `src/utils/deviceId.ts` - Device ID generation utility
- `src/services/cloudDeviceService.ts` - Device service for Supabase/IndexedDB
- Database tables: `user_devices` in Supabase
- IndexedDB store: `USER_DEVICES`

❌ **Not Yet Integrated:**
- Device management UI
- Device checking in login flow
- Device display in System Settings

## Testing Methods

### Method 1: Browser Console (Quick Test)

1. **Open your app** (e.g., `http://localhost:5173`)
2. **Open Browser DevTools** (F12 or Right-click → Inspect)
3. **Go to Console Tab**
4. **Run these commands:**

```javascript
// Check if device ID exists in localStorage
localStorage.getItem('device_id')

// Check device info
JSON.parse(localStorage.getItem('device_info') || '{}')

// View IndexedDB data (Chrome)
// Go to: Application tab → IndexedDB → Your DB → USER_DEVICES
```

### Method 2: Add Device Management to System Settings (Recommended)

Add a "Devices" section to System Settings where you can:
- View all devices for users
- See device registration status
- Test device registration
- Remove devices

### Method 3: Create a Test Page

Create a simple test page at `/test-devices` to:
- Generate device ID
- Register device
- List devices
- Remove device

### Method 4: Check Database Directly

**Supabase:**
1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Open `user_devices` table
4. View registered devices

**IndexedDB (Browser):**
1. Open DevTools → Application tab
2. Expand IndexedDB
3. Find your database
4. Open `USER_DEVICES` store
5. View stored devices

## Next Steps

Would you like me to:
1. **Add Device Management UI** to System Settings page? (Recommended)
2. **Create a test page** for device services?
3. **Integrate device checking** into login flow?

## Recommended: Add to System Settings

I can add a "Devices" tab to System Settings where admin can:
- View devices for each user
- See device registration status
- Test device registration
- Remove/manage devices
- See device limits based on subscription tier
