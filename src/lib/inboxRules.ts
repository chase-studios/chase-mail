import { Mail, InboxRule } from './types';

const RULES_STORAGE_PREFIX = 'chase-mail-rules:';

export const DEFAULT_RULES: InboxRule[] = [
  {
    id: 'rule-sponsors',
    name: 'Auto-tag Brand Deals & Sponsorships',
    enabled: true,
    conditionField: 'subject',
    conditionOperator: 'contains',
    conditionValue: 'sponsor',
    actions: {
      applyLabel: 'Sponsorship',
      markStarred: true
    }
  },
  {
    id: 'rule-urgent',
    name: 'Flag Urgent Production Deadlines',
    enabled: true,
    conditionField: 'body',
    conditionOperator: 'contains',
    conditionValue: 'urgent',
    actions: {
      applyLabel: 'Urgent',
      markStarred: true
    }
  },
  {
    id: 'rule-finance',
    name: 'Sort Invoices & Billing Receipts',
    enabled: true,
    conditionField: 'subject',
    conditionOperator: 'contains',
    conditionValue: 'invoice',
    actions: {
      applyLabel: 'Finance'
    }
  },
  {
    id: 'rule-collab',
    name: 'Tag Studio Collaboration Requests',
    enabled: true,
    conditionField: 'subject',
    conditionOperator: 'contains',
    conditionValue: 'collab',
    actions: {
      applyLabel: 'Collab'
    }
  }
];

export function getInboxRules(userId: string): InboxRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading inbox rules:', e);
  }
  return DEFAULT_RULES;
}

export function saveInboxRules(userId: string, rules: InboxRule[]): void {
  try {
    localStorage.setItem(RULES_STORAGE_PREFIX + userId, JSON.stringify(rules));
  } catch (e) {
    console.error('Error saving inbox rules:', e);
  }
}

export function matchesRule(mail: Mail, rule: InboxRule): boolean {
  if (!rule.enabled || !rule.conditionValue.trim()) return false;

  let targetText = '';
  if (rule.conditionField === 'from') {
    targetText = (mail.external_from || mail.sender_id || '').toLowerCase();
  } else if (rule.conditionField === 'subject') {
    targetText = (mail.subject || '').toLowerCase();
  } else if (rule.conditionField === 'body') {
    targetText = (mail.body || '').toLowerCase();
  }

  const needle = rule.conditionValue.trim().toLowerCase();

  if (rule.conditionOperator === 'contains') {
    return targetText.includes(needle);
  } else if (rule.conditionOperator === 'equals') {
    return targetText === needle;
  } else if (rule.conditionOperator === 'starts_with') {
    return targetText.startsWith(needle);
  }

  return false;
}

export interface RuleExecutionResult {
  starredIds: Set<string>;
  archivedIds: Set<string>;
  readIds: Set<string>;
  labelsToAdd: Map<string, Set<string>>; // mailId -> Set of label names
  matchedCount: number;
}

export function executeRules(
  mails: Mail[],
  rules: InboxRule[]
): RuleExecutionResult {
  const activeRules = rules.filter(r => r.enabled);
  const starredIds = new Set<string>();
  const archivedIds = new Set<string>();
  const readIds = new Set<string>();
  const labelsToAdd = new Map<string, Set<string>>();
  let matchedCount = 0;

  for (const mail of mails) {
    let mailMatched = false;
    for (const rule of activeRules) {
      if (matchesRule(mail, rule)) {
        mailMatched = true;
        if (rule.actions.markStarred) starredIds.add(mail.id);
        if (rule.actions.archive) archivedIds.add(mail.id);
        if (rule.actions.markRead) readIds.add(mail.id);
        if (rule.actions.applyLabel) {
          const current = labelsToAdd.get(mail.id) || new Set<string>();
          current.add(rule.actions.applyLabel);
          labelsToAdd.set(mail.id, current);
        }
      }
    }
    if (mailMatched) matchedCount++;
  }

  return {
    starredIds,
    archivedIds,
    readIds,
    labelsToAdd,
    matchedCount
  };
}
