import { EmailTemplate } from './types';

export const BUILTIN_TEMPLATES: EmailTemplate[] = [
  {
    id: 'sponsor-ratecard',
    title: '💼 Sponsorship & Brand Pitch',
    category: 'sponsorship',
    subject: 'Partnership Inquiry · Chase Studios Sponsorship',
    body: `Hello [Brand Team],

Thank you for reaching out to Chase Studios ("Every Genre. No Limits.").

We are excited about the prospect of partnering with your brand. Below is an overview of our standard collaboration options:

• Dedicated Video Integration (60-90s mid-roll with custom CTA)
• Live Stream Title Sponsorship & Interactive On-Screen Overlay
• Pinned Community & Description Promotion with Custom Referral Tracking

Please share your target campaign launch window and deliverable requirements so our executive team can provide tailored rate tiers and demographics.

Looking forward to creating something exceptional together.

Best regards,
Executive Partnerships · Chase Studios
"Every Genre. No Limits."`
  },
  {
    id: 'collab-invite',
    title: '🎮 YouTube Creator Collab',
    category: 'collab',
    subject: 'Collaboration Invitation · Chase Studios x [Creator]',
    body: `Hey [Creator Name],

Huge fan of what you're doing on your channel!

We're currently developing a major upcoming project at Chase Studios and would love to feature you as a guest collaborator. The format is high-energy, collaborative, and built to cross-pollinate our audiences.

Let us know your availability over the next couple of weeks for a quick 10-minute discord sync to chat through concepts.

Best,
The Chase Studios Team`
  },
  {
    id: 'fanmail-thanks',
    title: '❤️ Fan Mail & Supporter Response',
    category: 'fanmail',
    subject: 'Thank you for supporting Chase Studios!',
    body: `Hey [Name]!

Thank you so much for taking the time to write to us! Messages like yours mean the world to everyone on the Chase Studios team.

We're working on some of our most ambitious projects yet right now, and having your support in the community is what keeps the momentum going strong.

Stay tuned for upcoming releases!

With gratitude,
Chase Studios Crew
"Every Genre. No Limits."`
  },
  {
    id: 'nda-agreement',
    title: '⚖️ Studio NDA & Release Agreement',
    category: 'legal',
    subject: 'Mutual Production Non-Disclosure Agreement · Chase Studios',
    body: `Hello [Partner / Contractor],

In preparation for our upcoming production milestone, please review the standard Chase Studios Mutual Non-Disclosure and Content Release Agreement.

This agreement protects all preliminary footage, storyboards, voice recordings, and unreleased intellectual property.

Please reply with your written acknowledgment or signed copy so we can provision your production credentials.

Sincerely,
Operations & Legal Administration · Chase Studios`
  },
  {
    id: 'guest-booking',
    title: '🎙️ Live Stream Guest Appearance',
    category: 'collab',
    subject: 'Live Stream Appearance Confirmation · Chase Studios',
    body: `Hi [Guest Name],

We're excited to have you on Chase Studios Live!

Here are the key details for your segment:
• Scheduled Date/Time: [Date & Time]
• Platform: YouTube Live / Twitch
• Tech Check: 15 minutes prior to air time
• Discord Greenroom Link: [Insert Link]

Let us know if you have any questions or specific topics you'd like highlighted during the stream!

Cheers,
Chase Studios Production`
  }
];

const STORAGE_KEY = 'chase-mail-user-templates';

export function getTemplates(): EmailTemplate[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: EmailTemplate[] = JSON.parse(saved);
      return [...BUILTIN_TEMPLATES, ...parsed];
    }
  } catch {}
  return BUILTIN_TEMPLATES;
}

export function saveCustomTemplate(template: EmailTemplate): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const existing: EmailTemplate[] = saved ? JSON.parse(saved) : [];
    const updated = [...existing.filter(t => t.id !== template.id), { ...template, isCustom: true }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function deleteCustomTemplate(templateId: string): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const existing: EmailTemplate[] = JSON.parse(saved);
      const filtered = existing.filter(t => t.id !== templateId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}
}
