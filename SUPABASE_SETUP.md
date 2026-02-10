# Supabase Integration Setup Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project name**: `ai-co-analyst`
   - **Database password**: Create a strong password
   - **Region**: Select closest to you
5. Wait for project initialization (2-3 minutes)

## Step 2: Get Your Credentials

1. Go to **Settings → API** in your Supabase project
2. Copy these values and paste them in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Create a new query and paste this SQL:

```sql
-- Create datasets table
CREATE TABLE datasets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  upload_date TIMESTAMP NOT NULL,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  health_score FLOAT NOT NULL,
  columns JSONB NOT NULL,
  issues JSONB NOT NULL,
  insights JSONB NOT NULL,
  charts JSONB NOT NULL,
  summary TEXT,
  intent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX datasets_user_id_idx ON datasets(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own datasets
CREATE POLICY "Users can view their own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets"
  ON datasets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets"
  ON datasets FOR DELETE
  USING (auth.uid() = user_id);
```

3. Click "Run" to execute

## Step 4: Setup Google OAuth

### Get Google Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Google+ API"
4. Go to **Credentials → Create OAuth 2.0 Client ID**
5. Choose "Web application"
6. Add Authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
   - `https://your-project.supabase.co/auth/v1/callback` (Supabase)
7. Copy the **Client ID** and **Client Secret**

### Configure in Supabase:
1. Go to **Authentication → Providers** in Supabase
2. Find "Google"
3. Toggle it ON
4. Paste your Google **Client ID** and **Client Secret**
5. Save

### Update .env.local:
```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Step 5: Update Your App

The `supabaseService.ts` file already handles:
- ✅ **Password Security**: Supabase encrypts passwords automatically
- ✅ **Email/Password Auth**: Uses secure Supabase auth
- ✅ **Google OAuth**: Configured in Supabase
- ✅ **Session Management**: Automatic with Supabase
- ✅ **Data Persistence**: All data saved to Supabase DB

## Step 6: Test Locally

```bash
# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` and test:
1. Sign up with email/password
2. Check that password is NOT visible in browser storage
3. Log in with the same credentials
4. Try Google login (should redirect to Google)
5. Verify data persists after page refresh

## Important Notes

### Security Features Implemented:
- ✅ **No plain text passwords**: Supabase handles encryption
- ✅ **No passwords in localStorage**: Supabase manages sessions
- ✅ **Row Level Security (RLS)**: Users can only access their own data
- ✅ **Real Google OAuth**: Integrated via Supabase
- ✅ **Session tokens**: Secure, auto-refreshing tokens

### What Changed:
1. **Before**: Passwords stored in plain text in localStorage
2. **After**: Passwords sent securely to Supabase, encrypted server-side

3. **Before**: Data in browser localStorage only
4. **After**: Data in Supabase PostgreSQL database

5. **Before**: Fake Google login with random users
6. **After**: Real Google OAuth with Supabase redirect

## Troubleshooting

### "Supabase configuration missing" error
- Check `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after changing `.env.local`

### Google login redirects to blank page
- Check Google Client ID in Supabase matches your credentials
- Ensure redirect URI includes `http://localhost:3000` in Google Cloud Console

### "Row Level Security" errors
- Verify RLS policies were created in SQL Editor
- Check user_id column has correct values

### Datasets not saving
- Ensure user is logged in (check Supabase auth state)
- Verify datasets table exists in Supabase
- Check browser console for detailed error messages

## Next Steps

1. Update App.tsx to use `supabaseService.ts` instead of localStorage
2. Remove all localStorage auth calls
3. Test full flow: signup → upload → analysis → logout
4. Deploy to production with your Supabase production URL

Need help? Check [Supabase Docs](https://supabase.com/docs)
