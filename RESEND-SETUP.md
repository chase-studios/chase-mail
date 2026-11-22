# Chase Mail — Resend Integration & External Email Configuration

This guide details the complete configuration required to connect **Chase Mail** to **Resend** (https://resend.com) for sending and receiving external internet email with Gmail, Outlook, Yahoo, and Discord verification services.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Chase Mail Frontend           │
                      └──────────────────┬─────────────────────┘
                                         │
                   Internal (@chasemail) │ External (@gmail / etc.)
                                         │
                   ▼                     ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│ Supabase Table: mail_messages │ │ Edge Function: send-email     │
└───────────────────────────────┘ └──────────────┬────────────────┘
                                                 │ RESEND_API_KEY
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │      Resend Outbound API      │
                                  └──────────────┬────────────────┘
                                                 │
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │  Recipient (Gmail / Outlook)  │
                                  └───────────────────────────────┘
                                                 │
                                                 │ Inbound Email (MX)
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │ Resend Inbound Routing Engine │
                                  └──────────────┬────────────────┘
                                                 │ Webhook POST
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │ Edge Function: inbound-mail   │
                                  └──────────────┬────────────────┘
                                                 │ SUPABASE_SERVICE_ROLE_KEY
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │ Table: mail_external_messages │
                                  └───────────────────────────────┘
```

---

## 1. Resend Account & API Key Setup

1. Create a free account at [resend.com](https://resend.com).
2. Navigate to **API Keys** and create an API Key with `Full Access` permission.
3. In your Supabase Dashboard (**Project Settings > Edge Functions > Secrets**), add the secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_1234567890abcdef
   ```
4. Also verify `SUPABASE_SERVICE_ROLE_KEY` is present in your Edge Function secrets.

---

## 2. Domain Verification

To send email from `@chasemail.com` or `@chase-studios.org`:
1. In the Resend Dashboard, go to **Domains > Add Domain**.
2. Enter your domain (e.g., `mail.chase-studios.org` or `chasemail.com`).
3. Add the DNS records provided by Resend to your domain registrar / Cloudflare DNS (see `DNS-CONFIGURATION.md`).

---

## 3. Inbound Webhook Configuration

1. In Resend, navigate to **Webhooks > Add Webhook**.
2. Set Endpoint URL:
   ```
   https://rvetucuqburqnrgoatui.supabase.co/functions/v1/inbound-mail
   ```
3. Select Events: `email.received`
4. Copy the Webhook Signing Secret and add to Supabase secrets:
   ```bash
   supabase secrets set INBOUND_WEBHOOK_SECRET=whsec_...
   ```

---

## 4. Verification & Testing

Once configured:
- Sending to external addresses will automatically route through `send-email`.
- Incoming replies from external services (including Discord verification links) will trigger `inbound-mail` and appear instantly under the **External mail** tab in Chase Mail.
