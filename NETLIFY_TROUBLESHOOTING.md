# 🔧 Netlify Deployment Troubleshooting Guide

## Issue: "Project is not available" or "Repository not found"

This usually happens when Netlify can't see your GitHub repository. Here are the solutions:

---

## Solution 1: Authorize Netlify to Access GitHub

### Step-by-Step:

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Make sure you're logged in

2. **Authorize GitHub Access**
   - Click **"Add new site"** → **"Import an existing project"**
   - Click **"Deploy with GitHub"**
   - If you see "Authorize Netlify" or "Connect to GitHub", click it
   - You'll be redirected to GitHub to authorize Netlify
   - Click **"Authorize netlify"** (or similar button)
   - Grant all requested permissions

3. **Refresh and Try Again**
   - Go back to Netlify
   - Click **"Add new site"** → **"Import an existing project"** → **"Deploy with GitHub"**
   - Your repositories should now appear

---

## Solution 2: Check Repository Visibility

### If Repository is Private:

1. **Make Sure Netlify Has Access**
   - In GitHub, go to your repository: https://github.com/Shivamt-cloud/hisabkitab-pro
   - Go to **Settings** → **Integrations** → **Installed GitHub Apps**
   - Make sure Netlify is installed and has access

2. **Grant Access to Private Repos**
   - In Netlify, go to **User settings** → **Applications**
   - Find GitHub integration
   - Make sure "Access private repositories" is enabled

---

## Solution 3: Manual Repository Selection

### If Repository Still Doesn't Appear:

1. **Search for Repository**
   - In Netlify's "Deploy with GitHub" page
   - Use the search box to type: `hisabkitab-pro`
   - Or your GitHub username: `Shivamt-cloud`

2. **Check Repository Name**
   - Make sure the repository name matches exactly
   - Your repo: `hisabkitab-pro`
   - Case-sensitive!

---

## Solution 4: Deploy via Netlify CLI (Alternative)

If GitHub integration still doesn't work, use Netlify CLI:

### Install Netlify CLI:

```bash
npm install -g netlify-cli
```

### Login to Netlify:

```bash
netlify login
```

This will open a browser window. Log in and authorize.

### Initialize and Deploy:

```bash
# Make sure you're in the project directory
cd /Users/shivamgarima/inventory-system

# Initialize Netlify
netlify init

# Follow the prompts:
# - Create & configure a new site
# - Build command: npm run build
# - Publish directory: dist
# - Netlify functions folder: (leave empty, press Enter)

# Deploy to production
netlify deploy --prod
```

---

## Solution 5: Deploy via Drag & Drop (Quick Test)

For a quick test deployment:

1. **Build Your Project Locally:**
   ```bash
   npm run build
   ```

2. **Drag & Drop Deployment:**
   - Go to Netlify: https://app.netlify.com
   - Click **"Add new site"** → **"Deploy manually"**
   - Drag the `dist` folder from your project
   - Drop it in the Netlify upload area
   - Your site will be deployed!

**Note:** This is a one-time deployment. For automatic deployments, you still need GitHub integration.

---

## Solution 6: Check GitHub Repository Settings

### Verify Repository Exists:

1. **Check Repository URL:**
   ```bash
   git remote -v
   ```
   
   Should show:
   ```
   origin  https://github.com/Shivamt-cloud/hisabkitab-pro.git
   ```

2. **Verify Repository is Accessible:**
   - Visit: https://github.com/Shivamt-cloud/hisabkitab-pro
   - Make sure you can see the repository
   - If it's private, make sure you're logged into the correct GitHub account

---

## Solution 7: Reconnect GitHub Integration

### If Nothing Works:

1. **Disconnect GitHub:**
   - In Netlify: **User settings** → **Applications**
   - Find GitHub integration
   - Click **"Disconnect"** or **"Revoke access"**

2. **Reconnect:**
   - Go back to **"Add new site"** → **"Deploy with GitHub"**
   - Click **"Authorize Netlify"** again
   - Grant permissions again

---

## Common Issues & Fixes

### Issue: "Repository not found"
- **Fix:** Make sure the repository name is correct and you have access to it

### Issue: "No repositories available"
- **Fix:** Authorize Netlify to access your GitHub account

### Issue: "Permission denied"
- **Fix:** Grant Netlify access to private repositories in GitHub settings

### Issue: "Build failed"
- **Fix:** Make sure `npm run build` works locally first

---

## Quick Checklist

Before deploying, make sure:

- ✅ You're logged into Netlify
- ✅ You're logged into GitHub (same account)
- ✅ Netlify is authorized to access GitHub
- ✅ Repository exists and is accessible
- ✅ `npm run build` works locally
- ✅ `dist` folder is created after build

---

## Still Having Issues?

1. **Check Netlify Status:**
   - Visit: https://www.netlifystatus.com
   - Make sure Netlify services are operational

2. **Contact Support:**
   - Netlify Support: https://www.netlify.com/support/
   - GitHub Support: https://support.github.com

3. **Alternative: Use Vercel**
   - Similar to Netlify
   - Visit: https://vercel.com
   - Can also deploy from GitHub

---

## Recommended Approach

**For First-Time Deployment:**

1. Use **Solution 4 (Netlify CLI)** - Most reliable
2. Or **Solution 5 (Drag & Drop)** - Quickest for testing

**For Ongoing Deployments:**

1. Fix GitHub integration (Solutions 1-3)
2. Set up automatic deployments from GitHub

---

## Next Steps After Successful Deployment

Once deployed:

1. ✅ Test your live site
2. ✅ Configure custom domain (if needed)
3. ✅ Set up environment variables (if needed)
4. ✅ Enable automatic deployments

---

Good luck! 🚀

