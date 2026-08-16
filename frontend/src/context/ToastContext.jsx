import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import '../components/ui/toast.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'success', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    
    // Auto-generate titles if missing based on standard operations
    let finalTitle = title;
    if (!finalTitle) {
      if (type === 'success') finalTitle = 'تمت العملية بنجاح';
      else if (type === 'error') finalTitle = 'فشلت العملية';
      else if (type === 'warning') finalTitle = 'تنبيه مهم';
      else finalTitle = 'إشعار النظام';
    }

    const newToast = { id, type, title: finalTitle, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = useCallback(() => ({
    success: (message, title, duration) => addToast({ type: 'success', message, title: title || 'تم الحفظ بنجاح', duration }),
    error: (message, title, duration) => addToast({ type: 'error', message, title: title || 'خطأ بالنظام', duration }),
    warning: (message, title, duration) => addToast({ type: 'warning', message, title: title || 'تنبيه إجراء', duration }),
    info: (message, title, duration) => addToast({ type: 'info', message, title: title || 'إشعار هام', duration })
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast()}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
      case 'success':
      default:
        return <CheckCircle2 size={20} />;
    }
  };

  return (
    <div className={`toast-card toast-${toast.type}`}>
      <div className="toast-icon-wrapper">{getIcon()}</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button type="button" className="toast-close-btn" onClick={onClose} title="إغلاق">
        <X size={16} />
      </button>
      {toast.duration > 0 && (
        <div
          className="toast-progress-bar"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
