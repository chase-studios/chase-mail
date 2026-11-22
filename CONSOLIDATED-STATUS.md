# Chase Mail — consolidated build

Includes: Supabase authentication, Community account registration, internal inbox/sent/reply/search, draft save/edit/delete, contacts add/remove/compose, external-message read-only inbox UI, PWA manifest and service worker, deployment configuration.

Supabase production tables verified: mail_accounts, mail_messages, mail_drafts, mail_contacts, mail_external_messages, mail_delivery_events.

External internet email is NOT working. Requires domain ownership, DNS MX/SPF/DKIM/DMARC, an inbound/outbound mail provider, verified webhook ingestion, outbound server function, and live end-to-end tests. The UI deliberately does not claim external send capability.

Do not treat planned email domains as owned or live. Do not put service-role credentials in frontend.
