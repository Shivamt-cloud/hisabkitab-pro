# Deployment Guide - GitHub + Netlify + Custom Domain

## 🎯 Goal
Deploy HisabKitab Pro to Netlify with custom domain: **hisabkitabpro.com**

---

## Step 1: Initialize Git and Commit Code

### 1.1 Initialize Git Repository

```bash
cd /Users/shivamgarima/inventory-system
git init
git add .
git commit -m "Initial commit: HisabKitab Pro - Inventory Management System"
```

### 1.2 Set Git User (if not already set)

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## Step 2: Create GitHub Repository

### 2.1 Create Repository on GitHub

1. Go to [GitHub.com](https://github.com)
2. Click **"New repository"** (top right + icon)
3. Repository name: `hisabkitab-pro` (or your preferred name)
4. Description: `HisabKitab Pro - Comprehensive Inventory Management System`
5. Visibility: **Private** (recommended) or Public
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **"Create repository"**

### 2.2 Push Code to GitHub

After creating the repository, GitHub will show commands. Use these:

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/hisabkitab-pro.git

# Rename branch to main (if needed)
git branch -M main

# Push code to GitHub
git push -u origin main
```

**Note:** You may need to authenticate with GitHub (use Personal Access Token if prompted)

---

## Step 3: Deploy to Netlify

### 3.1 Create Netlify Account

1. Go to [Netlify.com](https://netlify.com)
2. Sign up / Log in (you can use GitHub to sign in)

### 3.2 Deploy from GitHub

1. In Netlify dashboard, click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Authorize Netlify to access your GitHub (if first time)
4. Select repository: `hisabkitab-pro`
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18` or `20` (in Environment variables)
6. Click **"Deploy site"**

### 3.3 Wait for Deployment

- Netlify will install dependencies and build your app
- This takes 2-3 minutes
- You'll get a URL like: `https://random-name-123456.netlify.app`

---

## Step 4: Configure Custom Domain (hisabkitabpro.com)

### 4.1 Add Domain in Netlify

1. In Netlify dashboard, go to your site
2. Click **"Domain settings"**
3. Click **"Add custom domain"**
4. Enter: `hisabkitabpro.com`
5. Click **"Verify"**
6. Netlify will show DNS configuration needed

### 4.2 Configure DNS in Hostinger

1. Log in to [Hostinger.com](https://hostinger.com)
2. Go to **Domains** → Select `hisabkitabpro.com`
3. Go to **DNS / Name Servers** section
4. Configure DNS records:

#### Option A: Use Netlify DNS (Recommended)

1. In Netlify, go to **Domain settings** → **DNS**
2. Copy the Netlify name servers (something like):
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   ```
3. In Hostinger, change nameservers to Netlify's nameservers
4. Wait 24-48 hours for DNS propagation

#### Option B: Use Hostinger DNS with A/CNAME Records

Add these DNS records in Hostinger:

**For www subdomain:**
- **Type:** CNAME
- **Name:** www
- **Value:** `your-site-name.netlify.app`
- **TTL:** 3600

**For root domain:**
- **Type:** A
- **Name:** @
- **Value:** `75.2.60.5` (Netlify's IP - check Netlify docs for current IP)
- **TTL:** 3600

**OR use ALIAS/ANAME record if Hostinger supports it:**
- **Type:** ALIAS
- **Name:** @
- **Value:** `your-site-name.netlify.app`

### 4.3 SSL Certificate (Automatic)

- Netlify automatically provisions SSL certificate
- Takes 1-2 hours after DNS is configured
- Your site will be accessible via HTTPS

### 4.4 Verify Domain

1. Wait for DNS propagation (can take up to 48 hours, usually 1-2 hours)
2. Check DNS propagation: [dnschecker.org](https://dnschecker.org)
3. Once DNS is propagated, Netlify will automatically:
   - Verify domain ownership
   - Provision SSL certificate
   - Enable HTTPS

---

## Step 5: Configure Build Settings (Optional)

### 5.1 Environment Variables (if needed later)

If you add environment variables (like Supabase keys):

1. In Netlify: **Site settings** → **Environment variables**
2. Add variables like:
   - `VITE_SUPABASE_URL=your-url`
   - `VITE_SUPABASE_ANON_KEY=your-key`
3. Redeploy after adding variables

### 5.2 Build Optimization

The `netlify.toml` file is already configured with:
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirects (for React Router)

---

## Step 6: Automatic Deployments

### How It Works:

- Every push to `main` branch → Netlify automatically deploys
- You can also deploy from other branches (for testing)
- Netlify creates preview deployments for pull requests

### Workflow:

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Netlify automatically builds and deploys! 🚀
```

---

## Troubleshooting

### Build Fails

1. Check build logs in Netlify dashboard
2. Common issues:
   - Missing dependencies → Add to `package.json`
   - Build errors → Fix TypeScript/React errors
   - Node version → Set in Netlify environment variables

### Domain Not Working

1. Check DNS propagation: [dnschecker.org](https://dnschecker.org)
2. Verify DNS records in Hostinger match Netlify requirements
3. Wait 24-48 hours for DNS propagation
4. Check Netlify domain settings for errors

### SSL Certificate Issues

1. Wait 1-2 hours after DNS is configured
2. Check Netlify SSL/TLS settings
3. Ensure DNS is correctly configured

---

## Quick Reference

### Important URLs:

- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Repository:** https://github.com/YOUR_USERNAME/hisabkitab-pro
- **Live Site:** https://hisabkitabpro.com
- **Netlify Site:** https://your-site-name.netlify.app

### Commands:

```bash
# Commit and push changes
git add .
git commit -m "Your commit message"
git push origin main

# Check deployment status
# (Check Netlify dashboard)
```

---

## Next Steps After Deployment

1. ✅ Test the live site
2. ✅ Test all features
3. ✅ Share the URL with users
4. ✅ Set up Supabase (if planning cloud sync)
5. ✅ Configure domain email (optional)

---

## Support

If you encounter issues:
1. Check Netlify build logs
2. Check browser console for errors
3. Verify DNS configuration
4. Check Netlify documentation: https://docs.netlify.com





