# Supabase Configuration Checklist

## ⚡ Quick Setup (15 minutes)

### Step 1: Create Supabase Project ⏱️ 3 min
- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Click "New Project"
- [ ] Project name: `ai-co-analyst`
- [ ] Create password: Use strong password
- [ ] Region: Pick one closest to you
- [ ] Click "Create new project"
- [ ] Wait for initialization...

### Step 2: Copy API Keys ⏱️ 1 min
- [ ] Go to **Settings → API**
- [ ] Copy **Project URL** (looks like `https://xxx.supabase.co`)
- [ ] Copy **Anon Key** (public key starting with `eyJh...`)
- [ ] Paste into `.env.local`:
  ```
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJh...
  ```

### Step 3: Create Database Tables ⏱️ 5 min
- [ ] In Supabase, go to **SQL Editor**
- [ ] Click **New Query**
- [ ] Paste SQL from below (or from SUPABASE_SETUP.md)
- [ ] Click **Run**

```sql
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

CREATE INDEX datasets_user_id_idx ON datasets(user_id);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own datasets"
  ON datasets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own datasets"
  ON datasets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets"
  ON datasets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets"
  ON datasets FOR DELETE USING (auth.uid() = user_id);
```

### Step 4: Setup Google OAuth ⏱️ 6 min (Optional but recommended)

#### Get Google Credentials:
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create new project
- [ ] Search "Google+ API" → Enable it
- [ ] Go to **Credentials**
- [ ] Click **Create OAuth 2.0 Client ID**
- [ ] Select "Web application"
- [ ] Add these **Authorized redirect URIs**:
  - `http://localhost:3000`
  - `https://your-domain.com` (later)
  - `https://your-project.supabase.co/auth/v1/callback`
- [ ] Copy **Client ID** and **Client Secret**

#### Configure Supabase:
- [ ] In Supabase, go to **Authentication → Providers**
- [ ] Find **Google** and toggle ON
- [ ] Paste Google **Client ID**
- [ ] Paste Google **Client Secret**
- [ ] Save

### Step 5: Test It! ⏱️ 2 min
```bash
npm run dev
# Visit http://localhost:3000
```

- [ ] Sign up with email: `test@example.com` / `password123`
- [ ] You're logged in ✅
- [ ] Refresh page → Still logged in ✅
- [ ] Click logout ✅
- [ ] Log back in with same email/password ✅
- [ ] Open DevTools → Application → No password visible ✅
- [ ] Click "Continue with Google" → Redirects to Google ✅

---

## ✅ Verification

### Check 1: Security
```javascript
// Open DevTools console, paste:
localStorage  // Should NOT have passwords
// Should show: Storage { length: 0 } or just app data
```

### Check 2: Session Persistence
```javascript
// After login, in DevTools go to:
// Application → Cookies → check for auth cookie
// Should see: sb-xxx-auth-token (Supabase session)
```

### Check 3: Database
```
In Supabase:
- Go to Table Editor
- Click "datasets"
- Should be empty (no data until you upload)
- RLS enabled ✅
```

---

## 🚨 Troubleshooting

### Error: "Supabase configuration missing"
**Solution:**
1. Check `.env.local` has both keys
2. Keys don't have extra spaces
3. Restart dev server: `npm run dev`

### Google login redirects to blank page
**Solution:**
1. Check Google Cloud Console has redirect URI: `https://your-project.supabase.co/auth/v1/callback`
2. Supabase Google provider has correct Client ID & Secret
3. Wait 5 minutes for changes to propagate

### Can't sign up
**Solution:**
1. Email might already exist in Supabase
2. Use different email
3. Or delete user from Supabase dashboard

### Datasets not saving
**Solution:**
1. Check user is logged in
2. Open browser DevTools → Network → Check POST to `/rest/v1/datasets`
3. Look for error messages

---

## 📋 Environment File Example

Create/update `.env.local`:

```dotenv
# Existing
GEMINI_API_KEY=AIzaSyD...

# New - Supabase (from Settings → API)
VITE_SUPABASE_URL=https://xyzpqr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional - Google OAuth
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

**⚠️ Never commit this file to Git!**

---

## 📱 What Users See

### Before (localStorage only)
❌ Sign up → Data only in browser
❌ Close browser → Data lost
❌ Password visible in DevTools
❌ Can't login on another device
❌ Google login generates fake user

### After (Supabase)
✅ Sign up → Data saved to Supabase
✅ Close browser → Data persists
✅ Password never exposed
✅ Can login from any device
✅ Google login is real

---

## 🎯 Success Criteria

- [x] Supabase project created
- [x] API keys in `.env.local`
- [x] Tables created with RLS
- [x] Email/password signup works
- [x] Session persists on refresh
- [x] Logout clears session
- [x] Google OAuth configured
- [x] Datasets save to Supabase
- [x] Multiple users work independently

---

## 🚀 Ready to Deploy?

Once everything works locally:

1. Deploy Supabase (already hosted)
2. Update `.env.local` for production
3. Add redirect URIs for your domain
4. Deploy your app (Vercel, Netlify, etc.)
5. Test in production

---

**Questions?** Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed steps.
