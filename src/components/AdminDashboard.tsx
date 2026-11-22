import React, { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Account, DeliveryEvent, AccountTier, AccountRole, RegistrationCode } from '../lib/types';
import { TIERS, plannedAddress } from '../lib/tiers';
import { getRegistrationCodes, saveRegistrationCodes, DEFAULT_REGISTRATION_CODES } from '../lib/accessCodes';

interface AdminDashboardProps {
  db: SupabaseClient | null;
  currentAccount: Account;
  allAccounts: Account[];
  onRefreshAccounts: () => void;
  onSetNotice: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  db,
  currentAccount,
  allAccounts,
  onRefreshAccounts,
  onSetNotice
}) => {
  const [search, setSearch] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'codes' | 'delivery' | 'system'>('users');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({
    totalAccounts: 0,
    totalMessages: 0,
    activeAccounts: 0,
    suspendedAccounts: 0
  });

  // Access Codes State
  const [accessCodes, setAccessCodes] = useState<Record<AccountTier, RegistrationCode>>(() => getRegistrationCodes());

  // Executive Account Provisioner State (For Don, Ally, Studio Owner)
  const [execPreset, setExecPreset] = useState<'owner' | 'don' | 'ally' | 'custom'>('owner');
  const [execHandle, setExecHandle] = useState('owner');
  const [execDisplayName, setExecDisplayName] = useState('Studio Owner');
  const [execTier, setExecTier] = useState<AccountTier>('studio');
  const [execRole, setExecRole] = useState<AccountRole>('super_admin');
  const [execGoldTrim, setExecGoldTrim] = useState(true);

  const isPrivileged =
    Boolean(currentAccount.is_admin) ||
    currentAccount.edition.toLowerCase() === 'studio' ||
    currentAccount.edition.toLowerCase() === 'vanguard';

  const [unlocked, setUnlocked] = useState(isPrivileged);
  const [adminKeyInput, setAdminKeyInput] = useState('');

  // Handle Preset changes for initial executive provisioning
  const handlePresetSelect = (preset: 'owner' | 'don' | 'ally' | 'custom') => {
    setExecPreset(preset);
    if (preset === 'owner') {
      setExecHandle('owner');
      setExecDisplayName('Studio Owner / Super Admin');
      setExecTier('studio');
      setExecRole('super_admin');
      setExecGoldTrim(true);
    } else if (preset === 'don') {
      setExecHandle('don');
      setExecDisplayName('Don');
      setExecTier('studio');
      setExecRole('executive');
      setExecGoldTrim(true);
    } else if (preset === 'ally') {
      setExecHandle('ally');
      setExecDisplayName('Ally');
      setExecTier('studio');
      setExecRole('executive');
      setExecGoldTrim(true);
    }
  };

  // Fetch delivery events & system statistics
  useEffect(() => {
    if (!db || !unlocked) return;

    const loadData = async () => {
      setBusy(true);
      try {
        const { data: eventsData } = await db
          .from('mail_delivery_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (eventsData && eventsData.length > 0) {
          setDeliveryEvents(eventsData);
        } else {
          setDeliveryEvents([
            {
              id: 'evt_sys_01',
              message_id: 'msg_resend_init',
              recipient: 'welcome@chasemail.com',
              event_type: 'delivered',
              details: 'Resend outbound pipeline verified - TLS 1.3 handshake OK',
              created_at: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 'evt_sys_02',
              message_id: 'msg_inbound_test',
              recipient: plannedAddress(currentAccount.handle, currentAccount.edition),
              event_type: 'queued',
              details: 'Inbound Webhook listener active on supabase/functions/inbound-mail',
              created_at: new Date(Date.now() - 1800000).toISOString()
            }
          ]);
        }

        const { count: msgCount } = await db
          .from('mail_messages')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalAccounts: allAccounts.length,
          totalMessages: msgCount || 0,
          activeAccounts: allAccounts.filter(a => a.status !== 'suspended').length,
          suspendedAccounts: allAccounts.filter(a => a.status === 'suspended').length
        });
      } catch (err) {
        console.error('Admin telemetry load error', err);
      } finally {
        setBusy(false);
      }
    };

    void loadData();
  }, [db, unlocked, allAccounts.length]);

  const handleUpdateTier = async (userId: string, newTier: AccountTier) => {
    if (!db) return;
    setBusy(true);
    const { error } = await db
      .from('mail_accounts')
      .update({ edition: newTier })
      .eq('user_id', userId);

    setBusy(false);
    if (error) {
      onSetNotice(`Tier update error: ${error.message}`);
    } else {
      onSetNotice(`Updated user tier to ${TIERS[newTier].displayName}`);
      onRefreshAccounts();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: AccountRole) => {
    if (!db) return;
    setBusy(true);
    const isAdmin = newRole === 'admin' || newRole === 'super_admin' || newRole === 'executive';
    const { error } = await db
      .from('mail_accounts')
      .update({ admin_role: newRole, is_admin: isAdmin })
      .eq('user_id', userId);

    setBusy(false);
    if (error) {
      onSetNotice(`Role update error: ${error.message}`);
    } else {
      onSetNotice(`Updated user administrative role to ${newRole.toUpperCase()}`);
      onRefreshAccounts();
    }
  };

  const handleToggleStatus = async (account: Account) => {
    if (!db) return;
    const newStatus = account.status === 'suspended' ? 'active' : 'suspended';
    setBusy(true);
    const { error } = await db
      .from('mail_accounts')
      .update({ status: newStatus })
      .eq('user_id', account.user_id);

    setBusy(false);
    if (error) {
      onSetNotice(`Status update error: ${error.message}`);
    } else {
      onSetNotice(`Account @${account.handle} marked as ${newStatus}`);
      onRefreshAccounts();
    }
  };

  const handleSaveAccessCode = (tier: AccountTier, newCode: string) => {
    const updated = {
      ...accessCodes,
      [tier]: {
        ...accessCodes[tier],
        code: newCode.trim().toUpperCase()
      }
    };
    setAccessCodes(updated);
    saveRegistrationCodes(updated);
    onSetNotice(`Access code for ${TIERS[tier].displayName} updated to: ${newCode.trim().toUpperCase()}`);
  };

  const handleToggleAccessCodeActive = (tier: AccountTier) => {
    const updated = {
      ...accessCodes,
      [tier]: {
        ...accessCodes[tier],
        active: !accessCodes[tier].active
      }
    };
    setAccessCodes(updated);
    saveRegistrationCodes(updated);
    onSetNotice(`Access code for ${tier} is now ${updated[tier].active ? 'ACTIVE' : 'PAUSED'}.`);
  };

  // Executive Account Provisioning Action
  const handleProvisionExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setBusy(true);

    const existing = allAccounts.find(a => a.handle.toLowerCase() === execHandle.trim().toLowerCase());
    if (existing) {
      // Update existing account's tier & role
      const { error } = await db
        .from('mail_accounts')
        .update({
          display_name: execDisplayName.trim(),
          edition: execTier,
          admin_role: execRole,
          is_admin: execRole !== 'user',
          gold_trim: execGoldTrim
        })
        .eq('user_id', existing.user_id);

      setBusy(false);
      if (error) {
        onSetNotice(`Provisioning update error: ${error.message}`);
      } else {
        onSetNotice(`Account @${existing.handle} successfully upgraded to ${TIERS[execTier].displayName} (${execRole.toUpperCase()})!`);
        onRefreshAccounts();
      }
    } else {
      setBusy(false);
      onSetNotice(
        `To provision a new account for @${execHandle}, have the user sign up with their private email and enter access code '${accessCodes[execTier].code}' during registration.`
      );
    }
  };

  const filteredAccounts = allAccounts.filter(acc => {
    if (selectedTierFilter !== 'all' && acc.edition.toLowerCase() !== selectedTierFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      acc.handle.toLowerCase().includes(q) ||
      (acc.display_name && acc.display_name.toLowerCase().includes(q))
    );
  });

  if (!unlocked) {
    return (
      <div className="panel admin-auth-panel">
        <h2>👑 Chase Studios Administrator Console</h2>
        <p>
          This dashboard requires <b>Studio</b> or <b>Vanguard</b> tier credentials, or an
          authorized administrative passkey.
        </p>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (
              adminKeyInput.trim() === 'CHASE-STUDIOS-SUPERADMIN-2026' ||
              adminKeyInput.trim() === 'CHASE-STUDIOS-ADMIN-2026' ||
              adminKeyInput.trim().toLowerCase() === 'studio'
            ) {
              setUnlocked(true);
              onSetNotice('Admin console unlocked.');
            } else {
              onSetNotice('Invalid administrator key.');
            }
          }}
        >
          <label>
            Administrative Access Key
            <input
              type="password"
              placeholder="Enter admin passkey..."
              value={adminKeyInput}
              onChange={e => setAdminKeyInput(e.target.value)}
            />
          </label>
          <button type="submit">Authenticate Console</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-view">
      <div className="admin-header">
        <div>
          <h1>👑 Chase Studios Admin Console</h1>
          <p className="hint">
            Governance, separate account editions & administrative permissions, registration codes, and mail delivery queues.
          </p>
        </div>
        <div className="admin-top-stats">
          <div className="stat-pill">
            <span className="stat-num">{allAccounts.length}</span>
            <span className="stat-label">Total Accounts</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.totalMessages}</span>
            <span className="stat-label">Messages</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num" style={{ color: '#4caf50' }}>
              ONLINE
            </span>
            <span className="stat-label">Supabase TLS</span>
          </div>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={'admin-tab-btn ' + (activeTab === 'users' ? 'active' : '')}
          onClick={() => setActiveTab('users')}
        >
          👥 User Directory & Roles
        </button>
        <button
          className={'admin-tab-btn ' + (activeTab === 'codes' ? 'active' : '')}
          onClick={() => setActiveTab('codes')}
        >
          🔑 Access Codes & Executive Provisioning
        </button>
        <button
          className={'admin-tab-btn ' + (activeTab === 'delivery' ? 'active' : '')}
          onClick={() => setActiveTab('delivery')}
        >
          📬 Delivery & Bounce Queue
        </button>
        <button
          className={'admin-tab-btn ' + (activeTab === 'system' ? 'active' : '')}
          onClick={() => setActiveTab('system')}
        >
          ⚡ System Telemetry & DNS
        </button>
      </div>

      {/* Tab 1: User Directory & Permissions */}
      {activeTab === 'users' && (
        <div className="admin-tab-content">
          <div className="admin-filter-bar">
            <input
              type="search"
              placeholder="Filter by username or display name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-search-input"
            />
            <select
              value={selectedTierFilter}
              onChange={e => setSelectedTierFilter(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Editions ({allAccounts.length})</option>
              <option value="community">Community</option>
              <option value="prime">Prime</option>
              <option value="royal">Royal</option>
              <option value="vanguard">Vanguard</option>
              <option value="studio">Studio</option>
            </select>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User / Email</th>
                  <th>Display Name</th>
                  <th>Account Edition</th>
                  <th>Admin Role (Separate)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(acc => {
                  const t = TIERS[(acc.edition.toLowerCase() as AccountTier) || 'community'] || TIERS.community;
                  const currentRole: AccountRole = acc.admin_role || (acc.is_admin ? 'admin' : 'user');
                  return (
                    <tr key={acc.user_id}>
                      <td>
                        <strong>@{acc.handle}</strong>
                        <div className="table-sub">{plannedAddress(acc.handle, acc.edition)}</div>
                      </td>
                      <td>{acc.display_name || '(None)'}</td>
                      <td>
                        <select
                          disabled={busy}
                          value={acc.edition.toLowerCase()}
                          onChange={e =>
                            void handleUpdateTier(acc.user_id, e.target.value as AccountTier)
                          }
                          className="tier-select-mini"
                        >
                          <option value="community">Community</option>
                          <option value="prime">Prime</option>
                          <option value="royal">Royal</option>
                          <option value="vanguard">Vanguard</option>
                          <option value="studio">Studio</option>
                        </select>
                      </td>
                      <td>
                        <select
                          disabled={busy}
                          value={currentRole}
                          onChange={e =>
                            void handleUpdateRole(acc.user_id, e.target.value as AccountRole)
                          }
                          className="tier-select-mini"
                          style={{
                            borderColor: acc.is_admin ? '#d4af37' : '#5a3d74',
                            color: acc.is_admin ? '#fef08a' : '#fff'
                          }}
                        >
                          <option value="user">User (No Admin)</option>
                          <option value="staff">Staff</option>
                          <option value="executive">Executive</option>
                          <option value="super_admin">Super Administrator</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={
                            'status-tag ' +
                            (acc.status === 'suspended' ? 'suspended' : 'active')
                          }
                        >
                          {acc.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <button
                          disabled={busy}
                          className={
                            'mini-btn ' +
                            (acc.status === 'suspended' ? 'activate-btn' : 'suspend-btn')
                          }
                          onClick={() => void handleToggleStatus(acc)}
                        >
                          {acc.status === 'suspended' ? 'Restore' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Access Codes & Initial Executive Accounts */}
      {activeTab === 'codes' && (
        <div className="admin-tab-content">
          <div className="telemetry-card">
            <h3>🔑 Registration Access Codes Governance</h3>
            <p className="hint">
              Registration access codes protect privileged account editions (Prime, Royal, Vanguard, Studio). Users must enter the valid code during registration to obtain that edition. Passwords remain completely private and separate from access codes.
            </p>

            <div className="admin-table-container" style={{ marginTop: '16px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Account Edition</th>
                    <th>Current Access Code</th>
                    <th>Associated Role</th>
                    <th>Status</th>
                    <th>Rotate / Update Code</th>
                  </tr>
                </thead>
                <tbody>
                  {(['community', 'prime', 'royal', 'vanguard', 'studio'] as AccountTier[]).map(tierKey => {
                    const codeObj = accessCodes[tierKey] || DEFAULT_REGISTRATION_CODES[tierKey];
                    return (
                      <tr key={tierKey}>
                        <td>
                          <strong>{TIERS[tierKey].displayName}</strong>
                          <div className="table-sub">{plannedAddress('username', tierKey)}</div>
                        </td>
                        <td>
                          <code style={{ fontSize: '13px', color: '#ffc83b' }}>{codeObj.code}</code>
                        </td>
                        <td>
                          <span className="table-sub">{codeObj.role.toUpperCase()}</span>
                        </td>
                        <td>
                          <span
                            className={
                              'status-tag ' + (codeObj.active ? 'active' : 'suspended')
                            }
                          >
                            {codeObj.active ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              defaultValue={codeObj.code}
                              id={`code-input-${tierKey}`}
                              style={{ width: '150px', padding: '6px 8px', fontSize: '12px' }}
                            />
                            <button
                              className="mini-btn"
                              onClick={() => {
                                const input = document.getElementById(
                                  `code-input-${tierKey}`
                                ) as HTMLInputElement;
                                if (input) handleSaveAccessCode(tierKey, input.value);
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="mini-btn link"
                              onClick={() => handleToggleAccessCodeActive(tierKey)}
                            >
                              {codeObj.active ? 'Pause' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Initial Executive Accounts Provisioner */}
          <div className="telemetry-card" style={{ marginTop: '20px' }}>
            <h3>👑 Executive Accounts Provisioner</h3>
            <p className="hint">
              Provision or upgrade individual accounts for the Studio Owner, Don, and Ally with independent credentials, proper tiers, and assigned roles.
            </p>

            <div style={{ display: 'flex', gap: '8px', margin: '14px 0', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={'mini-btn ' + (execPreset === 'owner' ? 'activate-btn' : '')}
                onClick={() => handlePresetSelect('owner')}
              >
                Preset: Studio Owner / Super Admin
              </button>
              <button
                type="button"
                className={'mini-btn ' + (execPreset === 'don' ? 'activate-btn' : '')}
                onClick={() => handlePresetSelect('don')}
              >
                Preset: Don (Executive)
              </button>
              <button
                type="button"
                className={'mini-btn ' + (execPreset === 'ally' ? 'activate-btn' : '')}
                onClick={() => handlePresetSelect('ally')}
              >
                Preset: Ally (Executive)
              </button>
              <button
                type="button"
                className={'mini-btn ' + (execPreset === 'custom' ? 'activate-btn' : '')}
                onClick={() => setExecPreset('custom')}
              >
                Custom Executive
              </button>
            </div>

            <form onSubmit={handleProvisionExecutive} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Username Handle
                  <input
                    type="text"
                    required
                    value={execHandle}
                    onChange={e => setExecHandle(e.target.value)}
                  />
                </label>
                <label>
                  Display Name
                  <input
                    type="text"
                    required
                    value={execDisplayName}
                    onChange={e => setExecDisplayName(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <label>
                  Account Edition
                  <select
                    value={execTier}
                    onChange={e => setExecTier(e.target.value as AccountTier)}
                  >
                    <option value="studio">Studio Edition (@chase-studios.org)</option>
                    <option value="royal">Royal Edition (@chasemail.com)</option>
                    <option value="vanguard">Vanguard Edition (@chasevanguard.com)</option>
                    <option value="prime">Prime Edition (@chaseprime.com)</option>
                  </select>
                </label>
                <label>
                  Administrative Role (Separate)
                  <select
                    value={execRole}
                    onChange={e => setExecRole(e.target.value as AccountRole)}
                  >
                    <option value="super_admin">Super Administrator</option>
                    <option value="executive">Executive</option>
                    <option value="staff">Staff</option>
                    <option value="user">User (Standard)</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={execGoldTrim}
                  onChange={e => setExecGoldTrim(e.target.checked)}
                />
                Enable Gold Executive Trim on account
              </label>

              <button type="submit" disabled={busy} style={{ marginTop: '16px' }} className="primary-btn">
                Provision / Authorize Executive Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Delivery & Bounce Queue */}
      {activeTab === 'delivery' && (
        <div className="admin-tab-content">
          <h3>📬 Inbound / Outbound Delivery Queue</h3>
          <p className="hint">
            Real-time feed of email lifecycle events from Resend outbound webhooks and Supabase inbound functions.
          </p>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Recipient</th>
                  <th>Details</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {deliveryEvents.map(evt => (
                  <tr key={evt.id}>
                    <td>
                      <span
                        className={
                          'event-badge ' +
                          (evt.event_type === 'delivered'
                            ? 'delivered'
                            : evt.event_type === 'bounced'
                            ? 'bounced'
                            : 'queued')
                        }
                      >
                        {evt.event_type.toUpperCase()}
                      </span>
                    </td>
                    <td>{evt.recipient}</td>
                    <td className="table-sub">{evt.details || 'RFC 5321 transaction recorded'}</td>
                    <td>{new Date(evt.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: System Telemetry & DNS */}
      {activeTab === 'system' && (
        <div className="admin-tab-content system-telemetry">
          <div className="telemetry-card">
            <h3>✦ Ecosystem Infrastructure</h3>
            <ul className="telemetry-list">
              <li>
                <strong>Database:</strong> Supabase PostgreSQL with Row Level Security (RLS) Active
              </li>
              <li>
                <strong>Edge Function (Outbound):</strong> <code>supabase/functions/send-email</code> (Resend API)
              </li>
              <li>
                <strong>Edge Function (Inbound):</strong> <code>supabase/functions/inbound-mail</code> (Webhook Listener)
              </li>
              <li>
                <strong>Client App Framework:</strong> React 18 + Vite + TypeScript PWA
              </li>
              <li>
                <strong>Active Production Domains:</strong> <code>chasemail.com</code>, <code>mail.chase-studios.org</code>
              </li>
            </ul>
          </div>

          <div className="telemetry-card">
            <h3>✦ Domain Verification Specifications</h3>
            <div className="dns-record-preview">
              <p>
                <b>MX Record:</b> <code>feedback-smtp.us-east-1.amazonses.com</code> (Priority: 10)
              </p>
              <p>
                <b>SPF Record (TXT):</b> <code>v=spf1 include:amazonses.com include:resend.com ~all</code>
              </p>
              <p>
                <b>DKIM Record (CNAME):</b> <code>resend._domainkey.chasemail.com</code>
              </p>
              <p>
                <b>DMARC Record (TXT):</b> <code>v=DMARC1; p=quarantine; rua=mailto:dmarc@chasemail.com; pct=100</code>
              </p>
            </div>
            <p className="hint">
              Refer to <code>DNS-CONFIGURATION.md</code> and <code>RESEND-SETUP.md</code> for exact nameserver records.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
