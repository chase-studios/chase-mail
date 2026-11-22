# Chase Mail — Database Architecture & Security Guide

**Product:** Chase Mail  
**Ecosystem:** Chase Studios ([https://chase-studios.org](https://chase-studios.org))  
**Database Engine:** PostgreSQL via Supabase Enterprise  
**Live Endpoint:** `https://rvetucuqburqnrgoatui.supabase.co`

---

## 1. Overview & Data Integrity Principle

Chase Mail enforces strict zero-loss data preservation. All migrations and maintenance scripts are strictly non-destructive. Production user accounts, mail history, and Pocket Companion nursery saves are retained permanently.

---

## 2. Table Specifications & Relationships

### `mail_accounts`
Stores native Chase Mail mailbox handles and identity tiers.

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `user_id` | `uuid` | PRIMARY KEY, REFERENCES `auth.users(id)` | User authentication ID |
| `handle` | `text` | UNIQUE, NOT NULL | Alphanumeric handle (e.g. `bill`) |
| `display_name` | `text` | NOT NULL | User's chosen display name |
| `edition` | `text` | DEFAULT `'community'` | Tier: `community`, `prime`, `vanguard`, `studio` |
| `created_at` | `timestamptz` | DEFAULT `now()` | Timestamp account was provisioned |
| `status` | `text` | DEFAULT `'active'` | Account state: `active` or `suspended` |

### `mail_messages`
Stores native peer-to-peer Chase Mail messages.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique message ID |
| `sender_id` | `uuid` | NOT NULL, REFERENCES `auth.users(id)` | Sender's user ID |
| `recipient_id` | `uuid` | NOT NULL, REFERENCES `auth.users(id)` | Recipient's user ID |
| `subject` | `text` | NOT NULL | Email subject line |
| `body` | `text` | NOT NULL | Message body (plain-text or HTML) |
| `sent_at` | `timestamptz` | DEFAULT `now()` | Send timestamp |
| `recipient_read_at`| `timestamptz`| NULLABLE | Timestamp message was read |
| `sender_deleted_at`| `timestamptz`| NULLABLE | Timestamp sender soft-deleted message |
| `recipient_deleted_at`| `timestamptz`| NULLABLE | Timestamp recipient soft-deleted message |

### `mail_drafts`
Stores private compose drafts with autosave support.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Draft identifier |
| `owner_id` | `uuid` | NOT NULL, REFERENCES `auth.users(id)` | Draft author |
| `recipient` | `text` | NULLABLE | Intended recipient handle or email |
| `subject` | `text` | NULLABLE | Draft subject |
| `body` | `text` | NULLABLE | Draft message content |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last saved timestamp |

### `mail_contacts`
User address book for internal handles and external email contacts.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Contact identifier |
| `owner_id` | `uuid` | NOT NULL, REFERENCES `auth.users(id)` | Owner user ID |
| `name` | `text` | NOT NULL | Full name or nickname |
| `email` | `text` | NOT NULL | Email address or handle |

### `mail_external_messages`
Inbound and outbound messages routed through external internet providers (e.g. Resend, Gmail, Outlook).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | External record ID |
| `owner_id` | `uuid` | NOT NULL, REFERENCES `auth.users(id)` | Mailbox owner |
| `direction` | `text` | CHECK (`inbound` or `outbound`) | Flow direction |
| `from_address` | `text` | NOT NULL | Source email |
| `to_address` | `text` | NOT NULL | Destination email |
| `subject` | `text` | NOT NULL | Message subject |
| `body_text` | `text` | NOT NULL | Sanitized email body |
| `received_at` | `timestamptz` | DEFAULT `now()` | Processing timestamp |
| `read_at` | `timestamptz` | NULLABLE | Read receipt timestamp |

### `mail_delivery_events`
Audit trail and delivery telemetry for bounce handling, spam filtering, and queue monitoring.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Telemetry event ID |
| `message_id` | `text` | NOT NULL | Associated email / RFC ID |
| `recipient` | `text` | NOT NULL | Recipient address |
| `event_type` | `text` | CHECK (`delivered`, `bounced`, `queued`, `opened`, `rejected`) | Delivery event |
| `details` | `text` | NULLABLE | Extended error or diagnostic log |
| `created_at` | `timestamptz` | DEFAULT `now()` | Event timestamp |

---

## 3. Row-Level Security (RLS) Policies

All tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

1. **`mail_accounts`**:
   - `SELECT`: Publicly readable by authenticated users so handles can be discovered and resolved.
   - `INSERT`: Granted via `register_chase_mail_account` stored procedure.
   - `UPDATE`: Users can update their own `display_name`. Studio/Vanguard administrators can update tiers.
2. **`mail_messages`**:
   - `SELECT`: `WHERE auth.uid() = sender_id OR auth.uid() = recipient_id`.
   - `INSERT`: `WHERE auth.uid() = sender_id`.
   - `UPDATE`: `WHERE auth.uid() = recipient_id` (for `recipient_read_at`) or soft-delete timestamps.
3. **`mail_drafts`**:
   - `ALL`: `WHERE auth.uid() = owner_id`.
4. **`mail_contacts`**:
   - `ALL`: `WHERE auth.uid() = owner_id`.
5. **`mail_external_messages`**:
   - `SELECT`: `WHERE auth.uid() = owner_id`.
   - `INSERT`: Denied to public/anon/authenticated roles; **restricted to `service_role`** only. This prevents client-side forgery of external mail deliveries.

---

## 4. Stored Procedures (RPCs)

### `register_chase_mail_account(p_handle text, p_display_name text)`
- **Security:** `SECURITY DEFINER`
- **Functionality:** Validates that `auth.uid()` is present, ensures `p_handle` is lowercase alphanumeric without invalid characters, checks for uniqueness, and inserts an entry into `mail_accounts` with default tier `community`.

### `delete_chase_mail_message(p_message_id uuid, p_folder text)`
- **Security:** `SECURITY DEFINER`
- **Functionality:** Safely marks `recipient_deleted_at` or `sender_deleted_at` depending on `p_folder` and verifying caller ownership.

---

## 5. Non-Destructive Migrations

All migrations reside in `supabase/migrations/`:
- `20261121_chase_mail_v10_fixes.sql`: Adds deletion timestamps, grants column update permissions, and defines `delete_chase_mail_message`.

To apply migrations manually:
```bash
npx supabase db push
# or run the SQL script via Supabase Studio SQL Editor
```

---

## 6. Backup and Recovery Procedures

### Automated JSON Backup
Run the included backup script:
```bash
node scripts/backup_database.js [SUPABASE_SERVICE_ROLE_KEY]
```
The script writes an archived timestamped JSON file to `backups/chase_mail_backup_<timestamp>.json`.

### Point-in-Time Recovery
Supabase Enterprise provides automated daily physical WAL backups. In case of emergency disaster recovery, restore to any point within the 7-day retention window from the Supabase management console.
