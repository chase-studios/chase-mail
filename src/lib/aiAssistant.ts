import { Mail } from './types';

export interface AISummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'collaborative' | 'urgent' | 'informational' | 'inquiry';
}

export interface AISmartReply {
  id: string;
  label: string;
  snippet: string;
  fullBody: string;
  icon: string;
}

/**
 * Intelligent summarizer that generates an executive breakdown of any email thread.
 */
export function generateThreadSummary(messages: Mail[], currentUserId: string): AISummaryResult {
  if (!messages || messages.length === 0) {
    return {
      summary: 'No conversation content available to summarize.',
      keyPoints: [],
      actionItems: [],
      sentiment: 'informational'
    };
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const totalCount = sorted.length;
  const participants = Array.from(new Set(sorted.map(m => m.sender_id)));

  // Extract all non-empty lines
  const allLines = sorted
    .flatMap(m => m.body.split('\n'))
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('>') && !l.startsWith('--'));

  const subject = latest.subject.replace(/^(re:\s*|fwd:\s*)+/i, '').trim();

  // Heuristic sentiment detection
  const fullText = sorted.map(m => m.body).join(' ').toLowerCase();
  let sentiment: 'collaborative' | 'urgent' | 'informational' | 'inquiry' = 'informational';
  if (/asap|urgent|deadline|immediate|critical|error|fail|blocking/i.test(fullText)) {
    sentiment = 'urgent';
  } else if (/can you|could you|what is|how do|when will|\?/i.test(fullText)) {
    sentiment = 'inquiry';
  } else if (/thanks|great|awesome|approved|agree|sounds good|congrats|excited/i.test(fullText)) {
    sentiment = 'collaborative';
  }

  // Key points extraction
  const keyPoints: string[] = [];
  keyPoints.push(`Conversation regarding "${subject}" across ${totalCount} exchange${totalCount > 1 ? 's' : ''}.`);

  const informativeLines = allLines.filter(
    l => l.length > 20 && !/^(hi|hello|hey|thanks|best|cheers)/i.test(l)
  );
  if (informativeLines.length > 0) {
    keyPoints.push(`Primary context: "${informativeLines[0].slice(0, 140)}${informativeLines[0].length > 140 ? '...' : ''}"`);
  }
  if (informativeLines.length > 1 && totalCount > 1) {
    keyPoints.push(`Latest progression: "${informativeLines[informativeLines.length - 1].slice(0, 140)}${informativeLines[informativeLines.length - 1].length > 140 ? '...' : ''}"`);
  }

  // Action items extraction
  const actionItems: string[] = [];
  for (const line of allLines) {
    if (/please|can you|could you|need to|let's|will you|todo|action|review|check/i.test(line)) {
      const clean = line.replace(/^[•\-*0-9.]+\s*/, '').trim();
      if (clean.length > 15 && clean.length < 180 && !actionItems.includes(clean)) {
        actionItems.push(clean);
        if (actionItems.length >= 3) break;
      }
    }
  }

  if (actionItems.length === 0) {
    actionItems.push('No pending action items detected. Informational thread.');
  }

  const summary = `${subject} (${totalCount} message${totalCount > 1 ? 's' : ''}): ${
    informativeLines[0] ? informativeLines[0].slice(0, 180) + '...' : 'Direct correspondence regarding studio operations.'
  }`;

  return {
    summary,
    keyPoints,
    actionItems,
    sentiment
  };
}

/**
 * Generates tailored, 1-click executive replies based on thread context
 */
export function generateSmartReplies(
  messages: Mail[],
  senderName: string = 'team'
): AISmartReply[] {
  const latest = messages[messages.length - 1];
  const subject = latest ? latest.subject.replace(/^(re:\s*|fwd:\s*)+/i, '').trim() : 'this';

  return [
    {
      id: 'approve',
      label: '✦ Executive Approval',
      snippet: 'Approved. Proceed as planned.',
      icon: '✓',
      fullBody: `Hello ${senderName},\n\nI have reviewed the details regarding ${subject}. Everything aligns with Chase Studios standards—approved to proceed immediately.\n\nKeep me updated on milestones.\n\nBest regards,\nExecutive Office · Chase Studios`
    },
    {
      id: 'defer',
      label: '✦ Reviewing & Will Defer',
      snippet: 'Received. Reviewing by EOD.',
      icon: '⏳',
      fullBody: `Hi ${senderName},\n\nThank you for the update on ${subject}. I am actively reviewing the materials and will provide comprehensive feedback shortly.\n\nBest,\nChase Studios`
    },
    {
      id: 'details',
      label: '✦ Request Briefing',
      snippet: 'Please provide more context.',
      icon: '🔍',
      fullBody: `Hi ${senderName},\n\nThanks for sending this over. Before we advance on ${subject}, could you provide a quick breakdown of the timeline, dependencies, and expected outcomes?\n\nLooking forward to the briefing.\n\nBest regards,`
    },
    {
      id: 'confirm',
      label: '✦ Confirm Receipt',
      snippet: 'Confirmed & noted.',
      icon: '✉',
      fullBody: `Hi ${senderName},\n\nReceipt confirmed. Noted and logged in our system.\n\nThanks!`
    }
  ];
}

/**
 * Polish draft text with chosen style
 */
export function polishDraftText(
  originalText: string,
  mode: 'executive' | 'shorten' | 'proofread' | 'urgent'
): string {
  const trimmed = originalText.trim();
  if (!trimmed) return originalText;

  if (mode === 'executive') {
    // Elevate vocabulary and structure
    return (
      `I am writing to address our strategic direction regarding this initiative.\n\n` +
      trimmed
        .split('\n\n')
        .map(p => {
          let enhanced = p.replace(/\bi want to\b/gi, 'I propose that we');
          enhanced = enhanced.replace(/\bcan we\b/gi, 'Let us evaluate if we can');
          enhanced = enhanced.replace(/\bgood\b/gi, 'exceptional');
          enhanced = enhanced.replace(/\bbad\b/gi, 'suboptimal');
          enhanced = enhanced.replace(/\bfix\b/gi, 'resolve');
          return enhanced;
        })
        .join('\n\n') +
      `\n\nYour prompt attention to this matter is greatly valued.\n\nSincerely,\nChase Studios Executive Division`
    );
  }

  if (mode === 'shorten') {
    // Distill to concise bullets
    const sentences = trimmed
      .split(/[.!?]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
    const keyBullets = sentences.slice(0, 3).map(s => `• ${s.replace(/\.$/, '')}.`);
    return `Summary & Action Points:\n\n${keyBullets.join('\n')}\n\nLet me know if you need clarification.`;
  }

  if (mode === 'proofread') {
    // Clean capitalization, spaces, and punctuation
    let cleaned = trimmed
      .replace(/\s+/g, ' ')
      .replace(/([.?!])\s*([a-z])/g, (_m, p1, p2) => `${p1} ${p2.toUpperCase()}`);
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
    return cleaned;
  }

  if (mode === 'urgent') {
    return `[PRIORITY NOTICE]\n\n${trimmed}\n\nThis item is time-sensitive. Please review and respond at your earliest convenience.`;
  }

  return originalText;
}

export type MagicPromptType =
  | 'sponsor_accept'
  | 'creator_collab'
  | 'executive_brief'
  | 'polite_decline'
  | 'patch_announcement'
  | 'milestone_thanks';

export interface MagicDraftTemplate {
  id: MagicPromptType;
  label: string;
  icon: string;
  defaultSubject: string;
  bodyGenerator: (recipientName: string) => string;
}

export const MAGIC_DRAFT_TEMPLATES: MagicDraftTemplate[] = [
  {
    id: 'sponsor_accept',
    label: 'Sponsorship Acceptance & Terms',
    icon: '🤝',
    defaultSubject: 'Partnership Agreement & Deliverables · Chase Studios',
    bodyGenerator: (name) =>
      `Hello ${name || 'Partnership Team'},\n\nThank you for reaching out regarding this partnership opportunity with Chase Studios.\n\nWe have reviewed the campaign brief and are excited to move forward. Our production team has reserved dedicated schedule slots for content integration.\n\nNext Steps:\n1. Please provide the final product tracking link and brand asset guidelines.\n2. We will dispatch the formal invoice and deliverable schedule via our Vanguard portal.\n\nLooking forward to a high-impact campaign together.\n\nBest regards,\nPartnerships Division · Chase Studios\n"Every Genre. No Limits."`
  },
  {
    id: 'creator_collab',
    label: 'Creator Collaboration Pitch',
    icon: '🎮',
    defaultSubject: 'Collaboration Proposal · Chase Studios Video & Stream Project',
    bodyGenerator: (name) =>
      `Hey ${name || 'there'}!\n\nI've been following your recent content and really admire what you've been building. The energy and quality align seamlessly with what we're crafting at Chase Studios.\n\nWe're currently assembling a collaborative special project (scheduled to begin production next week) and would love to feature you alongside our creators.\n\nWould you be open to jumping on a brief Discord sync or exchanging a few ideas here over email?\n\nExcited to potentially build something legendary together.\n\nCheers,\nChase Studios Team`
  },
  {
    id: 'executive_brief',
    label: 'Executive Operations Brief',
    icon: '✦',
    defaultSubject: 'Executive Briefing · Studio Milestones & Operational Updates',
    bodyGenerator: (name) =>
      `Greetings ${name || 'Team'},\n\nPlease review this week's key operational milestones across the Chase Studios network:\n\n• Infrastructure: Mailbox systems and Cloudflare email routing operating at 99.98% reliability.\n• Production: Q4 video renders and sound design pipelines on schedule.\n• Growth: Community member tier activations up across Prime, Royal, and Vanguard divisions.\n\nIf any blocking items require executive escalation, please respond directly to this dispatch.\n\nSincerely,\nExecutive Office · Chase Studios`
  },
  {
    id: 'polite_decline',
    label: 'Polite Deferral / Decline',
    icon: '⏳',
    defaultSubject: 'Regarding Your Inquiry · Chase Studios',
    bodyGenerator: (name) =>
      `Hi ${name || 'there'},\n\nThank you for considering Chase Studios and presenting this proposal. We genuinely appreciate your interest and the time you took to assemble the details.\n\nAt this current juncture, our production roadmap is entirely committed to active milestones, and we are unable to take on additional outside commitments.\n\nWe will gladly keep your contact on file and reach back out should future openings align with your expertise.\n\nWishing you continued success!\n\nBest regards,\nChase Studios`
  },
  {
    id: 'patch_announcement',
    label: 'Release & Patch Announcement',
    icon: '⚡',
    defaultSubject: 'Release Notes · Chase Mail Quantum Update Deployed',
    bodyGenerator: (name) =>
      `Hello ${name || 'Chase Community'},\n\nWe are thrilled to announce that our largest update to date is officially live across the Chase Mail network:\n\nHighlights in this release:\n✓ Studio Task Board (Kanban workflow for actionable emails)\n✓ Real-time Productivity & Storage Pulse Dashboard\n✓ Automated Inbox Rules Engine for creator mail sorting\n✓ Contact Book 2.0 with VIP Directory and vCard export\n✓ Standard RFC 822 .EML export & Print-ready sheets\n✓ 6 High-contrast Obsidian & Vanguard luxury themes\n\nExperience the live updates now at https://mail.chase-studios.org.\n\nChase Studios · "Every Genre. No Limits."`
  },
  {
    id: 'milestone_thanks',
    label: 'Milestone Celebration & Thanks',
    icon: '🎉',
    defaultSubject: 'Huge Milestone Reached — Thank You for Being Part of Chase Studios!',
    bodyGenerator: (name) =>
      `Dear ${name || 'Supporter'},\n\nToday marks a monumental milestone for Chase Studios, and we could not have achieved this without your dedication, support, and feedback.\n\nFrom our humble origins to a full-scale multi-genre entertainment network, every video, stream, code commit, and community message has brought us here.\n\nWe have incredible surprises in store for our community over the coming months. Thank you for believing in the vision!\n\nWith utmost gratitude,\nBill & The Entire Chase Studios Team`
  }
];

/**
 * Suggest catchy, high-engagement subject lines based on body text
 */
export function suggestSubjectLines(bodyText: string): string[] {
  const clean = bodyText.trim().toLowerCase();
  if (!clean || clean.length < 15) {
    return [
      'Important Update from Chase Studios',
      'Follow-up regarding our discussion',
      'Quick sync regarding upcoming milestones'
    ];
  }

  const suggestions: string[] = [];

  if (/sponsor|brand|deliverable|payment|deal/i.test(clean)) {
    suggestions.push('Partnership Proposal & Campaign Deliverables');
    suggestions.push('Confirmed: Chase Studios Sponsorship Terms');
    suggestions.push('Brand Collaboration Next Steps');
  } else if (/collab|video|stream|youtube|twitch/i.test(clean)) {
    suggestions.push('Collaboration Opportunity with Chase Studios');
    suggestions.push('Creator Special Project · Collab Idea');
    suggestions.push('Quick Question regarding your recent content');
  } else if (/urgent|deadline|asap|critical|block/i.test(clean)) {
    suggestions.push('[URGENT] Immediate Review Required');
    suggestions.push('Time-Sensitive Update: Action Required by EOD');
    suggestions.push('Critical Priority Dispatch · Chase Studios');
  } else if (/release|update|patch|new|announce/i.test(clean)) {
    suggestions.push('Major Update: New Features Live in Chase Mail');
    suggestions.push('Exciting News from Chase Studios');
    suggestions.push('Release Notes & Changelog Breakdown');
  } else {
    // Extract first sentence summary
    const firstSentence = bodyText.split(/[.!?\n]/)[0].trim();
    if (firstSentence.length > 5 && firstSentence.length < 60) {
      suggestions.push(firstSentence);
    }
    suggestions.push('Follow-up: Discussion & Next Steps');
    suggestions.push('Important Dispatch from Chase Studios');
  }

  return suggestions.slice(0, 3);
}

/**
 * Automatically tag emails with smart categorization
 */
export function autoCategorizeEmail(subject: string, body: string): string[] {
  const combined = `${subject} ${body}`.toLowerCase();
  const tags: string[] = [];

  if (/urgent|asap|emergency|immediately|deadline|critical|blocker/i.test(combined)) {
    tags.push('Urgent');
  }
  if (/invoice|receipt|payment|billing|stripe|paypal|charge|cost|budget|\$/i.test(combined)) {
    tags.push('Finance');
  }
  if (/youtube|game|gaming|stream|recording|premiere|video|animation|render/i.test(combined)) {
    tags.push('Gaming');
  }
  if (/script|production|episode|chapter|release|creative|art|audio/i.test(combined)) {
    tags.push('Production');
  }
  if (/founder|executive|vip|ceo|board|partner|exclusive/i.test(combined)) {
    tags.push('VIP');
  }

  return tags;
}
