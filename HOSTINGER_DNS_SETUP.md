# 🌐 How to Update DNS/Nameservers in Hostinger

## Step-by-Step Guide

### Step 1: Log in to Hostinger

1. Go to: https://www.hostinger.com
2. Click **"Log in"** (top right)
3. Enter your credentials and log in

---

### Step 2: Access Domain Management

1. After logging in, you'll see your **Dashboard**
2. Look for **"Domains"** section (usually on the left sidebar or main dashboard)
3. Click on **"Domains"** or **"My Domains"**

---

### Step 3: Select Your Domain

1. You'll see a list of your domains
2. Find and click on your domain (e.g., `hisabkitabpro.com`)
3. This will open the domain management page

---

### Step 4: Access DNS Settings

You have two options:

#### Option A: Change Nameservers (Recommended for Netlify)

1. Look for **"DNS / Name Servers"** or **"Nameservers"** section
2. Click on it
3. You'll see current nameservers (usually Hostinger's default ones)

#### Option B: Manage DNS Records

1. Look for **"DNS Zone Editor"** or **"DNS Management"**
2. Click on it
3. You'll see current DNS records (A, CNAME, MX, etc.)

---

## Method 1: Using Netlify Nameservers (Recommended)

### Step 1: Get Netlify Nameservers

1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your site: `hisabkitab-pro`
3. Go to **"Domain settings"**
4. Click **"Add custom domain"** (if not already added)
5. Enter your domain: `hisabkitabpro.com`
6. Netlify will show you nameservers like:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```
   (These will be different for your account - copy the exact ones shown)

### Step 2: Update Nameservers in Hostinger

1. In Hostinger, go to your domain's **"DNS / Name Servers"** section
2. Click **"Change"** or **"Edit"** button
3. Select **"Custom nameservers"** or **"Use custom nameservers"**
4. Enter the Netlify nameservers (one per field):
   - **Nameserver 1:** `dns1.p01.nsone.net`
   - **Nameserver 2:** `dns2.p01.nsone.net`
   - **Nameserver 3:** `dns3.p01.nsone.net`
   - **Nameserver 4:** `dns4.p01.nsone.net`
5. Click **"Save"** or **"Update"**

### Step 3: Wait for Propagation

- DNS changes can take **24-48 hours** to propagate globally
- Usually works within **1-2 hours** in most regions
- Check propagation status: https://dnschecker.org

---

## Method 2: Using DNS Records (Alternative)

If you prefer to keep Hostinger nameservers, use DNS records:

### Step 1: Get Netlify DNS Values

1. In Netlify, go to **"Domain settings"** → **"DNS"**
2. You'll see DNS records to add

### Step 2: Add DNS Records in Hostinger

1. In Hostinger, go to **"DNS Zone Editor"** or **"DNS Management"**
2. Add these records:

#### For Root Domain (hisabkitabpro.com):

**Option A: A Record (IPv4)**
- **Type:** `A`
- **Name:** `@` (or leave blank for root domain)
- **Value:** `75.2.60.5` (Netlify's IP - check Netlify docs for current IP)
- **TTL:** `3600` (or default)

**Option B: ALIAS/ANAME Record (if Hostinger supports it)**
- **Type:** `ALIAS` or `ANAME`
- **Name:** `@`
- **Value:** `hisabkitab-pro.netlify.app` (your Netlify site URL)
- **TTL:** `3600`

#### For WWW Subdomain (www.hisabkitabpro.com):

- **Type:** `CNAME`
- **Name:** `www`
- **Value:** `hisabkitab-pro.netlify.app` (your Netlify site URL)
- **TTL:** `3600`

### Step 3: Save and Wait

- Click **"Save"** or **"Add Record"**
- Wait 24-48 hours for DNS propagation

---

## Visual Guide (Hostinger Interface)

### Finding DNS Settings:

```
Hostinger Dashboard
├── Domains
│   └── [Your Domain]
│       ├── DNS / Name Servers  ← Click here for nameservers
│       └── DNS Zone Editor     ← Click here for DNS records
```

---

## Important Notes

### ⚠️ Before Changing Nameservers:

1. **Backup Current Settings:** Take a screenshot of current DNS records
2. **Email/Email Settings:** If you use email with this domain, make sure to:
   - Note down MX records
   - Re-add them after changing nameservers (if using Method 1)
3. **Other Services:** If you have other services (like subdomains), note their DNS records

### ✅ After Changing Nameservers:

1. **Email Configuration:** If you use email, you'll need to:
   - Configure email in Netlify (if supported)
   - Or use a third-party email service
   - Re-add MX records in Netlify DNS

2. **SSL Certificate:** Netlify will automatically provision SSL certificate
   - Takes 1-2 hours after DNS is configured
   - Your site will be accessible via HTTPS

---

## Verification Steps

### 1. Check DNS Propagation

1. Go to: https://dnschecker.org
2. Enter your domain: `hisabkitabpro.com`
3. Select record type: `A` or `NS` (for nameservers)
4. Check if DNS has propagated globally

### 2. Verify in Netlify

1. Go to Netlify dashboard
2. Check **"Domain settings"**
3. Look for **"DNS configuration"** status
4. Should show "Verified" or "Active" when ready

### 3. Test Your Domain

1. Wait 1-2 hours after DNS changes
2. Visit: `https://hisabkitabpro.com`
3. Your site should load!

---

## Troubleshooting

### Issue: "Nameservers not updating"

**Solution:**
- Wait 24-48 hours (DNS propagation takes time)
- Double-check you entered nameservers correctly
- Clear browser cache
- Try accessing from different network

### Issue: "Domain not verified in Netlify"

**Solution:**
- Make sure DNS has propagated (check dnschecker.org)
- Verify nameservers are correct
- Wait a few more hours
- Contact Netlify support if still not working after 48 hours

### Issue: "Email not working after DNS change"

**Solution:**
- Re-add MX records in Netlify DNS
- Or configure email forwarding
- Or use third-party email service

---

## Quick Reference

### Netlify Nameservers (Example - use your actual ones):
```
dns1.p01.nsone.net
dns2.p01.nsone.net
dns3.p01.nsone.net
dns4.p01.nsone.net
```

### DNS Records (Alternative):
```
A Record:
@ → 75.2.60.5

CNAME Record:
www → hisabkitab-pro.netlify.app
```

### Useful Links:
- **DNS Checker:** https://dnschecker.org
- **Netlify DNS Docs:** https://docs.netlify.com/domains-https/custom-domains/configure-external-dns/
- **Hostinger Support:** https://www.hostinger.com/contact

---

## Summary

**Recommended Approach:**
1. ✅ Use Netlify nameservers (Method 1) - Easier and more reliable
2. ✅ Wait 24-48 hours for DNS propagation
3. ✅ Netlify will automatically handle SSL certificate
4. ✅ Your site will be live at `https://hisabkitabpro.com`

**Time Required:**
- DNS changes: 5 minutes
- DNS propagation: 1-48 hours (usually 1-2 hours)
- SSL certificate: 1-2 hours after DNS is configured

---

Good luck! 🚀





