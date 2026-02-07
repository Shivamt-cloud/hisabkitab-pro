# Automated Exports Setup Guide

Automated exports send scheduled reports (daily or weekly) by email as PDF or Excel attachments. This requires a backend to run on schedule.

## Overview

1. **App**: User configures reports, schedule, and email in **Settings → Automated Exports**
2. **Supabase**: Stores the configuration in `scheduled_export_configs`
3. **Netlify Function**: Generates reports and sends emails
4. **External Cron**: Triggers the function on schedule (e.g. every hour)

---

## Step 1: Create Supabase Table

Run the SQL in your Supabase project:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the contents of `CREATE_SCHEDULED_EXPORTS_TABLE.sql`

This creates the `scheduled_export_configs` table.

---

## Step 2: Environment Variables (Netlify)

Add these in **Netlify Dashboard** → **Site Settings** → **Environment Variables**:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL (same as `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Settings → API in Supabase). **Keep secret!** |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) (free tier: 100 emails/day) |
| `CRON_SECRET` | Optional. Random string to secure the function endpoint |

### Getting the Service Role Key

1. Supabase Dashboard → **Settings** → **API**
2. Copy **service_role** key (not the anon key)
3. Never expose this in frontend code

### Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. For testing: Use `reports@resend.dev` as sender (Resend's test domain)
4. For production: Verify your domain in Resend to send from `reports@yourdomain.com`

---

## Step 3: External Cron (Trigger the Function)

Netlify doesn't provide built-in cron on the free tier. Use an external service:

### Option A: cron-job.org (Free)

1. Sign up at [cron-job.org](https://cron-job.org)
2. Create a new cron job:
   - **URL**: `https://your-site.netlify.app/.netlify/functions/scheduled-exports`
   - **Schedule**: Every hour (e.g. `0 * * * *`)
   - **Request headers**: Add `x-cron-secret: YOUR_CRON_SECRET`
   - **Request method**: GET or POST

### Option B: EasyCron, UptimeRobot, or similar

Configure to hit the function URL with the `x-cron-secret` header every hour.

---

## Step 4: Configure in the App

1. Go to **Dashboard** → **Automated Exports**
2. Enable scheduled reports
3. Select report types (Sales Summary, Purchase Summary, etc.)
4. Choose schedule (daily or weekly, time)
5. Enter email addresses (comma-separated)
6. Choose format (Excel or PDF)
7. Save

---

## How It Works

1. **Cron** hits the function every hour
2. **Function** checks which companies have exports due (based on schedule_time, schedule_type, schedule_day_of_week)
3. For each due config, it:
   - Fetches data from Supabase (sales, purchases, expenses)
   - Generates Excel workbook
   - Sends email via Resend
   - Updates `last_run_at`
4. **User** receives the report in their inbox

---

## Troubleshooting

- **No emails received**: Check Resend dashboard for delivery status. Verify sender domain for production.
- **Function returns 500**: Check Netlify function logs. Ensure all env vars are set and Supabase table exists.
- **Wrong schedule**: Times are in UTC. Adjust for your timezone (e.g. 8 AM IST = 2:30 AM UTC).
- **No data in report**: Ensure your sales/purchases/expenses are synced to Supabase (cloud sync enabled).

---

## Security Notes

- The function uses **service_role** key to bypass RLS and read all company data. The key must never be exposed.
- Use `CRON_SECRET` to prevent unauthorized calls to the function.
- Resend API key should only be in Netlify env vars, never in code.
