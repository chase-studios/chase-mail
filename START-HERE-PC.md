# Chase Mail — PC Master Recovery Package

## What this download actually is
This is the most complete **locally recoverable editable source** available in this session, with egg hatching, twelve pocket companions, accent-color picker, three themes, Supabase authentication, internal messaging, contacts and drafts. It is **not** a finished consolidation of all eight updates, and it is **not** the latest Vercel v0.8 source. Do not overwrite the current live deployment until you have tested a preview and confirmed features.

## PC quick start (Windows)
1. Install Node.js 22 LTS if you don't have it.
2. Extract the ZIP. Open a terminal in this folder.
3. Run `npm install` then `npm run dev`.
4. Copy `.env.example` to `.env`, and supply your existing Supabase project URL and *public publishable/anon* key. Never use a service-role key in frontend code.
5. Visit the localhost URL Vite prints.
6. To test a production build, run `npm run build` and inspect the `dist` folder.

## Deploy safely
- Upload source to a NEW GitHub branch or test repository, not directly over the existing live site.
- In Vercel, use Vite / `npm run build` / `dist` and deploy a preview first.
- Check sign-in, existing accounts, mail, Pocket Companions and settings.
- Only promote after comparing the preview with the existing live v0.8 deployment.
- Keep `mail.chase-studios.org` on its current Vercel project; no DNS changes.

## Build status
Build could not be verified in this environment because npm registry DNS resolution failed (EAI_AGAIN). Dependencies are NOT bundled. Run `npm install` on your PC.

## Version gap
Latest Vercel production deployment `dpl_8FTZohmNZ8Q6G4HA6AREvctxvZkB` is READY and has modules `chase-royal.js`, `chase-bulk-five.js`, `chase-cloud.js`, `chase-account.js`, etc. The Vercel file API truncated their contents, so they are not included here. A real complete update must merge that source with this package, not replace it blindly.
