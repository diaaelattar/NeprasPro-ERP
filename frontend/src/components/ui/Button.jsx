/**
 * Button.jsx — Unified Design System Button Component
 * NeprasPro UI Component
 */

import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'outline'
  size = 'md',        // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon: Icon = null,
  onClick,
  style = {},
  type = 'button',
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)' };
      case 'danger':
        return { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' };
      case 'warning':
        return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
      case 'secondary':
        return { background: '#1e293b', color: '#fff', border: 'none' };
      case 'outline':
        return { background: '#fff', color: '#1e293b', border: '1px solid #cbd5e1' };
      case 'primary':
      default:
        return { background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', color: '#fff', border: 'none', boxShadow: '0 2px 6px rgba(49, 46, 129, 0.3)' };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '5px 12px', fontSize: '12px', height: '32px' };
      case 'lg':
        return { padding: '12px 24px', fontSize: '15px', height: '48px' };
      case 'md':
      default:
        return { padding: '8px 16px', fontSize: '13px', height: '40px' };
    }
  };

  const baseStyle = {
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 800,
    borderRadius: '8px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.65 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    transition: 'all 0.2s ease',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={baseStyle}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'inline-block', animation: 'nepSpin 1s infinite linear' }}>⏳</span>
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : null}
      <span>{loading ? 'جاري التحميل...' : children}</span>
    </button>
  );
}
