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
3. Copy and paste this SQL:

```sql
-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_data JSONB NOT NULL,
  batting_stats JSONB DEFAULT '[]'::jsonb,
  bowling_stats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on match_data for better search performance
CREATE INDEX IF NOT EXISTS idx_matches_match_data ON matches USING GIN (match_data);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now - you can restrict later)
CREATE POLICY "Allow all operations" ON matches
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

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

### Add Authentication
To enable user-specific matches:
1. Enable authentication in Supabase
2. Update RLS policies to filter by user
3. Add auth to React app

### Back up Data
- Supabase automatically backs up your database
- Free tier includes daily backups
- Export data via SQL Editor if needed

## Security Notes

⚠️ **Important**: The current setup allows anyone with your API keys to read/write data. For production:

1. **Enable Row Level Security** (already done, but with open policy)
2. **Create user-specific policies** when you add authentication
3. **Don't commit `.env` file** to version control (it's already in `.gitignore`)

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Issues: Check browser console for detailed error messages

