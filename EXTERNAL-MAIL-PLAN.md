# Chase Mail — internal and external email roadmap

**Goal:** A real email service that can receive Discord verification emails and send/receive mail with Gmail, Outlook and other providers, alongside internal Chase Mail messaging.

## Current state
- Supabase-backed internal message database and Community account registration are implemented.
- Prototype frontend is included but not deployed or end-to-end tested.
- External SMTP/Internet inbound and outbound mail are NOT implemented.
- `chasemail.com`, `chasestudios.org`, `chasevanguard.com`, and `chaseprime.com` are planned domains only. Ownership and DNS have not been verified. `chasestudios.org` differs from existing website `chase-studios.org`.

## Required work
1. Verify ownership of intended domains; select an inbound/outbound mail provider with suitable pricing. A free tier must be confirmed, not assumed.
2. Set MX, SPF, DKIM and DMARC records and verify DNS. Supabase Auth custom SMTP sends authentication mail only; it is not an inbound mailbox.
3. Add secure inbound provider webhook/worker with signature validation, idempotency, recipient routing, spam/malware limits, safe MIME parsing and attachment storage.
4. Add server-side outbound sending with provider credentials in server secrets only, abuse prevention, bounce and delivery status handling.
5. Add external-address and delivery tables with RLS, thread headers, retention, and HTML sanitization. Do not mix untrusted Internet headers with internal account authorization.
6. Implement server-only executive and Studio account provisioning.
7. Test real inbound and outbound email and account recovery BEFORE switching Discord's registered email.

## Deployment
The connected GitHub integration still reports 404 for private `chase-studios/chase-mail`; the repository may exist but the integration cannot access it. The ZIP can be uploaded manually or when GitHub authorization is resolved. Deploy Vite static output and configure Supabase Auth allowed URLs.
