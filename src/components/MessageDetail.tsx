import React, { useState } from 'react';
import { Mail, Account, MailAttachment } from '../lib/types';
import { plannedAddress } from '../lib/tiers';

interface MessageDetailProps {
  mail: Mail;
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
}

export const MessageDetail: React.FC<MessageDetailProps> = ({
  mail,
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
  onToggleSpam
}) => {
  const [previewAttachment, setPreviewAttachment] = useState<MailAttachment | null>(null);

  const senderAcc = accounts.find(a => a.user_id === mail.sender_id);
  const recipientAcc = accounts.find(a => a.user_id === mail.recipient_id);

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

  const isSender = mail.sender_id === currentUserId;

  // Export as RFC 822 .eml file
  const handleExportEml = () => {
    const emlContent = [
      `From: ${senderDisplayName}`,
      `To: ${recipientDisplayName}`,
      `Subject: ${mail.subject}`,
      `Date: ${new Date(mail.sent_at).toUTCString()}`,
      `Message-ID: <${mail.id}@chasemail.com>`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      mail.body
    ].join('\r\n');

    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mail.subject.replace(/[^a-z0-9_-]/gi, '_') || 'message'}.eml`;
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
            onClick={() => onToggleStar(mail.id)}
            title={isStarred ? 'Unstar' : 'Star message'}
          >
            {isStarred ? '★ Starred' : '☆ Star'}
          </button>

          <button
            className="icon-action-btn"
            onClick={() => onToggleArchive(mail.id)}
            title={isArchived ? 'Move to Inbox' : 'Archive message'}
          >
            {isArchived ? '📥 Unarchive' : '📦 Archive'}
          </button>

          <button
            className="icon-action-btn"
            onClick={() => onToggleSpam(mail.id)}
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
            onClick={() => onDelete(mail.id)}
            title="Delete message"
          >
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Message Header Card */}
      <div className="detail-header-card">
        <div className="detail-title-row">
          <h1>{mail.subject || '(No subject)'}</h1>
          <span className="security-badge" title="Protected via Supabase Row-Level Security & TLS">
            🔒 TLS Encrypted
          </span>
        </div>

        <div className="detail-meta-grid">
          <div className="meta-field">
            <span className="meta-label">From:</span>
            <span className="meta-value">{senderDisplayName}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">To:</span>
            <span className="meta-value">{recipientDisplayName}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Date:</span>
            <span className="meta-value">
              {new Date(mail.sent_at).toLocaleString()} (
              {new Date(mail.sent_at).toUTCString()})
            </span>
          </div>
          {mail.recipient_read_at && (
            <div className="meta-field">
              <span className="meta-label">Read:</span>
              <span className="meta-value">
                ✓ Read on {new Date(mail.recipient_read_at).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Message Body */}
      <article className="detail-body-container">{renderBody(mail.body)}</article>

      {/* Attachments (if any attached in mail) */}
      {mail.attachments && mail.attachments.length > 0 && (
        <div className="detail-attachments-box">
          <h4>Attachments ({mail.attachments.length})</h4>
          <div className="attachment-tiles">
            {mail.attachments.map(att => (
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

      {/* Bottom Reply/Forward Actions */}
      <div className="detail-bottom-actions">
        <button className="primary-btn" onClick={() => onReply(mail)}>
          ↩ Reply
        </button>
        <button onClick={() => onReplyAll(mail)}>👥 Reply All</button>
        <button onClick={() => onForward(mail)}>➜ Forward</button>
      </div>
    </div>
  );
};
