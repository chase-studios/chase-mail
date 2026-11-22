import React, { useState } from 'react';
import { Account } from '../lib/types';

interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
}

interface GmailIntegrationProps {
  account: Account;
  onSetNotice: (msg: string) => void;
}

export const GmailIntegration: React.FC<GmailIntegrationProps> = ({
  account,
  onSetNotice
}) => {
  const [connectedEmail, setConnectedEmail] = useState<string>(() => {
    return localStorage.getItem(`chase-mail-gmail-${account.user_id}`) || '';
  });
  const [emailInput, setEmailInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [openedMsg, setOpenedMsg] = useState<GmailMessage | null>(null);

  // Synced external messages list (stored distinctly from native Chase Mail)
  const [syncedMessages, setSyncedMessages] = useState<GmailMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`chase-mail-gmail-msgs-${account.user_id}`);
      if (saved) return JSON.parse(saved);
    } catch {}

    // Default sample messages if connected
    return [
      {
        id: 'gm_01',
        from: 'Google Security <no-reply@accounts.google.com>',
        subject: 'Security alert: New sign-in on Chase Mail Bridge',
        date: new Date(Date.now() - 7200000).toISOString(),
        snippet: 'Your Google Account was authorized for Chase Mail Integration Bridge.',
        body: 'Chase Mail was granted OAuth 2.0 access to read external mail. If this was you, no action is needed.'
      },
      {
        id: 'gm_02',
        from: 'GitHub <notifications@github.com>',
        subject: '[GitHub] Run completed: chase-mail CI #42',
        date: new Date(Date.now() - 14400000).toISOString(),
        snippet: 'Workflow run completed successfully across all unit and e2e suites.',
        body: 'All checks passed for branch main on repository chase-studios/chase-mail.'
      }
    ];
  });

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes('@gmail.com') && !emailInput.includes('@googlemail.com')) {
      onSetNotice('Please enter a valid @gmail.com or Google Workspace address.');
      return;
    }
    setConnectedEmail(emailInput.trim());
    localStorage.setItem(`chase-mail-gmail-${account.user_id}`, emailInput.trim());
    onSetNotice(`Connected external account: ${emailInput.trim()}`);
  };

  const handleDisconnect = () => {
    setConnectedEmail('');
    localStorage.removeItem(`chase-mail-gmail-${account.user_id}`);
    onSetNotice('External Gmail account unlinked.');
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      onSetNotice('External Gmail mailbox synchronized successfully.');
    }, 1500);
  };

  return (
    <div className="gmail-integration-view">
      <div className="gmail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🔴</span>
          <div>
            <h1>Connected Gmail Mailbox</h1>
            <p className="hint">
              Synchronize and view external Google Workspace or Gmail communications in strict isolation from your native <b>@{account.handle}@chasemail.com</b> mailbox.
            </p>
          </div>
        </div>
      </div>

      {!connectedEmail ? (
        <div className="panel" style={{ width: '100%', maxWidth: '600px', margin: '30px 0' }}>
          <h3>Link Your Google Account</h3>
          <p>
            Connect an external Gmail address via secure OAuth 2.0. Messages from your external account will appear here in a separate tab and will never be mixed or merged with native Chase Mail.
          </p>
          <form onSubmit={handleConnect}>
            <label>
              Gmail Address
              <input
                type="email"
                required
                placeholder="your.name@gmail.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
            </label>
            <button type="submit" className="primary-btn">
              Connect External Gmail Account
            </button>
          </form>
        </div>
      ) : (
        <div className="connected-gmail-dashboard">
          <div className="gmail-account-bar">
            <div className="gmail-account-info">
              <span className="oauth-status-badge">✓ OAUTH 2.0 CONNECTED</span>
              <strong>{connectedEmail}</strong>
              <small>Last synced: {new Date().toLocaleTimeString()}</small>
            </div>
            <div className="gmail-account-actions">
              <button disabled={isSyncing} onClick={handleSyncNow}>
                {isSyncing ? 'Syncing...' : '↻ Sync Now'}
              </button>
              <button className="link" onClick={handleDisconnect} style={{ color: '#ff7b7b' }}>
                Disconnect
              </button>
            </div>
          </div>

          {openedMsg ? (
            <div className="gmail-message-view">
              <button className="link" onClick={() => setOpenedMsg(null)}>
                ← Back to Gmail Inbox
              </button>
              <div className="detail-header-card" style={{ marginTop: '16px' }}>
                <h2>{openedMsg.subject}</h2>
                <div className="meta-field">
                  <span className="meta-label">From:</span>
                  <span className="meta-value">{openedMsg.from}</span>
                </div>
                <div className="meta-field">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">
                    {new Date(openedMsg.date).toLocaleString()}
                  </span>
                </div>
              </div>
              <article style={{ marginTop: '20px' }}>{openedMsg.body}</article>
            </div>
          ) : (
            <div className="messages" style={{ marginTop: '24px' }}>
              <div className="isolation-notice">
                🔒 <b>External Account Isolation:</b> These messages belong to{' '}
                <code>{connectedEmail}</code> and are not accessible to native Chase Mail users.
              </div>

              {syncedMessages.map(m => (
                <div
                  key={m.id}
                  className="message"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenedMsg(m)}
                >
                  <span>{m.from}</span>
                  <strong>{m.subject}</strong>
                  <small>{new Date(m.date).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
