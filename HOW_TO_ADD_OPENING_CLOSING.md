# How to Add Opening and Closing Balance

## Steps to Add Opening/Closing Balance:

### 1. Navigate to Daily Expenses
   - Go to **Dashboard** → **Sales & Purchase Options** → **Daily Expenses**
   - OR go directly to `/expenses`

### 2. Click "Add Expense" Button
   - You'll see a button "Add Expense" in the top right corner
   - Click it to open the expense form

### 3. Select Expense Type
   - In the **Expense Type** dropdown, you'll see:
     - **Opening Balance (Morning)** - Select this for morning opening cash
     - **Closing Balance (Evening)** - Select this for evening closing cash
   - These are the **first two options** in the dropdown

### 4. Enter Cash Denominations
   Once you select "Opening Balance" or "Closing Balance":
   
   - A **Cash Denominations** section will appear
   - Enter the count for each denomination:
     - **Notes**: ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10
     - **Coins**: ₹10, ₹5, ₹2, ₹1
   - The **Total Amount** will be calculated automatically
   - The amount field will become read-only (shows calculated total)

### 5. Select Date
   - Make sure to select the correct date (today's date for opening/closing)

### 6. Submit
   - Click "Save Expense" button
   - The opening/closing balance will be saved

## Example:

**Opening Balance:**
- Expense Type: "Opening Balance (Morning)"
- Date: Today's date
- Cash Denominations:
  - ₹500 notes: 10
  - ₹200 notes: 5
  - ₹100 notes: 10
  - ₹10 notes: 10
  - ₹10 coins: 10
  - ₹5 coins: 10
- Total will auto-calculate: ₹8,150

**Closing Balance:**
- Expense Type: "Closing Balance (Evening)"
- Date: Today's date
- Enter actual denominations counted at end of day
- Total will auto-calculate

## Troubleshooting:

### If you don't see "Opening Balance" or "Closing Balance" options:

1. **Hard Refresh the Page:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - This clears cache and reloads the page

2. **Clear Browser Cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

3. **Check Permissions:**
   - Make sure you have `expenses:create` permission
   - Check your user role in User Management

4. **Verify the Form:**
   - Make sure you're on the "Add Expense" page (`/expenses/new`)
   - The Expense Type dropdown should show all options including Opening/Closing

## Where to Find It:

- **Direct URL**: `/expenses/new`
- **From Dashboard**: Sales & Purchase Options → Daily Expenses → Add Expense
- **From Sales & Category Management**: Daily Expenses tab → Add Expense

## Notes:

- Opening and Closing are treated as special expense types
- They don't require a description (auto-filled)
- Payment method field is hidden for opening/closing
- Amount is calculated automatically from denominations
- You can add multiple opening/closing entries for different dates




