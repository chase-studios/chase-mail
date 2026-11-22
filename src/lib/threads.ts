import { Mail } from './types';

export interface MailThread {
  threadKey: string;
  subject: string;
  normalizedSubject: string;
  participantIds: string[];
  messages: Mail[]; // sorted chronologically (oldest to newest)
  latestMessage: Mail;
  unread: boolean;
  starred: boolean;
  count: number;
}

/**
 * Strips reply/forward prefixes to group messages into coherent conversation threads.
 */
export function normalizeSubject(subject: string): string {
  if (!subject) return '(no subject)';
  return subject
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, '')
    .trim()
    .toLowerCase();
}

/**
 * Groups a set of visible messages and matching thread history into conversation threads.
 */
export function groupMessagesIntoThreads(
  visibleMails: Mail[],
  allMails: Mail[],
  currentUserId: string,
  starredIds: Set<string>
): MailThread[] {
  if (!visibleMails || visibleMails.length === 0) return [];

  const threadMap = new Map<string, { visibleSet: Set<string>; allThreadMails: Mail[] }>();

  const getThreadKey = (m: Mail) => {
    const normSubj = normalizeSubject(m.subject || '');
    if (m.is_external) {
      return `ext::${m.external_from || m.sender_id}::${normSubj}`;
    }
    const otherId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id;
    return `${otherId}::${normSubj}`;
  };

  // Register keys from visible messages
  for (const m of visibleMails) {
    const key = getThreadKey(m);
    if (!threadMap.has(key)) {
      threadMap.set(key, { visibleSet: new Set(), allThreadMails: [] });
    }
    threadMap.get(key)!.visibleSet.add(m.id);
  }

  // Gather full conversation history for each thread
  for (const m of allMails) {
    const key = getThreadKey(m);
    if (threadMap.has(key)) {
      threadMap.get(key)!.allThreadMails.push(m);
    }
  }

  const threads: MailThread[] = [];

  for (const [threadKey, { visibleSet, allThreadMails }] of threadMap.entries()) {
    // Deduplicate and sort chronologically (oldest first for thread stack)
    const uniqueMap = new Map<string, Mail>();
    for (const m of allThreadMails) {
      uniqueMap.set(m.id, m);
    }
    const threadMails = Array.from(uniqueMap.values());
    threadMails.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());

    const latestMessage = threadMails[threadMails.length - 1];
    const unread = threadMails.some(m => m.recipient_id === currentUserId && !m.recipient_read_at);
    const starred = threadMails.some(m => starredIds.has(m.id));
    const participantIds = Array.from(new Set(threadMails.flatMap(m => [m.sender_id, m.recipient_id])));

    threads.push({
      threadKey,
      subject: latestMessage.subject || '(No subject)',
      normalizedSubject: normalizeSubject(latestMessage.subject || ''),
      participantIds,
      messages: threadMails,
      latestMessage,
      unread,
      starred,
      count: threadMails.length
    });
  }

  // Sort threads by the latest message's timestamp (newest threads first)
  threads.sort((a, b) => new Date(b.latestMessage.sent_at).getTime() - new Date(a.latestMessage.sent_at).getTime());

  return threads;
}
