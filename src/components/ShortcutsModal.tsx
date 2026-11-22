import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['j', '↓'], desc: 'Next message / thread' },
        { keys: ['k', '↑'], desc: 'Previous message / thread' },
        { keys: ['Enter', 'o'], desc: 'Open selected thread' },
        { keys: ['Esc'], desc: 'Close open thread / exit modal' },
        { keys: ['/'], desc: 'Focus message search bar' },
        { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' }
      ]
    },
    {
      title: 'Actions',
      shortcuts: [
        { keys: ['c'], desc: 'Compose new message' },
        { keys: ['r'], desc: 'Reply to sender' },
        { keys: ['a'], desc: 'Reply all' },
        { keys: ['f'], desc: 'Forward message' },
        { keys: ['s'], desc: 'Star / Unstar thread' },
        { keys: ['e'], desc: 'Archive conversation' },
        { keys: ['#'], desc: 'Move to trash / delete' },
        { keys: ['z'], desc: 'Snooze email' },
        { keys: ['x'], desc: 'Select / unselect thread' }
      ]
    },
    {
      title: 'General',
      shortcuts: [
        { keys: ['?'], desc: 'Show this keyboard shortcuts guide' },
        { keys: ['g', 'i'], desc: 'Go to Inbox' },
        { keys: ['g', 's'], desc: 'Go to Starred' },
        { keys: ['g', 't'], desc: 'Go to Sent' },
        { keys: ['g', 'd'], desc: 'Go to Drafts' }
      ]
    }
  ];

  return (
    <div className="shortcuts-modal-backdrop" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⌨</span>
            <h3 style={{ margin: 0, color: '#fff' }}>Superhuman Keyboard Shortcuts</h3>
          </div>
          <button className="link" onClick={onClose} style={{ color: '#bbb', fontSize: '1.2rem' }}>
            ✕
          </button>
        </div>

        <div className="shortcuts-modal-body">
          {sections.map(section => (
            <div key={section.title} className="shortcuts-section">
              <h4 className="shortcuts-section-title">{section.title}</h4>
              <div className="shortcuts-grid">
                {section.shortcuts.map(sc => (
                  <div key={sc.desc} className="shortcut-row">
                    <span className="shortcut-desc">{sc.desc}</span>
                    <div className="shortcut-keys">
                      {sc.keys.map(k => (
                        <kbd key={k} className="shortcut-key">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-modal-footer">
          <small style={{ color: '#8d78a8' }}>
            Tip: Press <kbd>?</kbd> anytime from anywhere in Chase Mail to view this reference.
          </small>
        </div>
      </div>
    </div>
  );
};
