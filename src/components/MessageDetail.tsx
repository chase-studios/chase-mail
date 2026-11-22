import React, { useState, useMemo } from 'react';
import { Mail, Account, MailAttachment, MailLabel } from '../lib/types';
import { plannedAddress } from '../lib/tiers';
import { generateThreadSummary, generateSmartReplies } from '../lib/aiAssistant';

interface MessageDetailProps {
  mail: Mail;
  threadMails?: Mail[];
  currentUserId: string;
  accounts: Account[];
  folder: string;
  isStarred: boolean;
  isArchived: boolean;
  isSpam: boolean;
  mailLabels?: string[];
  availableLabels?: MailLabel[];
  onBack: () => void;
  onReply: (mail: Mail) => void;
  onReplyAll: (mail: Mail) => void;
  onForward: (mail: Mail) => void;
  onDelete: (mailId: string) => void;
  onToggleStar: (mailId: string) => void;
  onToggleArchive: (mailId: string) => void;
  onToggleSpam: (mailId: string) => void;
  onSnooze?: (mail: Mail) => void;
  onToggleLabel?: (mailId: string, labelName: string) => void;
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
  mailLabels = [],
  availableLabels = [],
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onToggleStar,
  onToggleArchive,
  onToggleSpam,
  onSnooze,
  onToggleLabel,
  onQuickSend
}) => {
  const [previewAttachment, setPreviewAttachment] = useState<MailAttachment | null>(null);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  // In stacked thread mode, threadMails contains all messages chronologically (oldest to newest)
  const displayMails = threadMails && threadMails.length > 0 ? threadMails : [mail];
  const isThread = displayMails.length > 1;
  const latestMail = displayMails[displayMails.length - 1];

  // AI Summary for this thread
  const aiSummary = useMemo(() => {
    return generateThreadSummary(displayMails, currentUserId);
  }, [displayMails, currentUserId]);

  // AI Smart Replies
  const smartReplies = useMemo(() => {
    const sender = accounts.find(a => a.user_id === latestMail.sender_id);
    const name = sender ? sender.display_name || sender.handle : latestMail.external_from || 'there';
    return generateSmartReplies(displayMails, name);
  }, [displayMails, latestMail, accounts]);

  // Expanded message IDs in the conversation stack (the newest message is expanded by default)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set<string>([latestMail.id]);
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
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

  const senderDisplayName = latestMail.is_external
    ? (latestMail.external_from || 'External Sender')
    : senderAcc
    ? `${senderAcc.display_name || senderAcc.handle} <${plannedAddress(
        senderAcc.handle,
        senderAcc.edition
      )}>`
    : 'Chase Mail user';

  const recipientDisplayName = latestMail.is_external
    ? (latestMail.external_to || 'You')
    : recipientAcc
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
          {onSnooze && (
            <button
              className="icon-action-btn"
              onClick={() => onSnooze(latestMail)}
              title="Snooze conversation"
            >
              ⏰ Snooze
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button
              className="icon-action-btn"
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              title="Manage Labels / Tags"
            >
              🏷 Label {mailLabels.length > 0 ? `(${mailLabels.length})` : ''} ▾
            </button>
            {showLabelPicker && (
              <div className="label-picker-dropdown">
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a894c2', marginBottom: '6px' }}>
                  TOGGLE LABELS:
                </div>
                {availableLabels.map(lbl => {
                  const isActive = mailLabels.includes(lbl.name);
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      className={`label-picker-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (onToggleLabel) onToggleLabel(latestMail.id, lbl.name);
                      }}
                    >
                      <span className="label-dot" style={{ background: lbl.color }} />
                      <span>#{lbl.name}</span>
                      {isActive && <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
          <div>
            <h1>{latestMail.subject || '(No subject)'}</h1>
            {mailLabels.length > 0 && (
              <div className="detail-label-chips" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {mailLabels.map(l => (
                  <span key={l} className="label-chip-badge">
                    #{l}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`ai-summary-toggle-btn ${showAiSummary ? 'active' : ''}`}
              onClick={() => setShowAiSummary(!showAiSummary)}
              title="Generate Instant AI Executive Briefing"
            >
              ✦ AI Summary {showAiSummary ? '▲' : '▼'}
            </button>

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

        {/* Collapsible AI Thread Summary Widget */}
        {showAiSummary && (
          <div className="ai-summary-box">
            <div className="ai-summary-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ai-sparkle-icon">✦</span>
                <strong>Chase Intelligence Executive Briefing</strong>
              </div>
              <span className={`ai-sentiment-pill sentiment-${aiSummary.sentiment}`}>
                Sentiment: {aiSummary.sentiment.toUpperCase()}
              </span>
            </div>

            <p className="ai-summary-text">{aiSummary.summary}</p>

            <div className="ai-summary-grid">
              <div className="ai-summary-col">
                <h5>Key Points</h5>
                <ul>
                  {aiSummary.keyPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="ai-summary-col">
                <h5>Action Items & Next Steps</h5>
                <ul>
                  {aiSummary.actionItems.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stacked Conversation Messages */}
      <div className="conversation-thread-stack">
        {displayMails.map(m => {
          const isExpanded = expandedIds.has(m.id);
          const isMsgSender = m.sender_id === currentUserId;
          const msgSenderAcc = accounts.find(a => a.user_id === m.sender_id);
          const msgSenderName = m.is_external
            ? m.external_from || 'External Sender'
            : isMsgSender
            ? 'You'
            : msgSenderAcc?.display_name || msgSenderAcc?.handle || 'Chase Mail user';
          const msgSenderHandle = m.is_external ? '🌐 Inbound' : msgSenderAcc ? `@${msgSenderAcc.handle}` : '';
          const msgSenderEmail = m.is_external
            ? m.external_from || ''
            : msgSenderAcc
            ? plannedAddress(msgSenderAcc.handle, msgSenderAcc.edition)
            : 'user@chasemail.com';

          return (
            <div
              key={m.id}
              className={`thread-card ${isExpanded ? 'expanded' : 'collapsed'} ${
                isMsgSender ? 'outgoing' : 'incoming'
              } ${m.is_external ? 'external-card' : ''}`}
            >
              <div className="thread-card-header" onClick={() => toggleExpand(m.id)}>
                <div className="thread-card-sender-info">
                  <div className={`thread-sender-avatar ${m.is_external ? 'external-avatar' : ''}`}>
                    {m.is_external ? '🌐' : msgSenderName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="thread-sender-text">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{msgSenderName}</strong>
                      {m.is_external && <span className="external-badge">🌐 External</span>}
                    </div>
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

      {/* Quick Reply Box with AI Smart Replies */}
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

          {/* AI Smart Replies Suggestions Bar */}
          <div className="ai-smart-replies-bar">
            <span style={{ fontSize: '0.75rem', color: '#a894c2', fontWeight: 600, alignSelf: 'center' }}>
              ✦ AI DRAFTS:
            </span>
            {smartReplies.map(reply => (
              <button
                key={reply.id}
                type="button"
                className="ai-smart-reply-pill"
                onClick={() => setQuickReplyText(reply.fullBody)}
                title={reply.snippet}
              >
                <span>{reply.icon}</span>
                <span>{reply.label}</span>
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={quickReplyText}
            onChange={e => setQuickReplyText(e.target.value)}
            placeholder={`Write a quick reply to @${otherAcc?.handle || 'user'} or tap an AI Draft above...`}
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

