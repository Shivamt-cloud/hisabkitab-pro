# 🚀 Quick Deploy Guide - Netlify CLI

## Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

## Step 2: Login to Netlify

```bash
netlify login
```

This will open your browser. Log in to Netlify there.

## Step 3: Build Your Project

```bash
npm run build
```

## Step 4: Deploy

```bash
# Initialize (first time only)
netlify init

# Follow prompts:
# - Create & configure a new site
# - Build command: npm run build
# - Publish directory: dist
# - Netlify functions folder: (press Enter to skip)

# Deploy to production
netlify deploy --prod
```

## That's it! Your site will be live! 🎉

---

## Alternative: Drag & Drop Deployment

1. Build your project:
   ```bash
   npm run build
   ```

2. Go to: https://app.netlify.com/drop

3. Drag the `dist` folder and drop it

4. Your site will be deployed instantly!

---

## After Deployment

- You'll get a URL like: `https://random-name-123456.netlify.app`
- Share this URL with users
- Every time you push to GitHub, Netlify will auto-deploy (after setting up GitHub integration)


