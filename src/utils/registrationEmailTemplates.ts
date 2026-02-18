// Registration Request Email Templates
// Templates for different stages of the registration process

import { RegistrationRequest } from '../services/registrationRequestService'

/**
 * Get GST rate based on country
 */
function getGSTRateByCountry(country: string): { rate: number; label: string } {
  const countryUpper = country.toUpperCase()
  
  // India - 18% GST
  if (countryUpper.includes('INDIA') || countryUpper === 'IN') {
    return { rate: 18, label: '18% GST (Goods and Services Tax)' }
  }
  
  // UAE - 5% VAT
  if (countryUpper.includes('UAE') || countryUpper.includes('UNITED ARAB EMIRATES') || countryUpper === 'AE') {
    return { rate: 5, label: '5% VAT (Value Added Tax)' }
  }
  
  // Singapore - 9% GST (as of 2024)
  if (countryUpper.includes('SINGAPORE') || countryUpper === 'SG') {
    return { rate: 9, label: '9% GST (Goods and Services Tax)' }
  }
  
  // Default: No GST/VAT or country-specific rate
  // For countries without GST, return 0
  return { rate: 0, label: 'No GST/VAT applicable' }
}

/**
 * Calculate price with GST
 */
function calculatePriceWithGST(basePrice: number, gstRate: number): { gstAmount: number; totalPrice: number } {
  if (gstRate === 0) {
    return { gstAmount: 0, totalPrice: basePrice }
  }
  const gstAmount = (basePrice * gstRate) / 100
  const totalPrice = basePrice + gstAmount
  return { gstAmount, totalPrice }
}

/**
 * Generate global platform section for email templates
 */
function getGlobalPlatformSection(request: RegistrationRequest): string {
  const tier = request.subscription_tier || 'starter'
  
  const deviceAccessSection = tier === 'starter' ? `
**Device Access Under Your Plan:**
✅ **1 Device** (Entry plan):
   • One device (Desktop, Laptop, or Tablet) for full business operations
   • Access all features: Sales, Purchases, Inventory, Reports (including Purchase Report)
   • Perfect to get started; upgrade anytime for more devices and users

**Total:** 1 device for your business needs!
` : tier === 'basic' ? `
**Device Access Under Your Plan:**
✅ **1 Primary Device** for full business operations:
   • Desktop/Laptop for main business work
   • OR Tablet for on-the-go management
   • Access all features: Sales, Purchases, Inventory, Reports

✅ **1 Personal Mobile Device** (Bonus Access):
   • Use your personal smartphone to:
     - 📊 Check daily reports and analytics
     - 📈 View sales summaries
     - 💰 Monitor cash flow
     - 📋 Review inventory status
     - 🔔 Receive notifications
   • Perfect for staying updated while away from your main device

**Total:** 1 primary device + 1 personal mobile = **2 devices** for your business needs!
` : tier === 'standard' ? `
**Device Access Under Your Plan:**
✅ **3 Primary Devices** for full business operations:
   • Desktop/Laptop for main business work
   • Tablet for on-the-go management
   • Additional device for staff/team member
   • Access all features: Sales, Purchases, Inventory, Reports

✅ **1 Personal Mobile Device** (Bonus Access):
   • Use your personal smartphone to:
     - 📊 Check daily reports and analytics
     - 📈 View sales summaries
     - 💰 Monitor cash flow
     - 📋 Review inventory status
     - 🔔 Receive notifications
   • Perfect for staying updated while away from your main devices

**Total:** 3 primary devices + 1 personal mobile = **4 devices** for your business needs!
` : `
**Device Access Under Your Plan:**
✅ **Unlimited Primary Devices** for full business operations:
   • Desktop/Laptop for main business work
   • Multiple tablets for on-the-go management
   • Unlimited devices for your entire team
   • Access all features: Sales, Purchases, Inventory, Reports
   • No device limit - scale as you grow!

✅ **1 Personal Mobile Device** (Bonus Access):
   • Use your personal smartphone to:
     - 📊 Check daily reports and analytics
     - 📈 View sales summaries
     - 💰 Monitor cash flow
     - 📋 Review inventory status
     - 🔔 Receive notifications
   • Perfect for staying updated while away from your main devices

**Total:** Unlimited primary devices + 1 personal mobile = **Unlimited access** for your entire business!
`

  const planName = tier === 'starter' ? '📱 Starter Plan - 1 device' : tier === 'basic' ? '📱 Basic Plan - 1 device + 1 mobile' : tier === 'standard' ? '📱📱📱 Standard Plan - 3 devices + 1 mobile' : tier === 'premium_plus' ? '🚗 Premium Plus Plan - Unlimited + Services (Bike, Car, E-bike)' : tier === 'premium_plus_plus' ? '🚗 Premium Plus Plus Plan - Unlimited + All Services' : '♾️ Premium Plan - Unlimited'

  return `
**🌍 GLOBAL PLATFORM - ACCESS FROM ANYWHERE:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 **Welcome to HisabKitab-Pro - Your Global Business Management Platform!**

HisabKitab-Pro is a **cloud-based global platform** that allows you to access your business data and manage your operations from **anywhere in the world**, at **any time**, on **any device** with internet connectivity.

✨ **Key Benefits:**
• 🌐 **Global Access**: Log in from any location worldwide
• ☁️ **Cloud-Based**: Your data is securely stored in the cloud
• 📱 **Multi-Device**: Access from desktop, laptop, tablet, or mobile
• 🔄 **Real-Time Sync**: Changes sync instantly across all your devices
• 💾 **Automatic Backup**: Your data is automatically backed up
• 🔒 **Secure**: Enterprise-grade security for your business data

**📱 YOUR SELECTED PLAN & DEVICE ACCESS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Plan:** ${planName}
${deviceAccessSection}

**💡 How to Use Your Devices:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **Primary Device(s)**: Use for complete business operations
   - Create sales, record purchases
   - Manage inventory, add products
   - Generate reports, track expenses
   - Full access to all features

2. **Personal Mobile**: Use for monitoring and quick checks
   - View reports and analytics
   - Check business performance
   - Monitor cash flow
   - Stay updated on the go

3. **Global Access**: Log in from anywhere
   - Home, office, or while traveling
   - Any device with internet
   - Real-time data sync
   - Secure cloud storage
`
}

export type EmailTemplateType = 
  | 'registration_received'
  | 'registration_accepted'
  | 'agreement_pending'
  | 'payment_pending'
  | 'welcome_completed'
  | 'rejected'
  | 'free_trial'
  | 'user_created'

export interface EmailTemplate {
  subject: string
  body: string
}

export const registrationEmailTemplates = {
  registration_received: (request: RegistrationRequest): EmailTemplate => ({
    subject: 'Registration Request Received - HisabKitab-Pro',
    body: `Dear ${request.name},

Thank you for your registration request for HisabKitab-Pro - Complete Inventory Management System.

${getGlobalPlatformSection(request)}

We have received your registration details and your request is currently under review.

**Your Registration Details:**
- Business Name: ${request.business_name}
- Business Type: ${request.business_type}
- Contact Email: ${request.email}
- Phone: ${request.phone}

**Next Steps:**
Our team will review your registration request and get back to you within 24-48 hours. 

**Registration Status:** Under Review

If you have any questions, please feel free to contact us at hisabkitabpro@gmail.com.

Best regards,
HisabKitab-Pro Team`
  }),

  registration_accepted: (request: RegistrationRequest): EmailTemplate => ({
    subject: 'Registration Accepted - Next Steps - HisabKitab-Pro',
    body: `Dear ${request.name},

Great news! Your registration request has been accepted.

${getGlobalPlatformSection(request)}

**Your Registration Details:**
- Business Name: ${request.business_name}
- Business Type: ${request.business_type}
- Contact Email: ${request.email}

**Next Steps:**
1. We will send you the agreement document for review
2. Once you sign the agreement, we will proceed with payment
3. After payment confirmation, your account will be activated

**Current Status:** Registration Accepted - Awaiting Agreement

Our team will contact you soon with the agreement document.

If you have any questions, please contact us at hisabkitabpro@gmail.com.

Best regards,
HisabKitab-Pro Team`
  }),

  agreement_pending: (request: RegistrationRequest, options?: { validityPeriod?: string; paymentPlan?: string; amount?: string }): EmailTemplate => {
    const validityPeriod = options?.validityPeriod || '1 Year'
    const paymentPlan = options?.paymentPlan || 'Annual'
    const baseAmount = options?.amount || 'As per pricing plan'
    
    // Get GST information based on country
    const gstInfo = getGSTRateByCountry(request.country || 'India')
    
    // Get currency symbol based on country
    const getCurrencySymbol = () => {
      const countryUpper = (request.country || 'India').toUpperCase()
      if (countryUpper.includes('INDIA') || countryUpper === 'IN') return '₹'
      if (countryUpper.includes('UAE') || countryUpper.includes('UNITED ARAB EMIRATES') || countryUpper === 'AE') return 'AED '
      if (countryUpper.includes('SINGAPORE') || countryUpper === 'SG') return 'S$'
      if (countryUpper.includes('UNITED STATES') || countryUpper === 'US') return '$'
      if (countryUpper.includes('UNITED KINGDOM') || countryUpper === 'GB') return '£'
      if (countryUpper.includes('AUSTRALIA') || countryUpper === 'AU') return 'A$'
      if (countryUpper.includes('CANADA') || countryUpper === 'CA') return 'C$'
      return '₹' // Default to INR
    }
    const currencySymbol = getCurrencySymbol()
    
    // Try to extract numeric amount if provided
    let basePriceNum = 0
    if (baseAmount && baseAmount !== 'As per pricing plan') {
      const match = baseAmount.match(/[\d,]+\.?\d*/)
      if (match) {
        basePriceNum = parseFloat(match[0].replace(/,/g, ''))
      }
    }
    
    const priceWithGST = basePriceNum > 0 ? calculatePriceWithGST(basePriceNum, gstInfo.rate) : null
    
    return {
      subject: 'Agreement Certificate & Terms - HisabKitab-Pro',
      body: `Dear ${request.name},

═══════════════════════════════════════════════════════════════
   AGREEMENT CERTIFICATE - HisabKitab-Pro Subscription
═══════════════════════════════════════════════════════════════

This certifies that we have agreed to the following terms and conditions for your subscription to HisabKitab-Pro - Complete Inventory Management System.

${getGlobalPlatformSection(request)}

**BUSINESS INFORMATION:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Name: ${request.business_name}
Business Type: ${request.business_type}
Contact Person: ${request.name}
Email: ${request.email}
Phone: ${request.phone}
Address: ${request.address}
City: ${request.city}, ${request.state} - ${request.pincode}
Country: ${request.country}
${request.gstin ? `GSTIN: ${request.gstin}` : ''}

**SUBSCRIPTION DETAILS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment Plan: ${paymentPlan}
${priceWithGST ? `Subscription Amount (Exclusive of ${gstInfo.label}): ${baseAmount}` : `Subscription Amount: ${baseAmount}`}
${priceWithGST && gstInfo.rate > 0 ? `+ ${gstInfo.label} (${gstInfo.rate}%): ${currencySymbol}${gstInfo.rate === 18 ? priceWithGST.gstAmount.toLocaleString('en-IN') : priceWithGST.gstAmount.toFixed(2)}` : ''}
${priceWithGST && gstInfo.rate > 0 ? `─────────────────────────────────────────────` : ''}
${priceWithGST && gstInfo.rate > 0 ? `Total Amount Payable (Inclusive of ${gstInfo.label}): ${currencySymbol}${gstInfo.rate === 18 ? priceWithGST.totalPrice.toLocaleString('en-IN') : priceWithGST.totalPrice.toFixed(2)}` : ''}
Validity Period: ${validityPeriod}
${gstInfo.rate > 0 ? `\n**IMPORTANT - GST/TAX INFORMATION:**\n⚠️ Subscription amount shown above is **EXCLUSIVE of ${gstInfo.label}**.\n📋 ${gstInfo.label} will be added during payment processing.\n💰 Final amount payable = Base Amount + ${gstInfo.label}` : ''}
Effective Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
Expiry Date: ${(() => {
  const expiryDate = new Date()
  if (validityPeriod.includes('Year') || validityPeriod.includes('year')) {
    const years = parseInt(validityPeriod) || 1
    expiryDate.setFullYear(expiryDate.getFullYear() + years)
  } else if (validityPeriod.includes('Month') || validityPeriod.includes('month')) {
    const months = parseInt(validityPeriod) || 12
    expiryDate.setMonth(expiryDate.getMonth() + months)
  } else {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)
  }
  return expiryDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
})()}

**TERMS AND CONDITIONS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SUBSCRIPTION SERVICE
   - Your subscription to HisabKitab-Pro includes access to all features and modules
   - The service will be activated upon receipt of payment confirmation
   - Your subscription is valid for the period mentioned above

2. PAYMENT TERMS
   - Payment must be made as per the agreed payment plan
   - All payments are non-refundable once service is activated
   - Payment confirmation is required before account activation

3. SERVICE USAGE
   - You agree to use the service in compliance with applicable laws and regulations
   - You are responsible for maintaining the confidentiality of your account credentials
   - Any misuse or unauthorized access is strictly prohibited

4. DATA AND PRIVACY
   - Your business data will be stored securely
   - We maintain strict confidentiality of your business information
   - Data backup and recovery services are included

5. SUPPORT AND MAINTENANCE
   - Technical support will be provided during the subscription period
   - System updates and maintenance will be performed as needed
   - Support can be reached at hisabkitabpro@gmail.com

6. RENEWAL
   - Subscription will need to be renewed before expiry date
   - Renewal reminders will be sent prior to expiry
   - Service will be suspended if renewal is not completed

7. TERMINATION
   - Either party may terminate this agreement with 30 days written notice
   - Data export will be provided upon termination request
   - Refund policy applies as per payment terms

8. LIABILITY
   - Service is provided "as is" without warranty of any kind
   - We are not liable for any indirect or consequential damages
   - Maximum liability is limited to the subscription amount paid

**ACKNOWLEDGMENT:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

By proceeding with payment, you acknowledge that you have read, understood, and agree to be bound by the terms and conditions stated above.

**NEXT STEPS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Review this agreement certificate carefully
2. Proceed with payment as per the payment plan
3. Upon payment confirmation, your account will be activated
4. You will receive login credentials via email

**CONTACT INFORMATION:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For any queries or clarifications regarding this agreement:
Email: hisabkitabpro@gmail.com
Subject: Agreement Query - ${request.business_name}

═══════════════════════════════════════════════════════════════

This is a system-generated agreement certificate. Please keep this document for your records.

Thank you for choosing HisabKitab-Pro!

Best regards,
HisabKitab-Pro Team

═══════════════════════════════════════════════════════════════`
    }
  },

  payment_pending: (request: RegistrationRequest): EmailTemplate => ({
    subject: 'Payment Required - Activate Your Account - HisabKitab-Pro',
    body: `Dear ${request.name},

Thank you for completing the agreement. We have received your signed agreement document.

${getGlobalPlatformSection(request)}

**Payment Information:**
- Business Name: ${request.business_name}
- Contact Email: ${request.email}

**Action Required:**
Please proceed with the payment to activate your account.

**Payment Details:**
[Payment instructions will be provided separately]

Once payment is confirmed, your account will be activated and you will receive login credentials.

**Current Status:** Awaiting Payment

If you have any questions, please contact us at hisabkitabpro@gmail.com.

Best regards,
HisabKitab-Pro Team`
  }),

  welcome_completed: (request: RegistrationRequest): EmailTemplate => ({
    subject: 'Welcome to HisabKitab-Pro - Complete User Manual & Getting Started Guide',
    body: `Dear ${request.name},

═══════════════════════════════════════════════════════════════
   🎉 WELCOME TO HISABKITAB-PRO!
   Your Account is Successfully Activated
═══════════════════════════════════════════════════════════════

Congratulations! Your account has been successfully activated and you're ready to start managing your business with HisabKitab-Pro.

${getGlobalPlatformSection(request)}

**YOUR ACCOUNT DETAILS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Name: ${request.business_name}
Login Email: ${request.email}
Account Status: ✅ Active
Subscription Plan: ${request.subscription_tier === 'starter' ? 'Starter Plan' : request.subscription_tier === 'basic' ? 'Basic Plan' : request.subscription_tier === 'standard' ? 'Standard Plan' : request.subscription_tier === 'premium_plus' ? 'Premium Plus Plan' : request.subscription_tier === 'premium_plus_plus' ? 'Premium Plus Plus Plan' : 'Premium Plan'}
Access: ${request.access_type === 'mobile' ? 'Mobile only' : request.access_type === 'desktop' ? 'Desktop only' : 'Combo (Mobile + Desktop)'}

**IMMEDIATE NEXT STEPS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Check your email for login credentials (separate email)
2. ✅ Log in to your account at: [Your Application URL]
3. ✅ Set up your company profile in System Settings
4. ✅ Start adding your products and suppliers
5. ✅ Begin managing your inventory!

═══════════════════════════════════════════════════════════════
   📖 COMPLETE USER MANUAL - STEP BY STEP GUIDE
═══════════════════════════════════════════════════════════════

This comprehensive guide will walk you through every feature of HisabKitab-Pro in a simple, easy-to-understand format.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📦 STEP 1: HOW TO ADD PRODUCTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** Add all your products to the system so you can track inventory.

**Steps:**
1. Click "Products" in the left sidebar menu
2. Click the "Add Product" button (green button, top right)
3. Fill in the product form:
   • Product Name* (e.g., "Samsung Galaxy S21")
   • Category* (Select from dropdown or create new)
   • Sub-Category (Optional)
   • Purchase Price* (Cost price)
   • Selling Price* (MRP/Sale price)
   • Stock Quantity* (Current stock)
   • Unit (e.g., "Piece", "Kg", "Liter")
   • Barcode (Optional - can generate automatically)
   • Description (Optional)
4. Click "Save Product" button

**Visual Flow:**
    Products Menu → Add Product Button → Fill Form → Save
         ↓              ↓                    ↓          ↓
    [Products List] → [Product Form] → [Validation] → [Success]

**Tips:**
✅ Add all products before starting purchases
✅ Use categories to organize products
✅ Set accurate purchase and selling prices
✅ Update stock quantity if you have existing inventory

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🏢 STEP 2: HOW TO ADD SUPPLIERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** Maintain a database of your suppliers for purchase tracking.

**Steps:**
1. Click "Suppliers" in the left sidebar menu
2. Click "Add Supplier" button (green button, top right)
3. Fill in the supplier form:
   • Supplier Name* (e.g., "ABC Wholesale")
   • Contact Person (Optional)
   • Phone Number* (Primary contact)
   • Email (Optional)
   • Address* (Complete address)
   • City, State, Pincode*
   • GSTIN (If applicable)
   • Account Balance (Opening balance if any)
4. Click "Save Supplier" button

**Visual Flow:**
    Suppliers Menu → Add Supplier Button → Fill Form → Save
         ↓                ↓                    ↓          ↓
    [Suppliers List] → [Supplier Form] → [Validation] → [Success]

**Tips:**
✅ Add all suppliers before recording purchases
✅ Include GSTIN for GST-compliant purchases
✅ Keep contact details updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📥 STEP 3: HOW TO ADD PURCHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** Record purchases from suppliers and automatically update stock.

**Types of Purchase:**
• Simple Purchase: For non-GST businesses
• GST Purchase: For GST-registered businesses (with tax calculations)

**Steps for Simple Purchase:**
1. Click "Purchase" in the left sidebar
2. Click "Simple Purchase" button
3. Fill in purchase details:
   • Select Supplier* (from dropdown)
   • Purchase Date*
   • Add Products:
     - Search product by name/barcode
     - Enter Quantity*
     - Enter Purchase Price* (per unit)
     - System calculates total automatically
   • Add multiple products using "Add Item" button
4. Review Grand Total
5. Click "Save Purchase" button

**Steps for GST Purchase:**
1. Click "Purchase" → "GST Purchase"
2. Fill supplier and date
3. Add products with:
   • Quantity, Rate, Tax Rate (GST %)
   • System calculates tax automatically
4. Review: Subtotal, Total Tax, Grand Total
5. Click "Save Purchase"

**Visual Flow:**
    Purchase Menu → Select Type → Select Supplier → Add Products
         ↓              ↓              ↓                ↓
    [Purchase List] → [Type] → [Supplier] → [Product List]
         ↓
    Enter Quantities & Prices → Review Total → Save
         ↓                              ↓           ↓
    [Product Details] → [Grand Total] → [Success]
         ↓
    Stock Automatically Increases! ✅

**Important:**
✅ Stock quantity increases automatically after saving purchase
✅ Purchase history is saved for reference
✅ Can view purchase details anytime

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💰 STEP 4: HOW TO DO SALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** Record sales to customers and automatically decrease stock.

**Steps:**
1. Click "Sales" in the left sidebar
2. Click "New Sale" button (green button, top right)
3. Fill in sale details:
   • Select Customer* (or choose "Walk-in Customer")
   • Sale Date* (defaults to today)
   • Add Products:
     - Search product by name/barcode/article number
     - Select product from results
     - Enter Quantity* (cannot exceed available stock)
     - Selling price auto-fills (can modify)
     - System calculates item total
   • Add multiple products
4. Apply Discount (if any):
   • Additional Discount: Enter amount or percentage
5. Payment Details:
   • Select Payment Method(s):
     - Cash
     - UPI
     - Card
     - Bank Transfer
     - Credit (Outstanding)
   • Enter amounts for each method
   • Total should match Grand Total
6. Review:
   • Subtotal
   • Discount (if any)
   • Grand Total
   • Payment Summary
7. Click "Save Sale" button

**Visual Flow:**
    Sales Menu → New Sale → Select Customer → Add Products
         ↓           ↓            ↓                ↓
    [Sales List] → [Sale Form] → [Customer] → [Product Search]
         ↓
    Enter Quantities → Apply Discount → Payment Methods
         ↓                  ↓                  ↓
    [Product List] → [Discount] → [Payment Selection]
         ↓
    Review Total → Save Sale
         ↓            ↓
    [Grand Total] → [Success]
         ↓
    Stock Automatically Decreases! ✅
    Invoice Generated! ✅

**Important:**
✅ Stock decreases automatically after saving sale
✅ Invoice number is generated automatically
✅ Can view/print invoice immediately
✅ Can send receipt via WhatsApp

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📱 STEP 5: HOW TO SEND RECEIPT BY WHATSAPP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** Quickly share invoice/receipt with customers via WhatsApp.

**Steps:**
1. After saving a sale, you'll see a success message
2. Click "View Invoice" button (or go to Sales History)
3. On the Invoice page, look for the WhatsApp icon (📱) button
4. Click the "Share via WhatsApp" button
5. WhatsApp Web/App will open automatically
6. The receipt is formatted and ready to send:
   • Company name and details
   • Invoice number and date
   • Customer name
   • Itemized list with quantities and prices
   • Total amount
   • Payment methods
   • Payment status
7. Select customer's WhatsApp number
8. Click "Send" in WhatsApp

**Visual Flow:**
    Save Sale → View Invoice → WhatsApp Button → WhatsApp Opens
         ↓            ↓              ↓                ↓
    [Success] → [Invoice Page] → [Share Icon] → [WhatsApp]
         ↓
    Receipt Formatted → Select Contact → Send
         ↓                    ↓            ↓
    [Formatted Text] → [Contact List] → [Sent] ✅

**Receipt Format Example:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Your Company Name*

*Invoice #INV-001*
Date: 15 January 2025
Customer: John Doe

*Items:*
1. Product A - Qty: 2 - ₹1,000.00
2. Product B - Qty: 1 - ₹500.00

*Total Amount: ₹1,500.00*
Payment Methods:
  1. CASH: ₹1,000.00
  2. UPI: ₹500.00
Payment Status: PAID

Thank you for your business! 🙏
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Tips:**
✅ Receipt is automatically formatted
✅ Can send to any WhatsApp number
✅ Professional format impresses customers
✅ Quick and convenient

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 STEP 6: HOW TO CHECK DAILY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** View comprehensive daily business summary including sales, profit, expenses, and cash flow.

**Steps:**
1. Click "Daily Report" in the left sidebar menu
2. Select the date you want to view (defaults to today)
3. Click "Generate Report" or report loads automatically
4. View the following sections:

**Report Sections:**

📈 **Summary Section:**
   • Total Sales: Sum of all sales for the day
   • Total Costing: Total purchase cost of sold items
   • Gross Profit: Sales - Costing
   • Profit Margin: (Profit / Sales) × 100
   • Total Expenses: All expenses for the day
   • Net Profit/Loss: Gross Profit - Expenses
   • Net Profit Margin: (Net Profit / Sales) × 100

💰 **Cash Management:**
   • Opening Balance: Cash at start of day
   • Closing Balance: Cash at end of day
   • Expected Closing: Calculated based on transactions
   • Difference: Actual vs Expected closing

💳 **Sales by Payment Method:**
   • Cash sales amount
   • UPI sales amount
   • Card sales amount
   • Bank Transfer amount
   • Credit/Outstanding amount

👥 **Sales by Sales Person:**
   • Individual sales person performance
   • Total sales per person

📝 **Expenses by Person:**
   • Expenses recorded by each person
   • Total expenses per person

📊 **Counts:**
   • Number of sales transactions
   • Number of purchase transactions
   • Number of expense entries

5. You can also:
   • Share report via WhatsApp (📱 button)
   • Export report (if available)
   • View previous days by changing date

**Visual Flow:**
    Daily Report Menu → Select Date → Generate Report
         ↓                ↓                ↓
    [Report Page] → [Date Picker] → [Loading...]
         ↓
    View Complete Report:
         ↓
    ┌─────────────────────────────────┐
    │ Summary (Sales, Profit, etc.)  │
    │ Cash Management                │
    │ Payment Methods Breakdown      │
    │ Sales Person Performance       │
    │ Expenses Summary               │
    │ Transaction Counts             │
    └─────────────────────────────────┘
         ↓
    Share/Export Options

**Tips:**
✅ Check daily report at end of each day
✅ Compare actual vs expected closing balance
✅ Review profit margins regularly
✅ Use sales person data for performance tracking

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💸 STEP 7: HOW TO ADD EXPENSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** Track all business expenses for accurate profit calculation.

**Steps:**
1. Click "Expenses" in the left sidebar menu
2. Click "Add Expense" button (green button, top right)
3. Fill in expense form:
   • Expense Type* (Select from dropdown):
     - Rent
     - Electricity
     - Salary
     - Transportation
     - Marketing
     - Maintenance
     - Other
   • Amount* (Enter expense amount)
   • Date* (Select expense date)
   • Description (Optional - add details)
   • Sales Person (Optional - if expense is by specific person)
4. Click "Save Expense" button

**Visual Flow:**
    Expenses Menu → Add Expense → Fill Form → Save
         ↓              ↓              ↓          ↓
    [Expenses List] → [Expense Form] → [Validation] → [Success]

**Expense Types Available:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Rent: Shop/office rent
• Electricity: Power bills
• Salary: Employee salaries
• Transportation: Delivery, fuel costs
• Marketing: Advertising, promotions
• Maintenance: Repairs, servicing
• Other: Any other expenses

**Tips:**
✅ Record expenses daily for accurate reporting
✅ Use descriptions to track expense details
✅ Assign to sales person if applicable
✅ Review expenses in daily report

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💵 STEP 8: HOW TO SET OPENING & CLOSING RECORDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Purpose:** Track daily cash flow by recording opening and closing balances.

**Steps:**

**A. Setting Opening Balance (Start of Day):**
1. Go to "Daily Report" in sidebar
2. Select today's date
3. At the top of the report, find "Opening Balance" field
4. Enter the cash amount you have at the start of the day
5. System automatically calculates "Expected Closing Balance" based on:
   • Opening Balance
   • Cash Sales
   • Cash Expenses
   • Other cash transactions

**B. Setting Closing Balance (End of Day):**
1. At the end of the day, go to "Daily Report"
2. Select today's date
3. Scroll to "Cash Management" section
4. Find "Closing Balance" field
5. Enter the actual cash amount you have at end of day
6. System shows:
   • Expected Closing: What should be (calculated)
   • Actual Closing: What you entered
   • Difference: Actual - Expected

**Visual Flow:**
    Start of Day:
    Daily Report → Enter Opening Balance → System Calculates Expected Closing
         ↓                ↓                            ↓
    [Report Page] → [Opening Field] → [Auto Calculation]
         ↓
    Throughout Day: Sales & Expenses Recorded
         ↓
    End of Day:
    Daily Report → Enter Closing Balance → View Difference
         ↓                ↓                      ↓
    [Report Page] → [Closing Field] → [Difference Display]

**Example:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Opening Balance:     ₹10,000.00
+ Cash Sales:        ₹15,000.00
- Cash Expenses:     ₹2,000.00
─────────────────────────────────
Expected Closing:    ₹23,000.00
Actual Closing:      ₹23,000.00
─────────────────────────────────
Difference:          ₹0.00 ✅ (Perfect match!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Tips:**
✅ Set opening balance every morning
✅ Enter closing balance every evening
✅ If difference is large, review transactions
✅ Keep records for accounting purposes

═══════════════════════════════════════════════════════════════
   🔄 COMPLETE BUSINESS FLOW DIAGRAM
═══════════════════════════════════════════════════════════════

Here's the complete flow of how to use HisabKitab-Pro for your daily business:

    ┌─────────────────────────────────────────────────┐
    │           START - SETUP PHASE                   │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Step 1: Add Products                          │
    │  → Products Menu → Add Product                 │
    │  → Fill details → Save                        │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Step 2: Add Suppliers                         │
    │  → Suppliers Menu → Add Supplier               │
    │  → Fill details → Save                         │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │           DAILY OPERATIONS                      │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Morning: Set Opening Balance                  │
    │  → Daily Report → Enter Opening Balance        │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Step 3: Record Purchase (When Needed)         │
    │  → Purchase Menu → Select Type                 │
    │  → Select Supplier → Add Products              │
    │  → Enter Quantities & Prices → Save            │
    │  → Stock Increases Automatically ✅             │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Step 4: Make Sales (Throughout Day)           │
    │  → Sales Menu → New Sale                       │
    │  → Select Customer → Add Products              │
    │  → Enter Quantities → Payment Methods          │
    │  → Save Sale                                    │
    │  → Stock Decreases Automatically ✅             │
    │  → Invoice Generated ✅                         │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Step 5: Send Receipt via WhatsApp            │
    │  → View Invoice → WhatsApp Button              │
    │  → Select Contact → Send                       │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Step 7: Add Expenses (As They Occur)         │
    │  → Expenses Menu → Add Expense                 │
    │  → Select Type → Enter Amount → Save           │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Step 6: Check Daily Report (End of Day)       │
    │  → Daily Report → View Summary                 │
    │  → Review: Sales, Profit, Expenses            │
    │  → Check Cash Flow                             │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │  Evening: Set Closing Balance                  │
    │  → Daily Report → Enter Closing Balance        │
    │  → Check Difference                            │
    └─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────────┐
    │              REPEAT DAILY                       │
    └─────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
   💡 PRO TIPS FOR SUCCESS
═══════════════════════════════════════════════════════════════

✅ **Setup Phase:**
   • Complete product and supplier setup before starting operations
   • Set accurate prices and stock quantities
   • Organize products using categories

✅ **Daily Operations:**
   • Set opening balance every morning
   • Record purchases immediately when received
   • Make sales using the system (don't skip)
   • Add expenses as they occur (don't wait)
   • Send WhatsApp receipts for better customer service

✅ **End of Day:**
   • Review daily report to understand business performance
   • Set closing balance and verify difference
   • Check profit margins regularly
   • Identify areas for improvement

✅ **Best Practices:**
   • Keep data updated daily
   • Review reports weekly for trends
   • Use WhatsApp receipts for professional image
   • Track all expenses for accurate profit calculation
   • Maintain proper opening/closing balance records

═══════════════════════════════════════════════════════════════
   🆘 NEED HELP?
═══════════════════════════════════════════════════════════════

If you have any questions or need assistance:

📧 Email: hisabkitabpro@gmail.com
📞 Phone: [Your contact number]
💬 Subject: User Support - ${request.business_name}

Our support team is always ready to help you!

═══════════════════════════════════════════════════════════════

**THANK YOU FOR CHOOSING HISABKITAB-PRO!**

We're excited to be part of your business journey. This system will help you:
• Save time on manual calculations
• Track inventory accurately
• Understand your business performance
• Make informed decisions
• Grow your business!

Start using the system today and experience the difference!

Best regards,
HisabKitab-Pro Team

═══════════════════════════════════════════════════════════════
This is your complete user manual. Save this email for reference.
═══════════════════════════════════════════════════════════════`
  }),

  rejected: (request: RegistrationRequest): EmailTemplate => ({
    subject: 'Registration Request Update - HisabKitab-Pro',
    body: `Dear ${request.name},

Thank you for your interest in HisabKitab-Pro.

${getGlobalPlatformSection(request)}

After reviewing your registration request, we regret to inform you that we are unable to proceed with your registration at this time.

**Your Registration Details:**
- Business Name: ${request.business_name}
- Contact Email: ${request.email}

If you have any questions or would like to discuss further, please contact us at hisabkitabpro@gmail.com.

We appreciate your interest and wish you success with your business.

Best regards,
HisabKitab-Pro Team`
  }),

  free_trial: (request: RegistrationRequest): EmailTemplate => {
    // Calculate plan pricing based on selected tier
    const getPlanDetails = () => {
      const tier = request.subscription_tier || 'starter'
      const tierNames = {
        starter: 'Starter Plan - 1 device',
        basic: 'Basic Plan - 1 device + 1 mobile',
        standard: 'Standard Plan - 3 devices + 1 mobile',
        premium: 'Premium Plan - Unlimited',
        premium_plus: 'Premium Plus Plan - Unlimited + Services (Bike, Car, E-bike, E-car)',
        premium_plus_plus: 'Premium Plus Plus Plan - Unlimited + All Services'
      }
      
      // Estimate pricing (you may want to adjust based on country)
      const basePrice = 6000 // INR base price
      const tierMultipliers = {
        starter: 0.6,
        basic: 1.0,
        standard: 1.33,
        premium: 2.0,
        premium_plus: 2.5,
        premium_plus_plus: 3.0
      }
      const estimatedPrice = Math.round(basePrice * (tierMultipliers[tier as keyof typeof tierMultipliers] ?? 1))
      
      return {
        name: tierNames[tier as keyof typeof tierNames],
        price: `₹${estimatedPrice.toLocaleString()}/Year`,
        tier: tier
      }
    }
    
    const planDetails = getPlanDetails()
    const trialStartDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    const reminderDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    
    // Get GST information based on country
    const gstInfo = getGSTRateByCountry(request.country || 'India')
    
    // Extract numeric price from formatted string (handles ₹, $, £, AED, S$, etc.)
    const priceMatch = planDetails.price.match(/[\d,]+\.?\d*/)
    const basePrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0
    const priceWithGST = calculatePriceWithGST(basePrice, gstInfo.rate)
    
    // Get currency symbol based on country
    const getCurrencySymbol = () => {
      const countryUpper = (request.country || 'India').toUpperCase()
      if (countryUpper.includes('INDIA') || countryUpper === 'IN') return '₹'
      if (countryUpper.includes('UAE') || countryUpper.includes('UNITED ARAB EMIRATES') || countryUpper === 'AE') return 'AED '
      if (countryUpper.includes('SINGAPORE') || countryUpper === 'SG') return 'S$'
      if (countryUpper.includes('UNITED STATES') || countryUpper === 'US') return '$'
      if (countryUpper.includes('UNITED KINGDOM') || countryUpper === 'GB') return '£'
      if (countryUpper.includes('AUSTRALIA') || countryUpper === 'AU') return 'A$'
      if (countryUpper.includes('CANADA') || countryUpper === 'CA') return 'C$'
      return '₹' // Default to INR
    }
    const currencySymbol = getCurrencySymbol()
    
    return {
      subject: '🎁 Welcome to Your 1 Month FREE Trial - HisabKitab-Pro',
      body: `Dear ${request.name},

═══════════════════════════════════════════════════════════════
   🎉 WELCOME TO YOUR 1 MONTH FREE TRIAL!
═══════════════════════════════════════════════════════════════

Congratulations! Your account has been activated for a **1 Month FREE Trial** of HisabKitab-Pro - Complete Inventory Management System.

${getGlobalPlatformSection(request)}

**YOUR TRIAL DETAILS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Name: ${request.business_name}
Contact Email: ${request.email}
Phone: ${request.phone}
Trial Start Date: ${trialStartDate}
Trial End Date: ${trialEndDate}
Trial Duration: 30 Days (1 Month)

**SELECTED PLAN:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan: ${planDetails.name}
Estimated Price (Exclusive of ${gstInfo.label}): ${planDetails.price}
${gstInfo.rate > 0 ? `+ ${gstInfo.label}: ${currencySymbol}${gstInfo.rate === 18 ? priceWithGST.gstAmount.toLocaleString('en-IN') : priceWithGST.gstAmount.toFixed(2)}` : ''}
${gstInfo.rate > 0 ? `─────────────────────────────────────────────` : ''}
${gstInfo.rate > 0 ? `Total Price (Inclusive of ${gstInfo.label}): ${currencySymbol}${gstInfo.rate === 18 ? priceWithGST.totalPrice.toLocaleString('en-IN') : priceWithGST.totalPrice.toFixed(2)}` : ''}

**IMPORTANT - GST/TAX INFORMATION:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ All prices shown above are **EXCLUSIVE of ${gstInfo.label}**.
${gstInfo.rate > 0 ? `📋 ${gstInfo.label} will be added during payment processing.` : ''}
${gstInfo.rate > 0 ? `💰 Final amount payable = Base Price + ${gstInfo.label}` : ''}
*Final pricing will be confirmed based on your country and selected plan*

**WHAT'S INCLUDED IN YOUR FREE TRIAL:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Full access to all features and modules
✅ Complete inventory management
✅ Purchase & Sales tracking
✅ GST compliance and reporting
✅ Real-time analytics and reports
✅ Multi-user access (as per selected plan)
✅ Technical support during trial period
✅ Data backup and security

**IMPORTANT INFORMATION:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Trial Period**: Your free trial will last for 30 days from ${trialStartDate} to ${trialEndDate}.

2. **Registration Process**: 
   - **10 days before your trial ends** (around ${reminderDate}), we will send you an email to initiate the registration process.
   - This will include agreement documents, payment details, and next steps.
   - Based on your selected plan (${planDetails.name}), the pricing will be ${planDetails.price}.

3. **After Trial Completion**:
   - Once your trial period ends, you can choose to continue with the subscription.
   - The registration process will be initiated automatically 10 days before trial expiry.
   - Payment will be required to continue using the service after the trial period.

4. **No Credit Card Required**: 
   - Your trial is completely free - no payment required during the trial period.
   - You can explore all features without any commitment.

5. **Account Access**:
   - You will receive your login credentials in a separate email.
   - Use these credentials to access your account and start managing your inventory.

**NEXT STEPS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ Check your email for login credentials (separate email)
2. ✅ Log in to your account
3. ✅ Set up your company profile
4. ✅ Start exploring all features
5. ✅ Enjoy your free trial!

**IMPORTANT REMINDERS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 **10 Days Before Trial Ends** (${reminderDate}):
   - We will send you an email to initiate the registration process
   - You'll receive agreement documents and payment instructions
   - Based on your selected plan, the pricing will be:
     • Base Price: ${planDetails.price} (Exclusive of ${gstInfo.label})
     ${gstInfo.rate > 0 ? `• ${gstInfo.label}: ${currencySymbol}${gstInfo.rate === 18 ? priceWithGST.gstAmount.toLocaleString('en-IN') : priceWithGST.gstAmount.toFixed(2)}` : ''}
     ${gstInfo.rate > 0 ? `• Total Amount: ${currencySymbol}${gstInfo.rate === 18 ? priceWithGST.totalPrice.toLocaleString('en-IN') : priceWithGST.totalPrice.toFixed(2)} (Inclusive of ${gstInfo.label})` : ''}

📅 **Trial End Date** (${trialEndDate}):
   - Your trial period will end
   - To continue, complete the registration and payment process
   - Your data will be preserved during the transition

**SUPPORT & ASSISTANCE:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any questions or need assistance during your trial:
📧 Email: hisabkitabpro@gmail.com
📞 Phone: [Your contact number]
💬 Subject: Free Trial Support - ${request.business_name}

Our support team is here to help you make the most of your trial period!

**QUICK START USER MANUAL:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 **Step-by-Step Guide to Get Started:**

1️⃣ **Add Products** (Products Menu)
   → Click "Products" in sidebar → Click "Add Product" button
   → Fill: Product Name, Category, Purchase Price, Selling Price, Stock Quantity
   → Click "Save Product"

2️⃣ **Add Suppliers** (Suppliers Menu)
   → Click "Suppliers" in sidebar → Click "Add Supplier" button
   → Fill: Supplier Name, Contact Details, Address
   → Click "Save Supplier"

3️⃣ **Record Purchase** (Purchase Menu)
   → Click "Purchase" → Select "Simple Purchase" or "GST Purchase"
   → Select Supplier → Add Products → Enter Quantities & Prices
   → Click "Save Purchase" (Stock automatically updates)

4️⃣ **Make a Sale** (Sales Menu)
   → Click "Sales" → Click "New Sale" button
   → Select Customer → Search & Add Products
   → Enter Quantities → Add Payment Methods
   → Click "Save Sale" (Stock automatically decreases)

5️⃣ **Send Receipt via WhatsApp**
   → After saving sale → Click "View Invoice" button
   → Click "Share via WhatsApp" icon (📱)
   → WhatsApp opens with formatted receipt → Send to customer

6️⃣ **Check Daily Report** (Reports Menu)
   → Click "Daily Report" in sidebar
   → Select Date → View:
     • Total Sales & Profit
     • Cash Flow (Opening/Closing Balance)
     • Sales by Payment Method
     • Expenses Summary

7️⃣ **Add Expenses** (Expenses Menu)
   → Click "Expenses" → Click "Add Expense" button
   → Fill: Expense Type, Amount, Date, Description
   → Click "Save Expense"

8️⃣ **Set Opening & Closing Records** (Daily Report)
   → Go to "Daily Report" → Select Date
   → Enter "Opening Balance" at top
   → System calculates "Expected Closing" automatically
   → Enter actual "Closing Balance" at end of day
   → System shows difference

**BUSINESS FLOW DIAGRAM:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    START
      ↓
  [Add Products] ───→ Products stored in inventory
      ↓
  [Add Suppliers] ──→ Supplier database ready
      ↓
  [Record Purchase] ─→ Stock increases automatically
      ↓
  [Make Sale] ──────→ Stock decreases automatically
      ↓
  [Send Receipt] ───→ WhatsApp receipt to customer
      ↓
  [Daily Report] ───→ View sales, profit, expenses
      ↓
  [Add Expenses] ───→ Track business expenses
      ↓
  [Set Cash Records] → Opening/Closing balance tracking
      ↓
     END

**TIPS FOR SUCCESS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Always add products before making purchases
✅ Set opening balance at start of each day
✅ Review daily report to track business performance
✅ Use WhatsApp receipt for quick customer communication
✅ Keep expenses updated for accurate profit calculation

**THANK YOU FOR CHOOSING HISABKITAB-PRO!**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're excited to have you on board and look forward to helping you streamline your business operations.

Enjoy exploring all the features, and don't hesitate to reach out if you need any assistance!

Best regards,
HisabKitab-Pro Team

═══════════════════════════════════════════════════════════════
This is an automated email. Please keep this for your records.
═══════════════════════════════════════════════════════════════`
    }
  },
}

/**
 * Get email template based on registration request status
 */
export function getEmailTemplateForStatus(request: RegistrationRequest): EmailTemplate {
  switch (request.status) {
    case 'pending':
    case 'under_review':
    case 'query_initiated':
    case 'query_completed':
      return registrationEmailTemplates.registration_received(request)
    case 'registration_accepted':
      return registrationEmailTemplates.registration_accepted(request)
    case 'agreement_pending':
    case 'agreement_accepted':
      return registrationEmailTemplates.agreement_pending(request)
    case 'payment_pending':
    case 'payment_completed':
      return registrationEmailTemplates.payment_pending(request)
    case 'activation_completed':
      return registrationEmailTemplates.welcome_completed(request)
    case 'activation_rejected':
      return registrationEmailTemplates.rejected(request)
    default:
      return registrationEmailTemplates.registration_received(request)
  }
}

/**
 * User creation email template
 * Sent when a new user is created with company assignment
 */
export interface UserCreatedEmailData {
  userName: string
  userEmail: string
  userPassword: string
  userRole: string
  companyName: string
  companyCode?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  subscriptionTier?: string
  accessType?: 'mobile' | 'desktop' | 'combo'
  loginUrl?: string
}

export function getUserCreatedEmailTemplate(data: UserCreatedEmailData): EmailTemplate {
  const roleDescription = {
    admin: 'Administrator - Full system access',
    manager: 'Manager - Manage team and operations',
    staff: 'Staff - Create sales, purchases, and manage inventory',
    viewer: 'Viewer - Read-only access to reports and data'
  }

  return {
    subject: '🎉 Your HisabKitab-Pro Account is Ready - Login Credentials',
    body: `Dear ${data.userName},

═══════════════════════════════════════════════════════════════
   🎉 YOUR ACCOUNT HAS BEEN CREATED!
   Welcome to HisabKitab-Pro
═══════════════════════════════════════════════════════════════

Congratulations! Your account has been successfully created and you're ready to start using HisabKitab-Pro - Complete Inventory Management System.

${(() => {
  // Create a mock RegistrationRequest for getGlobalPlatformSection
  const mockRequest: RegistrationRequest = {
    id: 0,
    name: data.userName,
    email: data.userEmail,
    registration_method: 'direct',
    business_name: data.companyName,
    business_type: '',
    address: data.companyAddress || '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: data.companyPhone || '',
    subscription_tier: (data.subscriptionTier || 'basic') as any,
    access_type: data.accessType || 'combo',
    status: 'activation_completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  return getGlobalPlatformSection(mockRequest)
})()}

**🔐 YOUR LOGIN CREDENTIALS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Email Address:** ${data.userEmail}

${data.userPassword && !data.userPassword.includes('[Password not available') ? `
**Password:** ${data.userPassword}

📌 **Note:** This is the same password that was set when your account was created. Keep it safe and confidential. We recommend changing it after your first login for added security.
` : `
**Password:** Your password is the same password that you created when you filled the registration form. If you don't remember it, please use the "Forgot Password" option on the login page or contact your administrator.
`}

**Login URL:** ${data.loginUrl || 'https://hisabkitabpro.com'}

⚠️ **IMPORTANT SECURITY INFORMATION:**
• Keep your password secure and confidential
• Do not share your login credentials with anyone
${data.userPassword && !data.userPassword.includes('[Password not available') ? '• Change your password after first login (recommended)' : '• Use "Forgot Password" on the login page if you need to reset'}
• Log out when using shared devices

**👤 YOUR ACCOUNT DETAILS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**User Information:**
• Name: ${data.userName}
• Email: ${data.userEmail}
• Role: ${data.userRole} - ${roleDescription[data.userRole as keyof typeof roleDescription] || data.userRole}
${data.companyCode ? `• User Code: ${data.companyCode}` : ''}

**Company Information:**
• Company Name: ${data.companyName}
${data.companyCode ? `• Company Code: ${data.companyCode}` : ''}
${data.companyAddress ? `• Address: ${data.companyAddress}` : ''}
${data.companyPhone ? `• Phone: ${data.companyPhone}` : ''}
${data.companyEmail ? `• Company Email: ${data.companyEmail}` : ''}
${data.subscriptionTier ? `• Subscription Plan: ${data.subscriptionTier === 'starter' ? 'Starter Plan' : data.subscriptionTier === 'basic' ? 'Basic Plan' : data.subscriptionTier === 'standard' ? 'Standard Plan' : data.subscriptionTier === 'premium_plus' ? 'Premium Plus Plan' : data.subscriptionTier === 'premium_plus_plus' ? 'Premium Plus Plus Plan' : 'Premium Plan'}` : ''}
${data.accessType ? `• Device access: ${data.accessType === 'mobile' ? 'Mobile only' : data.accessType === 'desktop' ? 'Desktop only' : 'Combo (Mobile + Desktop)'}` : ''}

**📋 YOUR ROLE PERMISSIONS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.userRole === 'admin' ? `
As an **Administrator**, you have full access to:
✅ All companies and users
✅ System settings and configuration
✅ All sales, purchases, and inventory
✅ Reports and analytics
✅ User management
✅ Company management
` : data.userRole === 'manager' ? `
As a **Manager**, you can:
✅ Create and manage sales
✅ Create and manage purchases
✅ Manage products and inventory
✅ View and export reports
✅ Manage team members (sales persons)
✅ Manage expenses
✅ View company settings
` : data.userRole === 'staff' ? `
As a **Staff** member, you can:
✅ Create sales transactions
✅ Create purchase records
✅ View and update products
✅ View inventory status
✅ View reports
✅ Create expenses
` : `
As a **Viewer**, you have read-only access to:
✅ View sales and purchases
✅ View products and inventory
✅ View reports and analytics
✅ View expenses
`}

**🚀 QUICK START GUIDE:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Log In to Your Account:**
   • Go to: ${data.loginUrl || 'https://hisabkitabpro.com'}
   • Enter your email: ${data.userEmail}
   • Enter your password: ${data.userPassword}
   • Click "Sign In"

2. **First Time Login:**
   • You'll see the dashboard
   • Review your company profile
   • Explore the menu options
   • Start adding products and suppliers

3. **Get Started:**
   • Add Products (Products menu)
   • Add Suppliers (Suppliers menu)
   • Record Purchases (Purchase menu)
   • Make Sales (Sales menu)
   • View Reports (Daily Report menu)

**📱 ACCESS YOUR ACCOUNT:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can access your account from:
• 🌐 Desktop/Laptop - Full features
• 📱 Tablet - On-the-go management
• 📲 Mobile Phone - Quick checks and reports
• ☁️ Any device with internet - Global access

**💡 IMPORTANT REMINDERS:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **Save This Email**: Keep this email for your records
✅ **Secure Password**: Change password after first login
✅ **Company Access**: You belong to "${data.companyName}"
✅ **Role**: Your role is "${data.userRole}" with specific permissions
✅ **Support**: Contact support if you need assistance

**🆘 NEED HELP?**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any questions or need assistance:
📧 Email: hisabkitabpro@gmail.com
💬 Subject: User Account Support - ${data.userName}
📞 Phone: [Your contact number]

Our support team is here to help you get started!

**THANK YOU FOR USING HISABKITAB-PRO!**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're excited to have you on board and look forward to helping you streamline your business operations.

Start managing your inventory today and experience the power of HisabKitab-Pro!

Best regards,
HisabKitab-Pro Team

═══════════════════════════════════════════════════════════════
This email contains sensitive login information. Please keep it secure.
═══════════════════════════════════════════════════════════════`
  }
}

/**
 * Generate mailto link for email template
 */
export function generateMailtoLink(request: RegistrationRequest, templateType?: EmailTemplateType): string {
  let template: EmailTemplate
  if (templateType && templateType !== 'user_created') {
    template = registrationEmailTemplates[templateType](request)
  } else {
    template = getEmailTemplateForStatus(request)
  }
  
  const subject = encodeURIComponent(template.subject)
  const body = encodeURIComponent(template.body)
  
  return `mailto:${request.email}?subject=${subject}&body=${body}`
}

/**
 * Generate mailto link for user created email
 */
export function generateUserCreatedMailtoLink(data: UserCreatedEmailData): string {
  const template = getUserCreatedEmailTemplate(data)
  const subject = encodeURIComponent(template.subject)
  const body = encodeURIComponent(template.body)
  
  // Use company email as recipient (the email registered during registration form)
  // Fallback to user email if company email is not available
  const recipientEmail = data.companyEmail || data.userEmail
  
  return `mailto:${recipientEmail}?subject=${subject}&body=${body}`
}
