# Chase Mail — Complete Production Deployment Guide

**Product:** Chase Mail (Version 10 Production Suite)  
**Company:** Chase Studios  
**Production Domain:** `chasemail.com`  
**Hosting Compatibility:** Vercel, Netlify, Cloudflare Pages

---

## 1. Prerequisites & Environment Variables

The frontend application requires only the public Supabase parameters to be exposed to the client.

### Client Environment Variables (`.env`)
```ini
VITE_SUPABASE_URL=https://rvetucuqburqnrgoatui.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_lObu0hrc0h8j6AaIw4L2_w_Z8P_Q0nD
```

> [!IMPORTANT]
> Never set `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in client `.env` files. These keys belong exclusively in Supabase Edge Functions.

---

## 2. Platform Deployment Configurations

### Option A: Vercel (Recommended)
Chase Mail includes a pre-configured `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
**Steps to Deploy on Vercel:**
1. Connect repository `chase-studios/chase-mail` to Vercel.
2. In Project Settings > Environment Variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Set build command to `npm run build` and output directory to `dist`.
4. Deploy!

### Option B: Netlify
Chase Mail includes a pre-configured `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
**Steps to Deploy on Netlify:**
1. Import repository on Netlify.
2. Add environment variables under Site configuration > Environment variables.
3. Deploy site.

### Option C: Cloudflare Pages
1. Select Cloudflare Pages > Create a project > Connect to Git.
2. Build command: `npm run build`.
3. Build output directory: `dist`.
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Deploy.

---

## 3. Supabase Authentication & URL Configuration

In the Supabase Management Console for project `rvetucuqburqnrgoatui`:
1. Navigate to **Authentication > URL Configuration**.
2. Set **Site URL** to your production domain: `https://chasemail.com` (or your staging Vercel/Netlify URL).
3. Under **Redirect URLs**, add:
   - `https://chasemail.com/**`
   - `https://chasemail.com/reset-password`
   - `http://localhost:5173/**` (for local development)

---

## 4. Deploying Supabase Edge Functions

Chase Mail relies on two Edge Functions for external email handling:

### 1. `send-email` (Outbound via Resend)
```bash
# Set required secrets
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Deploy function
npx supabase functions deploy send-email --no-verify-jwt
```

### 2. `inbound-mail` (Inbound Webhook)
```bash
# Set required secrets
npx supabase secrets set RESEND_WEBHOOK_SECRET=your_webhook_signing_secret
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Deploy function
npx supabase functions deploy inbound-mail --no-verify-jwt
```

---

## 5. Domain & DNS Verification

Refer to `DNS-CONFIGURATION.md` and `EMAIL-INFRASTRUCTURE.md` for configuring MX, SPF, DKIM, and DMARC records with your domain registrar.
