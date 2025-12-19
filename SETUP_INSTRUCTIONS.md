# How to Access Your HisabKitab Application

## The development server is running!

### Step-by-Step Instructions:

1. **Open your web browser** (Chrome, Firefox, Safari, or Edge)

2. **In the address bar, type:**
   ```
   http://localhost:5173
   ```
   Or simply:
   ```
   localhost:5173
   ```

3. **Press Enter**

4. You should see the **HisabKitab Dashboard** with:
   - Sales Options section on the left
   - Reports Summary section on the right

### If you can't see the page:

1. **Check if the server is running:**
   ```bash
   cd /Users/shivamgarima/inventory-system
   npm run dev
   ```
   
   You should see output like:
   ```
   VITE v7.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

2. **Check the terminal output** - look for any error messages

3. **Try a different browser** or clear your browser cache

4. **Check if port 5173 is in use:**
   ```bash
   lsof -i :5173
   ```

5. **If you see a blank page**, open the browser's Developer Console (F12 or Cmd+Option+I) and check for errors

### Troubleshooting:

- If port 5173 is already in use, Vite will automatically use the next available port (5174, 5175, etc.)
- Check the terminal output to see which port Vite is actually using
- Make sure you're using `http://` not `https://`

### Need Help?

If you're still having issues, please share:
- What you see in the browser (blank page, error message, etc.)
- Any error messages from the terminal
- Any error messages from the browser console (F12 → Console tab)

