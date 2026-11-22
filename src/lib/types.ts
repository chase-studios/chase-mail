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
  is_external?: boolean;
  external_from?: string;
  external_to?: string;
  labels?: string[];
  snoozed_until?: string | null;
};

export type MailLabel = {
  id: string;
  name: string;
  color: string;
};

export type SnoozeRecord = {
  mailId: string;
  snoozedUntil: string;
  note?: string;
};

export type ScheduledMessage = {
  id: string;
  to: string;
  subject: string;
  body: string;
  scheduledFor: string;
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  category: 'youtube' | 'stream' | 'sponsor' | 'sync' | 'general';
  description?: string;
  mailId?: string;
};

export type EmailTemplate = {
  id: string;
  title: string;
  subject: string;
  body: string;
  category: 'sponsorship' | 'collab' | 'fanmail' | 'legal' | 'custom';
  isCustom?: boolean;
};

export type AutoResponderConfig = {
  enabled: boolean;
  subject: string;
  body: string;
  startDate?: string;
  endDate?: string;
};

export type SoundProfile = 'executive' | 'cyber' | 'minimal' | 'mute';
export type AppTheme = 'dark' | 'royal-gold' | 'cyber-vanguard' | 'oled' | 'horizon';

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
  body_html?: string;
  received_at: string;
  read_at: string | null;
  is_read?: boolean;
  from_email?: string;
  to_email?: string;
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
