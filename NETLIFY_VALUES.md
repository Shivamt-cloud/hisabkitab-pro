# 📝 Netlify Deployment - What to Enter

## If Using Netlify CLI (`netlify init`)

When you run `netlify init`, you'll see these prompts. Here's what to enter:

### Prompt 1: "What would you like to do?"
**Enter:** `Create & configure a new site`

### Prompt 2: "Team"
**Enter:** Your team name (or just press Enter for personal account)

### Prompt 3: "Site name"
**Enter:** `hisabkitab-pro` (or any name you like, e.g., `inventory-system`)

### Prompt 4: "Build command"
**Enter:** `npm run build`

### Prompt 5: "Directory to deploy"
**Enter:** `dist`

### Prompt 6: "Netlify functions folder"
**Enter:** (Just press Enter - leave empty, you don't need functions)

### Prompt 7: "Netlify build settings"
**Enter:** (Press Enter to use defaults)

---

## If Using Netlify Dashboard (Web Interface)

### Build Settings:

1. **Base directory:**
   - Leave empty (or enter: `.`)

2. **Build command:**
   - Enter: `npm run build`

3. **Publish directory:**
   - Enter: `dist`

4. **Node version:**
   - Enter: `18` or `20` (in Environment variables section)

5. **Environment variables:**
   - Leave empty (you don't need any for this project)

---

## If You See "Repository" or "Branch" Options:

- **Repository:** `Shivamt-cloud/hisabkitab-pro`
- **Branch:** `main`
- **Base directory:** (leave empty)

---

## Quick Reference Card

```
Build command:     npm run build
Publish directory: dist
Node version:      18 or 20
Branch:            main
```

---

## Still Not Sure?

**Take a screenshot** of what you're seeing and I can help you with the exact field!

Or tell me which prompt/field you're on, and I'll give you the exact answer.

