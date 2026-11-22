import { AccountTier, TierDefinition } from './types';

export const PRIMARY_DOMAIN = 'chase-studios.org';

export const TIERS: Record<AccountTier, TierDefinition> = {
  community: {
    id: 'community',
    displayName: 'Community Edition',
    domain: PRIMARY_DOMAIN,
    description: 'Standard public email access for the Chase Studios universe.',
    maxAttachmentSizeMB: 10,
    mailboxStorageGB: 5,
    features: [
      `Native @${PRIMARY_DOMAIN} address`,
      'Standard Inbound/Outbound mail',
      'Pocket Companion nursery',
      'Basic themes & personalization'
    ],
    badgeColor: '#8648eb',
    isProtected: false
  },
  prime: {
    id: 'prime',
    displayName: 'Prime Edition',
    domain: PRIMARY_DOMAIN,
    description: 'Enhanced edition with dual address alias and extended mailbox capacity.',
    maxAttachmentSizeMB: 25,
    mailboxStorageGB: 25,
    features: [
      `Native @${PRIMARY_DOMAIN} & alias support`,
      'Priority mail processing',
      'Custom signatures & rich formatting',
      'Extended companion care & evolution',
      'Optional gold accent customization'
    ],
    badgeColor: '#eab308',
    isProtected: true
  },
  royal: {
    id: 'royal',
    displayName: 'Royal Edition',
    domain: PRIMARY_DOMAIN,
    description: 'Exclusive luxury tier with black, purple and gold trim aesthetic.',
    maxAttachmentSizeMB: 50,
    mailboxStorageGB: 100,
    features: [
      'Exclusive Royal account badge',
      'Luxury black, purple & gold aesthetic',
      'Gold-trimmed interface elements',
      'Protected VIP account provisioning',
      'Priority mail queue routing'
    ],
    badgeColor: '#d4af37',
    isProtected: true
  },
  vanguard: {
    id: 'vanguard',
    displayName: 'Vanguard Edition',
    domain: PRIMARY_DOMAIN,
    description: 'Advanced tactical edition featuring black-and-green aesthetic and enhanced security.',
    maxAttachmentSizeMB: 50,
    mailboxStorageGB: 100,
    features: [
      `Native @${PRIMARY_DOMAIN} address`,
      'Black-and-green visual styling & badge',
      'End-to-end security & 2FA enforcement',
      'Delivery queues & telemetry access',
      'Protected Vanguard access provisioning'
    ],
    badgeColor: '#10b981',
    isProtected: true
  },
  studio: {
    id: 'studio',
    displayName: 'Studio Edition',
    domain: PRIMARY_DOMAIN,
    description: 'Reserved executive and founder tier for verified Chase Studios personnel.',
    maxAttachmentSizeMB: 100,
    mailboxStorageGB: 500,
    features: [
      'Reserved for authorized Chase Studios personnel',
      'Executive & Founder mailbox addressing',
      'Optional executive gold trim',
      'Administrative directory & user governance',
      'Direct Chase Studios network integration'
    ],
    badgeColor: '#c084fc',
    isProtected: true
  }
};

export function getTier(edition: string | undefined): TierDefinition {
  const normalized = (edition || 'community').toLowerCase() as AccountTier;
  return TIERS[normalized] || TIERS.community;
}

export function plannedAddress(handle: string, edition?: string): string {
  return `${handle}@${PRIMARY_DOMAIN}`;
}
