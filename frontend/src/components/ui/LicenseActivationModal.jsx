import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Copy, Check, Lock, Award, AlertTriangle, X } from 'lucide-react';
import API_BASE_URL from '../../config/api';

const API = `${API_BASE_URL}/license`;

export default function LicenseActivationModal({ isOpen, onClose, onLicenseUpdated }) {
  const [license, setLicense] = useState(null);
  const [productKey, setProductKey] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLicenseStatus = () => {
    fetch(`${API}/status`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setLicense(d.license);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      fetchLicenseStatus();
      setError(''); setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyMachineId = () => {
    if (license?.machineId) {
      navigator.clipboard.writeText(license.machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleActivate = (e) => {
    e.preventDefault();
    if (!productKey) {
      setError('يرجى أدخال مفتاح التفعيل الرقمي أولاً.');
      return;
    }

    setLoading(true);
    setError(''); setSuccess('');

    fetch(`${API}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productKey, ownerName, schoolCode })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSuccess(d.message);
          fetchLicenseStatus();
          if (onLicenseUpdated) onLicenseUpdated();
        } else {
          setError(d.error || 'رمز التفعيل المدخل غير صحيح.');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: '#fff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>ترخيص وتفعيل منظومة NeprasPro</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.8 }}>نظام إدارة المدارس والكنترول الإلكتروني المعتمد</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', opacity: 0.7, cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* License Badge Banner */}
          {license && (
            <div style={{
              background: license.isActivated ? '#ecfdf5' : license.isTrialExpired ? '#fef2f2' : '#fff8f0',
              border: `1px solid ${license.isActivated ? '#a7f3d0' : license.isTrialExpired ? '#fecaca' : '#fde68a'}`,
              borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>حالة الترخيص الحالية</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: license.isActivated ? '#047857' : license.isTrialExpired ? '#dc2626' : '#b45309', marginTop: '2px' }}>
                  {license.licenseType}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {!license.isActivated && (
                  <span style={{ background: license.isTrialExpired ? '#ef4444' : '#d97706', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 10px', borderRadius: '20px' }}>
                    {license.isTrialExpired ? 'منتهية' : `متبقي ${license.trialDaysRemaining} يوم`}
                  </span>
                )}
                {license.isActivated && (
                  <span style={{ background: '#059669', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> ترخيص دائم
                  </span>
                )}
              </div>
            </div>
          )}

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 800, marginBottom: '16px' }}>⚠️ {error}</div>}
          {success && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 800, marginBottom: '16px' }}>{success}</div>}

          {/* Machine ID Box */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
              🆔 معرّف الجهاز الرقمي (Machine Hardware ID):
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={license?.machineId || 'جاري البناء...'}
                style={{ flex: 1, padding: '10px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 900, fontSize: '13px', color: '#1e293b', direction: 'ltr', textAlign: 'center' }}
              />
              <button
                type="button"
                onClick={handleCopyMachineId}
                style={{ background: copied ? '#059669' : '#4338ca', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'تم النسخ' : 'نسخ المعرف'}
              </button>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>قم بتزويد الدعم الفني بهذا المعرف للحصول على مفتاح التفعيل الدائم المعتمد لمدرستك.</p>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                اسم المدرسة / المؤسسة المترخصة:
              </label>
              <input
                type="text"
                placeholder="مثال: مدرسة السلام الخاصة - إدارة القاهرة"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 800 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                🏫 كود المدرسة (اختياري للتفعيل الماستر الموحد):
              </label>
              <input
                type="text"
                placeholder="مثال: 21024219"
                value={schoolCode}
                onChange={e => setSchoolCode(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 800, direction: 'ltr', textAlign: 'center' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                🔑 مفتاح التفعيل الرقمي (Product License Key):
              </label>
              <input
                type="text"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                value={productKey}
                onChange={e => setProductKey(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #6366f1', borderRadius: '8px', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', direction: 'ltr', textAlign: 'center' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 900, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.25)', marginTop: '6px' }}
            >
              {loading ? 'جاري التحقق والتفعيل...' : '🚀 تفعيل المنظومة الآن'}
            </button>
          </form>
        </div>

        {/* Footer Copyright */}
        <div style={{ background: '#f8fafc', padding: '12px 24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>
          {license?.copyright || 'حقوق الطبع والنشر © 2026 NeprasPro. جميع الحقوق محفوظة.'}
        </div>
      </div>
    </div>
  );
}
