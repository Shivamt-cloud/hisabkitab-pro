# 🔐 Google Sign-In Flow Explanation

## 📋 How Google Sign-In Works in HisabKitab-Pro

### Current Implementation (Simulated Google Sign-In)

**Note:** Currently, we're using a **simulated Google sign-in** flow. The actual Google OAuth integration can be added later. For now, users enter their email manually.

---

## 🔄 Step-by-Step Flow

### **Step 1: User Clicks "Sign in with Google" Button**

```
User clicks "Sign in with Google" button
↓
handleGoogleSignIn() function is called
↓
Email input dialog appears
```

**Code:** `src/pages/Login.tsx` line 70-74
```typescript
const handleGoogleSignIn = async () => {
  setError('')
  // Show email input dialog
  setShowEmailInput(true)
}
```

---

### **Step 2: User Enters Email Address**

User enters their email address in the modal dialog.

**UI:** Modal with email input field appears.

---

### **Step 3: System Checks if User Exists**

```
User submits email
↓
handleEmailSubmit() function is called
↓
System checks database: userService.getByEmail(email)
```

**Code:** `src/pages/Login.tsx` line 76-122
```typescript
const handleEmailSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setError('')
  setIsCheckingEmail(true)

  try {
    const email = googleEmail.trim().toLowerCase()
    
    // Validate email format
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      setIsCheckingEmail(false)
      return
    }

    // Check if user exists in database
    const existingUser = await userService.getByEmail(email)
    
    // ... (see Step 4)
  }
}
```

---

### **Step 4A: User EXISTS and Has Company → LOGIN**

**Condition:** `existingUser && existingUser.company_id`

```
✅ User found in database
✅ User has a company_id (associated with a company)
↓
Login successful
↓
Navigate to Dashboard (/)
```

**Code:**
```typescript
if (existingUser && existingUser.company_id) {
  // User exists and has a company - proceed with login
  const success = await login(email, '') // Empty password for Google users
  
  if (success) {
    setShowEmailInput(false)
    setGoogleEmail('')
    navigate('/') // Go to dashboard
  } else {
    setError('Unable to sign in. Please contact support or use email/password login.')
  }
}
```

---

### **Step 4B: User DOES NOT EXIST or Has NO Company → REGISTRATION**

**Condition:** `!existingUser || !existingUser.company_id`

```
❌ User not found OR user has no company_id
↓
Show registration form
↓
User fills business details
↓
Submit registration form
↓
Save to registration_requests table (IndexedDB + Supabase)
↓
Open email window to send details to hisabkitabpro@gmail.com
```

**Code:**
```typescript
else {
  // User doesn't exist OR exists but has no company - show registration form
  setGoogleUserEmail(email)
  setGoogleUserName(email.split('@')[0]) // Use email prefix as default name
  setRegistrationMode('google')
  setRegistrationFormData(prev => ({ ...prev, email, name: email.split('@')[0] }))
  setShowEmailInput(false)
  setGoogleEmail('')
  setShowRegistrationForm(true) // Show registration form
}
```

---

### **Step 5: Registration Form Submission**

When user submits the registration form:

**Code:** `src/pages/Login.tsx` line 147-249
```typescript
const handleRegistrationSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setIsSubmittingForm(true)
  setError('')

  try {
    const userEmail = registrationMode === 'google' ? googleUserEmail : registrationFormData.email
    const userName = registrationMode === 'google' ? googleUserName : registrationFormData.name
    const userPassword = registrationMode === 'google' ? '' : registrationFormData.password

    // Save registration request to database
    await registrationRequestService.create({
      name: userName,
      email: userEmail,
      password: userPassword || undefined,
      registration_method: registrationMode, // 'google' or 'direct'
      business_name: registrationFormData.businessName,
      business_type: registrationFormData.businessType,
      address: registrationFormData.address,
      city: registrationFormData.city,
      state: registrationFormData.state,
      pincode: registrationFormData.pincode,
      country: registrationFormData.country,
      phone: registrationFormData.phone,
      gstin: registrationFormData.gstin || undefined,
      website: registrationFormData.website || undefined,
      description: registrationFormData.description || undefined,
    })

    // Open email client with pre-filled content
    const mailtoLink = `mailto:hisabkitabpro@gmail.com?subject=...&body=...`
    window.location.href = mailtoLink

    // Show success message
    alert('Thank you for your registration request!...')
    
    // Reset form
    setShowRegistrationForm(false)
  } catch (err) {
    console.error('Registration form error:', err)
    setError('Failed to submit registration form. Please try again.')
  } finally {
    setIsSubmittingForm(false)
  }
}
```

---

## 📊 Data Storage

### **Registration Request is Saved to:**

1. **IndexedDB (Local Browser Storage)**
   - Store: `registration_requests`
   - Immediate storage (always works)

2. **Supabase (Cloud Database)**
   - Table: `registration_requests`
   - Cloud storage (if available and online)

### **Registration Request Contains:**

- ✅ User info: `name`, `email`, `password` (if direct registration)
- ✅ Registration method: `registration_method` ('google' or 'direct')
- ✅ Business info: `business_name`, `business_type`
- ✅ Address: `address`, `city`, `state`, `pincode`, `country`
- ✅ Contact: `phone`, `gstin`, `website`
- ✅ Additional: `description`
- ✅ Status: `status` (default: 'pending')
- ✅ Timestamps: `created_at`, `updated_at`

---

## 📧 Email Notification

After registration form is submitted:

1. **Email window opens** with:
   - **To:** `hisabkitabpro@gmail.com`
   - **Subject:** "New User Registration Request - HisabKitab-Pro"
   - **Body:** All registration details formatted

2. **User sees success message:**
   > "Thank you for your registration request! Your information has been saved. We will connect with you within 24 hours by email or contact. Please check your email for further instructions."

---

## 🔍 How to View Registration Requests

### **In Supabase:**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"Table Editor"**
4. Select **`registration_requests`** table
5. View all pending/approved/rejected requests

### **In IndexedDB (Browser DevTools):**

1. Open browser DevTools (F12)
2. Go to **"Application"** tab
3. Expand **"IndexedDB"**
4. Select **`hisabkitab_db`**
5. Select **`registration_requests`** store
6. View stored requests

---

## 🎯 Summary

**Google Sign-In Flow:**
1. User clicks "Sign in with Google"
2. User enters email
3. System checks if user exists
4. **If user exists with company → Login**
5. **If user doesn't exist or has no company → Registration form**
6. Registration data saved to `registration_requests` table
7. Email notification sent to admin
8. Admin reviews and approves/rejects request
9. User account created (future step)

---

## ⚠️ Current Status

- ✅ Google sign-in button exists
- ✅ Email input flow works
- ✅ User lookup works
- ✅ Registration form works
- ✅ Data saved to database
- ✅ Email notification works
- ⚠️ **Actual Google OAuth integration** (to be implemented in future)
- ⚠️ **Automatic account creation** (to be implemented in future)

---

**If you received a registration request, it means:**
- Someone clicked "Sign in with Google"
- Entered their email
- System found they don't exist or have no company
- They filled the registration form
- Data was saved to `registration_requests` table
- Email was sent to `hisabkitabpro@gmail.com`
