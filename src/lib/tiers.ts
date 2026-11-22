import { AccountTier, TierDefinition } from './types';

export const TIERS: Record<AccountTier, TierDefinition> = {
  community: {
    id: 'community',
    displayName: 'Community Edition',
    domain: 'chasemail.com',
    maxAttachmentSizeMB: 10,
    mailboxStorageGB: 5,
    features: [
      'Native @chasemail.com address',
      'Standard Inbound/Outbound mail',
      'Pocket Companion nursery',
      'Basic themes & personalization'
    ],
    badgeColor: '#8648eb'
  },
  prime: {
    id: 'prime',
    displayName: 'Prime Edition',
    domain: 'chaseprime.com',
    maxAttachmentSizeMB: 25,
    mailboxStorageGB: 25,
    features: [
      'Native @chaseprime.com & @chasemail.com alias',
      'Priority mail processing',
      'Custom signatures & rich formatting',
      'Extended companion care & evolution'
    ],
    badgeColor: '#ffaa00'
  },
  vanguard: {
    id: 'vanguard',
    displayName: 'Vanguard Edition',
    domain: 'chasevanguard.com',
    maxAttachmentSizeMB: 50,
    mailboxStorageGB: 100,
    features: [
      'Native @chasevanguard.com address',
      'End-to-end security & 2FA enforcement',
      'Delivery queues & telemetry access',
      'Custom theme creation studio'
    ],
    badgeColor: '#00d2ff'
  },
  studio: {
    id: 'studio',
    displayName: 'Studio Edition',
    domain: 'chasestudios.org',
    maxAttachmentSizeMB: 100,
    mailboxStorageGB: 500,
    features: [
      'Native @chasestudios.org address',
      'Full administrative directory & user management',
      'System-wide bounce queue monitor',
      'Direct Chase Studios network integration'
    ],
    badgeColor: '#ba8cff'
  }
};

export function getTier(edition: string | undefined): TierDefinition {
  const normalized = (edition || 'community').toLowerCase() as AccountTier;
  return TIERS[normalized] || TIERS.community;
}

export function plannedAddress(handle: string, edition?: string): string {
  const tier = getTier(edition);
  return `${handle}@${tier.domain}`;
}
