export type AccountTier = 'community' | 'prime' | 'royal' | 'vanguard' | 'studio';

export type AccountRole = 'user' | 'staff' | 'admin' | 'executive' | 'super_admin';

export type Account = {
  user_id: string;
  handle: string;
  edition: AccountTier | string;
  display_name: string;
  created_at?: string;
  status?: 'active' | 'suspended';
  avatar_url?: string;
  is_admin?: boolean;
  admin_role?: AccountRole;
  gold_trim?: boolean;
};

export type RegistrationCode = {
  code: string;
  tier: AccountTier;
  role: AccountRole;
  label: string;
  active: boolean;
  created_at: string;
};

export type MailAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // Base64 representation or Supabase storage path
};

export type Mail = {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  sent_at: string;
  recipient_read_at: string | null;
  sender_deleted_at?: string | null;
  recipient_deleted_at?: string | null;
  cc?: string[];
  bcc?: string[];
  attachments?: MailAttachment[];
  starred?: boolean;
  folder?: 'inbox' | 'sent' | 'archive' | 'trash' | 'spam';
  is_html?: boolean;
};

export type Draft = {
  id: string;
  owner_id: string;
  recipient: string;
  subject: string;
  body: string;
  updated_at: string;
  cc?: string;
  bcc?: string;
  attachments?: MailAttachment[];
};

export type Contact = {
  id: string;
  owner_id: string;
  name: string;
  email: string;
  avatar?: string;
  notes?: string;
};

export type ExternalMail = {
  id: string;
  owner_id: string;
  direction: 'inbound' | 'outbound';
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  received_at: string;
  read_at: string | null;
  attachments?: MailAttachment[];
};

export type DeliveryEvent = {
  id: string;
  message_id: string;
  recipient: string;
  event_type: 'delivered' | 'bounced' | 'opened' | 'rejected' | 'queued';
  details?: string;
  created_at: string;
};

export type TierDefinition = {
  id: AccountTier;
  displayName: string;
  domain: string;
  maxAttachmentSizeMB: number;
  mailboxStorageGB: number;
  features: string[];
  badgeColor: string;
  isProtected?: boolean;
  description?: string;
};
