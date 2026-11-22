# Chase Mail — product requirements and delivery roadmap

## Product vision
A real, user-facing, installable email application supporting both Chase Mail-to-Chase Mail messages and standards-based email with outside providers. Shared Chase Studios identity across the Chase UI ecosystem. No user should need to handle source ZIPs to use the finished product.

## Four editions (planned addresses; domains NOT yet verified)
- Community — `username@chasemail.com`, open registration, purple/black.
- Studio — `username@chasestudios.org`, invite-only employees, workspace roles.
- Vanguard — `username@chasevanguard.com`, reserved for CEO Don, green/black with gold executive avatar and verified status.
- Prime — `username@chaseprime.com`, reserved for founder Chris Magee, purple/black with gold executive avatar and verified status.
- Edition assignment is privileged server-side provisioning only. Existing Community registration cannot elevate editions. Verify control of every domain and configure DNS before promising real email addresses. The website `chase-studios.org` is a DIFFERENT domain from `chasestudios.org`.

## Current implementation
- Supabase Auth login/signup; internal mail tables with RLS; community account registration RPC.
- React/Vite responsive inbox, sent, compose, reply, mark-read.
- v0.3 adds installable PWA manifest and service worker. App still requires deployment and live user testing. Offline mode does not provide offline email access.

## Next delivery milestones
1. Secure recipient directory and message mutations; test two separate signed-in users; message deletion, pagination, realtime, drafts, search, threads, settings.
2. Provision founder/CEO editions through a server-controlled audited process; design per-edition themes and identity verification. Never rely on client-supplied edition or editable user metadata.
3. Deploy HTTPS web app and validate PWA installation on iPhone, Android, desktop. Add app-store wrappers/native apps after core stability.
4. External mail: verify domains; set MX, SPF, DKIM, DMARC; provision inbound processing and outbound provider with authenticated sending, rate limits, spam/abuse controls, attachment scanning, bounce handling, quotas and privacy safeguards; integrate both sources into a unified inbox. No external email is live now.
5. Verify receipt of real Discord confirmation/recovery messages before switching the channel's account email; preserve a working recovery method.
6. Contacts, aliases, filters, folders, spam, archive, trash, notifications, accessibility, account recovery, retention and export.
7. Friendly welcome emails signed **The Chase Studios Team**. Prime greets “Hey Chris!”, Vanguard “Hey Don!”, others greet display name.
8. Global Chase UI theme/profile settings; Pocket Companions (10–15 original pets, eggs, rare variants, wandering/sleeping/reacting, toggle off without losing progress), optional safe confirmed trading. Defer until messaging and external delivery work.
9. Future integrations with Chase UI Pulse, Nexus, Legacy, Vault, Identity, optional UI+ and Chase Gives; coordinate with website and game repositories without merging their development scopes.

## Known blockers
- GitHub connector has not yet confirmed access to private `chase-studios/chase-mail` repository.
- Domain ownership and inbound/outbound mail providers have not been verified.
- Backend, frontend and two-device integration have not been end-to-end tested.
- Supabase security advisories for existing functions/password settings require review before public launch.
