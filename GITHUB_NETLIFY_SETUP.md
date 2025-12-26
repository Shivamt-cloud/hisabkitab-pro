# Quick Setup Guide - GitHub + Netlify

## ✅ Step 1: Code is Ready!

Git is initialized and code is committed. Now push to GitHub.

---

## Step 2: Create GitHub Repository

### 2.1 Go to GitHub

1. Visit [github.com](https://github.com)
2. Log in to your account

### 2.2 Create New Repository

1. Click **"+"** (top right) → **"New repository"**
2. Repository name: `hisabkitab-pro` (or any name you prefer)
3. Description: `HisabKitab Pro - Comprehensive Inventory Management System`
4. Visibility: **Private** (recommended) or Public
5. **IMPORTANT:** DO NOT check any of these:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
   
   (We already have these files!)
6. Click **"Create repository"**

### 2.3 Push Code to GitHub

After creating the repository, GitHub will show you commands. Run these:

```bash
# Navigate to your project (if not already there)
cd /Users/shivamgarima/inventory-system

# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/hisabkitab-pro.git

# Rename branch to main (if needed)
git branch -M main

# Push code to GitHub
git push -u origin main
```

**If asked for authentication:**
- GitHub now requires Personal Access Token instead of password
- Generate token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Select scope: `repo` (full control of private repositories)
- Copy token and use it as password when pushing

---

## Step 3: Deploy to Netlify

### 3.1 Sign Up / Log In to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **"Sign up"** or **"Log in"**
3. Choose **"Sign up with GitHub"** (easiest option)

### 3.2 Deploy from GitHub

1. In Netlify dashboard, click **"Add new site"**
2. Choose **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub (if first time)
5. Select repository: `hisabkitab-pro`
6. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** Add environment variable:
     - Key: `NODE_VERSION`
     - Value: `18` or `20`
7. Click **"Deploy site"**

### 3.3 Wait for Deployment

- Netlify will install dependencies and build
- Takes 2-3 minutes
- You'll get a URL like: `https://random-name-123456.netlify.app`
- **Copy this URL** - you'll need it for domain setup

---

## Step 4: Configure Custom Domain (hisabkitabpro.com)

### 4.1 Add Domain in Netlify

1. In Netlify dashboard, go to your site
2. Click **"Domain settings"** (left sidebar)
3. Click **"Add custom domain"**
4. Enter: `hisabkitabpro.com`
5. Click **"Verify"**
6. Netlify will show DNS configuration

### 4.2 Configure DNS in Hostinger

1. Log in to [hostinger.com](https://hostinger.com)
2. Go to **Domains** → Select `hisabkitabpro.com`
3. Click **"DNS / Name Servers"** or **"DNS Zone Editor"**

#### Option A: Use Netlify DNS (Recommended - Easier)

1. In Netlify, go to **Domain settings** → **DNS** tab
2. Netlify will show nameservers (something like):
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```
3. In Hostinger, change nameservers:
   - Look for **"Name Servers"** or **"DNS Nameservers"** section
   - Change to Netlify's nameservers
   - Save changes
4. Wait 24-48 hours for DNS propagation

#### Option B: Use Hostinger DNS (Keep Hostinger DNS)

Add these DNS records in Hostinger:

**For root domain (hisabkitabpro.com):**
- **Type:** A
- **Name:** @
- **Value:** `75.2.60.5` (Netlify's IP - check Netlify docs for current)
- **TTL:** 3600

**For www subdomain (www.hisabkitabpro.com):**
- **Type:** CNAME
- **Name:** www
- **Value:** `your-site-name.netlify.app` (your Netlify URL)
- **TTL:** 3600

**OR if Hostinger supports ALIAS/ANAME:**
- **Type:** ALIAS
- **Name:** @
- **Value:** `your-site-name.netlify.app`
- **TTL:** 3600

### 4.3 Wait for DNS Propagation

- DNS changes can take 24-48 hours (usually 1-2 hours)
- Check propagation: [dnschecker.org](https://dnschecker.org)
- Enter: `hisabkitabpro.com`
- Check if records are propagated globally

### 4.4 SSL Certificate (Automatic)

- Once DNS is configured, Netlify automatically:
  - Verifies domain ownership
  - Provisions SSL certificate (free)
  - Enables HTTPS
- Takes 1-2 hours after DNS propagation
- Your site will be accessible via `https://hisabkitabpro.com`

---

## Step 5: Verify Deployment

### 5.1 Test the Site

1. Visit: `https://hisabkitabpro.com` (after DNS propagation)
2. Test all features:
   - Login functionality
   - Create products
   - Create sales
   - View reports
   - Everything should work!

### 5.2 Check Build Logs

If something doesn't work:
1. Go to Netlify dashboard → Your site
2. Click **"Deploys"** tab
3. Check build logs for errors
4. Common issues:
   - Build failures → Check logs
   - TypeScript errors → Fix code
   - Missing dependencies → Add to package.json

---

## Step 6: Automatic Deployments

### How It Works:

Every time you push to GitHub's `main` branch:
1. Netlify detects the push
2. Automatically runs `npm run build`
3. Deploys the new version
4. Your site updates automatically! 🚀

### Workflow:

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Netlify automatically deploys! ✨
```

---

## Troubleshooting

### Build Fails on Netlify

**Error:** Build command failed

**Solution:**
1. Check Netlify build logs
2. Common causes:
   - TypeScript errors → Run `npm run build` locally to test
   - Missing dependencies → Check `package.json`
   - Node version mismatch → Set `NODE_VERSION` environment variable in Netlify

### Domain Not Working

**Problem:** hisabkitabpro.com not loading

**Solutions:**
1. Wait 24-48 hours for DNS propagation
2. Check DNS records in Hostinger match Netlify requirements
3. Verify domain in Netlify: Domain settings → Check status
4. Use [dnschecker.org](https://dnschecker.org) to verify DNS propagation

### SSL Certificate Issues

**Problem:** HTTPS not working

**Solutions:**
1. Wait 1-2 hours after DNS is configured
2. Check Netlify SSL/TLS settings
3. Ensure DNS is correctly configured
4. Try "Renew certificate" in Netlify domain settings

---

## Quick Reference

### Important URLs:

- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Repository:** https://github.com/YOUR_USERNAME/hisabkitab-pro
- **Live Site:** https://hisabkitabpro.com
- **Netlify Site:** https://your-site-name.netlify.app (temporary URL)

### Commands:

```bash
# Make changes and deploy
git add .
git commit -m "Description of changes"
git push origin main
# Netlify auto-deploys! ✨

# Check git status
git status

# View commit history
git log --oneline
```

---

## Next Steps

After deployment:

1. ✅ Test all features on live site
2. ✅ Share URL with users
3. ✅ Set up Supabase (if planning cloud sync) - see `SUPABASE_INTEGRATION_PLAN.md`
4. ✅ Configure custom email (optional)
5. ✅ Monitor usage and performance

---

## Support Resources

- **Netlify Docs:** https://docs.netlify.com
- **GitHub Docs:** https://docs.github.com
- **Hostinger Support:** Check Hostinger knowledge base
- **DNS Propagation Check:** https://dnschecker.org

---

## Summary

✅ Code committed to Git
⬜ Push to GitHub
⬜ Deploy to Netlify
⬜ Configure domain (hisabkitabpro.com)
⬜ Test live site

**You're almost there! Follow the steps above to go live! 🚀**



