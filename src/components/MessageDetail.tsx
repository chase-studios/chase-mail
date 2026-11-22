import React, { useState } from 'react';
import { Mail, Account, MailAttachment } from '../lib/types';
import { plannedAddress } from '../lib/tiers';

interface MessageDetailProps {
  mail: Mail;
  threadMails?: Mail[];
  currentUserId: string;
  accounts: Account[];
  folder: string;
  isStarred: boolean;
  isArchived: boolean;
  isSpam: boolean;
  onBack: () => void;
  onReply: (mail: Mail) => void;
  onReplyAll: (mail: Mail) => void;
  onForward: (mail: Mail) => void;
  onDelete: (mailId: string) => void;
  onToggleStar: (mailId: string) => void;
  onToggleArchive: (mailId: string) => void;
  onToggleSpam: (mailId: string) => void;
  onQuickSend?: (toUserId: string, subject: string, body: string) => Promise<boolean>;
}

export const MessageDetail: React.FC<MessageDetailProps> = ({
  mail,
  threadMails,
  currentUserId,
  accounts,
  folder,
  isStarred,
  isArchived,
  isSpam,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onToggleStar,
  onToggleArchive,
  onToggleSpam,
  onQuickSend
}) => {
  const [previewAttachment, setPreviewAttachment] = useState<MailAttachment | null>(null);

  // In stacked thread mode, threadMails contains all messages chronologically (oldest to newest)
  const displayMails = threadMails && threadMails.length > 0 ? threadMails : [mail];
  const isThread = displayMails.length > 1;
  const latestMail = displayMails[displayMails.length - 1];

  // Expanded message IDs in the conversation stack (the newest message is expanded by default)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set<string>([latestMail.id]);
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Keep at least one message open
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Quick reply inline input state
  const [quickReplyText, setQuickReplyText] = useState('');
  const [quickReplyBusy, setQuickReplyBusy] = useState(false);

  const senderAcc = accounts.find(a => a.user_id === latestMail.sender_id);
  const recipientAcc = accounts.find(a => a.user_id === latestMail.recipient_id);

  const senderDisplayName = senderAcc
    ? `${senderAcc.display_name || senderAcc.handle} <${plannedAddress(
        senderAcc.handle,
        senderAcc.edition
      )}>`
    : 'Chase Mail user';

  const recipientDisplayName = recipientAcc
    ? `${recipientAcc.display_name || recipientAcc.handle} <${plannedAddress(
        recipientAcc.handle,
        recipientAcc.edition
      )}>`
    : 'Chase Mail user';

  const otherUserId = latestMail.sender_id === currentUserId ? latestMail.recipient_id : latestMail.sender_id;
  const otherAcc = accounts.find(a => a.user_id === otherUserId);
  const otherName = otherAcc ? (otherAcc.display_name || otherAcc.handle) : 'user';

  // Handle Quick Reply submit
  const handleQuickReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim() || !onQuickSend) return;
    setQuickReplyBusy(true);

    const cleanSubject = latestMail.subject.startsWith('Re:')
      ? latestMail.subject
      : `Re: ${latestMail.subject}`;

    const ok = await onQuickSend(otherUserId, cleanSubject, quickReplyText.trim());
    setQuickReplyBusy(false);
    if (ok) {
      setQuickReplyText('');
    }
  };

  // Export as RFC 822 .eml file
  const handleExportEml = () => {
    const emlContent = [
      `From: ${senderDisplayName}`,
      `To: ${recipientDisplayName}`,
      `Subject: ${latestMail.subject}`,
      `Date: ${new Date(latestMail.sent_at).toUTCString()}`,
      `Message-ID: <${latestMail.id}@chasemail.com>`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      latestMail.body
    ].join('\r\n');

    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${latestMail.subject.replace(/[^a-z0-9_-]/gi, '_') || 'message'}.eml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render message body with quotes and links
  const renderBody = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="message-body-content">
        {lines.map((line, idx) => {
          if (line.startsWith('>')) {
            return (
              <blockquote key={idx} className="quoted-line">
                {line}
              </blockquote>
            );
          }
          return (
            <p key={idx} className="message-line">
              {line || '\u00A0'}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="message-detail-view">
      {/* Top action toolbar */}
      <div className="detail-toolbar">
        <button className="link back-btn" onClick={onBack}>
          ← Back to {folder}
        </button>

        <div className="toolbar-actions">
          <button
            className={'icon-action-btn ' + (isStarred ? 'starred' : '')}
            onClick={() => onToggleStar(latestMail.id)}
            title={isStarred ? 'Unstar' : 'Star message'}
          >
            {isStarred ? '★ Starred' : '☆ Star'}
          </button>

          <button
            className="icon-action-btn"
            onClick={() => onToggleArchive(latestMail.id)}
            title={isArchived ? 'Move to Inbox' : 'Archive message'}
          >
            {isArchived ? '📥 Unarchive' : '📦 Archive'}
          </button>

          <button
            className="icon-action-btn"
            onClick={() => onToggleSpam(latestMail.id)}
            title={isSpam ? 'Mark as Not Spam' : 'Report Spam'}
          >
            {isSpam ? '✓ Not Spam' : '🚫 Spam'}
          </button>

          <button
            className="icon-action-btn"
            onClick={handleExportEml}
            title="Download .eml file"
          >
            🖨 Export .eml
          </button>

          <button
            className="icon-action-btn danger-btn"
            onClick={() => onDelete(latestMail.id)}
            title="Delete message"
          >
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Thread Title Header */}
      <div className="detail-header-card">
        <div className="detail-title-row">
          <h1>{latestMail.subject || '(No subject)'}</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isThread && (
              <span className="thread-stack-badge">
                ✦ {displayMails.length} Messages in Thread
              </span>
            )}
            <span className="security-badge" title="Protected via Supabase Row-Level Security & TLS">
              🔒 TLS Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Stacked Conversation Messages */}
      <div className="conversation-thread-stack">
        {displayMails.map((m, idx) => {
          const isExpanded = expandedIds.has(m.id);
          const isMsgSender = m.sender_id === currentUserId;
          const msgSenderAcc = accounts.find(a => a.user_id === m.sender_id);
          const msgSenderName = isMsgSender
            ? 'You'
            : msgSenderAcc?.display_name || msgSenderAcc?.handle || 'Chase Mail user';
          const msgSenderHandle = msgSenderAcc ? `@${msgSenderAcc.handle}` : '';
          const msgSenderEmail = msgSenderAcc
            ? plannedAddress(msgSenderAcc.handle, msgSenderAcc.edition)
            : 'user@chasemail.com';

          return (
            <div
              key={m.id}
              className={`thread-card ${isExpanded ? 'expanded' : 'collapsed'} ${
                isMsgSender ? 'outgoing' : 'incoming'
              }`}
            >
              <div className="thread-card-header" onClick={() => toggleExpand(m.id)}>
                <div className="thread-card-sender-info">
                  <div className="thread-sender-avatar">
                    {msgSenderName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="thread-sender-text">
                    <strong>{msgSenderName}</strong>
                    <span className="thread-sender-handle">{msgSenderHandle} &lt;{msgSenderEmail}&gt;</span>
                  </div>
                </div>

                {!isExpanded && (
                  <div className="thread-collapsed-snippet">
                    {m.body.replace(/\n/g, ' ').slice(0, 75)}...
                  </div>
                )}

                <div className="thread-card-meta">
                  <small>{new Date(m.sent_at).toLocaleString()}</small>
                  <button type="button" className="thread-expand-btn">
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="thread-card-body-section">
                  <article className="detail-body-container">{renderBody(m.body)}</article>

                  {/* Attachments (if any attached in mail) */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="detail-attachments-box">
                      <h4>Attachments ({m.attachments.length})</h4>
                      <div className="attachment-tiles">
                        {m.attachments.map(att => (
                          <div key={att.id} className="attachment-tile">
                            <span className="tile-icon">📎</span>
                            <div className="tile-info">
                              <strong>{att.name}</strong>
                              <small>{(att.size / 1024).toFixed(1)} KB</small>
                            </div>
                            <div className="tile-actions">
                              {att.dataUrl && att.type.startsWith('image/') && (
                                <button
                                  className="link"
                                  onClick={() => setPreviewAttachment(att)}
                                >
                                  Preview
                                </button>
                              )}
                              {att.dataUrl && (
                                <a
                                  href={att.dataUrl}
                                  download={att.name}
                                  className="link"
                                  style={{ textDecoration: 'none' }}
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.recipient_read_at && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#8fe2ff' }}>
                      ✓ Read on {new Date(m.recipient_read_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="modal-overlay" onClick={() => setPreviewAttachment(null)}>
          <div className="preview-modal-card" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewAttachment.name}</h3>
              <button className="link" onClick={() => setPreviewAttachment(null)}>
                ✕ Close
              </button>
            </div>
            <div className="preview-content">
              {previewAttachment.dataUrl && (
                <img
                  src={previewAttachment.dataUrl}
                  alt={previewAttachment.name}
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Reply Box */}
      {onQuickSend && folder !== 'trash' && folder !== 'spam' && (
        <form onSubmit={handleQuickReplySubmit} className="quick-reply-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ba8cff' }}>
              ✦ Quick Reply to {otherName}
            </span>
            <button
              type="button"
              className="link"
              style={{ fontSize: '0.8rem', padding: '2px 6px' }}
              onClick={() => onReply(latestMail)}
            >
              Full Editor ✎
            </button>
          </div>
          <textarea
            rows={3}
            value={quickReplyText}
            onChange={e => setQuickReplyText(e.target.value)}
            placeholder={`Write a quick reply to @${otherAcc?.handle || 'user'}...`}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={!quickReplyText.trim() || quickReplyBusy}
              className="primary-btn"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              {quickReplyBusy ? 'Sending...' : 'Send Reply ↗'}
            </button>
          </div>
        </form>
      )}

      {/* Bottom Reply/Forward Actions */}
      <div className="detail-bottom-actions">
        <button className="primary-btn" onClick={() => onReply(latestMail)}>
          ↩ Reply
        </button>
        <button onClick={() => onReplyAll(latestMail)}>👥 Reply All</button>
        <button onClick={() => onForward(latestMail)}>➜ Forward</button>
      </div>
    </div>
  );
};
