# Quick Deploy to grahamjenkinson.com

## 🚀 Recommended: Netlify (Easiest - 5 minutes)

### Step 1: Sign Up & Import
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click **"Add new site"** → **"Import an existing project"**
4. Select your `airflow_project` repository
5. Click **"Import"**

### Step 2: Configure Build
- **Base directory**: `cricket-ui`
- **Build command**: `npm run build`
- **Publish directory**: `cricket-ui/dist`
- Click **"Deploy site"**

### Step 3: Add Custom Domain
1. Once deployed, click **Site settings**
2. Go to **Domain management**
3. Click **"Add custom domain"**
4. Enter: `grahamjenkinson.com`
5. Click **"Verify"**

### Step 4: Configure DNS
Netlify will show you what DNS records to add:

**Option A: Using Netlify DNS (Easiest)**
- In your domain registrar (where you bought grahamjenkinson.com):
  - Change nameservers to Netlify's (shown in dashboard)
  - Netlify handles everything automatically

**Option B: Keep Current DNS**
- Add A record: `grahamjenkinson.com` → Netlify IP (shown in dashboard)
- Add CNAME: `www.grahamjenkinson.com` → `your-site.netlify.app`
- Wait 5-60 minutes for DNS propagation

### Step 5: Add Environment Variables
1. Go to **Site settings** → **Environment variables**
2. Click **"Add variable"**
3. Add:
   - Key: `VITE_SUPABASE_URL`
   - Value: Your Supabase URL
4. Add:
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon key
5. Click **"Redeploy site"**

### Step 6: Done! ✅
- Visit `grahamjenkinson.com`
- HTTPS is automatic
- Future pushes to `main` branch auto-deploy

---

## 🔄 Automatic Deployments

After initial setup, every time you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push
```

Netlify automatically:
- ✅ Detects the push
- ✅ Runs `npm run build` in `cricket-ui`
- ✅ Deploys to `grahamjenkinson.com`
- ✅ Takes ~2-3 minutes

---

## 📋 Alternative: Vercel

If you prefer Vercel:

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Add New"** → **"Project"**
4. Import `airflow_project`
5. Configure:
   - **Root Directory**: `cricket-ui`
   - **Framework Preset**: Vite
6. Click **"Deploy"**
7. Go to **Settings** → **Domains**
8. Add `grahamjenkinson.com`
9. Configure DNS as shown
10. Add environment variables (same as Netlify)

---

## ✅ Checklist

- [ ] Production build successful (`npm run build`)
- [ ] Deployed to hosting platform
- [ ] Custom domain configured
- [ ] DNS records updated
- [ ] Environment variables set (for Supabase)
- [ ] SSL certificate active (automatic)
- [ ] Test app at grahamjenkinson.com
- [ ] Verify Supabase connection works

---

## 🆘 Need Help?

**DNS Issues?**
- Wait up to 48 hours for DNS to propagate
- Check: [whatsmydns.net](https://www.whatsmydns.net)

**Build Errors?**
- Check build logs in Netlify/Vercel dashboard
- Ensure `npm run build` works locally

**Supabase Not Working?**
- Verify environment variables are set correctly
- Check browser console for errors
- Ensure variable names start with `VITE_`

---

**That's it!** Your cricket statistics app will be live at **grahamjenkinson.com** 🏏


