/**
 * ToastAlert.jsx — Unified Design System Floating Notification Toast Component
 * NeprasPro UI Component
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastAlert({ type = 'success', text = '', onClose }) {
  if (!text) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'error':
        return { bg: '#991b1b', border: '#fca5a5', icon: AlertCircle };
      case 'warning':
        return { bg: '#92400e', border: '#fcd34d', icon: AlertTriangle };
      case 'info':
        return { bg: '#1e40af', border: '#93c5fd', icon: Info };
      case 'success':
      default:
        return { bg: '#065f46', border: '#6ee7b7', icon: CheckCircle2 };
    }
  };

  const { bg, border, icon: Icon } = getToastStyles();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        padding: '12px 20px',
        borderRadius: '12px',
        fontWeight: 800,
        fontSize: '13.5px',
        background: bg,
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: `2px solid ${border}`,
        fontFamily: "'Cairo', sans-serif"
      }}
    >
      <Icon size={20} />
      <span>{text}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            fontWeight: 900,
            cursor: 'pointer',
            fontSize: '13px',
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '6px'
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
