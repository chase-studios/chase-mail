import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';
import './style.css';
import Update10 from './Update10';
import { ComposeModal } from './components/ComposeModal';
import { MessageDetail } from './components/MessageDetail';
import { AdminDashboard } from './components/AdminDashboard';
import { AccountSettings } from './components/AccountSettings';
import { GmailIntegration } from './components/GmailIntegration';
import { Account, Mail, Draft, Contact, ExternalMail, AccountTier } from './lib/types';
import { plannedAddress, getTier, TIERS } from './lib/tiers';
import { validateRegistrationCode } from './lib/accessCodes';

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
  const [busy, setBusy] = useState(false);

  // Registration Edition & Access Code State
  const [registerTier, setRegisterTier] = useState<AccountTier>('community');
  const [accessCode, setAccessCode] = useState('');

  // Previous unread count ref for desktop notifications
  const prevUnreadCountRef = useRef<number>(0);

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
      if (unreadInboxMsgs.length > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
        const latest = unreadInboxMsgs[0];
        if (latest && 'Notification' in window && Notification.permission === 'granted') {
          const senderObj = (allAccsRes.data || []).find(a => a.user_id === latest.sender_id);
          const senderName = senderObj ? senderObj.display_name || senderObj.handle : 'Chase Mail user';
          new Notification(`Chase Mail: ${latest.subject}`, {
            body: `${senderName}: ${latest.body.slice(0, 100)}`,
            icon: '/icon.svg'
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

    const tierDef = getTier(registerTier);
    if (tierDef.isProtected) {
      const codeValidation = validateRegistrationCode(accessCode, registerTier);
      if (!codeValidation.valid) {
        setBusy(false);
        setNotice(codeValidation.error || 'Invalid registration access code for this edition.');
        return;
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
        p_edition: registerTier,
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
        edition: registerTier,
        gold_trim: registerTier === 'royal' || registerTier === 'studio',
        is_admin: registerTier === 'studio'
      });
      if (!insertErr) {
        finalError = null;
      }
    } else if (!finalError && session) {
      // Ensure edition and gold trim are saved on the new account
      try {
        await db.from('mail_accounts').update({
          edition: registerTier,
          gold_trim: registerTier === 'royal' || registerTier === 'studio'
        }).eq('user_id', session.user.id);
      } catch {}
    }

    setBusy(false);
    setNotice(finalError?.message || 'Chase Mail account created.');
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

  // Open & Mark as Read
  async function openMail(m: Mail) {
    setOpened(m);
    if (db && session?.user.id === m.recipient_id && !m.recipient_read_at) {
      const { error } = await db
        .from('mail_messages')
        .update({ recipient_read_at: new Date().toISOString() })
        .eq('id', m.id);
      if (!error) {
        await refresh(session.user.id);
      }
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
        await db.rpc('delete_chase_mail_message', {
          p_message_id: messageId,
          p_folder: folder === 'sent' ? 'sent' : 'inbox'
        });
      } catch {}
    }
  }

  // Empty Trash
  function handleEmptyTrash() {
    setDeletedIds(prev => new Set([...prev, ...trashIds]));
    setTrashIds(new Set());
    setNotice('Trash emptied.');
  }

  // Message Filtering Logic Across Folders
  const visible = mails.filter(m => {
    // Exclude permanently deleted messages
    if (deletedIds.has(m.id)) return false;

    if (folder === 'inbox') {
      if (m.recipient_id !== session?.user.id) return false;
      if (m.recipient_deleted_at) return false;
      if (trashIds.has(m.id) || archivedIds.has(m.id) || spamIds.has(m.id)) return false;
    } else if (folder === 'starred') {
      if (!starredIds.has(m.id)) return false;
      if (trashIds.has(m.id)) return false;
    } else if (folder === 'sent') {
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

    return [m.subject, m.body, targetAccount?.handle || '', targetAccount?.display_name || ''].some(v =>
      v.toLowerCase().includes(searchString)
    );
  });

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
          <label className="theme-picker">
            Theme{' '}
            <select
              aria-label="Color theme"
              value={theme}
              onChange={e => setTheme(e.target.value as typeof theme)}
            >
              <option value="purple">Purple</option>
              <option value="midnight">Midnight</option>
              <option value="light">Light</option>
            </select>
          </label>
          {session && (
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
          )}
        </div>
      </header>

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
                    >
                      <div className="tier-card-header">
                        <span className={`edition-badge ${t.id}`}>{t.displayName}</span>
                        {t.isProtected && <span style={{ fontSize: '0.75rem', color: '#ffd700' }}>🔒 Access Code</span>}
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
                  onChange={e => setAccessCode(e.target.value.trim())}
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
            ) : /* Message Detail View */
            opened ? (
              <MessageDetail
                mail={opened}
                currentUserId={session.user.id}
                accounts={accounts}
                folder={folder}
                isStarred={starredIds.has(opened.id)}
                isArchived={archivedIds.has(opened.id)}
                isSpam={spamIds.has(opened.id)}
                onBack={() => setOpened(null)}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onDelete={handleDeleteMail}
                onToggleStar={handleToggleStar}
                onToggleArchive={handleToggleArchive}
                onToggleSpam={handleToggleSpam}
              />
            ) : /* Standard Mail Folders (Inbox, Starred, Sent, Drafts, Archive, Spam, Trash) */
            (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h1>
                    {folder === 'inbox'
                      ? 'Inbox ✦'
                      : folder === 'starred'
                      ? 'Starred ⭐'
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
                    <label style={{ margin: '14px 0' }}>
                      Search messages
                      <input
                        type="search"
                        aria-label="Search messages"
                        placeholder="Search subject, message or username"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </label>

                    {visible.length === 0 ? (
                      <p className="empty">
                        {folder === 'inbox'
                          ? 'No messages yet. Your Chase Mail journey starts here.'
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
                        {visible.map(m => (
                          <div
                            key={m.id}
                            className={
                              'message ' +
                              (folder === 'inbox' && !m.recipient_read_at ? 'unread' : '')
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => void openMail(m)}
                          >
                            <span>
                              {who(folder === 'sent' ? m.recipient_id : m.sender_id)}
                            </span>
                            <strong>
                              {starredIds.has(m.id) ? '★ ' : ''}
                              {m.subject || '(No subject)'}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <small>{new Date(m.sent_at).toLocaleString()}</small>
                              <button
                                className="link"
                                style={{
                                  color: starredIds.has(m.id) ? '#ffc83b' : '#a998be',
                                  fontSize: '16px',
                                  padding: '0 4px'
                                }}
                                title={starredIds.has(m.id) ? 'Unstar' : 'Star'}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleToggleStar(m.id);
                                }}
                              >
                                {starredIds.has(m.id) ? '★' : '☆'}
                              </button>
                              <button
                                className="link"
                                style={{ color: '#ff7b7b', padding: '0 4px', fontSize: '13px' }}
                                title="Delete message"
                                onClick={e => {
                                  e.stopPropagation();
                                  void handleDeleteMail(m.id);
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
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
          onClose={() => setComposeOpen(false)}
          onSent={msg => {
            setNotice(msg);
            void refresh(session.user.id);
          }}
          onDraftSaved={() => void refresh(session.user.id)}
        />
      )}

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
