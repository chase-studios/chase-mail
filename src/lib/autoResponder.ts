import { AutoResponderConfig } from './types';

const STORAGE_KEY = 'chase-mail-auto-responder';
const SENT_LOG_KEY = 'chase-mail-auto-responder-log';

export const DEFAULT_AUTORESPONDER: AutoResponderConfig = {
  enabled: false,
  subject: '[Auto-Reply] Currently in Studio / Production',
  body: `Thank you for contacting Chase Studios ("Every Genre. No Limits.").

I am currently on set or in a recording session and have limited access to email.

If this matter is urgent regarding live operations or sponsor deliverables, please flag your message as [URGENT] or reach out via our executive discord channel.

Otherwise, I will review and reply to your note as soon as I wrap up production.

Best regards,
Chase Studios Executive Office`
};

export function getAutoResponderConfig(): AutoResponderConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_AUTORESPONDER, ...JSON.parse(saved) } : DEFAULT_AUTORESPONDER;
  } catch {
    return DEFAULT_AUTORESPONDER;
  }
}

export function saveAutoResponderConfig(config: AutoResponderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function shouldSendAutoReply(senderAddress: string): boolean {
  const config = getAutoResponderConfig();
  if (!config.enabled) return false;
  if (!senderAddress || senderAddress.includes('no-reply') || senderAddress.includes('mailer-daemon')) {
    return false;
  }

  // Check if we already replied to this sender in the last 24 hours to avoid spamming
  try {
    const logRaw = localStorage.getItem(SENT_LOG_KEY);
    const log: Record<string, number> = logRaw ? JSON.parse(logRaw) : {};
    const lastSent = log[senderAddress.toLowerCase()];
    if (lastSent && Date.now() - lastSent < 24 * 60 * 60 * 1000) {
      return false;
    }
  } catch {}

  return true;
}

export function recordAutoReplySent(senderAddress: string): void {
  try {
    const logRaw = localStorage.getItem(SENT_LOG_KEY);
    const log: Record<string, number> = logRaw ? JSON.parse(logRaw) : {};
    log[senderAddress.toLowerCase()] = Date.now();
    localStorage.setItem(SENT_LOG_KEY, JSON.stringify(log));
  } catch {}
}
