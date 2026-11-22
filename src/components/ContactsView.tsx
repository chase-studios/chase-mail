import React, { useState, useMemo } from 'react';
import { Contact, Mail, Account } from '../lib/types';
import { playMailSound } from '../lib/soundFx';

interface ContactsViewProps {
  contacts: Contact[];
  mails: Mail[];
  account: Account | null;
  busy: boolean;
  onAddContact: (name: string, email: string) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onComposeTo: (email: string) => void;
  onFilterByContact: (email: string) => void;
  onSetNotice?: (notice: string) => void;
}

const VIP_CONTACTS_KEY = 'chase-mail-vip-contacts';

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  mails,
  account,
  busy,
  onAddContact,
  onDeleteContact,
  onComposeTo,
  onFilterByContact,
  onSetNotice
}) => {
  const [search, setSearch] = useState('');
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // VIP contacts set in localStorage
  const [vipIds, setVipIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(VIP_CONTACTS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleVip = (id: string) => {
    setVipIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(VIP_CONTACTS_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    playMailSound('action');
  };

  // Compute interaction telemetry for each contact
  const enrichedContacts = useMemo(() => {
    return contacts.map(c => {
      const emailLower = c.email.toLowerCase();
      const relevantMails = mails.filter(
        m =>
          (m.external_from && m.external_from.toLowerCase().includes(emailLower)) ||
          (m.external_to && m.external_to.toLowerCase().includes(emailLower)) ||
          (m.sender_id && m.sender_id.toLowerCase().includes(emailLower)) ||
          (m.recipient_id && m.recipient_id.toLowerCase().includes(emailLower))
      );

      const count = relevantMails.length;
      const sorted = [...relevantMails].sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      );
      const lastMail = sorted[0];

      return {
        ...c,
        isVip: vipIds.has(c.id),
        emailCount: count,
        lastInteractedAt: lastMail ? lastMail.sent_at : undefined,
        lastSubject: lastMail ? lastMail.subject : undefined
      };
    });
  }, [contacts, mails, vipIds]);

  const filteredContacts = enrichedContacts.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesVip = !showVipOnly || c.isVip;
    return matchesSearch && matchesVip;
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim()) return;
    await onAddContact(nameInput.trim(), emailInput.trim());
    setNameInput('');
    setEmailInput('');
  };

  // Export as vCard (.vcf)
  const handleExportVCard = () => {
    let vcfContent = '';
    contacts.forEach(c => {
      vcfContent += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${c.name}\r\nEMAIL;TYPE=INTERNET:${c.email}\r\nNOTE:Chase Mail Verified Contact\r\nEND:VCARD\r\n`;
    });

    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chase-mail-contacts-${new Date().toISOString().split('T')[0]}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onSetNotice) onSetNotice('Contacts exported to vCard (.vcf) successfully!');
  };

  // Export as JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(contacts, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chase-mail-contacts-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onSetNotice) onSetNotice('Contacts exported to JSON successfully!');
  };

  return (
    <div className="contacts-hub-container">
      <div className="contacts-hub-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>👥</span> Studio Contact Book & VIP Directory
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#a795be', fontSize: '0.88rem' }}>
            Manage verified studio partners, executive VIPs, and collaborators across your network.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleExportVCard}
            style={{ padding: '6px 14px', fontSize: '0.82rem', background: '#201633', border: '1px solid #633f8e', color: '#64dcff' }}
          >
            📇 Export .VCF
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleExportJson}
            style={{ padding: '6px 14px', fontSize: '0.82rem', background: '#201633', border: '1px solid #633f8e' }}
          >
            💾 Export .JSON
          </button>
        </div>
      </div>

      {/* Add Contact Card */}
      <div className="pulse-panel" style={{ marginTop: '16px', padding: '16px 20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: '#fff' }}>+ Add New Contact</h3>
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'transparent', padding: 0, border: 'none' }}>
          <input
            required
            maxLength={120}
            placeholder="Full Name (e.g. Alex Chase)"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            style={{ flex: 1, minWidth: '180px', padding: '10px 14px' }}
          />
          <input
            required
            type="email"
            maxLength={254}
            placeholder="Email Address (e.g. alex@chase-studios.org)"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            style={{ flex: 1, minWidth: '220px', padding: '10px 14px' }}
          />
          <button type="submit" disabled={busy} className="primary-btn" style={{ padding: '10px 22px' }}>
            {busy ? 'Saving...' : 'Add Contact'}
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search contacts by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '240px', padding: '10px 14px', background: '#171122', border: '1px solid #5a3875', borderRadius: '12px' }}
        />

        <button
          type="button"
          className={`secondary-btn ${showVipOnly ? 'active-filter' : ''}`}
          onClick={() => setShowVipOnly(!showVipOnly)}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: showVipOnly ? '1px solid #d4af37' : '1px solid #5a3875',
            background: showVipOnly ? '#36280e' : '#1c1328',
            color: showVipOnly ? '#ffd700' : '#ddd'
          }}
        >
          ⭐ VIPs Only ({enrichedContacts.filter(c => c.isVip).length})
        </button>
      </div>

      {/* Contacts Cards Grid */}
      <div className="contacts-grid" style={{ marginTop: '16px' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9986b3', gridColumn: '1 / -1', background: '#1c1328', borderRadius: '16px', border: '1px dashed #5a3875' }}>
            No contacts found matching your criteria.
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.id} className={`contact-card ${contact.isVip ? 'contact-vip' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="contact-avatar-bubble">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '1rem', color: '#fff' }}>{contact.name}</strong>
                      {contact.isVip && <span title="VIP Verified" style={{ color: '#ffd700' }}>👑</span>}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64dcff', wordBreak: 'break-all' }}>
                      {contact.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="link"
                  onClick={() => toggleVip(contact.id)}
                  title={contact.isVip ? 'Remove VIP' : 'Mark as VIP'}
                  style={{ fontSize: '1.2rem', padding: '2px 4px' }}
                >
                  {contact.isVip ? '⭐' : '☆'}
                </button>
              </div>

              {/* Interaction Details */}
              <div style={{ margin: '14px 0 10px 0', fontSize: '0.78rem', color: '#b9a5cb', borderTop: '1px solid #3d2454', paddingTop: '10px' }}>
                <div>Messages exchanged: <strong style={{ color: '#fff' }}>{contact.emailCount}</strong></div>
                {contact.lastInteractedAt && (
                  <div style={{ marginTop: '3px' }}>
                    Last correspondence: {new Date(contact.lastInteractedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => onComposeTo(contact.email)}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem' }}
                >
                  ✉ Compose
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => onFilterByContact(contact.email)}
                  title="Filter inbox with this contact"
                  style={{ padding: '6px 10px', fontSize: '0.82rem', background: '#221535', border: '1px solid #5a3875' }}
                >
                  🔍 History
                </button>

                <button
                  type="button"
                  className="link"
                  onClick={() => void onDeleteContact(contact.id)}
                  title="Delete contact"
                  style={{ color: '#ef4444', fontSize: '0.9rem', padding: '6px 8px' }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
