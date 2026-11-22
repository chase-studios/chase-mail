# Chase Mail — Update 10 rewrite (PC)

## What is actually included
This is an **editable source-code release candidate**, not a compiled or production-tested website. It builds on the v0.6 recovery foundation, **not** on the full v0.8 Vercel deployment. Do not replace production until tested and differences reconciled.

The existing app includes Supabase authentication, internal inbox/sent, drafts, contacts, search, local basic pets, and existing theme controls. New Update 10 code adds a richer egg nursery, four starter eggs, 12-species collection book, rarity tiers, leveling/care, eight theme presets, custom background/accent, compact and reduced-motion controls, signature editor (not auto-inserted), and personal JSON export/import. The Update 10 additions are stored per Supabase user in browser localStorage, **not cloud synced**.

## PC instructions
1. Install Node.js 22 LTS or newer.
2. Extract the ZIP. Open a terminal in the folder containing `package.json`.
3. Run `npm install`.
4. Copy `.env.example` to `.env` (public Supabase URL and publishable key only). Never add a service-role key.
5. Run `npm run check`, then `npm run build`, then `npm run dev`.
6. Open the local URL printed by Vite. Sign in with a **test account** and test the Companions and Settings screens.
7. Check existing mail, drafts, contacts, account permissions, mobile layout and browser console.
8. Deploy to a **preview** of the existing Vercel `chase-mail` project. Do not change DNS or production until tested.

## Unfinished / NOT represented as complete
- Full v0.8 Vercel code merge (latest source not fully recovered)
- All prior Update 1–8 enhancements (some only documented)
- Real external Gmail/Outlook/Yahoo send/receive and OAuth
- Shared Chase Studios SSO
- Cloud companion inventory, verified trading and economy
- Scheduled automatic sending, secure file attachments, push delivery
- Royal/Prime/Vanguard server-side entitlements and verified addresses
- Automatic signature insertion, real notification delivery
- Production build and end-to-end testing

## Safeguards
- Back up your current repository and Supabase database before deployment.
- Do not publish `.env`, OAuth secrets, or service-role keys.
- Check Supabase Row Level Security and migrations before enabling new database features.
- Current `mail.chase-studios.org` should stay on the existing Vercel production deployment until a preview passes testing.

## Troubleshooting
If `npm install` fails, check your network and Node installation. If `npm run check` fails, resolve the TypeScript errors before deploying. If the site shows 'Configuration needed', verify `.env` values and restart Vite.
