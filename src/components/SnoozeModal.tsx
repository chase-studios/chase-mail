import React, { useState } from 'react';

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (untilIsoString: string) => void;
  mailSubject?: string;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  isOpen,
  onClose,
  onSnooze,
  mailSubject
}) => {
  const [customDateTime, setCustomDateTime] = useState('');

  if (!isOpen) return null;

  const handleQuickSnooze = (type: 'later_today' | 'tomorrow_morning' | 'this_weekend' | 'next_week') => {
    const now = new Date();
    let target = new Date();

    if (type === 'later_today') {
      target.setHours(now.getHours() + 4);
    } else if (type === 'tomorrow_morning') {
      target.setDate(now.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (type === 'this_weekend') {
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
      target.setDate(now.getDate() + daysUntilSaturday);
      target.setHours(9, 0, 0, 0);
    } else if (type === 'next_week') {
      const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
      target.setDate(now.getDate() + daysUntilMonday);
      target.setHours(9, 0, 0, 0);
    }

    onSnooze(target.toISOString());
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDateTime) return;
    const parsed = new Date(customDateTime);
    if (!isNaN(parsed.getTime())) {
      onSnooze(parsed.toISOString());
      onClose();
    }
  };

  return (
    <div className="snooze-modal-backdrop" onClick={onClose}>
      <div className="snooze-modal" onClick={e => e.stopPropagation()}>
        <div className="snooze-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⏰</span>
            <h3 style={{ margin: 0, color: '#fff' }}>Snooze Email</h3>
          </div>
          <button className="link" onClick={onClose} style={{ color: '#aaa', fontSize: '1.1rem' }}>
            ✕
          </button>
        </div>

        {mailSubject && (
          <p className="snooze-modal-subject">
            Temporarily hide <strong>"{mailSubject.slice(0, 50)}{mailSubject.length > 50 ? '...' : ''}"</strong> until:
          </p>
        )}

        <div className="snooze-options-list">
          <button
            type="button"
            className="snooze-option-btn"
            onClick={() => handleQuickSnooze('later_today')}
          >
            <span className="snooze-icon">⛅</span>
            <div className="snooze-text">
              <strong>Later Today</strong>
              <small>+4 hours from now</small>
            </div>
          </button>

          <button
            type="button"
            className="snooze-option-btn"
            onClick={() => handleQuickSnooze('tomorrow_morning')}
          >
            <span className="snooze-icon">🌅</span>
            <div className="snooze-text">
              <strong>Tomorrow Morning</strong>
              <small>9:00 AM</small>
            </div>
          </button>

          <button
            type="button"
            className="snooze-option-btn"
            onClick={() => handleQuickSnooze('this_weekend')}
          >
            <span className="snooze-icon">☕</span>
            <div className="snooze-text">
              <strong>This Weekend</strong>
              <small>Saturday at 9:00 AM</small>
            </div>
          </button>

          <button
            type="button"
            className="snooze-option-btn"
            onClick={() => handleQuickSnooze('next_week')}
          >
            <span className="snooze-icon">🗓</span>
            <div className="snooze-text">
              <strong>Next Week</strong>
              <small>Monday at 9:00 AM</small>
            </div>
          </button>
        </div>

        <form onSubmit={handleCustomSubmit} className="snooze-custom-form">
          <label style={{ fontSize: '0.8rem', color: '#ba9cc8', display: 'block', marginBottom: '6px' }}>
            Pick custom date & time:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="datetime-local"
              className="snooze-datetime-input"
              value={customDateTime}
              onChange={e => setCustomDateTime(e.target.value)}
              required
            />
            <button type="submit" className="primary-btn" style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}>
              Set ⏰
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
