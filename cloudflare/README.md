# Chase Mail - Cloudflare Inbound Email Worker

This worker allows `chase-studios.org` to dual-route incoming emails:
1. **Gmail Forwarding**: Forwards every incoming message directly to `billgaming2424@gmail.com`.
2. **In-App Ingestion**: Simultaneously POSTs the inbound message to the Supabase Edge Function `inbound-mail`, populating the Chase Mail Unified Inbox (`mail_external_messages`).

## Deployment via Wrangler or Cloudflare Dashboard

### Option A: Cloudflare Dashboard
1. Go to **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Worker**.
2. Name it `chase-mail-inbound`.
3. Paste the contents of `email-worker.js`.
4. Add Environment Variable:
   - `DESTINATION_EMAIL`: `billgaming2424@gmail.com`
   - `SUPABASE_URL`: `https://rvetucuqburqnrgoatui.supabase.co`
   - `SUPABASE_ANON_KEY`: *(your supabase anon key)*
5. Go to **Email Routing** $\rightarrow$ **Routing Rules**.
6. Edit the Catch-all rule or add custom action: **Send to a Worker** $\rightarrow$ Select `chase-mail-inbound`.

### Option B: Wrangler CLI
```bash
npx wrangler deploy cloudflare/email-worker.js --name chase-mail-inbound
```
