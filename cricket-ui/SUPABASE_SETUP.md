# Supabase Setup Instructions

Follow these steps to set up Supabase for remote storage in the Cricket Statistics app.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account (GitHub, Google, or email)
3. You'll be taken to your dashboard

## Step 2: Create a New Project

1. Click **"New Project"** in your dashboard
2. Fill in the project details:
   - **Name**: `cricket-statistics` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is sufficient
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be set up

## Step 3: Create the Database Table

Once your project is ready:

1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open [`supabase/schema.sql`](../supabase/schema.sql) from this repo, copy its **entire** contents, and paste them in.
4. Click **"Run"** (or press Cmd/Ctrl + Enter). You should see "Success. No rows returned".

This creates the `teams`, `players`, and `matches` tables and — critically — enables
**owner-scoped Row Level Security** so each signed-in user can only see and modify
their own data. The script is idempotent, so you can re-run it safely.

> ⚠️ **Do not use a `USING (true) WITH CHECK (true)` "allow all" policy.** Because the
> app authenticates with the public anon key (which is shipped in the browser bundle),
> an open policy lets *anyone* read, edit, and delete *every* user's data. Earlier
> versions of this guide created exactly that policy — `supabase/schema.sql` drops it
> and replaces it with per-user policies. After running, confirm under
> **Authentication → Policies** that only the `*_select_own` / `*_insert_own` /
> `*_update_own` / `*_delete_own` policies exist.

## Step 4: Get Your API Keys

1. Go to **"Settings"** (gear icon in left sidebar)
2. Click **"API"**
3. You'll see two important values:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon/public key**: Copy this (long string starting with `eyJ...`)

## Step 5: Configure the App

1. In the `cricket-ui` folder, create a `.env` file (or rename `.env.example` to `.env`)

```bash
cp .env.example .env
```

2. Open `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file

## Step 6: Restart the Dev Server

If your dev server is running, stop it (Ctrl+C) and restart:

```bash
npm run dev
```

## Step 7: Test It Out!

1. Open your app in the browser
2. You should see **"☁️ Cloud Storage Active"** at the top
3. Create a match and add some statistics
4. The data should now be saved to Supabase
5. Check the "Search Matches" tab - your match should appear!

## Verification

You can verify data is being saved:

1. Go to your Supabase dashboard
2. Click **"Table Editor"** in the left sidebar
3. Select the **"matches"** table
4. You should see your saved matches!

## Troubleshooting

### "Local Storage Only" appears
- Check that your `.env` file exists and has correct values
- Make sure you restarted the dev server after creating `.env`
- Check browser console for any errors

### "Error saving match" in console
- Verify your API keys are correct
- Check that the SQL migration ran successfully
- Ensure Row Level Security policy is created

### Data not syncing
- Check your internet connection
- Look for errors in the browser console
- Verify Supabase project is active (not paused)

## Next Steps (Optional)

### Authentication (already wired)
The app already uses Supabase Auth (email/password) and the per-user RLS policies
from `supabase/schema.sql`. Just ensure **Email** auth is enabled under
**Authentication → Providers** in your Supabase project. Saving teams/matches
requires being signed in.

### Back up Data
- Supabase automatically backs up your database
- Free tier includes daily backups
- Export data via SQL Editor if needed

## Security Notes

The web app talks to Supabase directly with the **public anon key**, so Row Level
Security is your only access control. [`supabase/schema.sql`](../supabase/schema.sql)
sets this up correctly:

1. **RLS is enabled** on `teams`, `players`, and `matches`.
2. **Per-user policies** restrict every row to its owner (`auth.uid() = user_id`), so
   users only ever see and modify their own data. Users must be **signed in** — the
   anon role has no access.
3. **Never** re-introduce an `USING (true)` "allow all" policy.
4. **Don't commit `.env`** (already in `.gitignore`). The anon key is safe to expose;
   the service-role key is **not** — keep it server-side only.

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Issues: Check browser console for detailed error messages

