# Deployment Guide for grahamjenkinson.com

This guide covers deploying the Cricket Statistics UI to your custom domain.

## Quick Start Options

### Option 1: Netlify (Recommended - Easiest) ⭐

**Pros:**
- Free tier with custom domains
- Easy setup (connects to GitHub)
- Automatic deployments on git push
- HTTPS included
- Great for React apps

**Setup:**
1. Go to [netlify.com](https://netlify.com) and sign up
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to GitHub and select `airflow_project`
4. Configure build settings:
   - **Base directory**: `cricket-ui`
   - **Build command**: `npm run build`
   - **Publish directory**: `cricket-ui/dist`
5. Click **"Deploy site"**
6. Once deployed, go to **Site settings** → **Domain management**
7. Click **"Add custom domain"** → Enter `grahamjenkinson.com`
8. Follow Netlify's DNS instructions (add CNAME or A record)
9. Netlify will provision SSL certificate automatically

**DNS Configuration:**
- Option A: Netlify DNS (easiest)
  - Use Netlify as your DNS provider
  - Point your domain to Netlify nameservers
  
- Option B: External DNS
  - Add CNAME: `www.grahamjenkinson.com` → `your-site.netlify.app`
  - Add A record: `grahamjenkinson.com` → Netlify IP (shown in dashboard)
  - Add redirect: `grahamjenkinson.com` → `www.grahamjenkinson.com` (optional)

**Automatic Deployments:**
- Every push to `main` branch auto-deploys
- Preview deployments for pull requests

---

### Option 2: Vercel (Also Great)

**Pros:**
- Free tier with custom domains
- Excellent React support
- Automatic deployments
- Edge network (fast globally)

**Setup:**
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **"Add New"** → **"Project"**
3. Import `airflow_project` from GitHub
4. Configure:
   - **Root Directory**: `cricket-ui`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**
6. Once deployed, go to **Settings** → **Domains**
7. Add `grahamjenkinson.com` and `www.grahamjenkinson.com`
8. Configure DNS as shown in Vercel dashboard

**DNS Configuration:**
- Add CNAME: `www.grahamjenkinson.com` → `cname.vercel-dns.com`
- Add A record: `grahamjenkinson.com` → Vercel IP addresses

---

### Option 3: GitHub Pages (Free)

**Pros:**
- Free hosting
- Custom domain support
- Integrated with GitHub

**Setup:**
1. Go to your GitHub repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: cricket-ui/package-lock.json
    
    - name: Install dependencies
      working-directory: ./cricket-ui
      run: npm ci
    
    - name: Build
      working-directory: ./cricket-ui
      run: npm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./cricket-ui/dist
```

4. In Settings → Pages:
   - Custom domain: `grahamjenkinson.com`
   - Enforce HTTPS: ✓
5. Configure DNS:
   - Add CNAME: `www.grahamjenkinson.com` → `grahamjenks.github.io`
   - Or add A records (check GitHub Pages docs for IPs)

---

### Option 4: Traditional Web Hosting

If you have your own web hosting (cPanel, shared hosting, etc.):

**Steps:**
1. Build the production bundle:
   ```bash
   cd cricket-ui
   npm run build
   ```

2. Upload contents of `dist/` folder to your web root (e.g., `public_html/`)

3. Configure your domain's DNS to point to your hosting provider

4. Ensure your server supports:
   - SPA routing (rewrite all routes to `index.html`)
   - HTTPS/SSL certificate

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Nginx:**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Environment Variables (Important!)

For Supabase to work in production, you need to set environment variables:

### Netlify
1. Go to Site settings → Environment variables
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

### Vercel
1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

### GitHub Actions
Add secrets in repo Settings → Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then update the workflow to pass them as environment variables.

---

## DNS Configuration Summary

For `grahamjenkinson.com`:

### Option A: Apex Domain (grahamjenkinson.com)
- **A Record**: Point to hosting provider's IP
- **CNAME**: Not typically allowed for apex domains

### Option B: www Subdomain (www.grahamjenkinson.com)
- **CNAME**: Point to hosting provider
- Then redirect apex → www

### Option C: Both (Recommended)
- **Apex (grahamjenkinson.com)**: A record
- **www**: CNAME to hosting provider
- Redirect both to one canonical URL

---

## SSL Certificate

All recommended platforms (Netlify, Vercel, GitHub Pages) automatically provide:
- ✅ Free SSL certificates (Let's Encrypt)
- ✅ Automatic renewal
- ✅ HTTPS enforcement

For traditional hosting, use Let's Encrypt or your hosting provider's SSL.

---

## Recommended Setup

For **grahamjenkinson.com**, I recommend:

1. **Netlify** (easiest setup with custom domain)
   - Connect GitHub repo
   - Add custom domain
   - Automatic HTTPS
   - Set environment variables
   - Done!

2. **Alternative**: **Vercel** if you prefer their platform

---

## Testing Deployment

After deploying:
1. Visit `grahamjenkinson.com` (may take a few minutes for DNS to propagate)
2. Check browser console for errors
3. Test Supabase connection (should show "Cloud Storage Active")
4. Create a test match and verify it saves

---

## Troubleshooting

### DNS Not Working
- Wait up to 48 hours for DNS propagation
- Use [whatsmydns.net](https://www.whatsmydns.net) to check propagation
- Clear DNS cache: `sudo dscacheutil -flushcache` (Mac)

### Environment Variables Not Working
- Ensure variables start with `VITE_` for Vite apps
- Restart build after adding variables
- Check build logs for errors

### 404 Errors on Routes
- Ensure SPA routing is configured (redirect to index.html)
- Check netlify.toml or vercel.json exists

### Supabase Not Connecting
- Verify environment variables are set in hosting platform
- Check browser console for errors
- Verify Supabase project is active

---

## Need Help?

- **Netlify Docs**: https://docs.netlify.com
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Pages Docs**: https://docs.github.com/en/pages

---

**Ready to deploy?** Choose your preferred platform above and follow the steps!

