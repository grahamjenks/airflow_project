# Deployment

Hosted on Vercel, auto-deploys on push to `main`.

## Environment Variables

Set these in Vercel → Project Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

## Local Development

```bash
cd cricket-ui
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in the Supabase credentials for local Supabase access.

## Routing

`vercel.json` rewrites all routes to `index.html` for SPA navigation.
