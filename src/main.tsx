import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';
import './style.css';
import Update10 from './Update10';
import { ComposeModal } from './components/ComposeModal';
import { MessageDetail } from './components/MessageDetail';
import { AdminDashboard } from './components/AdminDashboard';
import { AccountSettings } from './components/AccountSettings';
import { GmailIntegration } from './components/GmailIntegration';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SnoozeModal } from './components/SnoozeModal';
import { DriveVault } from './components/DriveVault';
import { LockShieldModal } from './components/LockShieldModal';
import { playMailSound } from './lib/soundFx';
import { Account, Mail, Draft, Contact, ExternalMail, AccountTier, MailLabel, ScheduledMessage } from './lib/types';
import { plannedAddress, getTier, TIERS } from './lib/tiers';
import { validateRegistrationCode } from './lib/accessCodes';
import {
  playChimeSound,
  updateAppBadge,
  showSystemNotification,
  requestNotificationPermission
} from './lib/notifications';
import {
  groupMessagesIntoThreads,
  normalizeSubject,
  MailThread
} from './lib/threads';

const url =
  import.meta.env.VITE_SUPABASE_URL || 'https://rvetucuqburqnrgoatui.supabase.co';
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_lObu0hrc0h8j6AaIw4L2_w_Z8P_Q0nD';
const db = url && key ? createClient(url, key) : null;

export type FolderType =
  | 'inbox'
  | 'starred'
  | 'sent'
  | 'drafts'
  | 'snoozed'
  | 'drive'
  | 'archive'
  | 'spam'
  | 'trash'
  | 'contacts'
  | 'external'
  | 'gmail'
  | 'companions'
  | 'settings'
  | 'admin';

function App() {
  // Appearance & Pet Preferences
  const [pet, setPet] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chase-mail-pet') || 'null');
    } catch {
      return null;
    }
  });

  const [egg, setEgg] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chase-mail-egg') || 'null');
    } catch {
      return null;
    }
  });

  const [accent, setAccent] = useState(() => {
    try {
      return localStorage.getItem('chase-mail-accent') || '#9c4dff';
    } catch {
      return '#9c4dff';
    }
  });

  const [petVisible, setPetVisible] = useState(
    () => localStorage.getItem('chase-mail-pet-visible') !== 'false'
  );

  const [theme, setTheme] = useState<'purple' | 'midnight' | 'light'>(() => {
    try {
      const t = localStorage.getItem('chase-mail-theme');
      return t === 'midnight' || t === 'light' ? t : 'purple';
    } catch {
      return 'purple';
    }
  });

  // Mail, Contacts, and Drafts State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [external, setExternal] = useState<ExternalMail[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [externalOpened, setExternalOpened] = useState<ExternalMail | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [search, setSearch] = useState('');

  // Authentication State
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [notice, setNotice] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mails, setMails] = useState<Mail[]>([]);

  // Persistent Folders State (Starred, Archive, Spam, Trash, Deleted)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-deleted-ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [trashIds, setTrashIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-trash-ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-starred-ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-archived-ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [spamIds, setSpamIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-spam-ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Navigation and Compose Modal State
  const [folder, setFolder] = useState<FolderType>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitialTo, setComposeInitialTo] = useState('');
  const [composeInitialSubject, setComposeInitialSubject] = useState('');
  const [composeInitialBody, setComposeInitialBody] = useState('');
  const [opened, setOpened] = useState<Mail | null>(null);
  const [openedThreadMails, setOpenedThreadMails] = useState<Mail[]>([]);
  const [busy, setBusy] = useState(false);

  // Registration Edition & Access Code State
  const [registerTier, setRegisterTier] = useState<AccountTier>('community');
  const [accessCode, setAccessCode] = useState('');

  // Previous unread count ref for desktop notifications
  const prevUnreadCountRef = useRef<number>(0);

  // In-App Notification Toast State
  const [inAppToast, setInAppToast] = useState<{
    id: string;
    sender: string;
    subject: string;
    preview: string;
    mail: Mail;
  } | null>(null);

  // Unified Inbox Source Filter State ('all' | 'network' | 'external')
  const [inboxSourceFilter, setInboxSourceFilter] = useState<'all' | 'network' | 'external'>('all');

  // Batch Multi-Select State
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Undo Send Engine State
  const [undoSend, setUndoSend] = useState<{
    id: string;
    to: string;
    subject: string;
    body: string;
    secondsLeft: number;
  } | null>(null);
  const undoTimerRef = useRef<any>(null);

  // Command Palette & Keyboard Shortcuts
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [snoozeTargetMail, setSnoozeTargetMail] = useState<Mail | null>(null);

  // Security Privacy PIN Shield
  const [isLocked, setIsLocked] = useState(false);

  // Snoozed Mails Map (mailId -> ISO string until resurface)
  const [snoozedMap, setSnoozedMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-snoozed-map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Scheduled Send Queue
  const [scheduledQueue, setScheduledQueue] = useState<ScheduledMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-scheduled-queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom Labels Map (mailId -> labelNames[])
  const [labelsMap, setLabelsMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('chase-mail-labels-map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const availableLabels: MailLabel[] = [
    { id: 'lbl-prod', name: 'Production', color: '#8648eb' },
    { id: 'lbl-game', name: 'Gaming', color: '#22d3ee' },
    { id: 'lbl-vip', name: 'VIP', color: '#d4af37' },
    { id: 'lbl-urgent', name: 'Urgent', color: '#f43f5e' },
    { id: 'lbl-finance', name: 'Finance', color: '#10b981' }
  ];

  // Compose attachments initial
  const [composeInitialAttachments, setComposeInitialAttachments] = useState<any[]>([]);

  // Notification Permission Request Banner State
  const [showPermissionBanner, setShowPermissionBanner] = useState(() => {
    return (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default' &&
      localStorage.getItem('chase-mail-dismiss-notif-banner') !== 'true'
    );
  });

  // Auto-dismiss in-app notification toast
  useEffect(() => {
    if (inAppToast) {
      const timer = setTimeout(() => {
        setInAppToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [inAppToast]);

  // Persist Appearance State
  useEffect(() => {
    document.documentElement.style.setProperty('--custom-accent', accent);
    try {
      localStorage.setItem('chase-mail-accent', accent);
    } catch {}
  }, [accent]);

  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-egg', JSON.stringify(egg));
    } catch {}
  }, [egg]);

  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-pet', JSON.stringify(pet));
      localStorage.setItem('chase-mail-pet-visible', String(petVisible));
    } catch {}
  }, [pet, petVisible]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('chase-mail-theme', theme);
    } catch {}
  }, [theme]);

  // Gold Executive Trim effect
  useEffect(() => {
    const isGold =
      localStorage.getItem('chase-mail-gold-trim') === 'true' ||
      Boolean(account?.gold_trim) ||
      account?.edition?.toLowerCase() === 'royal';
    if (isGold) {
      document.body.classList.add('gold-trim');
    } else {
      document.body.classList.remove('gold-trim');
    }
  }, [account]);

  // Persist Folder Sets
  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-deleted-ids', JSON.stringify(Array.from(deletedIds)));
    } catch {}
  }, [deletedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-trash-ids', JSON.stringify(Array.from(trashIds)));
    } catch {}
  }, [trashIds]);

  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-starred-ids', JSON.stringify(Array.from(starredIds)));
    } catch {}
  }, [starredIds]);

  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-archived-ids', JSON.stringify(Array.from(archivedIds)));
    } catch {}
  }, [archivedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-spam-ids', JSON.stringify(Array.from(spamIds)));
    } catch {}
  }, [spamIds]);

  // Persist Snooze Map
  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-snoozed-map', JSON.stringify(snoozedMap));
    } catch {}
  }, [snoozedMap]);

  // Persist Scheduled Send Queue
  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-scheduled-queue', JSON.stringify(scheduledQueue));
    } catch {}
  }, [scheduledQueue]);

  // Persist Custom Labels Map
  useEffect(() => {
    try {
      localStorage.setItem('chase-mail-labels-map', JSON.stringify(labelsMap));
    } catch {}
  }, [labelsMap]);

  // Periodic timer for Snoozed resurrection and Scheduled Send dispatch
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // 1. Check snoozed items
      let snoozedChanged = false;
      const nextSnoozed = { ...snoozedMap };
      for (const [mId, untilIso] of Object.entries(nextSnoozed)) {
        if (new Date(untilIso).getTime() <= now) {
          delete nextSnoozed[mId];
          snoozedChanged = true;
          playMailSound('receive');
          setNotice('A snoozed email has returned to your Inbox.');
        }
      }
      if (snoozedChanged) {
        setSnoozedMap(nextSnoozed);
      }

      // 2. Check scheduled send dispatches
      if (scheduledQueue.length > 0 && db && session) {
        const dueMessages = scheduledQueue.filter(sm => new Date(sm.scheduledFor).getTime() <= now);
        if (dueMessages.length > 0) {
          for (const msg of dueMessages) {
            void executeScheduledSend(msg);
          }
          setScheduledQueue(prev => prev.filter(sm => new Date(sm.scheduledFor).getTime() > now));
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [snoozedMap, scheduledQueue, db, session]);

  // Supabase Auth Listener
  useEffect(() => {
    if (!db) return;
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription }
    } = db.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Retrieve user signature from Update 10 personal storage
  function getUserSignature(userId: string): string {
    try {
      const raw = localStorage.getItem('chase-mail-v10:' + userId);
      if (raw) {
        const parsed = JSON.parse(raw);
        return typeof parsed.signature === 'string' ? parsed.signature.trim() : '';
      }
    } catch {}
    return '';
  }

  // Refresh user data from Supabase
  async function refresh(userId: string) {
    if (!db) return;
    try {
      const [accRes, allAccsRes, msgsRes, draftsRes, ctRes, exRes] = await Promise.all([
        db.from('mail_accounts').select('*').eq('user_id', userId).maybeSingle(),
        db.from('mail_accounts').select('*'),
        db
          .from('mail_messages')
          .select('*')
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('sent_at', { ascending: false }),
        db.from('mail_drafts').select('*').eq('owner_id', userId).order('updated_at', { ascending: false }),
        db.from('mail_contacts').select('*').eq('owner_id', userId).order('name'),
        db
          .from('mail_external_messages')
          .select('*')
          .eq('owner_id', userId)
          .order('received_at', { ascending: false })
          .limit(100)
      ]);

      if (accRes.error || allAccsRes.error || msgsRes.error) {
        setNotice(accRes.error?.message || allAccsRes.error?.message || msgsRes.error?.message || '');
      }

      setAccount(accRes.data);
      setAccounts(allAccsRes.data || []);
      setMails(msgsRes.data || []);
      setDrafts(draftsRes.data || []);
      setContacts(ctRes.data || []);
      setExternal(exRes.data || []);

      if (ctRes.error || exRes.error) {
        setNotice(ctRes.error?.message || exRes.error?.message || '');
      }

      // Check for incoming desktop notification
      const unreadInboxMsgs = (msgsRes.data || []).filter(
        m =>
          m.recipient_id === userId &&
          !m.recipient_read_at &&
          !deletedIds.has(m.id) &&
          !trashIds.has(m.id) &&
          !spamIds.has(m.id)
      );
      // Synchronize PWA Home Screen / Taskbar App Badge with unread inbox count
      updateAppBadge(unreadInboxMsgs.length);

      if (unreadInboxMsgs.length > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
        const latest = unreadInboxMsgs[0];
        if (latest) {
          const senderObj = (allAccsRes.data || []).find(a => a.user_id === latest.sender_id);
          const senderName = senderObj ? senderObj.display_name || senderObj.handle : 'Chase Mail user';

          // Play synthesized luxury audio chime
          playChimeSound();

          // Dispatch native desktop/mobile push notification
          void showSystemNotification(`Chase Mail: ${latest.subject}`, {
            body: `${senderName}: ${latest.body.slice(0, 100)}`,
            tag: `chase-mail-${latest.id}`,
            onClick: () => {
              setFolder('inbox');
              setOpened(latest);
            }
          });

          // Trigger in-app animated toast alert
          setInAppToast({
            id: latest.id,
            sender: senderName,
            subject: latest.subject,
            preview: latest.body.slice(0, 80),
            mail: latest
          });
        }
      }
      prevUnreadCountRef.current = unreadInboxMsgs.length;
    } catch (err: any) {
      console.error('Refresh error', err);
    }
  }

  useEffect(() => {
    if (session?.user.id) {
      void refresh(session.user.id);
    } else {
      setAccount(null);
      setMails([]);
    }
  }, [session?.user.id]);

  // Periodic polling when tab is active
  useEffect(() => {
    if (!session?.user.id || !db) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh(session.user.id);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [session?.user.id]);

  // Authentication Handlers
  async function auth() {
    if (!db) return;
    setBusy(true);
    setNotice('');

    let loginEmail = email.trim();
    // Allow logging in with plain username, defaulting to @chasemail.com
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail.toLowerCase()}@chasemail.com`;
    }

    const r =
      mode === 'login'
        ? await db.auth.signInWithPassword({ email: loginEmail, password })
        : await db.auth.signUp({ email: loginEmail, password });
    setBusy(false);
    setNotice(
      r.error?.message ||
        (mode === 'signup'
          ? 'Account created! Please set up your inbox address below.'
          : 'Signed in.')
    );
  }

  async function resetPassword() {
    if (!db || !email.trim()) return;
    setBusy(true);
    let resetEmail = email.trim();
    if (!resetEmail.includes('@')) {
      resetEmail = `${resetEmail.toLowerCase()}@chasemail.com`;
    }
    const { error } = await db.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin
    });
    setBusy(false);
    setNotice(
      error?.message || 'If that address is registered, a password-reset email will be sent.'
    );
  }

  async function register() {
    if (!db) return;
    setBusy(true);

    let effectiveTier = registerTier;
    const tierDef = getTier(registerTier);
    if (tierDef.isProtected || accessCode.trim()) {
      const codeValidation = validateRegistrationCode(accessCode, registerTier);
      if (!codeValidation.valid) {
        setBusy(false);
        setNotice(codeValidation.error || 'Invalid registration access code for this edition.');
        return;
      }
      if (codeValidation.matchedTier) {
        effectiveTier = codeValidation.matchedTier;
      }
    }

    // Standard 2-param RPC is the primary deployed procedure
    let rpcRes = await db.rpc('register_chase_mail_account', {
      p_handle: handle.trim(),
      p_display_name: name.trim()
    });

    let finalError = rpcRes.error;

    // If standard RPC fails with parameter mismatch or schema cache error, try 4-param RPC
    if (finalError && (finalError.message?.includes('schema cache') || finalError.message?.includes('parameter'))) {
      const fourParamRes = await db.rpc('register_chase_mail_account', {
        p_handle: handle.trim(),
        p_display_name: name.trim(),
        p_edition: effectiveTier,
        p_access_code: accessCode.trim()
      });
      finalError = fourParamRes.error;
    }

    // Direct table fallback if RPC is completely unavailable
    if (finalError && session && (finalError.message?.includes('schema cache') || finalError.message?.includes('function'))) {
      const { error: insertErr } = await db.from('mail_accounts').insert({
        user_id: session.user.id,
        handle: handle.trim().toLowerCase(),
        display_name: name.trim(),
        edition: effectiveTier,
        gold_trim: effectiveTier === 'royal' || effectiveTier === 'studio',
        is_admin: effectiveTier === 'studio'
      });
      if (!insertErr) {
        finalError = null;
      }
    } else if (!finalError && session) {
      // Ensure edition and gold trim are saved on the new account
      try {
        await db.from('mail_accounts').update({
          edition: effectiveTier,
          gold_trim: effectiveTier === 'royal' || effectiveTier === 'studio'
        }).eq('user_id', session.user.id);
      } catch {}
    }

    setBusy(false);
    setNotice(finalError?.message || `Chase Mail ${getTier(effectiveTier).displayName} inbox created.`);
    if (!finalError && session) {
      await refresh(session.user.id);
    }
  }

  // Compose Message Preparation with Signature Auto-Insertion
  function handleOpenNewCompose() {
    setSelectedDraftId(null);
    setComposeInitialTo('');
    setComposeInitialSubject('');

    let initialBody = '';
    if (session) {
      const sig = getUserSignature(session.user.id);
      if (sig) {
        initialBody = `\n\n--\n${sig}`;
      }
    }
    setComposeInitialBody(initialBody);
    setComposeOpen(true);
  }

  // Contact Handlers
  async function addContact() {
    if (!db || !session || !contactName.trim() || !contactEmail.trim()) return;
    setBusy(true);
    const { error } = await db.from('mail_contacts').insert({
      owner_id: session.user.id,
      name: contactName.trim(),
      email: contactEmail.trim().toLowerCase()
    });
    setBusy(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setContactName('');
    setContactEmail('');
    await refresh(session.user.id);
  }

  async function removeContact(id: string) {
    if (!db || !session) return;
    const { error } = await db.from('mail_contacts').delete().eq('id', id);
    if (error) {
      setNotice(error.message);
      return;
    }
    await refresh(session.user.id);
  }

  function openExternal(m: ExternalMail) {
    setExternalOpened(m);
  }

  // Open & Mark as Read (supports individual mail and stacked conversation threads)
  async function openThread(thread: MailThread) {
    setOpened(thread.latestMessage);
    setOpenedThreadMails(thread.messages);

    // Mark any unread messages in the thread as read
    if (db && session) {
      const unreadInThread = thread.messages.filter(
        m => m.recipient_id === session.user.id && !m.recipient_read_at
      );
      if (unreadInThread.length > 0) {
        const internalIds = unreadInThread.filter(m => !m.is_external).map(m => m.id);
        const externalIds = unreadInThread
          .filter(m => m.is_external)
          .map(m => m.id.replace('ext-', ''));

        if (internalIds.length > 0) {
          await db
            .from('mail_messages')
            .update({ recipient_read_at: new Date().toISOString() })
            .in('id', internalIds);
        }
        if (externalIds.length > 0) {
          await db
            .from('mail_external_messages')
            .update({ is_read: true })
            .in('id', externalIds);
        }
        await refresh(session.user.id);
      }
    }
  }

  function openMailFromAnywhere(m: Mail) {
    const existingThread = visibleThreads.find(t => t.messages.some(x => x.id === m.id));
    if (existingThread) {
      void openThread(existingThread);
    } else {
      void openThread({
        threadKey: m.id,
        subject: m.subject || '(No subject)',
        normalizedSubject: normalizeSubject(m.subject || ''),
        messages: [m],
        latestMessage: m,
        unread: false,
        starred: starredIds.has(m.id),
        count: 1,
        participantIds: [m.sender_id, m.recipient_id]
      });
    }
  }

  // Quick Inline Reply from Thread View
  async function handleQuickSend(toUserId: string, subject: string, body: string): Promise<boolean> {
    if (!db || !session) return false;
    try {
      const { data: newMsg, error } = await db.from('mail_messages').insert({
        sender_id: session.user.id,
        recipient_id: toUserId,
        subject,
        body,
        sent_at: new Date().toISOString()
      }).select().single();

      if (error) {
        setNotice(`Failed to send reply: ${error.message}`);
        return false;
      }

      setNotice('Reply dispatched.');
      playChimeSound();
      await refresh(session.user.id);
      if (newMsg) {
        setOpenedThreadMails(prev => [...prev, newMsg]);
        triggerUndoSend({
          id: newMsg.id,
          to: who(toUserId),
          subject: newMsg.subject || subject,
          body: body
        });
      }
      return true;
    } catch (err: any) {
      setNotice(`Send error: ${err.message}`);
      return false;
    }
  }

  // Reply
  function handleReply(original: Mail) {
    const senderAcc = accounts.find(a => a.user_id === original.sender_id);
    const replyHandle = senderAcc?.handle || '';
    const cleanSubject = original.subject.startsWith('Re:')
      ? original.subject
      : `Re: ${original.subject}`;

    const dateStr = new Date(original.sent_at).toLocaleString();
    const senderName = who(original.sender_id);
    const quotedBody = original.body
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');

    let replyBody = `\n\n--- On ${dateStr}, ${senderName} wrote: ---\n${quotedBody}`;
    if (session) {
      const sig = getUserSignature(session.user.id);
      if (sig) {
        replyBody = `\n\n--\n${sig}${replyBody}`;
      }
    }

    setComposeInitialTo(replyHandle);
    setComposeInitialSubject(cleanSubject);
    setComposeInitialBody(replyBody);
    setSelectedDraftId(null);
    setComposeOpen(true);
    setOpened(null);
  }

  // Reply All
  function handleReplyAll(original: Mail) {
    handleReply(original);
  }

  // Message Forwarding
  function handleForward(original: Mail) {
    const cleanSubject = original.subject.startsWith('Fwd:')
      ? original.subject
      : `Fwd: ${original.subject}`;

    const dateStr = new Date(original.sent_at).toLocaleString();
    const fwdHeader = `\n\n---------- Forwarded message ---------\nFrom: ${who(
      original.sender_id
    )}\nDate: ${dateStr}\nSubject: ${original.subject}\nTo: ${who(original.recipient_id)}\n\n`;

    let fwdBody = fwdHeader + original.body;
    if (session) {
      const sig = getUserSignature(session.user.id);
      if (sig) {
        fwdBody = `\n\n--\n${sig}${fwdBody}`;
      }
    }

    setComposeInitialTo('');
    setComposeInitialSubject(cleanSubject);
    setComposeInitialBody(fwdBody);
    setSelectedDraftId(null);
    setComposeOpen(true);
    setOpened(null);
  }

  // Toggle Star
  function handleToggleStar(mailId: string) {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(mailId)) {
        next.delete(mailId);
        setNotice('Message unstarred.');
      } else {
        next.add(mailId);
        setNotice('Message starred.');
      }
      return next;
    });
  }

  // Toggle Archive
  function handleToggleArchive(mailId: string) {
    setArchivedIds(prev => {
      const next = new Set(prev);
      if (next.has(mailId)) {
        next.delete(mailId);
        setNotice('Message moved to Inbox.');
      } else {
        next.add(mailId);
        setNotice('Message archived.');
      }
      return next;
    });
    setOpened(null);
  }

  // Toggle Spam
  function handleToggleSpam(mailId: string) {
    setSpamIds(prev => {
      const next = new Set(prev);
      if (next.has(mailId)) {
        next.delete(mailId);
        setNotice('Message marked as Not Spam.');
      } else {
        next.add(mailId);
        setNotice('Message reported as Spam.');
      }
      return next;
    });
    setOpened(null);
  }

  // Convert external messages into unified Mail objects for seamless inbox integration
  const externalMails = useMemo<Mail[]>(() => {
    if (!session?.user?.id) return [];
    return external.map(ext => ({
      id: `ext-${ext.id}`,
      sender_id: 'external-sender',
      recipient_id: session.user.id,
      subject: ext.subject || '(No subject)',
      body: ext.body_text || ext.body_html || '',
      sent_at: ext.received_at,
      recipient_read_at: ext.read_at || (ext.is_read ? ext.received_at : null),
      is_external: true,
      external_from: ext.from_email || ext.from_address || 'external',
      external_to: ext.to_email || ext.to_address || ''
    }));
  }, [external, session?.user?.id]);

  const allMails = useMemo<Mail[]>(() => {
    return [...mails, ...externalMails];
  }, [mails, externalMails]);

  // Undo Send Action Engine
  function triggerUndoSend(details: { id: string; to: string; subject: string; body: string }) {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    setUndoSend({ ...details, secondsLeft: 5 });

    let count = 5;
    undoTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(undoTimerRef.current);
        setUndoSend(null);
      } else {
        setUndoSend(prev => (prev ? { ...prev, secondsLeft: count } : null));
      }
    }, 1000);
  }

  async function handleExecuteUndo() {
    if (!undoSend || !db || !session) return;
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);

    const { id, to, subject, body } = undoSend;
    setUndoSend(null);
    setBusy(true);

    try {
      await db.from('mail_messages').delete().eq('id', id).eq('sender_id', session.user.id);
      await refresh(session.user.id);

      setComposeInitialTo(to);
      setComposeInitialSubject(subject);
      setComposeInitialBody(body);
      setComposeOpen(true);
      setNotice('Sending undone. Message reverted to draft editor.');
    } catch (err: any) {
      setNotice(`Could not undo send: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  // Batch Multi-Select Handlers
  function handleToggleSelectThread(threadMails: Mail[], e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      const allSelected = threadMails.length > 0 && threadMails.every(m => next.has(m.id));
      if (allSelected) {
        threadMails.forEach(m => next.delete(m.id));
      } else {
        threadMails.forEach(m => next.add(m.id));
      }
      return next;
    });
  }

  function handleToggleSelectAll() {
    setSelectedMessageIds(prev => {
      const visibleIds = visible.map(m => m.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => prev.has(id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(visibleIds);
      }
    });
  }

  async function handleBulkMarkRead(markAsRead: boolean) {
    if (!session || selectedMessageIds.size === 0) return;
    const targetIds = Array.from(selectedMessageIds);
    setNotice(`Marking ${targetIds.length} message(s) as ${markAsRead ? 'read' : 'unread'}...`);

    if (db) {
      const internalIds = targetIds.filter(id => !id.startsWith('ext-'));
      const externalIds = targetIds.filter(id => id.startsWith('ext-')).map(id => id.replace('ext-', ''));

      if (internalIds.length > 0) {
        await db
          .from('mail_messages')
          .update({ recipient_read_at: markAsRead ? new Date().toISOString() : null })
          .in('id', internalIds)
          .eq('recipient_id', session.user.id);
      }
      if (externalIds.length > 0) {
        await db
          .from('mail_external_messages')
          .update({ is_read: markAsRead })
          .in('id', externalIds)
          .eq('owner_id', session.user.id);
      }
      await refresh(session.user.id);
    }
    setSelectedMessageIds(new Set());
    setNotice(`Updated ${targetIds.length} message(s).`);
  }

  function handleBulkStar() {
    if (selectedMessageIds.size === 0) return;
    const targetIds = Array.from(selectedMessageIds);
    setStarredIds(prev => {
      const next = new Set(prev);
      const anyUnstarred = targetIds.some(id => !next.has(id));
      targetIds.forEach(id => {
        if (anyUnstarred) next.add(id);
        else next.delete(id);
      });
      return next;
    });
    setNotice(`${targetIds.length} message(s) updated.`);
    setSelectedMessageIds(new Set());
  }

  function handleBulkArchive() {
    if (selectedMessageIds.size === 0) return;
    const targetIds = Array.from(selectedMessageIds);
    setArchivedIds(prev => {
      const next = new Set(prev);
      const anyUnarchived = targetIds.some(id => !next.has(id));
      targetIds.forEach(id => {
        if (anyUnarchived) next.add(id);
        else next.delete(id);
      });
      return next;
    });
    setNotice(`${targetIds.length} message(s) archived.`);
    setSelectedMessageIds(new Set());
  }

  async function handleBulkDelete() {
    if (selectedMessageIds.size === 0) return;
    const targetIds = Array.from(selectedMessageIds);
    if (folder === 'trash') {
      setDeletedIds(prev => new Set([...prev, ...targetIds]));
      setTrashIds(prev => {
        const next = new Set(prev);
        targetIds.forEach(id => next.delete(id));
        return next;
      });
      setNotice(`Permanently deleted ${targetIds.length} message(s).`);
    } else {
      setTrashIds(prev => new Set([...prev, ...targetIds]));
      setNotice(`Moved ${targetIds.length} message(s) to Trash.`);
    }
    setSelectedMessageIds(new Set());
  }

  // Delete / Move to Trash
  async function handleDeleteMail(messageId: string) {
    if (!session) return;

    if (folder === 'trash' || trashIds.has(messageId)) {
      // Permanent deletion
      setDeletedIds(prev => new Set([...prev, messageId]));
      setTrashIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      setNotice('Message permanently deleted.');
    } else {
      // Move to trash
      setTrashIds(prev => new Set([...prev, messageId]));
      setNotice('Message moved to Trash.');
    }

    setOpened(null);

    // Call Supabase soft-delete RPC if available
    if (db) {
      try {
        if (messageId.startsWith('ext-')) {
          const rawExtId = messageId.replace('ext-', '');
          if (folder === 'trash' || trashIds.has(messageId)) {
            await db.from('mail_external_messages').delete().eq('id', rawExtId);
          }
        } else {
          await db.rpc('delete_chase_mail_message', {
            p_message_id: messageId,
            p_folder: folder === 'sent' ? 'sent' : 'inbox'
          });
        }
      } catch {}
    }
  }

  // Global Superhuman Keyboard Navigation Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }

      // Ignore if user is typing in an input, modal, or screen lock
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        composeOpen ||
        isLocked
      ) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      } else if (e.key === 'c') {
        e.preventDefault();
        handleOpenNewCompose();
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-and-select-bar input[type="search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      } else if (e.key === 'Escape') {
        if (opened) setOpened(null);
        if (shortcutsModalOpen) setShortcutsModalOpen(false);
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (snoozeTargetMail) setSnoozeTargetMail(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composeOpen, isLocked, opened, shortcutsModalOpen, commandPaletteOpen, snoozeTargetMail]);

  // Snooze Actions
  function handleSnoozeMail(mail: Mail, untilIso: string) {
    setSnoozedMap(prev => ({
      ...prev,
      [mail.id]: untilIso
    }));
    playMailSound('snooze');
    setNotice(`Conversation snoozed until ${new Date(untilIso).toLocaleString()}.`);
    setOpened(null);
    setSnoozeTargetMail(null);
  }

  function handleUnsnooze(mailId: string) {
    setSnoozedMap(prev => {
      const next = { ...prev };
      delete next[mailId];
      return next;
    });
    setNotice('Message returned to Inbox.');
  }

  // Label Actions
  function handleToggleLabel(mailId: string, labelName: string) {
    setLabelsMap(prev => {
      const current = prev[mailId] || [];
      const nextLabels = current.includes(labelName)
        ? current.filter(l => l !== labelName)
        : [...current, labelName];
      return {
        ...prev,
        [mailId]: nextLabels
      };
    });
  }

  // Scheduled Send Action
  function handleScheduleSend(details: { to: string; subject: string; body: string; scheduledFor: string }) {
    const newScheduled: ScheduledMessage = {
      id: 'sched-' + Date.now(),
      to: details.to,
      subject: details.subject,
      body: details.body,
      scheduledFor: details.scheduledFor,
      createdAt: new Date().toISOString()
    };
    setScheduledQueue(prev => [...prev, newScheduled]);
    setNotice(`Message scheduled to send at ${new Date(details.scheduledFor).toLocaleString()}.`);
  }

  async function executeScheduledSend(item: ScheduledMessage) {
    if (!db || !session) return;
    try {
      const cleanHandle = item.to.split('@')[0].toLowerCase();
      const internalAcc = accounts.find(
        a =>
          a.handle.toLowerCase() === item.to.toLowerCase() ||
          a.handle.toLowerCase() === cleanHandle
      );
      if (internalAcc) {
        await db.from('mail_messages').insert({
          sender_id: session.user.id,
          recipient_id: internalAcc.user_id,
          subject: item.subject,
          body: item.body,
          sent_at: new Date().toISOString()
        });
        playMailSound('send');
        setNotice(`Scheduled message to ${item.to} was dispatched successfully!`);
        await refresh(session.user.id);
      }
    } catch {}
  }

  // Empty Trash
  function handleEmptyTrash() {
    setDeletedIds(prev => new Set([...prev, ...trashIds]));
    setTrashIds(new Set());
    setNotice('Trash emptied.');
  }

  // Message Filtering Logic Across Folders (Unified Inbox + Snooze + Labels)
  const visible = allMails.filter(m => {
    // Exclude permanently deleted messages
    if (deletedIds.has(m.id)) return false;

    if (folder === 'inbox') {
      if (m.recipient_id !== session?.user.id) return false;
      if (m.recipient_deleted_at) return false;
      if (trashIds.has(m.id) || archivedIds.has(m.id) || spamIds.has(m.id)) return false;

      // Hide snoozed messages while timer is active
      if (snoozedMap[m.id] && new Date(snoozedMap[m.id]).getTime() > Date.now()) return false;

      // In-App Unified Inbox Source Filter
      if (inboxSourceFilter === 'network' && m.is_external) return false;
      if (inboxSourceFilter === 'external' && !m.is_external) return false;
    } else if (folder === 'snoozed') {
      if (!snoozedMap[m.id] || new Date(snoozedMap[m.id]).getTime() <= Date.now()) return false;
      if (trashIds.has(m.id) || deletedIds.has(m.id)) return false;
    } else if (folder === 'starred') {
      if (!starredIds.has(m.id)) return false;
      if (trashIds.has(m.id)) return false;
    } else if (folder === 'sent') {
      if (m.is_external) return false;
      if (m.sender_id !== session?.user.id) return false;
      if (m.sender_deleted_at) return false;
      if (trashIds.has(m.id)) return false;
    } else if (folder === 'archive') {
      if (!archivedIds.has(m.id)) return false;
      if (trashIds.has(m.id)) return false;
    } else if (folder === 'spam') {
      if (!spamIds.has(m.id)) return false;
      if (trashIds.has(m.id)) return false;
    } else if (folder === 'trash') {
      if (!trashIds.has(m.id)) return false;
    }

    if (!search.trim()) return true;

    const targetAccount = accounts.find(
      a => a.user_id === (folder === 'sent' ? m.recipient_id : m.sender_id)
    );
    const searchString = search.trim().toLowerCase();

    // Custom label search e.g. #production or #gaming
    if (searchString.startsWith('#')) {
      const targetLabel = searchString.slice(1);
      const mLabels = labelsMap[m.id] || [];
      return mLabels.some(l => l.toLowerCase() === targetLabel);
    }

    const mailLabels = (labelsMap[m.id] || []).join(' ');

    return [
      m.subject,
      m.body,
      m.external_from || '',
      m.external_to || '',
      mailLabels,
      targetAccount?.handle || '',
      targetAccount?.display_name || ''
    ].some(v => v.toLowerCase().includes(searchString));
  });

  // Group visible messages into stacked conversation threads
  const visibleThreads = useMemo(() => {
    if (!session?.user?.id) return [];
    return groupMessagesIntoThreads(visible, allMails, session.user.id, starredIds);
  }, [visible, allMails, session?.user?.id, starredIds]);

  const who = (id: string) => {
    const a = accounts.find(x => x.user_id === id);
    return a ? `${a.display_name || a.handle} (@${a.handle})` : 'Chase Mail user';
  };

  const isPrivilegedTier =
    account &&
    (Boolean(account.is_admin) ||
      account.admin_role === 'super_admin' ||
      account.admin_role === 'executive' ||
      account.admin_role === 'admin' ||
      account.edition.toLowerCase() === 'studio' ||
      account.edition.toLowerCase() === 'royal' ||
      account.edition.toLowerCase() === 'vanguard');

  return (
    <div className="shell">
      <header>
        <div className="brand">
          <img src="/chase-studios-logo.svg" alt="Chase Studios" className="brand-logo-img" />
          <span>
            CHASE <b>MAIL</b>
          </span>
        </div>
        <span className="tag">EVERY GENRE. NO LIMITS.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {session && (
            <button
              type="button"
              className="command-palette-trigger"
              onClick={() => setCommandPaletteOpen(true)}
              title="Open Command Palette (Ctrl+K / Cmd+K)"
            >
              <span>🔍 Search & Commands</span>
              <kbd>Ctrl K</kbd>
            </button>
          )}

          <label className="theme-picker">
            Theme{' '}
            <select
              aria-label="Color theme"
              value={theme}
              onChange={e => setTheme(e.target.value as any)}
            >
              <option value="purple">🌌 Obsidian Royale</option>
              <option value="royal-gold">👑 Royal Gold Sovereign</option>
              <option value="cyber-vanguard">🛡 Cyber Vanguard</option>
              <option value="oled">🖤 OLED Pure Pitch</option>
              <option value="light">☀️ Studio Horizon</option>
            </select>
          </label>

          {session && (
            <>
              <button
                type="button"
                className="header-icon-btn"
                onClick={() => setShortcutsModalOpen(true)}
                title="Superhuman Keyboard Shortcuts (?)"
              >
                ⌨
              </button>

              <button
                type="button"
                className="header-icon-btn"
                onClick={() => setIsLocked(true)}
                title="Lock Privacy Shield"
              >
                🔒
              </button>

              <button
                type="button"
                className="mini-btn"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (db) void db.auth.signOut();
                }}
                title="Sign out of current account"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </header>

      {account && showPermissionBanner && (
        <div className="notification-prompt-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔔</span>
            <span>Enable notifications to get instant alerts on your phone or desktop when new Chase Mail arrives.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="enable-btn"
              onClick={async () => {
                const res = await requestNotificationPermission();
                setShowPermissionBanner(false);
                if (res === 'granted') {
                  void showSystemNotification('Chase Mail Notifications Enabled', {
                    body: 'You will receive real-time alerts when new emails arrive.'
                  });
                  playChimeSound();
                }
              }}
            >
              Enable Notifications 🔔
            </button>
            <button
              type="button"
              className="dismiss-btn"
              onClick={() => {
                setShowPermissionBanner(false);
                localStorage.setItem('chase-mail-dismiss-notif-banner', 'true');
              }}
              title="Dismiss notification prompt"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {!db ? (
        <main className="panel">
          <h2>Configuration needed</h2>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> and start the app.
          </p>
        </main>
      ) : !session ? (
        <div className="auth-container">
          <div className="hero">
            <div className="symbol">
              <img src="/chase-studios-logo.svg" alt="Chase Studios" className="hero-logo-img" />
            </div>
            <div className="eyebrow">A CHASE STUDIOS EXPERIENCE</div>
            <h1>
              Your inbox. <span className="gradient-text">Your universe.</span>
            </h1>
            <p>More than messages. Your creative universe, connected.</p>
          </div>

          <main className="panel auth">
            {/* Prominent Auth Mode Switcher */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '18px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background:
                    mode === 'login' && !resetMode
                      ? 'linear-gradient(135deg, var(--accent), #7928ca)'
                      : 'transparent',
                  color: mode === 'login' && !resetMode ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => {
                  setMode('login');
                  setResetMode(false);
                  setNotice('');
                }}
              >
                🔐 Sign In
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background:
                    mode === 'signup' && !resetMode
                      ? 'linear-gradient(135deg, var(--accent), #7928ca)'
                      : 'transparent',
                  color: mode === 'signup' && !resetMode ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => {
                  setMode('signup');
                  setResetMode(false);
                  setNotice('');
                }}
              >
                ✨ Create Account
              </button>
            </div>

            <h1>
              {resetMode
                ? 'Reset your password'
                : mode === 'login'
                ? 'Sign In to Chase Mail'
                : 'Create your account'}
            </h1>
            <p>
              {resetMode
                ? 'Enter your email or Chase Mail address to receive a recovery link.'
                : mode === 'login'
                ? 'Log in with your Chase Mail address, username, or existing email.'
                : 'Sign up to claim your address and join the Chase Studios universe.'}
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                void (resetMode ? resetPassword() : auth());
              }}
            >
              <label>
                {mode === 'login' ? 'Email or Username' : 'Email Address'}
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={
                    mode === 'login'
                      ? 'name@chasemail.com or username'
                      : 'you@chasemail.com or personal email'
                  }
                />
              </label>
              {!resetMode && (
                <label>
                  Password
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </label>
              )}
              <button disabled={busy} style={{ marginTop: '6px' }}>
                {busy
                  ? 'Please wait...'
                  : resetMode
                  ? 'Send reset link'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  fontSize: '0.85rem'
                }}
              >
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setResetMode(!resetMode);
                    setNotice('');
                  }}
                >
                  {resetMode ? '← Back to sign in' : 'Forgot password?'}
                </button>
                {!resetMode && (
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setMode(mode === 'login' ? 'signup' : 'login');
                      setNotice('');
                    }}
                  >
                    {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                  </button>
                )}
              </div>
            </form>
          </main>
        </div>
      ) : !account ? (
        <main className="panel auth" style={{ maxWidth: '540px' }}>
          <h1>Set up your Chase Mail address</h1>
          <p>Choose your username and edition for the Chase Studios universe.</p>
          <form
            onSubmit={e => {
              e.preventDefault();
              void register();
            }}
          >
            <label>
              Username
              <input
                required
                maxLength={32}
                value={handle}
                onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="yourname"
              />
            </label>
            <label>
              Display name
              <input
                required
                maxLength={80}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your Name"
              />
            </label>

            <div style={{ margin: '14px 0 8px 0' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Select Account Edition</label>
              <div className="registration-tier-cards">
                {Object.values(TIERS).map(t => {
                  const isSelected = registerTier === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`registration-tier-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setRegisterTier(t.id)}
                      style={{
                        position: 'relative',
                        border: isSelected ? '2px solid #d4af37' : '1px solid #4a3361',
                        background: isSelected ? '#2b183f' : '#191024'
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-7px',
                            right: '6px',
                            background: '#d4af37',
                            color: '#07050d',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '1px 6px',
                            borderRadius: '8px',
                            letterSpacing: '0.04em'
                          }}
                        >
                          ✓ SELECTED
                        </div>
                      )}
                      <div className="tier-card-header">
                        <span className={`edition-badge ${t.id}`}>{t.displayName}</span>
                        {t.isProtected && <span style={{ fontSize: '0.72rem', color: '#ffd700' }}>🔒 Code</span>}
                      </div>
                      <div className="tier-card-desc">{t.description}</div>
                      <div className="tier-card-domain">{plannedAddress(handle || 'yourname', t.id)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {getTier(registerTier).isProtected && (
              <label style={{ marginTop: '12px', display: 'block' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Registration Access Code</span>
                  <span style={{ fontSize: '0.75rem', color: '#ba8cff' }}>Required for {getTier(registerTier).displayName}</span>
                </span>
                <input
                  required
                  value={accessCode}
                  onChange={e => {
                    const val = e.target.value.trim();
                    setAccessCode(val);
                    // Seamlessly auto-switch selected tier if user enters code for another tier
                    const clean = val.toUpperCase();
                    if (clean === 'ROYAL-CHASE-2026' && registerTier !== 'royal') {
                      setRegisterTier('royal');
                    } else if (clean === 'VANGUARD-CHASE-2026' && registerTier !== 'vanguard') {
                      setRegisterTier('vanguard');
                    } else if (clean === 'PRIME-CHASE-2026' && registerTier !== 'prime') {
                      setRegisterTier('prime');
                    } else if (clean === 'STUDIO-EXEC-2026' && registerTier !== 'studio') {
                      setRegisterTier('studio');
                    }
                  }}
                  placeholder={`Enter ${getTier(registerTier).displayName} registration code`}
                  style={{ border: '1px solid rgba(212, 175, 55, 0.4)', background: 'rgba(212, 175, 55, 0.05)' }}
                />
              </label>
            )}

            <button disabled={busy} style={{ marginTop: '16px' }}>
              {busy ? 'Creating inbox...' : `Create ${getTier(registerTier).displayName} Inbox`}
            </button>
            <p className="hint">
              This provisions your address ({plannedAddress(handle || 'yourname', registerTier)}) across the network.
            </p>
          </form>
        </main>
      ) : (
        <div className="layout">
          <aside>
            <div className="identity">
              <strong>{account.display_name || account.handle}</strong>
              <small>{plannedAddress(account.handle, account.edition)}</small>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className={'edition-badge ' + (account.edition ? account.edition.toLowerCase() : 'community')}>
                  {getTier(account.edition).displayName}
                </span>
                {account.is_admin && (
                  <span className="edition-badge studio" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                    👑 {account.admin_role ? account.admin_role.toUpperCase() : 'ADMIN'}
                  </span>
                )}
              </div>
            </div>

            <button className="side" style={{ fontWeight: 700 }} onClick={handleOpenNewCompose}>
              ✎ New message
            </button>

            {/* Main Folders */}
            <button
              className={'side ' + (folder === 'inbox' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('inbox');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              📥 Inbox{' '}
              {mails.filter(
                m =>
                  m.recipient_id === session.user.id &&
                  !m.recipient_read_at &&
                  !deletedIds.has(m.id) &&
                  !trashIds.has(m.id) &&
                  !spamIds.has(m.id)
              ).length > 0 && (
                <span className="nav-badge">
                  {
                    mails.filter(
                      m =>
                        m.recipient_id === session.user.id &&
                        !m.recipient_read_at &&
                        !deletedIds.has(m.id) &&
                        !trashIds.has(m.id) &&
                        !spamIds.has(m.id)
                    ).length
                  }
                </span>
              )}
            </button>

            <button
              className={'side ' + (folder === 'starred' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('starred');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              ⭐ Starred ({mails.filter(m => starredIds.has(m.id) && !trashIds.has(m.id) && !deletedIds.has(m.id)).length})
            </button>

            <button
              className={'side ' + (folder === 'snoozed' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('snoozed');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              ⏰ Snoozed {Object.keys(snoozedMap).length > 0 && `(${Object.keys(snoozedMap).length})`}
            </button>

            <button
              className={'side ' + (folder === 'sent' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('sent');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              ↗ Sent
            </button>

            <button
              className={'side ' + (folder === 'drafts' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('drafts');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              ✎ Drafts ({drafts.length})
            </button>

            <button
              className={'side ' + (folder === 'drive' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('drive');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              📁 Chase Drive (Files)
            </button>

            <button
              className={'side ' + (folder === 'archive' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('archive');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              📦 Archive ({mails.filter(m => archivedIds.has(m.id) && !trashIds.has(m.id)).length})
            </button>

            <button
              className={'side ' + (folder === 'spam' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('spam');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              🚫 Spam ({mails.filter(m => spamIds.has(m.id) && !trashIds.has(m.id)).length})
            </button>

            <button
              className={'side ' + (folder === 'trash' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('trash');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              🗑 Trash ({mails.filter(m => trashIds.has(m.id) && !deletedIds.has(m.id)).length})
            </button>

            <div className="folder-divider" />

            <button
              className={'side ' + (folder === 'contacts' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('contacts');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              👥 Contacts ({contacts.length})
            </button>

            <button
              className={'side ' + (folder === 'external' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('external');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              🌐 External mail ({external.length})
            </button>

            <button
              className={'side ' + (folder === 'gmail' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('gmail');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              🔴 Gmail (Connected)
            </button>

            <div className="folder-divider" />

            <button
              className={'side ' + (folder === 'companions' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('companions');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              🐾 Pocket Companions
            </button>

            <button
              className={'side ' + (folder === 'settings' && !opened ? 'active' : '')}
              onClick={() => {
                setFolder('settings');
                setOpened(null);
                setExternalOpened(null);
              }}
            >
              ⚙ Settings
            </button>

            {isPrivilegedTier && (
              <button
                className={'side ' + (folder === 'admin' && !opened ? 'active' : '')}
                style={{ color: '#ba8cff' }}
                onClick={() => {
                  setFolder('admin');
                  setOpened(null);
                  setExternalOpened(null);
                }}
              >
                👑 Admin Console
              </button>
            )}

            <button
              className="side"
              style={{ marginTop: 'auto' }}
              onClick={() => {
                if (db) void db.auth.signOut();
              }}
            >
              Sign out
            </button>
          </aside>

          <main className="content">
            {/* Folder: Admin Console */}
            {folder === 'admin' ? (
              <AdminDashboard
                db={db}
                currentAccount={account}
                allAccounts={accounts}
                onRefreshAccounts={() => void refresh(session.user.id)}
                onSetNotice={setNotice}
              />
            ) : /* Folder: Gmail Connected */
            folder === 'gmail' ? (
              <GmailIntegration account={account} onSetNotice={setNotice} />
            ) : /* Folder: Pocket Companions */
            folder === 'companions' ? (
              <Update10 userId={session.user.id} tab="companions" />
            ) : /* Folder: Settings */
            folder === 'settings' ? (
              <AccountSettings
                db={db}
                account={account}
                mails={mails}
                drafts={drafts}
                contacts={contacts}
                onRefresh={() => void refresh(session.user.id)}
                onSetNotice={setNotice}
              />
            ) : /* Folder: Contacts */
            folder === 'contacts' ? (
              <>
                <h1>👥 Contacts</h1>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    void addContact();
                  }}
                >
                  <label>
                    Name
                    <input
                      required
                      maxLength={120}
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      maxLength={254}
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                  </label>
                  <button disabled={busy}>Add contact</button>
                </form>
                <div className="messages" style={{ marginTop: '20px' }}>
                  {contacts.map(c => (
                    <div key={c.id} className="message">
                      <strong>{c.name}</strong>
                      <span>{c.email}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setComposeInitialTo(c.email);
                            setComposeInitialSubject('');
                            let initialBody = '';
                            if (session) {
                              const sig = getUserSignature(session.user.id);
                              if (sig) initialBody = `\n\n--\n${sig}`;
                            }
                            setComposeInitialBody(initialBody);
                            setSelectedDraftId(null);
                            setComposeOpen(true);
                          }}
                        >
                          Compose
                        </button>
                        <button className="link" onClick={() => void removeContact(c.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {contacts.length === 0 && <p className="empty">No contacts added yet.</p>}
                </div>
              </>
            ) : /* Folder: External Mail */
            folder === 'external' ? (
              <>
                <h1>🌐 External Mail</h1>
                <p className="hint">
                  External messaging integration via Resend / Inbound webhook. External
                  deliveries appear here.
                </p>
                {externalOpened ? (
                  <>
                    <button className="link" onClick={() => setExternalOpened(null)}>
                      ← Back
                    </button>
                    <h2>{externalOpened.subject || '(No subject)'}</h2>
                    <p className="meta">
                      From {externalOpened.from_address} · To {externalOpened.to_address} ·{' '}
                      {new Date(externalOpened.received_at).toLocaleString()}
                    </p>
                    <article>{externalOpened.body_text}</article>
                  </>
                ) : (
                  <div className="messages">
                    {external.map(m => (
                      <button
                        key={m.id}
                        className="message"
                        onClick={() => void openExternal(m)}
                      >
                        <span>
                          {m.direction === 'inbound' ? m.from_address : m.to_address}
                        </span>
                        <strong>{m.subject || '(No subject)'}</strong>
                        <small>{new Date(m.received_at).toLocaleString()}</small>
                      </button>
                    ))}
                    {external.length === 0 && (
                      <p className="empty">
                        No external emails received yet. Configure your provider webhook to route
                        messages here.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : /* Folder: Chase Drive & Attachment Vault */
            folder === 'drive' ? (
              <DriveVault
                mails={allMails}
                accounts={accounts}
                onOpenMail={openMailFromAnywhere}
                onComposeWithAttachment={att => {
                  setComposeInitialAttachments([att]);
                  setComposeInitialTo('');
                  setComposeInitialSubject('');
                  setComposeInitialBody('');
                  setComposeOpen(true);
                }}
              />
            ) : /* Message Detail View */
            opened ? (
              <MessageDetail
                mail={opened}
                threadMails={openedThreadMails}
                currentUserId={session.user.id}
                accounts={accounts}
                folder={folder}
                isStarred={starredIds.has(opened.id)}
                isArchived={archivedIds.has(opened.id)}
                isSpam={spamIds.has(opened.id)}
                mailLabels={labelsMap[opened.id] || []}
                availableLabels={availableLabels}
                onBack={() => {
                  setOpened(null);
                  setOpenedThreadMails([]);
                }}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onDelete={handleDeleteMail}
                onToggleStar={handleToggleStar}
                onToggleArchive={handleToggleArchive}
                onToggleSpam={handleToggleSpam}
                onSnooze={m => setSnoozeTargetMail(m)}
                onToggleLabel={handleToggleLabel}
                onQuickSend={handleQuickSend}
              />
            ) : /* Standard Mail Folders (Inbox, Starred, Snoozed, Sent, Drafts, Archive, Spam, Trash) */
            (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h1>
                    {folder === 'inbox'
                      ? 'Inbox ✦'
                      : folder === 'starred'
                      ? 'Starred ⭐'
                      : folder === 'snoozed'
                      ? 'Snoozed ⏰'
                      : folder === 'drafts'
                      ? 'Drafts ✎'
                      : folder === 'sent'
                      ? 'Sent ↗'
                      : folder === 'archive'
                      ? 'Archive 📦'
                      : folder === 'spam'
                      ? 'Spam 🚫'
                      : 'Trash 🗑'}
                  </h1>

                  {folder === 'trash' && trashIds.size > 0 && (
                    <button className="danger-btn" onClick={handleEmptyTrash}>
                      Empty Trash
                    </button>
                  )}
                </div>

                {folder === 'inbox' && (
                  <section className="welcome-note">
                    <small>✦ THE CHASE STUDIOS TEAM</small>
                    <p>
                      <strong>
                        Welcome to your universe,{' '}
                        {account.display_name || account.handle}!
                      </strong>
                    </p>
                    <p>
                      We're excited to have you here. This is your space to connect,
                      create and stay in touch. Every genre. No limits.
                    </p>
                    <p className="hint">
                      This is an in-app welcome note. Standard internet delivery requires Resend and domain MX records.
                    </p>
                  </section>
                )}

                {folder === 'drafts' && (
                  <div className="messages">
                    {drafts.map(d => (
                      <button
                        key={d.id}
                        className="message"
                        onClick={() => {
                          setSelectedDraftId(d.id);
                          setComposeInitialTo(d.recipient);
                          setComposeInitialSubject(d.subject);
                          setComposeInitialBody(d.body);
                          setComposeOpen(true);
                        }}
                      >
                        <span>{d.recipient || 'No recipient'}</span>
                        <strong>{d.subject || '(No subject)'}</strong>
                        <small>{new Date(d.updated_at).toLocaleString()}</small>
                      </button>
                    ))}
                    {drafts.length === 0 && (
                      <p className="empty">No drafts saved.</p>
                    )}
                  </div>
                )}

                {folder !== 'drafts' && (
                  <>
                    {folder === 'inbox' && (
                      <div className="inbox-filter-pills">
                        <button
                          type="button"
                          className={`filter-pill ${inboxSourceFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setInboxSourceFilter('all')}
                        >
                          All Messages
                        </button>
                        <button
                          type="button"
                          className={`filter-pill ${inboxSourceFilter === 'network' ? 'active' : ''}`}
                          onClick={() => setInboxSourceFilter('network')}
                        >
                          Chase Network
                        </button>
                        <button
                          type="button"
                          className={`filter-pill ${inboxSourceFilter === 'external' ? 'active' : ''}`}
                          onClick={() => setInboxSourceFilter('external')}
                        >
                          🌐 External Inbound
                        </button>
                      </div>
                    )}

                    <div className="search-and-select-bar">
                      <label className="select-all-checkbox-label" title="Select all visible messages">
                        <input
                          type="checkbox"
                          checked={visible.length > 0 && visible.every(m => selectedMessageIds.has(m.id))}
                          onChange={handleToggleSelectAll}
                        />
                        <span>Select All</span>
                      </label>
                      <input
                        type="search"
                        aria-label="Search messages"
                        placeholder="Search subject, message, or email address"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>

                    {selectedMessageIds.size > 0 && (
                      <div className="bulk-actions-toolbar">
                        <span className="bulk-count">{selectedMessageIds.size} selected</span>
                        <div className="bulk-btn-group">
                          <button
                            type="button"
                            className="bulk-btn"
                            onClick={() => void handleBulkMarkRead(true)}
                            title="Mark as Read"
                          >
                            ✓ Read
                          </button>
                          <button
                            type="button"
                            className="bulk-btn"
                            onClick={() => void handleBulkMarkRead(false)}
                            title="Mark as Unread"
                          >
                            ✉ Unread
                          </button>
                          <button
                            type="button"
                            className="bulk-btn"
                            onClick={handleBulkStar}
                            title="Star / Unstar"
                          >
                            ★ Star
                          </button>
                          <button
                            type="button"
                            className="bulk-btn"
                            onClick={handleBulkArchive}
                            title="Archive"
                          >
                            📥 Archive
                          </button>
                          <button
                            type="button"
                            className="bulk-btn bulk-btn-delete"
                            onClick={() => void handleBulkDelete()}
                            title="Delete"
                          >
                            🗑 Delete
                          </button>
                        </div>
                        <button
                          type="button"
                          className="bulk-btn-close"
                          onClick={() => setSelectedMessageIds(new Set())}
                          title="Clear selection"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {visibleThreads.length === 0 ? (
                      <p className="empty">
                        {folder === 'inbox'
                          ? inboxSourceFilter === 'external'
                            ? 'No external inbound messages yet. Any email sent to your @chase-studios.org address will appear here.'
                            : 'No messages yet. Your Chase Mail journey starts here.'
                          : folder === 'starred'
                          ? 'No starred messages.'
                          : folder === 'archive'
                          ? 'No archived messages.'
                          : folder === 'spam'
                          ? 'No spam messages. Inbox clean.'
                          : folder === 'trash'
                          ? 'Trash is empty.'
                          : 'No sent messages.'}
                      </p>
                    ) : (
                      <div className="messages">
                        {visibleThreads.map(thread => {
                          const otherParticipantId =
                            thread.participantIds.find(id => id !== session.user.id) ||
                            thread.latestMessage.sender_id;
                          const isThreadSelected =
                            thread.messages.length > 0 &&
                            thread.messages.every(m => selectedMessageIds.has(m.id));
                          const isExternalMail = Boolean(thread.latestMessage.is_external);

                          return (
                            <div
                              key={thread.threadKey}
                              className={
                                'message ' +
                                (thread.unread ? 'unread ' : '') +
                                (thread.count > 1 ? 'stacked-thread ' : '') +
                                (isThreadSelected ? 'selected ' : '') +
                                (isExternalMail ? 'external-card ' : '')
                              }
                              style={{ cursor: 'pointer' }}
                              onClick={() => void openThread(thread)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  className="thread-checkbox"
                                  checked={isThreadSelected}
                                  onClick={e => handleToggleSelectThread(thread.messages, e)}
                                  onChange={() => {}}
                                  aria-label="Select conversation thread"
                                />
                                {isExternalMail ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="external-badge">🌐 External</span>
                                    <span style={{ fontWeight: 600, color: '#22d3ee' }}>
                                      {thread.latestMessage.external_from || 'External Sender'}
                                    </span>
                                  </div>
                                ) : (
                                  <span>{who(otherParticipantId)}</span>
                                )}
                                {thread.count > 1 && (
                                  <span
                                    className="thread-count-pill"
                                    title={`${thread.count} stacked messages in this conversation`}
                                  >
                                    {thread.count}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <strong>
                                  {thread.starred ? '★ ' : ''}
                                  {thread.subject}
                                </strong>
                                <span style={{ fontSize: '0.8rem', color: '#a89bb8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {thread.latestMessage.body.replace(/\n/g, ' ').slice(0, 80)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <small>{new Date(thread.latestMessage.sent_at).toLocaleString()}</small>
                                <button
                                  className="link"
                                  style={{
                                    color: thread.starred ? '#ffc83b' : '#a998be',
                                    fontSize: '16px',
                                    padding: '0 4px'
                                  }}
                                  title={thread.starred ? 'Unstar' : 'Star'}
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleToggleStar(thread.latestMessage.id);
                                  }}
                                >
                                  {thread.starred ? '★' : '☆'}
                                </button>
                                <button
                                  className="link"
                                  style={{ color: '#ff7b7b', padding: '0 4px', fontSize: '13px' }}
                                  title="Delete conversation"
                                  onClick={e => {
                                    e.stopPropagation();
                                    for (const msg of thread.messages) {
                                      void handleDeleteMail(msg.id);
                                    }
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {/* Floating Action Button (FAB) for Mobile Compose */}
      {session && account && (
        <button
          className="mobile-compose-fab"
          onClick={handleOpenNewCompose}
          title="Compose new message"
          aria-label="Compose new message"
        >
          ✎
        </button>
      )}

      {/* Compose Modal */}
      {composeOpen && session && account && (
        <ComposeModal
          db={db}
          account={account}
          accounts={accounts}
          contacts={contacts}
          draftId={selectedDraftId}
          initialTo={composeInitialTo}
          initialSubject={composeInitialSubject}
          initialBody={composeInitialBody}
          initialAttachments={composeInitialAttachments}
          onClose={() => {
            setComposeOpen(false);
            setComposeInitialAttachments([]);
          }}
          onSent={(msg, sentDetails) => {
            setNotice(msg);
            if (sentDetails) {
              triggerUndoSend(sentDetails);
            }
            void refresh(session.user.id);
          }}
          onDraftSaved={() => void refresh(session.user.id)}
          onScheduleSend={handleScheduleSend}
        />
      )}

      {/* 5-Second Undo Send Action Banner */}
      {undoSend && (
        <div className="undo-send-banner" role="status">
          <div className="undo-send-info">
            <span>✉️ Message sent to <strong>{undoSend.to}</strong>.</span>
          </div>
          <div className="undo-send-controls">
            <button
              type="button"
              className="undo-send-btn"
              onClick={() => void handleExecuteUndo()}
              title="Recall sent message and resume drafting"
            >
              ↩ Undo ({undoSend.secondsLeft}s)
            </button>
            <button
              type="button"
              className="undo-send-dismiss"
              onClick={() => setUndoSend(null)}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Superhuman Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectFolder={f => setFolder(f)}
        onOpenCompose={handleOpenNewCompose}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenLockShield={() => setIsLocked(true)}
        onChangeTheme={t => setTheme(t as any)}
        mails={allMails}
        accounts={accounts}
        onOpenMail={openMailFromAnywhere}
      />

      {/* Keyboard Shortcuts Cheat Sheet (?) */}
      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Snooze Email Dialog */}
      <SnoozeModal
        isOpen={Boolean(snoozeTargetMail)}
        onClose={() => setSnoozeTargetMail(null)}
        onSnooze={untilIso => {
          if (snoozeTargetMail) handleSnoozeMail(snoozeTargetMail, untilIso);
        }}
        mailSubject={snoozeTargetMail?.subject}
      />

      {/* Studio Privacy PIN Shield Lock */}
      <LockShieldModal
        isLocked={isLocked}
        onUnlock={() => setIsLocked(false)}
        onSignOut={() => {
          setIsLocked(false);
          if (db) void db.auth.signOut();
        }}
      />

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}

      {session && account && pet && petVisible && (
        <div className="floating-pet" title={pet.name}>
          {pet.emoji}
          <small>{pet.name}</small>
        </div>
      )}

      {inAppToast && (
        <div className="in-app-toast-container">
          <div className="in-app-toast">
            <div className="in-app-toast-header">
              <div className="in-app-toast-title">
                <span>✉️</span>
                <span>New Mail from {inAppToast.sender}</span>
              </div>
              <button
                className="link"
                style={{ padding: '2px 6px', fontSize: '0.8rem', background: 'transparent', border: 'none', color: '#c5b5d8', cursor: 'pointer' }}
                onClick={() => setInAppToast(null)}
              >
                ✕
              </button>
            </div>
            <div className="in-app-toast-body">
              <strong>{inAppToast.subject}</strong>
              <div className="in-app-toast-preview">{inAppToast.preview}</div>
            </div>
            <div className="in-app-toast-actions">
              <button
                type="button"
                className="in-app-toast-btn"
                onClick={() => {
                  setFolder('inbox');
                  setOpened(inAppToast.mail);
                  setInAppToast(null);
                }}
              >
                View Message
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>Chase Studios · Chase Mail · Production Beta · chasemail.com</footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
