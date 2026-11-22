import React, { useState, useEffect } from 'react';
import { InboxRule, Mail } from '../lib/types';
import { getInboxRules, saveInboxRules, executeRules, DEFAULT_RULES } from '../lib/inboxRules';
import { playMailSound } from '../lib/soundFx';

interface InboxRulesProps {
  userId: string;
  mails: Mail[];
  onApplyRulesResult?: (result: {
    starredIds: Set<string>;
    archivedIds: Set<string>;
    readIds: Set<string>;
    labelsToAdd: Map<string, Set<string>>;
    matchedCount: number;
  }) => void;
  onSetNotice?: (notice: string) => void;
}

export const InboxRules: React.FC<InboxRulesProps> = ({
  userId,
  mails,
  onApplyRulesResult,
  onSetNotice
}) => {
  const [rules, setRules] = useState<InboxRule[]>(() => getInboxRules(userId));
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [conditionField, setConditionField] = useState<'from' | 'subject' | 'body'>('subject');
  const [conditionOperator, setConditionOperator] = useState<'contains' | 'equals' | 'starts_with'>('contains');
  const [conditionValue, setConditionValue] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionStar, setActionStar] = useState(false);
  const [actionRead, setActionRead] = useState(false);
  const [actionArchive, setActionArchive] = useState(false);

  useEffect(() => {
    saveInboxRules(userId, rules);
  }, [rules, userId]);

  const handleToggleRule = (ruleId: string) => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
    playMailSound('action');
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
    playMailSound('trash');
  };

  const handleResetDefaults = () => {
    setRules(DEFAULT_RULES);
    playMailSound('action');
    if (onSetNotice) onSetNotice('Restored studio default automation rules.');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !conditionValue.trim()) return;

    const newRule: InboxRule = {
      id: 'rule_' + Date.now(),
      name: ruleName.trim(),
      enabled: true,
      conditionField,
      conditionOperator,
      conditionValue: conditionValue.trim(),
      actions: {
        applyLabel: actionLabel.trim() || undefined,
        markStarred: actionStar || undefined,
        markRead: actionRead || undefined,
        archive: actionArchive || undefined
      }
    };

    setRules(prev => [newRule, ...prev]);
    setRuleName('');
    setConditionValue('');
    setActionLabel('');
    setActionStar(false);
    setActionRead(false);
    setActionArchive(false);
    setShowAddModal(false);
    playMailSound('action');
    if (onSetNotice) onSetNotice(`Created automation rule "${newRule.name}"!`);
  };

  const handleRunNow = () => {
    const result = executeRules(mails, rules);
    if (onApplyRulesResult) {
      onApplyRulesResult(result);
    }
    playMailSound('send');
    if (onSetNotice) {
      onSetNotice(
        `⚡ Executed automation rules! Matched ${result.matchedCount} messages across ${rules.filter(r => r.enabled).length} active rules.`
      );
    }
  };

  return (
    <div className="inbox-rules-container">
      <div className="rules-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚡</span> Studio Inbox Rules & Automation
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#a795be', fontSize: '0.88rem' }}>
            Automate your inbox processing: auto-tag sponsor inquiries, auto-star executive emails, and organize high-volume fan mail.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleRunNow}
            style={{ padding: '8px 16px', background: '#25163a', border: '1px solid #7c4db3', color: '#64dcff' }}
          >
            ⚡ Run Rules on Inbox Now
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 18px' }}
          >
            + New Automation Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="rules-list">
        {rules.map(rule => (
          <div key={rule.id} className={`rule-card ${rule.enabled ? 'rule-active' : 'rule-disabled'}`}>
            <div className="rule-card-main">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8648eb' }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', color: rule.enabled ? '#fff' : '#888' }}>
                    {rule.name}
                  </h3>
                  <div className="rule-condition-summary">
                    <span>IF</span>
                    <strong>{rule.conditionField.toUpperCase()}</strong>
                    <span>{rule.conditionOperator.replace('_', ' ')}</span>
                    <span className="rule-keyword">"{rule.conditionValue}"</span>
                  </div>
                </div>
              </div>

              {/* Action Badges */}
              <div className="rule-actions-summary">
                <span style={{ fontSize: '0.8rem', color: '#ba9cc8', fontWeight: 600 }}>THEN:</span>
                {rule.actions.applyLabel && (
                  <span className="rule-badge badge-label">🏷 Label: {rule.actions.applyLabel}</span>
                )}
                {rule.actions.markStarred && (
                  <span className="rule-badge badge-star">⭐ Star</span>
                )}
                {rule.actions.markRead && (
                  <span className="rule-badge badge-read">✓ Mark Read</span>
                )}
                {rule.actions.archive && (
                  <span className="rule-badge badge-archive">📦 Move to Archive</span>
                )}
              </div>
            </div>

            <div className="rule-card-ops">
              <button
                type="button"
                className="card-action-btn card-action-delete"
                onClick={() => handleDeleteRule(rule.id)}
                title="Delete rule"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="link"
          style={{ fontSize: '0.82rem', color: '#ba9cc8' }}
          onClick={handleResetDefaults}
        >
          ↺ Reset to Studio Default Rules
        </button>
      </div>

      {/* Create Rule Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="rule-modal-card" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>✦ New Studio Automation Rule</h3>
              <button className="link" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="task-modal-form">
              <label>
                Rule Name *
                <input
                  required
                  type="text"
                  placeholder="e.g. Tag Discord Collab Requests"
                  value={ruleName}
                  onChange={e => setRuleName(e.target.value)}
                  autoFocus
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  When field:
                  <select
                    value={conditionField}
                    onChange={e => setConditionField(e.target.value as any)}
                  >
                    <option value="subject">Subject</option>
                    <option value="body">Message Body</option>
                    <option value="from">Sender / From Address</option>
                  </select>
                </label>

                <label>
                  Operator:
                  <select
                    value={conditionOperator}
                    onChange={e => setConditionOperator(e.target.value as any)}
                  >
                    <option value="contains">Contains Keyword</option>
                    <option value="equals">Exact Match</option>
                    <option value="starts_with">Starts With</option>
                  </select>
                </label>
              </div>

              <label>
                Keyword or Phrase *
                <input
                  required
                  type="text"
                  placeholder="e.g. sponsor, invoice, discord, urgent"
                  value={conditionValue}
                  onChange={e => setConditionValue(e.target.value)}
                />
              </label>

              <div style={{ marginTop: '10px', padding: '12px', background: '#1c1328', borderRadius: '12px', border: '1px solid #4a2c68' }}>
                <strong style={{ fontSize: '0.88rem', color: '#ba8cff', display: 'block', marginBottom: '8px' }}>
                  Execute Actions on Matching Emails:
                </strong>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={actionStar}
                    onChange={e => setActionStar(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#8648eb' }}
                  />
                  <span>⭐ Mark as Starred</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={actionRead}
                    onChange={e => setActionRead(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#8648eb' }}
                  />
                  <span>✓ Mark as Read</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={actionArchive}
                    onChange={e => setActionArchive(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#8648eb' }}
                  />
                  <span>📦 Automatically Archive</span>
                </label>

                <label style={{ display: 'block', marginTop: '10px' }}>
                  Apply Custom Tag / Label:
                  <input
                    type="text"
                    placeholder="e.g. Sponsorship, Fanmail, Legal, VIP"
                    value={actionLabel}
                    onChange={e => setActionLabel(e.target.value)}
                    style={{ marginTop: '4px' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'transparent', border: '1px solid #5a3a78' }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Rule ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
