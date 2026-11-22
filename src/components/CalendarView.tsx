import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../lib/types';

interface CalendarViewProps {
  onComposeEventEmail?: (eventTitle: string) => void;
}

const STORAGE_KEY = 'chase-mail-calendar-events';

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Chase Studios Major Series Premiere',
    date: new Date(Date.now() + 86400000 * 2).toISOString(),
    category: 'youtube',
    description: 'Main channel YouTube premiere with live chat & community drop.'
  },
  {
    id: 'evt-2',
    title: 'Weekly Creator & Gaming Stream',
    date: new Date(Date.now() + 86400000 * 4).toISOString(),
    category: 'stream',
    description: 'Community multiplayer live stream on Twitch / YouTube Live.'
  },
  {
    id: 'evt-3',
    title: 'Q4 Brand Sponsor Deliverable Due',
    date: new Date(Date.now() + 86400000 * 6).toISOString(),
    category: 'sponsor',
    description: 'Final video draft review and tracking links submission.'
  }
];

export const CalendarView: React.FC<CalendarViewProps> = ({ onComposeEventEmail }) => {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState<CalendarEvent['category']>('youtube');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {}
  }, [events]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const newEvt: CalendarEvent = {
      id: 'evt-' + Date.now(),
      title: newTitle.trim(),
      date: new Date(newDate).toISOString(),
      category: newCategory,
      description: newDesc.trim()
    };

    setEvents(prev => [...prev, newEvt]);
    setNewTitle('');
    setNewDate('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const getCategoryBadge = (cat: CalendarEvent['category']) => {
    switch (cat) {
      case 'youtube':
        return <span className="calendar-badge badge-youtube">🎬 YouTube Premiere</span>;
      case 'stream':
        return <span className="calendar-badge badge-stream">🎮 Live Stream</span>;
      case 'sponsor':
        return <span className="calendar-badge badge-sponsor">💼 Sponsor Deadline</span>;
      case 'sync':
        return <span className="calendar-badge badge-sync">👥 Studio Sync</span>;
      default:
        return <span className="calendar-badge badge-general">📌 General</span>;
    }
  };

  const getTimeRemaining = (dateIso: string) => {
    const diffMs = new Date(dateIso).getTime() - Date.now();
    if (diffMs < 0) return { text: 'Concluded', status: 'past' };
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return { text: `In ${diffDays} day${diffDays > 1 ? 's' : ''}`, status: 'future' };
    if (diffHours > 0) return { text: `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`, status: 'today' };
    return { text: 'Starting soon!', status: 'urgent' };
  };

  const filteredEvents = events
    .filter(e => activeCategory === 'all' || e.category === activeCategory)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="calendar-view-container">
      <div className="calendar-header">
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>🗓 Studio Release & Event Calendar</h2>
          <p style={{ margin: '4px 0 0 0', color: '#9d8db3', fontSize: '0.85rem' }}>
            Coordinate video drops, live stream broadcasts, brand milestones, and team syncs.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setShowAddModal(true)}
          style={{ padding: '8px 18px', fontSize: '0.88rem' }}
        >
          + Schedule Event
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-filter-pills">
          <button
            type="button"
            className={`filter-pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Milestones ({events.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${activeCategory === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveCategory('youtube')}
          >
            🎬 YouTube
          </button>
          <button
            type="button"
            className={`filter-pill ${activeCategory === 'stream' ? 'active' : ''}`}
            onClick={() => setActiveCategory('stream')}
          >
            🎮 Streams
          </button>
          <button
            type="button"
            className={`filter-pill ${activeCategory === 'sponsor' ? 'active' : ''}`}
            onClick={() => setActiveCategory('sponsor')}
          >
            💼 Sponsors
          </button>
          <button
            type="button"
            className={`filter-pill ${activeCategory === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveCategory('sync')}
          >
            👥 Syncs
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="calendar-empty">
          <span style={{ fontSize: '3rem', opacity: 0.4 }}>🗓️</span>
          <h3 style={{ color: '#fff', margin: '12px 0 4px 0' }}>No scheduled events</h3>
          <p style={{ color: '#88769e', margin: 0, fontSize: '0.88rem' }}>
            Schedule an event or tap "Add to Calendar" inside any email.
          </p>
        </div>
      ) : (
        <div className="calendar-timeline">
          {filteredEvents.map(evt => {
            const timeInfo = getTimeRemaining(evt.date);
            return (
              <div key={evt.id} className={`calendar-event-card status-${timeInfo.status}`}>
                <div className="calendar-event-left">
                  <div className="event-date-block">
                    <span className="event-month">
                      {new Date(evt.date).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="event-day">
                      {new Date(evt.date).getDate()}
                    </span>
                  </div>
                </div>

                <div className="calendar-event-body">
                  <div className="calendar-event-title-row">
                    <strong>{evt.title}</strong>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {getCategoryBadge(evt.category)}
                      <span className={`time-pill status-${timeInfo.status}`}>{timeInfo.text}</span>
                    </div>
                  </div>

                  {evt.description && (
                    <p className="calendar-event-desc">{evt.description}</p>
                  )}

                  <div className="calendar-event-time">
                    <span>⏰ {new Date(evt.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="calendar-event-actions">
                  {onComposeEventEmail && (
                    <button
                      type="button"
                      className="link"
                      onClick={() => onComposeEventEmail(evt.title)}
                      title="Compose email regarding this event"
                    >
                      ✉ Email Team
                    </button>
                  )}
                  <button
                    type="button"
                    className="link"
                    style={{ color: '#ff7b7b' }}
                    onClick={() => handleDeleteEvent(evt.id)}
                    title="Delete event"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="snooze-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="snooze-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🗓</span>
                <h3 style={{ margin: 0, color: '#fff' }}>Schedule Studio Milestone</h3>
              </div>
              <button className="link" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#bba7ce', display: 'block', marginBottom: '4px' }}>
                  Event / Milestone Title
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Episode 12 YouTube Premiere"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#bba7ce', display: 'block', marginBottom: '4px' }}>
                  Target Date & Time
                </label>
                <input
                  required
                  type="datetime-local"
                  className="snooze-datetime-input"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#bba7ce', display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="sig-preset-select"
                  style={{ width: '100%', padding: '8px', fontSize: '0.88rem' }}
                >
                  <option value="youtube">🎬 YouTube Premiere</option>
                  <option value="stream">🎮 Live Stream</option>
                  <option value="sponsor">💼 Sponsor Milestone</option>
                  <option value="sync">👥 Team / Production Sync</option>
                  <option value="general">📌 General Milestone</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#bba7ce', display: 'block', marginBottom: '4px' }}>
                  Description / Deliverable Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or links..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="link" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Add to Calendar 🗓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
