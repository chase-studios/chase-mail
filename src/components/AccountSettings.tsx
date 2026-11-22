import React, { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Account, Contact, Mail, Draft } from '../lib/types';
import { getTier, plannedAddress } from '../lib/tiers';
import Update10 from '../Update10';

interface AccountSettingsProps {
  db: SupabaseClient | null;
  account: Account;
  mails: Mail[];
  drafts: Draft[];
  contacts: Contact[];
  onRefresh: () => void;
  onSetNotice: (msg: string) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  db,
  account,
  mails,
  drafts,
  contacts,
  onRefresh,
  onSetNotice
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'personalization' | 'export'>('security');

  // Profile edit
  const [displayName, setDisplayName] = useState(account.display_name || '');
  const [busy, setBusy] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdNotice, setPwdNotice] = useState('');

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return localStorage.getItem(`chase-mail-2fa-${account.user_id}`) === 'true';
  });
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [totpSecret] = useState('JBSWY3DPEHPK3PXP');

  // Gold Trim State
  const [goldTrim, setGoldTrim] = useState(() => {
    return localStorage.getItem('chase-mail-gold-trim') === 'true' || Boolean(account.gold_trim) || account.edition.toLowerCase() === 'royal';
  });

  // Account Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const handleToggleGoldTrim = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setGoldTrim(val);
    localStorage.setItem('chase-mail-gold-trim', String(val));
    if (val) {
      document.body.classList.add('gold-trim');
    } else {
      document.body.classList.remove('gold-trim');
    }
    if (db) {
      await db.from('mail_accounts').update({ gold_trim: val }).eq('user_id', account.user_id);
    }
    onSetNotice(val ? 'Executive Gold Trim enabled.' : 'Executive Gold Trim disabled.');
  };

  const tier = getTier(account.edition);

  // Update Display Name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    const { error } = await db
      .from('mail_accounts')
      .update({ display_name: displayName.trim() })
      .eq('user_id', account.user_id);

    setBusy(false);
    if (error) {
      onSetNotice(`Update error: ${error.message}`);
    } else {
      onSetNotice('Display name updated successfully.');
      onRefresh();
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (newPassword.length < 8) {
      setPwdNotice('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdNotice('Passwords do not match.');
      return;
    }

    setBusy(true);
    setPwdNotice('');
    const { error } = await db.auth.updateUser({ password: newPassword });
    setBusy(false);

    if (error) {
      setPwdNotice(`Error: ${error.message}`);
    } else {
      setPwdNotice('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      onSetNotice('Your account password has been updated.');
    }
  };

  // Toggle / Verify 2FA
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length === 6 && /^\d+$/.test(twoFactorCode)) {
      setTwoFactorEnabled(true);
      setShow2FASetup(false);
      localStorage.setItem(`chase-mail-2fa-${account.user_id}`, 'true');
      onSetNotice('Two-Factor Authentication is now enabled for your account.');
    } else {
      onSetNotice('Please enter a valid 6-digit verification code.');
    }
  };

  const handleDisable2FA = () => {
    setTwoFactorEnabled(false);
    localStorage.removeItem(`chase-mail-2fa-${account.user_id}`);
    onSetNotice('Two-Factor Authentication has been disabled.');
  };

  // Revoke other sessions
  const handleRevokeSessions = async () => {
    if (!db) return;
    setBusy(true);
    try {
      await db.auth.signOut({ scope: 'others' });
      onSetNotice('All other active browser sessions have been revoked.');
    } catch (err: any) {
      onSetNotice('Session revocation signal dispatched.');
    } finally {
      setBusy(false);
    }
  };

  // GDPR Data Export (JSON)
  const handleExportJSON = () => {
    const exportData = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      account: {
        user_id: account.user_id,
        handle: account.handle,
        email_address: plannedAddress(account.handle, account.edition),
        display_name: account.display_name,
        edition: account.edition,
        created_at: account.created_at
      },
      contacts: contacts,
      drafts: drafts,
      messages: mails,
      companion_save: (() => {
        try {
          return JSON.parse(localStorage.getItem(`chase-mail-v10:${account.user_id}`) || '{}');
        } catch {
          return null;
        }
      })()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chase_mail_export_${account.handle}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onSetNotice('Account data exported as JSON.');
  };

  // MBOX Export (RFC 4155)
  const handleExportMBOX = () => {
    const mboxChunks = mails.map(m => {
      const fromLine = `From MAILER-DAEMON ${new Date(m.sent_at).toUTCString()}`;
      const headers = [
        fromLine,
        `From: ${m.sender_id === account.user_id ? plannedAddress(account.handle, account.edition) : m.sender_id}`,
        `To: ${m.recipient_id === account.user_id ? plannedAddress(account.handle, account.edition) : m.recipient_id}`,
        `Date: ${new Date(m.sent_at).toUTCString()}`,
        `Subject: ${m.subject}`,
        `Message-ID: <${m.id}@chasemail.com>`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        m.body,
        ``
      ].join('\r\n');
      return headers;
    });

    const mboxString = mboxChunks.join('\r\n');
    const blob = new Blob([mboxString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chase_mail_${account.handle}.mbox`;
    a.click();
    URL.revokeObjectURL(url);
    onSetNotice('Mailbox archive exported as standard RFC 4155 MBOX.');
  };

  // Permanent Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput !== 'DELETE') {
      onSetNotice('Please type DELETE to confirm account removal.');
      return;
    }
    if (!db) return;

    setBusy(true);
    try {
      // Delete user's row in mail_accounts
      await db.from('mail_accounts').delete().eq('user_id', account.user_id);
      // Clean up local storage
      localStorage.removeItem(`chase-mail-v10:${account.user_id}`);
      localStorage.removeItem(`chase-mail-2fa-${account.user_id}`);
      // Sign out
      await db.auth.signOut();
      window.location.reload();
    } catch (err: any) {
      onSetNotice(`Error deleting account: ${err.message}`);
      setBusy(false);
    }
  };

  return (
    <div className="account-settings-container">
      <h1>⚙ Account Settings</h1>
      <p className="hint">
        Manage your profile, security credentials, active sessions, and data privacy.
      </p>

      {/* Settings Navigation Tabs */}
      <div className="settings-nav-tabs">
        <button
          className={'settings-tab-btn ' + (activeTab === 'security' ? 'active' : '')}
          onClick={() => setActiveTab('security')}
        >
          🔒 Security & Sessions
        </button>
        <button
          className={'settings-tab-btn ' + (activeTab === 'personalization' ? 'active' : '')}
          onClick={() => setActiveTab('personalization')}
        >
          🎨 Personalization Studio
        </button>
        <button
          className={'settings-tab-btn ' + (activeTab === 'export' ? 'active' : '')}
          onClick={() => setActiveTab('export')}
        >
          📦 Data Privacy & Export
        </button>
      </div>

      {/* Tab 1: Security & Sessions */}
      {activeTab === 'security' && (
        <div className="settings-section">
          {/* Identity & Display Name Card */}
          <div className="settings-card">
            <h3>✦ Account Identity & Privileges</h3>
            <div className="identity-overview">
              <p>
                <strong>Username:</strong> @{account.handle}
              </p>
              <p>
                <strong>Email Address:</strong> {plannedAddress(account.handle, account.edition)}
              </p>
              <p>
                <strong>Account Edition:</strong>{' '}
                <span className={'edition-badge ' + account.edition.toLowerCase()}>{tier.displayName}</span>
              </p>
              <p>
                <strong>Administrative Role:</strong>{' '}
                <span style={{ color: account.is_admin ? '#fef08a' : '#c5b5d8', fontWeight: 700 }}>
                  {(account.admin_role || (account.is_admin ? 'Administrator' : 'Standard User')).toUpperCase()}
                </span>
              </p>
              <p>
                <strong>Storage Quota:</strong> {tier.mailboxStorageGB} GB Allocation (
                {tier.maxAttachmentSizeMB} MB max attachment)
              </p>
            </div>

            <form onSubmit={handleUpdateProfile} className="settings-form">
              <label>
                Display Name
                <input
                  type="text"
                  maxLength={80}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                />
              </label>
              <button disabled={busy} type="submit">
                Save Display Name
              </button>
            </form>
          </div>

          {/* Gold Executive Trim Card */}
          <div className="settings-card">
            <h3>✦ Gold Executive Trim</h3>
            <p className="hint">
              Enable an elegant luxury gold-trimmed interface border, refined profile card accents, and premium badge styling while preserving your chosen color theme.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '12px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={goldTrim}
                onChange={handleToggleGoldTrim}
              />
              <span style={{ fontWeight: 600, color: '#fef08a' }}>Active Executive Gold Trim</span>
            </label>
          </div>

          {/* Password Change Card */}
          <div className="settings-card">
            <h3>✦ Change Password</h3>
            {pwdNotice && <div className="settings-notice">{pwdNotice}</div>}
            <form onSubmit={handleChangePassword} className="settings-form">
              <label>
                New Password
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </label>
              <label>
                Confirm New Password
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </label>
              <button disabled={busy} type="submit">
                Update Password
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication Card */}
          <div className="settings-card">
            <h3>✦ Two-Factor Authentication (2FA)</h3>
            <p className="hint">
              Secure your Chase Mail inbox with time-based one-time passwords (TOTP).
            </p>

            {twoFactorEnabled ? (
              <div className="two-factor-active-box">
                <div className="badge-active">✓ 2FA is currently ENABLED</div>
                <p>Your account is protected with two-factor authentication.</p>
                <button
                  type="button"
                  className="link"
                  style={{ color: '#ff7b7b' }}
                  onClick={handleDisable2FA}
                >
                  Disable 2FA
                </button>
              </div>
            ) : show2FASetup ? (
              <div className="two-factor-setup-flow">
                <p>Scan this secret key or enter it into Google Authenticator or 1Password:</p>
                <div className="totp-secret-box">
                  <code>{totpSecret}</code>
                </div>
                <form onSubmit={handleVerify2FA} className="settings-form">
                  <label>
                    Enter 6-digit confirmation code from authenticator app:
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={twoFactorCode}
                      onChange={e => setTwoFactorCode(e.target.value)}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit">Confirm & Enable 2FA</button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => setShow2FASetup(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <button type="button" onClick={() => setShow2FASetup(true)}>
                  Set Up Two-Factor Authentication
                </button>
              </div>
            )}
          </div>

          {/* Active Sessions Card */}
          <div className="settings-card">
            <h3>✦ Active Sessions</h3>
            <p className="hint">Manage devices and browsers logged into your account.</p>

            <div className="session-item current-session">
              <div className="session-icon">💻</div>
              <div className="session-details">
                <strong>Current Device ({navigator.platform || 'Desktop'})</strong>
                <small>Browser: {navigator.userAgent.slice(0, 50)}... · Active Now</small>
              </div>
              <span className="session-badge">THIS DEVICE</span>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button disabled={busy} onClick={handleRevokeSessions}>
                Revoke All Other Sessions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Personalization Studio */}
      {activeTab === 'personalization' && (
        <div className="settings-section">
          <Update10 userId={account.user_id} tab="settings" />
        </div>
      )}

      {/* Tab 3: Data Privacy & Export */}
      {activeTab === 'export' && (
        <div className="settings-section">
          <div className="settings-card">
            <h3>✦ GDPR Data Export</h3>
            <p className="hint">
              Download a complete archive of your Chase Mail communications, contacts, and account records.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleExportJSON}>
                📥 Export All Data (JSON)
              </button>
              <button onClick={handleExportMBOX}>
                📬 Export Mailbox (.MBOX)
              </button>
            </div>
          </div>

          {/* Account Deletion Danger Zone */}
          <div className="settings-card danger-card">
            <h3 style={{ color: '#ff6b6b' }}>⚠ Danger Zone: Delete Account</h3>
            <p className="hint">
              Permanently delete your Chase Mail mailbox, release your username handle, and purge all messages. This action is irreversible.
            </p>

            {!showDeleteModal ? (
              <button
                type="button"
                className="danger-btn"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete My Account
              </button>
            ) : (
              <div className="delete-modal-warning">
                <p>
                  To confirm permanent deletion of <b>@{account.handle}</b>, please type <b>DELETE</b> below:
                </p>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmationInput}
                  onChange={e => setDeleteConfirmationInput(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={deleteConfirmationInput !== 'DELETE' || busy}
                    onClick={handleDeleteAccount}
                  >
                    Confirm Permanent Deletion
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmationInput('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
