# 🌐 Netlify Environment Variables Setup Guide

## ⚠️ Issue: "Supabase not configured" Error in Production

If you're seeing this error in production:
```
Sync completed with issues. 0 record(s) synced, 0 record(s) failed in 0s. Errors: Supabase not configured
```

This means the Supabase environment variables are not configured in Netlify.

---

## ✅ Solution: Add Environment Variables in Netlify

### Step 1: Access Netlify Dashboard

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Log in to your account
3. Select your site (`hisabkitab-pro` or your site name)

### Step 2: Navigate to Environment Variables

1. In your site dashboard, click **"Site settings"** (or go to: **Settings** → **Environment variables**)
2. Click **"Environment variables"** in the left sidebar
3. You'll see a section to add environment variables

### Step 3: Add Supabase Variables

Click **"Add a variable"** and add these two variables:

#### Variable 1: `VITE_SUPABASE_URL`
- **Key:** `VITE_SUPABASE_URL`
- **Value:** Your Supabase project URL (e.g., `https://uywqvyohahdadrlcbkzb.supabase.co`)
- **Scopes:** Check **"All scopes"** (or at least "Production" and "Deploy previews")

#### Variable 2: `VITE_SUPABASE_ANON_KEY`
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** Your Supabase anon key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
- **Scopes:** Check **"All scopes"** (or at least "Production" and "Deploy previews")

### Step 4: Save and Redeploy

1. Click **"Save"** after adding both variables
2. Go to **"Deploys"** tab in your Netlify dashboard
3. Click **"Trigger deploy"** → **"Deploy site"** to trigger a new build
   - Or wait for the next automatic deploy when you push to GitHub

---

## 📋 Where to Find Your Supabase Credentials

### Get Supabase Project URL and API Key:

1. Go to [https://supabase.com](https://supabase.com)
2. Log in and select your project
3. Go to **Settings** (gear icon) → **API**
4. Find:
   - **Project URL:** Copy the URL (e.g., `https://xxxxx.supabase.co`)
   - **anon public key:** Copy the anon key (long string starting with `eyJ...`)

---

## ✅ Verify Setup

After adding the environment variables and redeploying:

1. Go to your production site
2. Navigate to **Backup & Restore** page
3. Try to sync data
4. You should see: **"Sync completed successfully"** instead of the error

---

## 🔍 Troubleshooting

### Still seeing the error after setup?

1. **Check variable names:**
   - Must be exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Case-sensitive! No typos.

2. **Check scopes:**
   - Make sure variables are available for "Production" scope
   - If you want them for all environments, check "All scopes"

3. **Redeploy required:**
   - Environment variables are only available after a new deploy
   - Go to **Deploys** → **Trigger deploy** → **Deploy site**

4. **Check values:**
   - Make sure there are no extra spaces before/after the values
   - URL should start with `https://` and end with `.supabase.co`
   - Key should be a long string starting with `eyJ...`

---

## 📝 Important Notes

- **Environment variables in `.env` file only work locally** - they don't work in production
- **Netlify requires environment variables to be set in the dashboard** for production builds
- **Vite prefix:** All environment variables must start with `VITE_` to be exposed to the client
- **Security:** The `anon` key is safe to use in frontend code (it's designed for client-side access)

---

## ✅ Summary

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` with your Supabase project URL
3. Add `VITE_SUPABASE_ANON_KEY` with your Supabase anon key
4. Save and trigger a new deploy
5. Verify sync works in production

After this, your sync feature should work correctly in production! 🚀
