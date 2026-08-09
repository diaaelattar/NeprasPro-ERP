import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

export default function TransferForm({ studentId, studentName, onSaved, onCancel }) {
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [years,   setYears]   = useState([]);

  const [form, setForm] = useState({
    transferType:    'out',
    fromSchool:      '', fromDirectorate: '',
    toSchool:        '', toDirectorate:   '',
    reason:          '',
    transferDate:    new Date().toISOString().split('T')[0],
    academicYearId:  '',
    notes:           '',
  });

  useEffect(() => {
    fetch(`${API}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setYears(d.academicYears || []);
          const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
          if (cur) setForm(f => ({ ...f, academicYearId: String(cur.id) }));
        }
      });
  }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.transferType)    return setError('يرجى تحديد نوع التحويل.');
    if (!form.academicYearId)  return setError('يرجى تحديد العام الدراسي.');
    if (!form.reason.trim())   return setError('يرجى إدخال سبب التحويل.');

    setSaving(true);
    try {
      const res = await fetch(`${API}/students/${studentId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ بيانات التحويل.');
      setSuccess('تم تسجيل التحويل بنجاح.');
      setTimeout(() => onSaved(), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const SelectField = ({ label, value, onChange, options }) => (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <select className="field-input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">اختر...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const InputField = ({ label, value, onChange, placeholder = '', type = 'text', dir = 'rtl' }) => (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <input type={type} className="field-input" placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} dir={dir} />
    </div>
  );

  return (
    <div className="transfer-form-overlay">
      <div className="transfer-form-card glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeftRight size={18} style={{ color: '#f59e0b' }} /> تسجيل تحويل — {studentName}
          </h3>
          <button className="btn-cancel" onClick={onCancel}><X size={15} /></button>
        </div>

        {error   && <div className="form-alert error"   style={{ marginBottom: 14 }}><AlertCircle size={15} /> {error}</div>}
        {success && <div className="form-alert success" style={{ marginBottom: 14 }}><CheckCircle2 size={15} /> {success}</div>}

        <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <SelectField label="نوع التحويل" value={form.transferType} onChange={v => setF('transferType', v)}
            options={[
              { value: 'out',      label: '⬆️ تحويل صادر (خروج من المدرسة)' },
              { value: 'in',       label: '⬇️ تحويل وارد (قادم من مدرسة أخرى)' },
              { value: 'internal', label: '🔄 نقل داخلي (بين الأقسام)' },
            ]}
          />
          <SelectField label="العام الدراسي" value={form.academicYearId} onChange={v => setF('academicYearId', v)}
            options={years.map(y => ({ value: String(y.id), label: y.year_label }))}
          />
        </div>

        {(form.transferType === 'in' || form.transferType === 'internal') && (
          <div className="fields-grid" style={{ marginTop: 12 }}>
            <InputField label="المدرسة الأصل" value={form.fromSchool} onChange={v => setF('fromSchool', v)} placeholder="اسم المدرسة" />
            <InputField label="الإدارة التعليمية الأصل" value={form.fromDirectorate} onChange={v => setF('fromDirectorate', v)} placeholder="مثال: مديرية التعليم" />
          </div>
        )}

        {form.transferType === 'out' && (
          <div className="fields-grid" style={{ marginTop: 12 }}>
            <InputField label="المدرسة الوجهة" value={form.toSchool} onChange={v => setF('toSchool', v)} placeholder="اسم المدرسة" />
            <InputField label="الإدارة التعليمية الوجهة" value={form.toDirectorate} onChange={v => setF('toDirectorate', v)} placeholder="مثال: إدارة مدينة نصر" />
          </div>
        )}

        <div className="fields-grid" style={{ marginTop: 12 }}>
          <InputField label="تاريخ التحويل" value={form.transferDate} onChange={v => setF('transferDate', v)} type="date" />
          <InputField label="سبب التحويل" value={form.reason} onChange={v => setF('reason', v)} placeholder="انتقال السكن / رغبة ولي الأمر ..." />
        </div>

        <div className="field-group" style={{ marginTop: 12 }}>
          <label className="field-label">ملاحظات إضافية</label>
          <textarea className="field-input" style={{ minHeight: 70, resize: 'vertical' }}
            value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="أي بيانات إضافية..." />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-start' }}>
          <button className="btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? <><div className="loading-spinner sm" /> جاري الحفظ...</> : <><Save size={15} /> حفظ التحويل</>}
          </button>
          <button className="btn-cancel" onClick={onCancel}><X size={15} /> إلغاء</button>
        </div>
      </div>
    </div>
  );
}
