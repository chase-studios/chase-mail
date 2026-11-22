import React, { useState, useEffect, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Account, Contact, MailAttachment } from '../lib/types';
import { getTier, plannedAddress } from '../lib/tiers';

interface ComposeModalProps {
  db: SupabaseClient | null;
  account: Account;
  accounts: Account[];
  contacts: Contact[];
  draftId: string | null;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  onSent: (msg: string, sentDetails?: { id: string; to: string; subject: string; body: string }) => void;
  onDraftSaved: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  db,
  account,
  accounts,
  contacts,
  draftId,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  onClose,
  onSent,
  onDraftSaved
}) => {
  const [to, setTo] = useState(initialTo);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isHtml, setIsHtml] = useState(false);
  const [activeComposerTab, setActiveComposerTab] = useState<'write' | 'preview'>('write');
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tier = getTier(account.edition);
  const maxBytes = tier.maxAttachmentSizeMB * 1024 * 1024;

  const insertFormatting = (prefix: string, suffix: string = prefix, placeholder: string = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      setBody(prev => `${prev}${prefix}${placeholder}${suffix}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end) || placeholder;
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const newText = `${before}${prefix}${selectedText}${suffix}${after}`;
    setBody(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const handleApplySignature = (preset: string) => {
    let sigText = '';
    const userDisplayName = account.display_name || account.handle;
    const address = plannedAddress(account.handle, account.edition);

    if (preset === 'executive') {
      sigText = `\n\n--\n✦ ${userDisplayName.toUpperCase()}\nFounder & Executive Officer · Chase Studios\nDirect: ${address}\n"Every Genre. No Limits."`;
    } else if (preset === 'royal') {
      sigText = `\n\n--\n👑 ${userDisplayName}\nRoyal VIP Edition · Chase Studios\nDispatch: ${address}`;
    } else if (preset === 'vanguard') {
      sigText = `\n\n--\n🛡 ${userDisplayName}\nVanguard Tactical Division · Chase Mail Network\nVerified: ${address} [TLS Encrypted]`;
    } else if (preset === 'clean') {
      sigText = `\n\n--\nBest regards,\n${userDisplayName}\n${address}`;
    } else if (preset === 'default') {
      const savedSig = localStorage.getItem('chase-mail-v10:' + account.user_id);
      if (savedSig) {
        try {
          const parsed = JSON.parse(savedSig);
          if (parsed.signature) sigText = `\n\n--\n${parsed.signature}`;
        } catch {}
      }
    }

    if (sigText) {
      setBody(prev => {
        const stripped = prev.split('\n--\n')[0].trimEnd();
        return stripped + sigText;
      });
    }
  };

  // Autosave timer
  useEffect(() => {
    if (!to.trim() && !subject.trim() && !body.trim()) return;

    const timer = setTimeout(() => {
      void autoSaveDraft();
    }, 12000);

    return () => clearTimeout(timer);
  }, [to, subject, body, cc, bcc, attachments]);

  const autoSaveDraft = async () => {
    if (!db || !account) return;
    try {
      const payload = {
        owner_id: account.user_id,
        recipient: to.trim(),
        subject: subject.trim(),
        body: body,
        updated_at: new Date().toISOString()
      };

      if (currentDraftId) {
        await db.from('mail_drafts').update(payload).eq('id', currentDraftId);
      } else {
        const { data } = await db.from('mail_drafts').insert(payload).select('id').single();
        if (data?.id) setCurrentDraftId(data.id);
      }
      setAutoSaveStatus(`Autosaved at ${new Date().toLocaleTimeString()}`);
      onDraftSaved();
    } catch {
      // Quiet failure for background autosave
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg('');
    const newAttachments: MailAttachment[] = [];

    Array.from(files).forEach(file => {
      if (file.size > maxBytes) {
        setErrorMsg(
          `File "${file.name}" exceeds your ${tier.displayName} limit of ${tier.maxAttachmentSizeMB}MB.`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachments(prev => [
          ...prev,
          {
            id: 'att_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleSend = async () => {
    if (!db || !account) return;
    const recipientInput = to.trim().toLowerCase();

    if (!recipientInput) {
      setErrorMsg('Please specify a recipient.');
      return;
    }

    setBusy(true);
    setErrorMsg('');

    // Check if recipient is external
    const isExternal =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientInput) &&
      !['chasemail.com', 'chaseprime.com', 'chasevanguard.com', 'chase-studios.org', 'chasestudios.org'].some(d =>
        recipientInput.endsWith(`@${d}`)
      );

    if (isExternal) {
      try {
        const { data, error } = await db.functions.invoke('send-email', {
          body: {
            from: plannedAddress(account.handle, account.edition),
            to: recipientInput,
            subject: subject.trim() || '(No subject)',
            body: body,
            is_html: isHtml,
            cc: cc ? cc.split(',').map(s => s.trim()) : undefined,
            bcc: bcc ? bcc.split(',').map(s => s.trim()) : undefined,
            attachments: attachments.map(a => ({
              filename: a.name,
              content: a.dataUrl?.split(',')[1],
              type: a.type
            }))
          }
        });

        if (error || data?.error) {
          setErrorMsg(
            `External send to ${recipientInput} requires Resend API key or provider DNS setup. ${
              error?.message || data?.error || ''
            }`
          );
          setBusy(false);
          return;
        }

        // Clean up draft if one existed
        if (currentDraftId) {
          await db.from('mail_drafts').delete().eq('id', currentDraftId);
        }

        onSent(`External email dispatched successfully to ${recipientInput}!`);
        onClose();
      } catch (err: any) {
        setErrorMsg(
          `External mail infrastructure requires configured Resend API key for ${recipientInput}. See RESEND-SETUP.md for details.`
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    // Internal recipient matching (supports raw handle, handle@domain, or planned address)
    const cleanHandle = recipientInput.split('@')[0].toLowerCase();
    const internalAcc = accounts.find(
      a =>
        a.handle.toLowerCase() === recipientInput ||
        a.handle.toLowerCase() === cleanHandle ||
        plannedAddress(a.handle, a.edition).toLowerCase() === recipientInput
    );

    if (!internalAcc) {
      setErrorMsg(
        'Recipient not found. Enter an existing Chase Mail username or a valid external email address.'
      );
      setBusy(false);
      return;
    }

    try {
      // Pack any attachments into body metadata if native column does not exist
      let payloadBody = body;
      if (attachments.length > 0) {
        payloadBody += `\n\n[Attachments: ${attachments.map(a => `${a.name} (${formatFileSize(a.size)})`).join(', ')}]`;
      }

      const { data: newMsg, error } = await db
        .from('mail_messages')
        .insert({
          sender_id: account.user_id,
          recipient_id: internalAcc.user_id,
          subject: subject.trim() || '(No subject)',
          body: payloadBody
        })
        .select()
        .single();

      if (error) {
        setErrorMsg(error.message);
        setBusy(false);
        return;
      }

      if (currentDraftId) {
        await db.from('mail_drafts').delete().eq('id', currentDraftId);
      }

      onSent(
        `Message sent to ${internalAcc.display_name || internalAcc.handle}!`,
        newMsg
          ? {
              id: newMsg.id,
              to: internalAcc.handle,
              subject: newMsg.subject || subject.trim() || '(No subject)',
              body: payloadBody
            }
          : undefined
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending message');
    } finally {
      setBusy(false);
    }
  };

  const handleManualSaveDraft = async () => {
    if (!db || !account) return;
    setBusy(true);
    await autoSaveDraft();
    setBusy(false);
    onSent('Draft saved.');
    onClose();
  };

  const handleDeleteDraft = async () => {
    if (!db || !currentDraftId) return;
    setBusy(true);
    await db.from('mail_drafts').delete().eq('id', currentDraftId);
    setBusy(false);
    onDraftSaved();
    onClose();
  };

  return (
    <div className="compose-modal-overlay">
      <div className="compose-modal-card">
        <div className="compose-header">
          <h2>✦ New Message</h2>
          <div className="compose-header-actions">
            {autoSaveStatus && <span className="autosave-tag">{autoSaveStatus}</span>}
            <button className="link" onClick={onClose} aria-label="Close composer">
              ✕
            </button>
          </div>
        </div>

        {errorMsg && <div className="compose-error">{errorMsg}</div>}

        <div className="compose-body-form">
          <div className="compose-row">
            <label>To</label>
            <input
              type="text"
              placeholder="Username or address@domain.com"
              value={to}
              onChange={e => setTo(e.target.value)}
              list="compose-contacts-list"
              autoFocus
            />
            <datalist id="compose-contacts-list">
              {contacts.map(c => (
                <option key={c.id} value={c.email}>
                  {c.name} ({c.email})
                </option>
              ))}
              {accounts.map(a => (
                <option key={a.user_id} value={a.handle}>
                  {a.display_name || a.handle} (@{a.handle})
                </option>
              ))}
            </datalist>
            <div className="cc-bcc-buttons">
              {!showCc && (
                <button type="button" className="link" onClick={() => setShowCc(true)}>
                  + CC
                </button>
              )}
              {!showBcc && (
                <button type="button" className="link" onClick={() => setShowBcc(true)}>
                  + BCC
                </button>
              )}
            </div>
          </div>

          {showCc && (
            <div className="compose-row">
              <label>CC</label>
              <input
                type="text"
                placeholder="Comma separated emails"
                value={cc}
                onChange={e => setCc(e.target.value)}
              />
              <button type="button" className="link" onClick={() => setShowCc(false)}>
                ✕
              </button>
            </div>
          )}

          {showBcc && (
            <div className="compose-row">
              <label>BCC</label>
              <input
                type="text"
                placeholder="Comma separated emails"
                value={bcc}
                onChange={e => setBcc(e.target.value)}
              />
              <button type="button" className="link" onClick={() => setShowBcc(false)}>
                ✕
              </button>
            </div>
          )}

          <div className="compose-row">
            <label>Subject</label>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="composer-tab-bar">
            <button
              type="button"
              className={`composer-tab-btn ${activeComposerTab === 'write' ? 'active' : ''}`}
              onClick={() => setActiveComposerTab('write')}
            >
              ✎ Write
            </button>
            <button
              type="button"
              className={`composer-tab-btn ${activeComposerTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveComposerTab('preview')}
            >
              👁 Preview
            </button>
          </div>

          <div className="compose-toolbar">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('**', '**', 'bold text')}
              title="Bold"
            >
              <b>B</b>
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('*', '*', 'italic text')}
              title="Italic"
            >
              <i>I</i>
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('<u>', '</u>', 'underlined')}
              title="Underline"
            >
              <u>U</u>
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('> ', '', 'quote')}
              title="Quote"
            >
              ❝ Quote
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('- ', '', 'list item')}
              title="Bullet list"
            >
              • List
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('1. ', '', 'numbered item')}
              title="Numbered list"
            >
              1. List
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('`', '`', 'code')}
              title="Inline code"
            >
              {'</>'}
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertFormatting('[', '](https://)', 'Link text')}
              title="Insert link"
            >
              🔗
            </button>

            <select
              className="sig-preset-select"
              title="Insert signature preset"
              onChange={e => {
                if (e.target.value) {
                  handleApplySignature(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>✍ Signatures...</option>
              <option value="default">Default Profile Signature</option>
              <option value="executive">✦ Executive / Founder</option>
              <option value="royal">👑 Royal VIP Edition</option>
              <option value="vanguard">🛡 Vanguard Verified</option>
              <option value="clean">Clean Minimal</option>
            </select>

            <button
              type="button"
              className={'toolbar-btn ' + (isHtml ? 'active' : '')}
              onClick={() => setIsHtml(!isHtml)}
              title="HTML Mode Toggle"
            >
              HTML
            </button>
            <label className="toolbar-btn file-attach-btn" title="Attach Files">
              📎 Attach ({tier.maxAttachmentSizeMB}MB max)
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div className="compose-editor">
            {activeComposerTab === 'write' ? (
              <textarea
                ref={textareaRef}
                rows={10}
                placeholder="Write your message here... You can use Markdown or select signature presets."
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            ) : (
              <div className="compose-preview-pane">
                {body.trim() ? (
                  <div className="preview-rendered">
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                      {body}
                    </pre>
                  </div>
                ) : (
                  <p className="preview-placeholder">Nothing to preview yet. Switch back to Write tab to compose.</p>
                )}
              </div>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="attachments-bar">
              <strong>Attached files ({attachments.length}):</strong>
              <div className="attachment-chips">
                {attachments.map(att => (
                  <div key={att.id} className="attachment-chip">
                    <span className="chip-name">{att.name}</span>
                    <span className="chip-size">{formatFileSize(att.size)}</span>
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeAttachment(att.id)}
                      title="Remove attachment"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="compose-footer">
          <div className="footer-left">
            <button
              type="button"
              className="primary-btn"
              disabled={busy}
              onClick={handleSend}
            >
              {busy ? 'Sending...' : 'Send Message ↗'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleManualSaveDraft}
            >
              Save Draft
            </button>
          </div>
          <div className="footer-right">
            {currentDraftId && (
              <button
                type="button"
                className="link"
                style={{ color: '#ff7b7b' }}
                onClick={handleDeleteDraft}
              >
                Delete Draft
              </button>
            )}
            <button type="button" className="link" onClick={onClose}>
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
