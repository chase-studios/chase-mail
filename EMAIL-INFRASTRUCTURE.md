# Chase Mail — Email Infrastructure, DNS & Interoperability Architecture

**Product:** Chase Mail  
**Company:** Chase Studios  
**Domain:** `chasemail.com`  
**Brand Motto:** EVERY GENRE. NO LIMITS.

---

## 1. Architectural Philosophy

Chase Mail is engineered as a genuine, independent email provider. It does not pretend that an internal chat app is equivalent to an email service. Internal messages between `@chasemail.com` users are transferred with sub-millisecond latency via Supabase PostgreSQL, while external messages to Gmail, Outlook, Yahoo, Apple Mail, and custom corporate domains are dispatched through RFC 5321/5322 compliant email gateways.

---

## 2. Mail Infrastructure Components

```
                ┌────────────────────────────────────────┐
                │          Chase Mail Frontend           │
                │     (React + TypeScript PWA Client)    │
                └──────────────────┬─────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
        (Internal Recipient)             (External Recipient)
                   │                               │
                   ▼                               ▼
       ┌───────────────────────┐       ┌────────────────────────┐
       │   Supabase Postgres   │       │ Supabase Edge Function │
       │    `mail_messages`    │       │     (`send-email`)     │
       └───────────────────────┘       └───────────┬────────────┘
                                                   │
                                                   ▼
                                       ┌────────────────────────┐
                                       │    Resend Email API    │
                                       │   (SMTP / REST Relay)  │
                                       └───────────┬────────────┘
                                                   │
                                                   ▼
                                       ┌────────────────────────┐
                                       │ External Mail Servers  │
                                       │ (Gmail, Outlook, etc.) │
                                       └────────────────────────┘
```

### Outbound Gateway (`supabase/functions/send-email`)
- **Authentication:** Requires valid Supabase user JWT.
- **Provider:** Resend API (`api.resend.com/emails`).
- **Sender Verification:** Restricts `From:` to verified Chase Mail addresses (`handle@chasemail.com`, `handle@chaseprime.com`, `handle@chasevanguard.com`, `handle@chasestudios.org`).
- **Telemetry:** Logs every dispatch into `mail_delivery_events` with status `queued` or `delivered`.

### Inbound Webhook Gateway (`supabase/functions/inbound-mail`)
- **Webhook Endpoint:** `https://rvetucuqburqnrgoatui.supabase.co/functions/v1/inbound-mail`
- **Security:** Verifies provider signature (`RESEND_WEBHOOK_SECRET`).
- **Handle Resolution:** Extracts recipient local-part, queries `mail_accounts` to find `user_id`.
- **Storage:** Inserts into `mail_external_messages` using `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Required DNS Configuration for `chasemail.com`

To ensure 100% inbox delivery and protect against email spoofing, the following DNS records must be configured in your domain registrar / DNS provider (Cloudflare, Namecheap, Route 53):

### A. Inbound MX Records (Mail Exchanger)
Routes incoming emails to the processing gateway:

| Type | Host | Points To / Target | Priority | TTL |
|---|---|---|---|---|
| `MX` | `@` (or `chasemail.com`) | `feedback-smtp.us-east-1.amazonses.com` | `10` | 3600 |
| `MX` | `@` (or `chasemail.com`) | `inbound.resend.com` | `20` | 3600 |

### B. SPF Record (Sender Policy Framework)
Authorizes legitimate email servers to send mail on behalf of `chasemail.com`:

| Type | Host | Value | TTL |
|---|---|---|---|
| `TXT` | `@` | `v=spf1 include:amazonses.com include:resend.com ~all` | 3600 |

### C. DKIM Records (DomainKeys Identified Mail)
Provides cryptographic proof that outgoing emails have not been tampered with:

| Type | Host | Points To / Value | TTL |
|---|---|---|---|
| `CNAME` | `resend._domainkey` | `dkim.resend.com` | 3600 |
| `CNAME` | `resend1._domainkey`| `dkim1.resend.com`| 3600 |
| `CNAME` | `resend2._domainkey`| `dkim2.resend.com`| 3600 |

### D. DMARC Record (Domain-based Message Authentication, Reporting & Conformance)
Specifies policy for messages that fail SPF or DKIM:

| Type | Host | Value | TTL |
|---|---|---|---|
| `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@chasemail.com; ruf=mailto:dmarc-forensics@chasemail.com` | 3600 |

---

## 4. Account Tiers & Deliverability Allocations

Chase Mail provisions addresses according to the user's account tier:

| Tier | Primary Domain | Max Attachment | Mailbox Size | Queue Priority |
|---|---|---|---|---|
| **Community** | `@chasemail.com` | 10 MB | 5 GB | Standard |
| **Prime** | `@chaseprime.com` | 25 MB | 25 GB | High |
| **Vanguard** | `@chasevanguard.com` | 50 MB | 100 GB | VIP / Encrypted |
| **Studio** | `@chasestudios.org` | 100 MB | 500 GB | Enterprise / Admin |

---

## 5. Bounce, Spam, and Abuse Protection

1. **Delivery Event Audit Log (`mail_delivery_events`):** Every bounce, rejection, or delivery failure is stored with error details.
2. **Client Rate Limiting:** Outbound Edge Function enforces a threshold of 60 messages/minute per user to prevent automated abuse.
3. **External Mail Quarantine:** Suspicious incoming messages flagged by spam engines are placed into the `Spam` mailbox rather than user inboxes.
4. **Separate External Account Isolation:** External accounts connected via OAuth (e.g. Google/Gmail) remain in isolated tabs to prevent accidental cross-domain data leakage.
