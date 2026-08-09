/**
 * EmptyState.jsx — Unified Design System Empty State Component
 * NeprasPro UI Component
 */

import React from 'react';
import { SearchX, Inbox, ShieldAlert, FolderOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'لا توجد بيانات متاحة',
  description = 'لم يتم العثور على أي سجلات متطابقة مع الاستعلام أو الفلتر المحدد.',
  actionLabel = null,
  onAction = null,
  style = {}
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '2px dashed #cbd5e1',
        borderRadius: '16px',
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '16px 0',
        fontFamily: "'Cairo', sans-serif",
        ...style
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}
      >
        <Icon size={32} color="#64748b" />
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 900,
          color: '#1e1b4b'
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: '8px 0 20px 0',
          fontSize: '13.5px',
          color: '#64748b',
          maxWidth: '440px',
          lineHeight: 1.6,
          fontWeight: 700
        }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
