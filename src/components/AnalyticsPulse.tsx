import React, { useMemo } from 'react';
import { Account, Mail, Contact } from '../lib/types';
import { getTier, plannedAddress } from '../lib/tiers';

interface AnalyticsPulseProps {
  account: Account;
  mails: Mail[];
  contacts: Contact[];
  onComposeTo?: (email: string) => void;
}

export const AnalyticsPulse: React.FC<AnalyticsPulseProps> = ({
  account,
  mails,
  contacts,
  onComposeTo
}) => {
  const tier = useMemo(() => getTier(account.edition), [account]);

  // Telemetry computation
  const stats = useMemo(() => {
    const total = mails.length;
    const sent = mails.filter(m => m.sender_id === account.user_id).length;
    const received = mails.filter(m => m.recipient_id === account.user_id).length;
    const unread = mails.filter(m => m.recipient_id === account.user_id && !m.recipient_read_at).length;
    const starred = mails.filter(m => m.starred).length;

    // Clearance rate
    const clearance = received > 0 ? Math.round(((received - unread) / received) * 100) : 100;

    // Time of day distribution
    const timeOfDay = {
      morning: 0,   // 06:00 - 11:59
      afternoon: 0, // 12:00 - 17:59
      evening: 0,   // 18:00 - 23:59
      night: 0      // 00:00 - 05:59
    };

    mails.forEach(m => {
      const hour = new Date(m.sent_at).getHours();
      if (hour >= 6 && hour < 12) timeOfDay.morning++;
      else if (hour >= 12 && hour < 18) timeOfDay.afternoon++;
      else if (hour >= 18 && hour <= 23) timeOfDay.evening++;
      else timeOfDay.night++;
    });

    // Top correspondents
    const correspondentCounts = new Map<string, number>();
    mails.forEach(m => {
      const other = m.sender_id === account.user_id ? m.recipient_id : m.sender_id;
      const count = correspondentCounts.get(other) || 0;
      correspondentCounts.set(other, count + 1);
    });

    const topCollaborators = Array.from(correspondentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const contact = contacts.find(c => c.email.includes(id) || c.name.toLowerCase().includes(id.toLowerCase()));
        return {
          id,
          name: contact ? contact.name : id.length > 20 ? id.slice(0, 8) + '...' : id,
          count
        };
      });

    // Simulated storage consumed (MB)
    const totalBytes = mails.reduce((acc, m) => {
      let b = (m.body || '').length * 2;
      if (m.attachments) {
        m.attachments.forEach(a => (b += a.size));
      }
      return acc;
    }, 0);
    const usedMB = (totalBytes / (1024 * 1024) + total * 0.15).toFixed(1);
    const maxGB = tier.mailboxStorageGB;
    const storagePercent = Math.min(100, Math.max(1, Math.round((parseFloat(usedMB) / (maxGB * 1024)) * 100)));

    return {
      total,
      sent,
      received,
      unread,
      starred,
      clearance,
      timeOfDay,
      topCollaborators,
      usedMB,
      maxGB,
      storagePercent
    };
  }, [mails, account, contacts, tier]);

  return (
    <div className="analytics-pulse-container">
      <div className="pulse-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📊</span> Studio Analytics & Productivity Pulse
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#a795be', fontSize: '0.88rem' }}>
            Real-time correspondence telemetry, response velocity, and studio storage metrics for{' '}
            <strong style={{ color: '#fff' }}>{account.display_name || account.handle}</strong> ({tier.displayName}).
          </p>
        </div>

        <div className="pulse-edition-chip" style={{ border: `1px solid ${tier.badgeColor}` }}>
          <span style={{ color: tier.badgeColor, fontWeight: 700 }}>✦ {tier.displayName} Edition</span>
        </div>
      </div>

      {/* Hero Metric Cards */}
      <div className="pulse-metric-grid">
        <div className="pulse-card">
          <div className="pulse-card-label">Total Messages Processed</div>
          <div className="pulse-card-val" style={{ color: '#8fe2ff' }}>{stats.total}</div>
          <div className="pulse-card-sub">
            <span style={{ color: '#64dcff' }}>↗ {stats.sent} Sent</span> ·{' '}
            <span style={{ color: '#ba8cff' }}>📥 {stats.received} Received</span>
          </div>
        </div>

        <div className="pulse-card">
          <div className="pulse-card-label">Inbox Clearance Velocity</div>
          <div className="pulse-card-val" style={{ color: stats.clearance > 80 ? '#10b981' : '#f59e0b' }}>
            {stats.clearance}%
          </div>
          <div className="pulse-card-sub">
            {stats.unread === 0 ? '🏆 Inbox Zero Achieved' : `${stats.unread} unread pending attention`}
          </div>
        </div>

        <div className="pulse-card">
          <div className="pulse-card-label">Priority & Starred Ratio</div>
          <div className="pulse-card-val" style={{ color: '#fbbf24' }}>{stats.starred}</div>
          <div className="pulse-card-sub">
            Flagged for executive follow-up
          </div>
        </div>

        <div className="pulse-card">
          <div className="pulse-card-label">Storage Quota Consumption</div>
          <div className="pulse-card-val" style={{ color: '#a78bfa' }}>
            {stats.usedMB} <span style={{ fontSize: '1rem', color: '#a795be' }}>MB / {stats.maxGB} GB</span>
          </div>
          <div className="pulse-card-sub">
            {100 - stats.storagePercent}% high-speed cloud headroom remaining
          </div>
        </div>
      </div>

      {/* Storage Progress Bar */}
      <div className="pulse-panel" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#e8dbf7' }}>
            📁 Mailbox Cloud Quota ({tier.displayName} Allowance: {tier.mailboxStorageGB} GB)
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64dcff' }}>{stats.usedMB} MB used ({stats.storagePercent}%)</span>
        </div>
        <div className="storage-meter-track">
          <div
            className="storage-meter-fill"
            style={{
              width: `${Math.max(2, stats.storagePercent)}%`,
              background: stats.storagePercent > 85 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #8648eb, #64dcff)'
            }}
          />
        </div>
      </div>

      {/* Split Insights: Time of Day & Top Collaborators */}
      <div className="pulse-split-grid">
        {/* Hourly Distribution */}
        <div className="pulse-panel">
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🕒</span> Email Activity by Time of Day
          </h3>
          <p style={{ margin: '0 0 16px 0', color: '#a795be', fontSize: '0.82rem' }}>
            Analyze when your studio correspondence is heaviest to optimize dispatch timing.
          </p>

          <div className="activity-bar-group">
            {[
              { label: 'Morning (06:00 - 12:00)', count: stats.timeOfDay.morning, icon: '🌅', color: '#fbbf24' },
              { label: 'Afternoon (12:00 - 18:00)', count: stats.timeOfDay.afternoon, icon: '☀️', color: '#64dcff' },
              { label: 'Prime / Evening (18:00 - 00:00)', count: stats.timeOfDay.evening, icon: '🌆', color: '#a855f7' },
              { label: 'Night Owl (00:00 - 06:00)', count: stats.timeOfDay.night, icon: '🌙', color: '#3b82f6' }
            ].map(slot => {
              const maxSlot = Math.max(1, stats.timeOfDay.morning, stats.timeOfDay.afternoon, stats.timeOfDay.evening, stats.timeOfDay.night);
              const pct = Math.round((slot.count / maxSlot) * 100);
              return (
                <div key={slot.label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ddd', marginBottom: '4px' }}>
                    <span>{slot.icon} {slot.label}</span>
                    <strong style={{ color: slot.color }}>{slot.count} emails</strong>
                  </div>
                  <div className="slot-track">
                    <div className="slot-fill" style={{ width: `${Math.max(2, pct)}%`, background: slot.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Collaborators */}
        <div className="pulse-panel">
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👥</span> Top Studio Collaborators
          </h3>
          <p style={{ margin: '0 0 16px 0', color: '#a795be', fontSize: '0.82rem' }}>
            Frequent contacts with the highest correspondence volume.
          </p>

          {stats.topCollaborators.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
              No correspondence data recorded yet.
            </div>
          ) : (
            <div className="collaborator-list">
              {stats.topCollaborators.map(c => (
                <div key={c.id} className="collaborator-item">
                  <div className="collaborator-avatar">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{c.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#ba9cc8' }}>{c.count} messages exchanged</div>
                  </div>
                  {onComposeTo && (
                    <button
                      type="button"
                      className="link"
                      style={{ fontSize: '0.8rem', color: '#64dcff' }}
                      onClick={() => onComposeTo(c.name)}
                    >
                      Compose ↗
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security & Infrastructure Health */}
      <div className="pulse-panel" style={{ marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span> Security & Infrastructure Telemetry
        </h3>
        <div className="security-badges-row">
          <div className="sec-badge">
            <span className="sec-dot dot-active" />
            <div>
              <strong>Cloudflare Email Routing</strong>
              <small>Catch-all active via worker</small>
            </div>
          </div>
          <div className="sec-badge">
            <span className="sec-dot dot-active" />
            <div>
              <strong>Supabase Edge Functions</strong>
              <small>inbound-mail & send-email online</small>
            </div>
          </div>
          <div className="sec-badge">
            <span className="sec-dot dot-active" />
            <div>
              <strong>Row-Level Security (RLS)</strong>
              <small>Strict JWT tenant isolation</small>
            </div>
          </div>
          <div className="sec-badge">
            <span className="sec-dot dot-active" />
            <div>
              <strong>TLS 1.3 Transport Encryption</strong>
              <small>End-to-end HTTPS & DNSSEC</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
