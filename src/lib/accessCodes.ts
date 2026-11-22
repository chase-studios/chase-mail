import { AccountTier, AccountRole, RegistrationCode } from './types';

// Default system registration codes (can be rotated by authorized administrators)
export const DEFAULT_REGISTRATION_CODES: Record<AccountTier, RegistrationCode> = {
  community: {
    code: 'COMMUNITY',
    tier: 'community',
    role: 'user',
    label: 'Standard Public Community Access',
    active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  prime: {
    code: 'PRIME-CHASE-2026',
    tier: 'prime',
    role: 'user',
    label: 'Prime Account Edition Authorization',
    active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  royal: {
    code: 'ROYAL-CHASE-2026',
    tier: 'royal',
    role: 'user',
    label: 'Exclusive Royal Edition Authorization',
    active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  vanguard: {
    code: 'VANGUARD-CHASE-2026',
    tier: 'vanguard',
    role: 'user',
    label: 'Vanguard Edition Access Code',
    active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  studio: {
    code: 'STUDIO-EXEC-2026',
    tier: 'studio',
    role: 'executive',
    label: 'Chase Studios Executive & Personnel Code',
    active: true,
    created_at: '2026-01-01T00:00:00Z'
  }
};

const STORAGE_KEY = 'chase-mail-registration-codes';

export function getRegistrationCodes(): Record<AccountTier, RegistrationCode> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_REGISTRATION_CODES, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_REGISTRATION_CODES;
}

export function saveRegistrationCodes(codes: Record<AccountTier, RegistrationCode>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {}
}

/**
 * Validates whether the given code permits registration for the requested edition
 */
export function validateRegistrationCode(
  enteredCode: string,
  desiredTier: AccountTier
): { valid: boolean; role: AccountRole; error?: string } {
  // Community Edition is publicly available by default
  if (desiredTier === 'community' && (!enteredCode || enteredCode.trim() === '')) {
    return { valid: true, role: 'user' };
  }

  const clean = enteredCode.trim().toUpperCase();
  const currentCodes = getRegistrationCodes();
  const targetDef = currentCodes[desiredTier];

  if (!targetDef || !targetDef.active) {
    return { valid: false, role: 'user', error: `Registration for ${desiredTier} edition is currently paused.` };
  }

  if (clean === targetDef.code.toUpperCase()) {
    return { valid: true, role: targetDef.role };
  }

  // Super Admin universal authorization key
  if (clean === 'CHASE-STUDIOS-SUPERADMIN-2026' || clean === 'CHASE-STUDIOS-ADMIN-2026') {
    return { valid: true, role: 'super_admin' };
  }

  return {
    valid: false,
    role: 'user',
    error: `Invalid registration access code for ${desiredTier.toUpperCase()} Edition. Please verify your code or register a Community account.`
  };
}
