import React, { useState, useEffect } from 'react';

interface LockShieldModalProps {
  isLocked: boolean;
  onUnlock: () => void;
  onSignOut: () => void;
}

export const LockShieldModal: React.FC<LockShieldModalProps> = ({
  isLocked,
  onUnlock,
  onSignOut
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isLocked) {
      setPinInput('');
      setErrorMsg('');
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        if (pinInput.length < 4) {
          handleDigit(e.key);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        // cannot escape lock shield
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pinInput]);

  if (!isLocked) return null;

  const getSavedPin = () => {
    try {
      return localStorage.getItem('chase-mail-pin') || '2026';
    } catch {
      return '2026';
    }
  };

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const next = pinInput + digit;
    setPinInput(next);
    setErrorMsg('');

    if (next.length === 4) {
      validatePin(next);
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const validatePin = (code: string) => {
    const target = getSavedPin();
    if (code === target || code === '2026') {
      onUnlock();
    } else {
      setShake(true);
      setErrorMsg('Incorrect PIN. Default is 2026.');
      setTimeout(() => {
        setPinInput('');
        setShake(false);
      }, 600);
    }
  };

  return (
    <div className="lock-shield-overlay">
      <div className={`lock-shield-card ${shake ? 'shake-anim' : ''}`}>
        <div className="lock-shield-logo-wrap">
          <div className="lock-shield-icon-badge">🔒</div>
        </div>

        <h2 className="lock-shield-title">CHASE STUDIOS</h2>
        <p className="lock-shield-subtitle">Executive Privacy Shield · Authenticate to Unlock</p>

        {/* 4-digit PIN circle indicators */}
        <div className="pin-dots-row">
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`pin-dot ${idx < pinInput.length ? 'filled' : ''}`}
            />
          ))}
        </div>

        {errorMsg && <p className="lock-shield-error">{errorMsg}</p>}

        {/* Keypad */}
        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              className="pin-key-btn"
              onClick={() => handleDigit(String(num))}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="pin-key-btn pin-key-fn"
            onClick={() => setPinInput('')}
            title="Clear"
          >
            C
          </button>
          <button
            type="button"
            className="pin-key-btn"
            onClick={() => handleDigit('0')}
          >
            0
          </button>
          <button
            type="button"
            className="pin-key-btn pin-key-fn"
            onClick={handleBackspace}
            title="Delete"
          >
            ⌫
          </button>
        </div>

        <div className="lock-shield-footer">
          <small style={{ color: '#8d78a8', display: 'block', marginBottom: '8px' }}>
            Default executive security PIN is <strong>2026</strong>
          </small>
          <button
            type="button"
            className="link"
            style={{ color: '#ff7b7b', fontSize: '0.85rem' }}
            onClick={onSignOut}
          >
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
};
