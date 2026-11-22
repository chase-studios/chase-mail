import React, { useState, useEffect, useRef } from 'react';
import { Mail, Account } from '../lib/types';
import { FolderType } from '../main';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folder: FolderType) => void;
  onOpenCompose: () => void;
  onOpenShortcuts: () => void;
  onOpenLockShield: () => void;
  onChangeTheme: (theme: string) => void;
  mails: Mail[];
  accounts: Account[];
  onOpenMail: (mail: Mail) => void;
}

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Themes' | 'Messages';
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
  onOpenCompose,
  onOpenShortcuts,
  onOpenLockShield,
  onChangeTheme,
  mails,
  accounts,
  onOpenMail
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Base command list
  const baseCommands: CommandItem[] = [
    {
      id: 'compose',
      category: 'Actions',
      title: 'Compose New Message',
      subtitle: 'Open the rich email editor (shortcut: c)',
      icon: '✎',
      action: () => {
        onOpenCompose();
        onClose();
      }
    },
    {
      id: 'shortcuts',
      category: 'Actions',
      title: 'Keyboard Shortcuts Cheat Sheet',
      subtitle: 'View all keyboard navigation shortcuts (shortcut: ?)',
      icon: '⌨',
      action: () => {
        onOpenShortcuts();
        onClose();
      }
    },
    {
      id: 'lock-shield',
      category: 'Actions',
      title: 'Lock Privacy Shield',
      subtitle: 'Secure screen behind executive PIN prompt',
      icon: '🔒',
      action: () => {
        onOpenLockShield();
        onClose();
      }
    },
    {
      id: 'nav-inbox',
      category: 'Navigation',
      title: 'Go to Inbox',
      subtitle: 'Primary email stream & conversations',
      icon: '📥',
      action: () => {
        onSelectFolder('inbox');
        onClose();
      }
    },
    {
      id: 'nav-snoozed',
      category: 'Navigation',
      title: 'Go to Snoozed',
      subtitle: 'Temporarily deferred messages awaiting timer',
      icon: '⏰',
      action: () => {
        onSelectFolder('snoozed');
        onClose();
      }
    },
    {
      id: 'nav-drive',
      category: 'Navigation',
      title: 'Go to Chase Drive (File Vault)',
      subtitle: 'Browse all attachments and media files',
      icon: '📁',
      action: () => {
        onSelectFolder('drive');
        onClose();
      }
    },
    {
      id: 'nav-starred',
      category: 'Navigation',
      title: 'Go to Starred',
      subtitle: 'Bookmarked and flagged messages',
      icon: '★',
      action: () => {
        onSelectFolder('starred');
        onClose();
      }
    },
    {
      id: 'nav-sent',
      category: 'Navigation',
      title: 'Go to Sent',
      subtitle: 'Outgoing dispatches & replies',
      icon: '↗',
      action: () => {
        onSelectFolder('sent');
        onClose();
      }
    },
    {
      id: 'nav-drafts',
      category: 'Navigation',
      title: 'Go to Drafts',
      subtitle: 'Saved message drafts',
      icon: '📝',
      action: () => {
        onSelectFolder('drafts');
        onClose();
      }
    },
    {
      id: 'nav-contacts',
      category: 'Navigation',
      title: 'Go to Studio Directory & Contacts',
      subtitle: 'Verified personnel & address book',
      icon: '👥',
      action: () => {
        onSelectFolder('contacts');
        onClose();
      }
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Go to Settings',
      subtitle: 'Signatures, notifications & sound FX',
      icon: '⚙',
      action: () => {
        onSelectFolder('settings');
        onClose();
      }
    },
    {
      id: 'theme-obsidian',
      category: 'Themes',
      title: 'Theme: Obsidian Royale',
      subtitle: 'Deep black, royal purple, and cyan luminescence',
      icon: '🌌',
      action: () => {
        onChangeTheme('dark');
        onClose();
      }
    },
    {
      id: 'theme-gold',
      category: 'Themes',
      title: 'Theme: Royal Gold Sovereign',
      subtitle: 'Obsidian lacquer with polished gold leaf accents',
      icon: '👑',
      action: () => {
        onChangeTheme('royal-gold');
        onClose();
      }
    },
    {
      id: 'theme-cyber',
      category: 'Themes',
      title: 'Theme: Cyber Vanguard',
      subtitle: 'Tactical stealth dark with telemetry emerald & cyan',
      icon: '🛡',
      action: () => {
        onChangeTheme('cyber-vanguard');
        onClose();
      }
    },
    {
      id: 'theme-oled',
      category: 'Themes',
      title: 'Theme: OLED Pure Pitch',
      subtitle: 'True #000000 deep dark for maximum battery efficiency',
      icon: '🖤',
      action: () => {
        onChangeTheme('oled');
        onClose();
      }
    },
    {
      id: 'theme-horizon',
      category: 'Themes',
      title: 'Theme: Studio Horizon (Daylight)',
      subtitle: 'Pristine frosted daylight platinum',
      icon: '☀️',
      action: () => {
        onChangeTheme('horizon');
        onClose();
      }
    }
  ];

  // Dynamic message search results if user is typing
  let dynamicResults: CommandItem[] = [];
  const cleanQ = query.trim().toLowerCase();

  if (cleanQ) {
    const matchingMails = mails
      .filter(
        m =>
          m.subject.toLowerCase().includes(cleanQ) ||
          m.body.toLowerCase().includes(cleanQ) ||
          (m.external_from && m.external_from.toLowerCase().includes(cleanQ))
      )
      .slice(0, 5)
      .map(m => {
        const sender = accounts.find(a => a.user_id === m.sender_id);
        const senderName = sender ? sender.display_name || sender.handle : m.external_from || 'User';
        return {
          id: `mail-${m.id}`,
          category: 'Messages' as const,
          title: m.subject || '(No subject)',
          subtitle: `From ${senderName} · ${m.body.slice(0, 60)}...`,
          icon: m.is_external ? '🌐' : '✉',
          action: () => {
            onOpenMail(m);
            onClose();
          }
        };
      });

    const matchingCommands = baseCommands.filter(
      c =>
        c.title.toLowerCase().includes(cleanQ) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(cleanQ)) ||
        c.category.toLowerCase().includes(cleanQ)
    );

    dynamicResults = [...matchingCommands, ...matchingMails];
  } else {
    dynamicResults = baseCommands;
  }

  // Handle keyboard navigation within the list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, dynamicResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + dynamicResults.length) % Math.max(1, dynamicResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (dynamicResults[selectedIndex]) {
        dynamicResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="command-palette-header">
          <span className="command-palette-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command, folder, or search emails... (ESC to exit)"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="command-palette-esc-chip">ESC</kbd>
        </div>

        <div className="command-palette-list" ref={listRef}>
          {dynamicResults.length === 0 ? (
            <div className="command-palette-empty">No commands or emails match "{query}"</div>
          ) : (
            dynamicResults.map((item, idx) => (
              <div
                key={item.id}
                className={`command-palette-item ${idx === selectedIndex ? 'active' : ''}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="command-palette-item-icon">{item.icon}</span>
                <div className="command-palette-item-text">
                  <div className="command-palette-item-title">
                    <span>{item.title}</span>
                    <span className="command-palette-item-badge">{item.category}</span>
                  </div>
                  {item.subtitle && (
                    <div className="command-palette-item-subtitle">{item.subtitle}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <span>
            Navigate <kbd>↑</kbd> <kbd>↓</kbd>
          </span>
          <span>
            Select <kbd>↵</kbd>
          </span>
          <span>
            Close <kbd>ESC</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
