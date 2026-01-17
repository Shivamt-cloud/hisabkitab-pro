# Debug Registration Form Issue

## To check what's happening:

1. **Open Browser Console:**
   - Press `F12` or `Right-click` → `Inspect` → `Console` tab

2. **Try submitting the form again**

3. **Look for errors in the console** - you should see:
   - "Registration request saved successfully to database" (if IndexedDB save works)
   - OR error messages if something fails

4. **Check Network tab:**
   - Go to `Network` tab in DevTools
   - Filter by "registration_requests" or "Supabase"
   - See if there are any failed requests

5. **Common issues:**
   - Schema mismatch between TypeScript interface and Supabase table
   - Missing required fields
   - Network errors
   - CORS issues

---

## Quick Check:

The form should:
- Save to IndexedDB (local) - this should always work
- Try to save to Supabase (cloud) - this might fail but shouldn't block

If the form is stuck on "Submitting...", it means the code is hanging somewhere.

Please share the console error messages!
