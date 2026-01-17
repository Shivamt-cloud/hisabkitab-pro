# Device Restriction Implementation Plan

## Overview
Implement device-based access restrictions based on payment/subscription tiers.

## Payment Tiers

| Tier | Devices | Price (Example) | Description |
|------|---------|----------------|-------------|
| **Basic** | 1 device | ₹6,000/Year | Single device access |
| **Standard** | 3 devices | ₹8,000/Year | Up to 3 devices |
| **Premium** | Unlimited | ₹12,000/Year | Unlimited devices |

## Database Schema Changes

### 1. Update `users` table
Add subscription/device limit fields:

```sql
-- Add subscription fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'standard', 'premium')),
ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));
```

### 2. Create `user_devices` table
Track devices per user:

```sql
-- Create user_devices table
CREATE TABLE IF NOT EXISTS user_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser_info TEXT,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(user_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own devices" ON user_devices FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own devices" ON user_devices FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own devices" ON user_devices FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own devices" ON user_devices FOR DELETE USING (auth.uid()::text = user_id);
```

## Device Identification Strategy

### Option 1: Browser Fingerprint (Recommended)
- Generate unique device ID based on:
  - User Agent
  - Screen resolution
  - Timezone
  - Language
  - Canvas fingerprint
  - WebGL fingerprint
- Store in localStorage
- More reliable, harder to bypass

### Option 2: Simple UUID
- Generate UUID on first visit
- Store in localStorage
- Simple but can be cleared/reset

### Option 3: Hybrid Approach (Best)
- Generate UUID + Browser Fingerprint
- Combine for unique device ID
- Store both for verification

## Implementation Steps

### Step 1: Device ID Generation Utility
Create `src/utils/deviceId.ts`:
- Generate unique device ID
- Store in localStorage
- Retrieve device ID
- Validate device ID

### Step 2: Update User Service
- Add subscription tier management
- Add device limit checking
- Add device registration methods

### Step 3: Create Device Service
Create `src/services/deviceService.ts`:
- Register device
- Get user devices
- Remove device
- Check device limit
- Update last accessed

### Step 4: Update Login Flow
- On login, check device count
- If at limit, show device management UI
- Allow user to remove old devices
- Register new device if under limit

### Step 5: Device Management UI
Create device management page/section:
- List active devices
- Show device info (name, type, last accessed)
- Remove/revoke device option
- Show device limit and current usage

### Step 6: Subscription Management
- Update subscription tier
- Update device limit based on tier
- Handle subscription expiry
- Renew subscription

## Enforcement Logic

### On Login:
1. Check if device is already registered
2. If not registered:
   - Get user's active device count
   - Get user's max_devices limit
   - If count < limit: Register device
   - If count >= limit: Show device management, allow removal of old device
3. Update last_accessed timestamp

### On Each Request (Optional):
- Validate device is still active
- Check subscription status
- Block if expired or device revoked

### Device Removal:
- User can remove devices from device management UI
- Admin can remove devices (future)
- Automatic removal of inactive devices (optional: after 90 days)

## User Experience Flow

### Scenario 1: New Device (Under Limit)
1. User logs in from new device
2. Device auto-registered
3. Access granted

### Scenario 2: New Device (At Limit)
1. User logs in from new device
2. Device limit reached message shown
3. Show list of existing devices
4. User selects device to remove
5. New device registered
6. Access granted

### Scenario 3: Returning Device
1. User logs in from registered device
2. Last accessed timestamp updated
3. Access granted

### Scenario 4: Device Management
1. User goes to Settings > Devices
2. See all active devices
3. Can remove any device
4. Can rename devices
5. See device limit and usage

## UI Components Needed

1. **Device Management Page**
   - List of devices
   - Device info (name, type, last accessed)
   - Remove button
   - Device limit indicator

2. **Device Limit Warning**
   - Modal/dialog when limit reached
   - Show existing devices
   - Allow removal selection

3. **Subscription Info**
   - Show current tier
   - Show device limit
   - Upgrade option

## API/Service Methods Needed

### Device Service:
```typescript
- getDeviceId(): string
- registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<Device>
- getUserDevices(userId: string): Promise<Device[]>
- removeDevice(userId: string, deviceId: string): Promise<boolean>
- checkDeviceLimit(userId: string): Promise<{atLimit: boolean, currentCount: number, maxDevices: number}>
- updateLastAccessed(userId: string, deviceId: string): Promise<void>
- isDeviceRegistered(userId: string, deviceId: string): Promise<boolean>
```

### User Service (Update):
```typescript
- updateSubscriptionTier(userId: string, tier: 'basic' | 'standard' | 'premium'): Promise<User>
- getMaxDevices(tier: string): number
- checkSubscriptionStatus(userId: string): Promise<{active: boolean, expiryDate: string}>
```

## Security Considerations

1. **Device ID Storage**: Store in localStorage (persistent) + IndexedDB (backup)
2. **Validation**: Validate device on login and periodically
3. **Rate Limiting**: Prevent rapid device registration/removal
4. **Admin Override**: Admin can manage devices for users
5. **Audit Log**: Log device registration/removal events

## Migration Strategy

1. Add new columns to existing users (default: basic tier, 1 device)
2. Existing users continue with current access
3. On first login after update, register current device
4. Show device management UI gradually
5. Allow upgrade to higher tiers

## Future Enhancements

1. **Device Naming**: Allow users to name their devices
2. **Push Notifications**: Notify when new device logs in
3. **Remote Logout**: Logout from all devices option
4. **Device Activity Log**: Show login history per device
5. **IP Tracking**: Track IP addresses per device
6. **Geolocation**: Show device location (optional)
7. **Two-Factor Authentication**: Require 2FA for new devices
