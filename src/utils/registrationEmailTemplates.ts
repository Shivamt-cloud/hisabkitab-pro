// Registration Request Email Templates
// Templates for different stages of the registration process

import { RegistrationRequest } from '../services/registrationRequestService'

export type EmailTemplateType = 
  | 'registration_received'
  | 'registration_accepted'
  | 'agreement_pending'
  | 'payment_pending'
  | 'welcome_completed'
  | 'rejected'

export interface EmailTemplate {
  subject: string
  body: string
}

export const registrationEmailTemplates = {
  registration_received: (request: RegistrationRequest): EmailTemplate => ({
    subject: 'Registration Request Received - HisabKitab-Pro',
    body: `Dear ${request.name},

Thank you for your registration request for HisabKitab-Pro - Complete Inventory Management System.

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
    const amount = options?.amount || 'As per pricing plan'
    
    return {
      subject: 'Agreement Certificate & Terms - HisabKitab-Pro',
      body: `Dear ${request.name},

═══════════════════════════════════════════════════════════════
   AGREEMENT CERTIFICATE - HisabKitab-Pro Subscription
═══════════════════════════════════════════════════════════════

This certifies that we have agreed to the following terms and conditions for your subscription to HisabKitab-Pro - Complete Inventory Management System.

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
Subscription Amount: ${amount}
Validity Period: ${validityPeriod}
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
    subject: 'Welcome to HisabKitab-Pro - Your Account is Activated!',
    body: `Dear ${request.name},

Welcome to HisabKitab-Pro! Your account has been successfully activated.

**Account Details:**
- Business Name: ${request.business_name}
- Login Email: ${request.email}
- Account Status: Active

**Next Steps:**
1. You will receive your login credentials in a separate email
2. Log in to your account
3. Set up your company profile
4. Start managing your inventory!

**Your Account Features:**
✅ Complete inventory management
✅ Purchase & Sales tracking
✅ GST compliance
✅ Reports & Analytics
✅ Multi-user access
✅ And much more!

If you need any assistance, please contact our support team at hisabkitabpro@gmail.com.

Welcome aboard!

Best regards,
HisabKitab-Pro Team`
  }),

  rejected: (request: RegistrationRequest): EmailTemplate => ({
    subject: 'Registration Request Update - HisabKitab-Pro',
    body: `Dear ${request.name},

Thank you for your interest in HisabKitab-Pro.

After reviewing your registration request, we regret to inform you that we are unable to proceed with your registration at this time.

**Your Registration Details:**
- Business Name: ${request.business_name}
- Contact Email: ${request.email}

If you have any questions or would like to discuss further, please contact us at hisabkitabpro@gmail.com.

We appreciate your interest and wish you success with your business.

Best regards,
HisabKitab-Pro Team`
  }),
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
 * Generate mailto link for email template
 */
export function generateMailtoLink(request: RegistrationRequest, templateType?: EmailTemplateType): string {
  const template = templateType 
    ? registrationEmailTemplates[templateType](request)
    : getEmailTemplateForStatus(request)
  
  const subject = encodeURIComponent(template.subject)
  const body = encodeURIComponent(template.body)
  
  return `mailto:${request.email}?subject=${subject}&body=${body}`
}
