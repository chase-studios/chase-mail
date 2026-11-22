# Chase Mail (Version 10 Production Suite)

![Chase Mail](public/icon.svg)

> **EVERY GENRE. NO LIMITS.**  
> The official independent email platform for the **Chase Studios** ecosystem ([chase-studios.org](https://chase-studios.org)).

---

## ✦ Overview

Chase Mail is an independent, secure, and production-ready email platform built for the Chase Studios network. It provides native `@chasemail.com` email addresses, full external interoperability with standard email providers (Gmail, Outlook, Yahoo, Apple Mail), rich customization and personalization (Pocket Companions nursery, themes, accents), and enterprise-grade account tiering and administration.

---

## ✦ Core Features

### 1. Complete Mail Experience
- **Native Mailboxes:** Inbox, Starred, Sent, Drafts, Archive, Spam, Trash, and Contacts.
- **Compose Suite:**
  - Rich text formatting & HTML support.
  - CC and BCC chip entry.
  - File attachments with client-side preview, download, and tier-based quota checks (10MB–100MB).
  - Continuous autosave for drafts.
  - User signature insertion from Update 10 personal storage.
- **Message Interactions:**
  - Full conversation threading and read/unread status.
  - Star / Unstar toggle.
  - Archive / Unarchive.
  - Mark Spam / Not Spam.
  - Soft-delete to Trash and permanent purge ("Empty Trash").
  - Quoted Reply and Reply-All with context preservation.
  - Message Forwarding with standard email headers.
  - Standard RFC 822 `.eml` download export.
- **Search:** Instant real-time search across sender, recipient, subject, and message content.

### 2. Email Provider Infrastructure & Interoperability
- **Native Addresses:** Unique username registration provisioning `@chasemail.com`, `@chaseprime.com`, `@chasevanguard.com`, and `@chasestudios.org`.
- **Outbound Gateway:** Server-side Supabase Edge Function (`supabase/functions/send-email`) relaying through Resend API with TLS 1.3 encryption.
- **Inbound Webhook Listener:** Supabase Edge Function (`supabase/functions/inbound-mail`) accepting incoming internet email.
- **External Email Delivery Telemetry:** Live delivery and bounce tracking stored in `mail_delivery_events`.
- **DNS Compatibility:** Full specifications provided for MX, SPF, DKIM, and DMARC (`DNS-CONFIGURATION.md`).
- **External Gmail Integration:** Isolated external Gmail / Google Workspace account bridge, keeping external mail strictly partitioned from native `@chasemail.com` accounts.

### 3. Account Tiers & Governance
- **Community Edition (`chasemail.com`):** 10 MB attachment limit, 5 GB storage, standard delivery.
- **Prime Edition (`chaseprime.com`):** 25 MB attachment limit, 25 GB storage, priority delivery.
- **Vanguard Edition (`chasevanguard.com`):** 50 MB attachment limit, 100 GB storage, VIP telemetry & security.
- **Studio Edition (`chasestudios.org`):** 100 MB attachment limit, 500 GB storage, ecosystem administrative console.

### 4. Pocket Companions & Personalization (Update 10)
- **Nursery & Collection Book:** 12 species (Nova, Pip, Ember, Luna, Moss, Iris, Bramble, Frost, Starlight, Shadow, Pebble, Echo).
- **Egg Care & Hatching:** Starlight, Ember, Moonlight, Forest eggs.
- **Themes & Colors:** Obsidian Purple, Midnight, and Light themes with customizable CSS accent colors.
- **Floating Companion:** Companion widget floats on the dashboard with toggleable visibility.

### 5. Security & Privacy
- **Row-Level Security (RLS):** Strict PostgreSQL partition ensuring users only access their own private messages.
- **Two-Factor Authentication (TOTP):** Compatible with Google Authenticator and 1Password.
- **Active Session Auditing:** Inspect connected devices and remotely revoke all other sessions.
- **GDPR Data Portability:** One-click JSON data export and RFC 4155 MBOX mailbox export.
- **Account Deletion:** Permanent account purge with safety confirmation safeguard.

### 6. Administration Console
- User directory with handle search and tier upgrade/downgrade controls.
- Account suspension and reactivation.
- Mail delivery events and bounce queue inspector.
- Ecosystem telemetry indicators.

---

## ✦ Quickstart (Local Development)

### 1. Prerequisites
- Node.js 20.19+ or Node.js 22+
- npm 10+

### 2. Installation
```bash
git clone https://github.com/chase-studios/chase-mail.git
cd chase-mail
npm install
```

### 3. Configuration
Copy `.env.example` to `.env`:
```ini
VITE_SUPABASE_URL=https://rvetucuqburqnrgoatui.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_lObu0hrc0h8j6AaIw4L2_w_Z8P_Q0nD
```

### 4. Development Server
```bash
npm run dev
```

### 5. Production Build & Preview
```bash
npm run check   # Type check (tsc --noEmit)
npm run build   # Production bundle (Vite)
npm run preview # Preview production build
```

---

## ✦ Technical Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Hosting on Vercel, Netlify, and Cloudflare Pages.
- [DATABASE.md](DATABASE.md) — Schema, RLS policies, migrations, and safe backups.
- [EMAIL-INFRASTRUCTURE.md](EMAIL-INFRASTRUCTURE.md) — Resend gateway, inbound webhooks, and DNS records.
- [SECURITY.md](SECURITY.md) — Security model, 2FA, session management, and GDPR compliance.
- [TESTING.md](TESTING.md) — Verification matrix, multi-account tests, and E2E browser automation.
- [DNS-CONFIGURATION.md](DNS-CONFIGURATION.md) — Official DNS records for `chasemail.com`.
- [RESEND-SETUP.md](RESEND-SETUP.md) — Outbound API and webhook configuration.

---

## ✦ License & Ownership

Copyright © 2026 Chase Studios. All rights reserved.  
Official website: [https://chase-studios.org](https://chase-studios.org)
