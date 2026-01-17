# 🔍 User Lookup Table Explanation

## Which Table Does the System Check During Google Sign-In?

When a user enters their email during Google sign-in, the system checks for the user in **TWO places** (with automatic fallback):

---

## 📊 Tables/Databases Checked

### **1. Supabase Cloud Database (Primary)**
- **Table Name:** `users`
- **Checked First:** If Supabase is available and online
- **Query:** `SELECT * FROM users WHERE email = 'user@example.com'`

### **2. IndexedDB Local Storage (Fallback)**
- **Store Name:** `users` (STORES.USERS)
- **Checked If:** Supabase is not available or offline
- **Location:** Browser's local IndexedDB

---

## 🔄 Lookup Flow

```
User enters email in Google Sign-In form
↓
userService.getByEmail(email) is called
↓
cloudUserService.getByEmail(email) is called
↓
Check: Is Supabase available AND online?
│
├─ YES → Query Supabase 'users' table
│        └─ Found? → Return user data
│        └─ Error? → Fallback to IndexedDB
│
└─ NO → Query IndexedDB 'users' store
        └─ Search by email (case-insensitive)
        └─ Return user data if found
```

---

## 📝 Code Reference

**File:** `src/services/cloudUserService.ts` (lines 92-127)

```typescript
getByEmail: async (email: string): Promise<UserWithPassword | undefined> => {
  // If Supabase not available or offline, use local storage
  if (!isSupabaseAvailable() || !isOnline()) {
    const users = await getAll<UserWithPassword>(STORES.USERS)
    return users.find(u => u.email.toLowerCase() === email.toLowerCase())
  }

  try {
    // Try Supabase first
    const { data, error } = await supabase!
      .from('users')  // ← Supabase table name
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error) {
      console.error('Error fetching user by email from cloud:', error)
      // Fallback to local storage
      const users = await getAll<UserWithPassword>(STORES.USERS)
      return users.find(u => u.email.toLowerCase() === email.toLowerCase())
    }

    // Sync to local storage
    if (data) {
      await put(STORES.USERS, data as UserWithPassword)
    }

    return data as UserWithPassword | undefined
  } catch (error) {
    console.error('Error in cloudUserService.getByEmail:', error)
    // Fallback to local storage
    const users = await getAll<UserWithPassword>(STORES.USERS)
    return users.find(u => u.email.toLowerCase() === email.toLowerCase())
  }
}
```

---

## 📋 Table Structure

### **Supabase Table: `users`**

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  company_id INTEGER,
  user_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **IndexedDB Store: `users`**

Same structure as Supabase table, stored locally in the browser.

---

## ✅ Two Outcomes After Lookup

### **Outcome 1: User Found AND Has Company**
```
existingUser && existingUser.company_id
↓
✅ User exists
✅ User has a company_id (associated with a company)
↓
LOGIN SUCCESS → Navigate to Dashboard
```

### **Outcome 2: User NOT Found OR No Company**
```
!existingUser || !existingUser.company_id
↓
❌ User doesn't exist OR
❌ User exists but has no company_id
↓
SHOW REGISTRATION FORM → User fills business details
```

---

## 🔍 How to Check Users

### **In Supabase:**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"Table Editor"**
4. Select **`users`** table
5. View all users

### **In IndexedDB (Browser DevTools):**
1. Open browser DevTools (F12)
2. Go to **"Application"** tab
3. Expand **"IndexedDB"**
4. Select **`hisabkitab_db`**
5. Select **`users`** store
6. View stored users

---

## 📊 Summary

| Database | Table/Store Name | Priority | Condition |
|----------|-----------------|----------|-----------|
| **Supabase** | `users` | Primary | If available and online |
| **IndexedDB** | `users` | Fallback | If Supabase unavailable/offline |

**The system automatically uses the best available source!**
