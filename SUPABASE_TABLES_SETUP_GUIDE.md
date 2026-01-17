# Supabase Tables Setup Guide

## Overview
This guide explains how to set up all required tables in Supabase for multi-device sync and data isolation.

## Tables Created
1. **products** - Product inventory management
2. **suppliers** - Supplier information
3. **customers** - Customer information
4. **purchases** - Purchase transactions (GST and Simple)
5. **sales** - Sales transactions
6. **expenses** - Expense tracking and analysis

## Setup Instructions

### Step 1: Run the SQL Script
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the entire contents of `CREATE_ALL_SUPABASE_TABLES.sql`
6. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 2: Verify Tables Created
Run this query to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'suppliers', 'customers', 'purchases', 'sales', 'expenses')
ORDER BY table_name;
```

You should see all 6 tables listed.

### Step 3: Verify RLS is Enabled
Run this query to verify Row Level Security is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'suppliers', 'customers', 'purchases', 'sales', 'expenses');
```

All tables should have `rowsecurity = true`.

### Step 4: Verify Indexes Created
Run this query to verify indexes:

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'suppliers', 'customers', 'purchases', 'sales', 'expenses')
ORDER BY tablename, indexname;
```

You should see indexes on `company_id` and other key fields for each table.

## Data Isolation Strategy

### Application-Level Security (Current Implementation)
- All queries filter by `company_id` in the application code
- Services (productService, purchaseService, etc.) already implement `company_id` filtering
- RLS policies are permissive for service role (application uses service role key)
- Data isolation is enforced by application code

### Why This Approach?
1. **Simpler Implementation**: Works with existing code structure
2. **Flexible**: Easy to implement complex filtering logic
3. **Consistent**: Same filtering logic for IndexedDB and Supabase
4. **Secure**: Service role key is kept secret, only application can access

### Future Enhancement (Optional)
For even stronger security, you can implement user-level RLS policies that check:
- User's `company_id` from `users` table
- User's role (admin vs regular user)
- Current company selection (for admin users)

This would require:
- JWT claims with user information
- More complex RLS policies
- Changes to authentication flow

## Table Schema Details

### Products Table
- Stores product information (name, SKU, barcode, pricing, stock, etc.)
- Key field: `company_id` for data isolation
- JSONB fields: None (flat structure)

### Suppliers Table
- Stores supplier information
- Key field: `company_id` for data isolation
- JSONB fields: None (flat structure)

### Customers Table
- Stores customer information
- Key field: `company_id` for data isolation
- JSONB fields: None (flat structure)

### Purchases Table
- Stores purchase transactions (both GST and Simple)
- Key field: `company_id` for data isolation
- JSONB field: `items` - Array of PurchaseItem objects
- Type field: `type` ('gst' or 'simple') determines which fields are used

### Sales Table
- Stores sales transactions
- Key field: `company_id` for data isolation
- JSONB field: `items` - Array of SaleItem objects
- JSONB field: `payment_methods` - Array of payment method objects (optional)

### Expenses Table
- Stores expense transactions
- Key field: `company_id` for data isolation
- JSONB field: `cash_denominations` - CashDenominations object (optional)
- Type field: `expense_type` determines expense category

## Next Steps

After creating the tables:

1. **Create Cloud Services**: Implement `cloudProductService.ts`, `cloudPurchaseService.ts`, etc.
2. **Update Existing Services**: Modify services to use cloud services when available
3. **Test Data Sync**: Verify data syncs correctly between IndexedDB and Supabase
4. **Test Multi-Device**: Test accessing data from multiple devices
5. **Monitor Performance**: Monitor query performance and optimize indexes if needed

## Troubleshooting

### Tables Not Created
- Check SQL script for syntax errors
- Ensure you have proper permissions in Supabase
- Check Supabase logs for errors

### RLS Policies Not Working
- Verify RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Check policy definitions
- Verify service role key is being used

### Data Not Syncing
- Check Supabase connection (environment variables)
- Verify service role key is correct
- Check browser console for errors
- Verify table names match in code

### Performance Issues
- Check indexes are created correctly
- Verify `company_id` indexes exist
- Monitor query performance in Supabase dashboard
- Consider adding additional indexes based on query patterns

## Security Considerations

1. **Service Role Key**: Keep your Supabase service role key secure (never expose in client-side code)
2. **Environment Variables**: Store keys in `.env` file (not committed to git)
3. **Data Validation**: Always validate data before inserting/updating
4. **Company ID Filtering**: Always filter by `company_id` in application code
5. **Input Sanitization**: Sanitize user inputs to prevent SQL injection (Supabase handles this, but be cautious)

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Check application logs (browser console)
- Verify table structure matches TypeScript interfaces
- Test with sample data to verify functionality
