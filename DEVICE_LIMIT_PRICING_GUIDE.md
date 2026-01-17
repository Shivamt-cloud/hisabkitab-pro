# Device Limit Pricing Display Guide

## Pricing Tiers with Device Limits

### Basic Tier
- **Price**: ₹6,000/Year (India), $720/Year (US), etc.
- **Device Limit**: 1 device
- **Display**: "1 Device Access"

### Standard Tier
- **Price**: ₹8,000/Year (India), $960/Year (US), etc.
- **Device Limit**: 3 devices
- **Display**: "3 Devices Access"

### Premium Tier
- **Price**: ₹12,000/Year (India), $1,440/Year (US), etc.
- **Device Limit**: Unlimited
- **Display**: "Unlimited Devices"

## Current Implementation
Currently, the login page shows a single pricing display. We need to:

1. **Update pricing display** to show device limits
2. **Add tier selection** (Basic/Standard/Premium) or show all tiers
3. **Integrate device restriction** into login flow
4. **Add device management** when limit is reached

## Recommendation
For now, show the current pricing (Basic tier - 1 device) with clear device limit message. Later, we can add tier selection.
