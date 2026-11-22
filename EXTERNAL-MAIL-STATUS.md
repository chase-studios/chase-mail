# External mail implementation status

Applied to connected Supabase project: `mail_external_messages` and `mail_delivery_events` tables with owner-only SELECT RLS. The external message table is intentionally NOT writable by ordinary authenticated clients: only a verified server-side ingestion path may insert provider mail. The backend adapter in `supabase/functions/inbound-mail` fails closed with HTTP 503 until a mail provider is chosen and cryptographic signature verification is implemented. It is not a working inbound receiver. This prevents spoofed verification emails being inserted by clients.

Remaining external dependencies: verified domain ownership; DNS MX/SPF/DKIM/DMARC; mail provider account and credentials; provider-specific signed webhook parser, validation and idempotent insert; outbound provider integration; live delivery tests; deployed frontend. No real Discord verification can be received yet.
