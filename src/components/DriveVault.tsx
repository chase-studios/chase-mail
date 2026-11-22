import React, { useState, useMemo } from 'react';
import { Mail, Account } from '../lib/types';

interface DriveVaultProps {
  mails: Mail[];
  accounts: Account[];
  onOpenMail: (mail: Mail) => void;
  onComposeWithAttachment?: (file: { name: string; size: number; type: string; dataUrl?: string }) => void;
}

interface VaultItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  mail: Mail;
  senderName: string;
  date: string;
}

export const DriveVault: React.FC<DriveVaultProps> = ({
  mails,
  accounts,
  onOpenMail,
  onComposeWithAttachment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'image' | 'document' | 'audio' | 'archive'>('all');

  // Extract all attachments across all emails
  const vaultItems = useMemo<VaultItem[]>(() => {
    const items: VaultItem[] = [];

    for (const mail of mails) {
      const senderObj = accounts.find(a => a.user_id === mail.sender_id);
      const senderName = senderObj ? senderObj.display_name || senderObj.handle : mail.external_from || 'Unknown';

      // 1. Native attachments
      if (mail.attachments && Array.isArray(mail.attachments)) {
        for (const att of mail.attachments) {
          items.push({
            id: `${mail.id}-${att.id}`,
            name: att.name,
            size: att.size,
            type: att.type,
            dataUrl: att.dataUrl,
            mail,
            senderName,
            date: mail.sent_at
          });
        }
      }

      // 2. Parsed attachment tags in body metadata: "[Attachments: filename (1.2 MB), ...]"
      const metaMatch = mail.body.match(/\[Attachments:\s*([^\]]+)\]/);
      if (metaMatch && metaMatch[1]) {
        const fileEntries = metaMatch[1].split(',');
        for (let i = 0; i < fileEntries.length; i++) {
          const entry = fileEntries[i].trim();
          const namePart = entry.replace(/\s*\([^)]+\)$/, '').trim();
          if (namePart && !items.some(x => x.mail.id === mail.id && x.name === namePart)) {
            items.push({
              id: `${mail.id}-meta-${i}`,
              name: namePart,
              size: 256 * 1024, // fallback approximation
              type: inferMimeType(namePart),
              mail,
              senderName,
              date: mail.sent_at
            });
          }
        }
      }
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mails, accounts]);

  function inferMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image/' + ext;
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'audio/' + ext;
    if (['mp4', 'mov', 'webm'].includes(ext || '')) return 'video/' + ext;
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext || '')) return 'application/zip';
    if (['pdf'].includes(ext || '')) return 'application/pdf';
    return 'application/octet-stream';
  }

  function getFileIcon(type: string, name: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('video/')) return '🎬';
    if (type.includes('pdf')) return '📄';
    if (type.includes('zip') || type.includes('tar') || name.endsWith('.zip')) return '📦';
    if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.json') || name.endsWith('.html')) return '💻';
    return '📁';
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  const filteredItems = vaultItems.filter(item => {
    if (categoryFilter === 'image' && !item.type.startsWith('image/')) return false;
    if (categoryFilter === 'audio' && !item.type.startsWith('audio/') && !item.type.startsWith('video/')) return false;
    if (categoryFilter === 'document' && !item.type.includes('pdf') && !item.name.match(/\.(docx?|pdf|txt|md|xlsx?)$/i)) return false;
    if (categoryFilter === 'archive' && !item.type.includes('zip') && !item.name.match(/\.(zip|tar|gz|7z|rar)$/i)) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.senderName.toLowerCase().includes(q) ||
      item.mail.subject.toLowerCase().includes(q)
    );
  });

  return (
    <div className="drive-vault-container">
      <div className="drive-vault-header">
        <div className="drive-vault-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>📁</span>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>Chase Drive & File Vault</h2>
              <p style={{ margin: '2px 0 0 0', color: '#9d8db3', fontSize: '0.85rem' }}>
                Central repository of all files, documents, and media shared across Chase Mail.
              </p>
            </div>
          </div>
        </div>

        <div className="drive-vault-stats">
          <div className="drive-stat-pill">
            <span className="stat-num">{vaultItems.length}</span>
            <span className="stat-label">Total Files</span>
          </div>
          <div className="drive-stat-pill">
            <span className="stat-num">
              {formatBytes(vaultItems.reduce((acc, curr) => acc + curr.size, 0))}
            </span>
            <span className="stat-label">Vault Storage</span>
          </div>
        </div>
      </div>

      <div className="drive-vault-toolbar">
        <div className="drive-category-pills">
          <button
            type="button"
            className={`filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All Files ({vaultItems.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${categoryFilter === 'image' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('image')}
          >
            🖼️ Images
          </button>
          <button
            type="button"
            className={`filter-pill ${categoryFilter === 'document' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('document')}
          >
            📄 Documents
          </button>
          <button
            type="button"
            className={`filter-pill ${categoryFilter === 'audio' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('audio')}
          >
            🎵 Media
          </button>
          <button
            type="button"
            className={`filter-pill ${categoryFilter === 'archive' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('archive')}
          >
            📦 Archives
          </button>
        </div>

        <div className="drive-search-box">
          <input
            type="search"
            placeholder="Search files by name, sender, or subject..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="drive-vault-empty">
          <span style={{ fontSize: '3rem', opacity: 0.4 }}>📂</span>
          <h3 style={{ color: '#fff', margin: '10px 0 4px 0' }}>No files found in Vault</h3>
          <p style={{ color: '#88769e', margin: 0, fontSize: '0.88rem' }}>
            {searchTerm
              ? `No attachments match "${searchTerm}".`
              : 'Files attached to incoming and outgoing emails will automatically index here.'}
          </p>
        </div>
      ) : (
        <div className="drive-vault-grid">
          {filteredItems.map(item => (
            <div key={item.id} className="drive-file-card">
              <div className="drive-file-top">
                <span className="drive-file-icon">{getFileIcon(item.type, item.name)}</span>
                <span className="drive-file-size">{formatBytes(item.size)}</span>
              </div>
              <div className="drive-file-name" title={item.name}>
                {item.name}
              </div>
              <div className="drive-file-meta">
                <span>From: {item.senderName}</span>
                <span>{new Date(item.date).toLocaleDateString()}</span>
              </div>
              <div className="drive-file-subject" title={item.mail.subject}>
                Re: {item.mail.subject}
              </div>
              <div className="drive-file-actions">
                {item.dataUrl ? (
                  <a
                    href={item.dataUrl}
                    download={item.name}
                    className="drive-btn"
                    title="Download file"
                  >
                    ⬇ Download
                  </a>
                ) : (
                  <button
                    type="button"
                    className="drive-btn"
                    onClick={() => onOpenMail(item.mail)}
                    title="View parent message"
                  >
                    View Mail
                  </button>
                )}
                {onComposeWithAttachment && (
                  <button
                    type="button"
                    className="drive-btn drive-btn-attach"
                    onClick={() =>
                      onComposeWithAttachment({
                        name: item.name,
                        size: item.size,
                        type: item.type,
                        dataUrl: item.dataUrl
                      })
                    }
                    title="Attach to new draft"
                  >
                    + Attach
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
