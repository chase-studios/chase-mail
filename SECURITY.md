# Chase Mail — Security Architecture & Data Protection

**Product:** Chase Mail  
**Company:** Chase Studios  
**Security Level:** Production Grade  
**Compliance Target:** GDPR, CCPA, CAN-SPAM, RFC 5321/5322

---

## 1. Zero Trust Security Model

Chase Mail operates under a Zero Trust security paradigm. No client is trusted by default. Every database transaction, message dispatch, and settings mutation requires cryptographic authentication and authorization.

---

## 2. Row-Level Security (RLS) & Access Control

All PostgreSQL tables in Chase Mail are protected by Supabase Row-Level Security:

1. **Private Mail Isolation:** A user can only select, read, or update messages where `auth.uid() = sender_id` or `auth.uid() = recipient_id`. Direct queries for another user's messages are denied at the database engine level (HTTP 403 / PostgreSQL error 42501).
2. **Draft Confidentiality:** Only the owner (`owner_id = auth.uid()`) can view, edit, or delete message drafts.
3. **Contact Privacy:** Contacts and address books are strictly partitioned per user ID.
4. **External Mail Injection Barrier:** Direct `INSERT` operations on `mail_external_messages` are blocked for all client sessions (`anon` and `authenticated`). Only verified server-side Edge Functions with `service_role` privileges can write inbound external messages after validating provider webhook cryptographic signatures.

---

## 3. Secret & Credential Isolation

- **Frontend Environment (`.env`):** Contains only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Sensitive Secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_WEBHOOK_SECRET` are never bundled into the client build. They are stored as server-side environment secrets within Supabase Edge Functions (`supabase secrets set`).

---

## 4. Two-Factor Authentication (TOTP) & Session Security

1. **Time-Based One-Time Passwords (TOTP):** Users can link standard authenticator apps (Google Authenticator, 1Password, Bitwarden) with standard Base32 secret generation and 6-digit confirmation codes.
2. **Active Session Auditing:** Users can inspect active login sessions (browser client, operating system, last active time) directly from Settings.
3. **Remote Session Revocation:** Users can terminate all other active browser sessions with a single click via `supabase.auth.signOut({ scope: 'others' })`.

---

## 5. GDPR Compliance & Data Privacy

1. **Complete Data Export (JSON):** Users can download their complete account data—including profile records, message history, drafts, contacts, and Pocket Companion nursery saves—in machine-readable JSON.
2. **Standard Mailbox Export (.MBOX):** Users can export their message archives in standard RFC 4155 MBOX format for effortless import into third-party clients such as Mozilla Thunderbird or Apple Mail.
3. **Permanent Account Deletion (Right to be Forgotten):** Users can permanently delete their accounts and purge their communications. Deletion requires explicit safety confirmation by typing `DELETE`.

---

## 6. XSS Prevention & Content Sanitization

1. Email message rendering uses React's automated text escaping to prevent script injection.
2. Quoted lines are parsed into semantic blockquotes.
3. Attachment downloads enforce original file MIME types and restrict executable extensions (`.exe`, `.bat`, `.cmd`) from executing in browser context.
