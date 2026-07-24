import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Plus, RefreshCw, Trash2, ArrowUpRight, CheckCircle2,
  AlertCircle, FileArchive, Download, Upload
} from 'lucide-react';

const API     = `http://${window.location.hostname}:3001/api/settings/backups`;
const API_DL  = `http://${window.location.hostname}:3001/api/settings/backups/download`;
const API_IMP = `http://${window.location.hostname}:3001/api/settings/backups/import`;

export default function BackupPage() {
  const [backups,       setBackups]       = useState([]);
  const [backupDir,     setBackupDir]     = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [importing,     setImporting]     = useState(false);
  const fileInputRef = useRef(null);

  const loadBackups = () => {
    setLoading(true);
    setError('');
    fetch(API)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setBackups(d.backups || []);
          if (d.backupDir) setBackupDir(d.backupDir);
        } else {
          setError(d.error || 'فشل تحميل النسخ الاحتياطية.');
        }
      })
      .catch(() => setError('تعذّر الاتصال بالخادم لتحميل النسخ الاحتياطية.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBackups(); }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); }
  }, [success]);

  // ── إنشاء نسخة احتياطية داخلية ──────────────────────────────
  const handleCreateBackup = async () => {
    setActionLoading(true); setError(''); setSuccess('');
    try {
      const res  = await fetch(API, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء النسخة الاحتياطية.');
      setSuccess(data.message || 'تم إنشاء نسخة احتياطية جديدة بنجاح.');
      loadBackups();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  // ── تصدير ملف النسخة لأي مكان (USB / مجلد) ─────────────────
  const handleExport = async (filename) => {
    try {
      setActionLoading(true);
      // First create a fresh backup so the exported file is up-to-date
      const res  = await fetch(`${API_DL}/${encodeURIComponent(filename)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'فشل تنزيل الملف.');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(`تم تصدير "${filename}" بنجاح — اختر مكان الحفظ من نافذة التنزيل.`);
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  // ── استيراد ملف نسخة من فلاشة / أي مكان ────────────────────
  const handleImportFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected if needed

    if (!window.confirm(
      `تحذير: سيتم استبدال قاعدة البيانات الحالية بالكامل بملف:\n"${file.name}"\n\nسيتم حفظ نسخة احتياطية تلقائية من البيانات الحالية قبل الاستيراد.\n\nهل تريد الاستمرار؟`
    )) return;

    setImporting(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res  = await fetch(API_IMP, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل استيراد الملف.');
      setSuccess(data.message);
      loadBackups();
    } catch (err) { setError(err.message); }
    finally { setImporting(false); }
  };

  // ── استعادة نسخة من داخل القائمة ───────────────────────────
  const handleRestoreBackup = async (filename) => {
    if (!window.confirm(`تحذير: استعادة "${filename}" سيقوم بالكتابة فوق قاعدة البيانات الحالية تماماً. هل تريد الاستمرار؟`)) return;
    setActionLoading(true); setError(''); setSuccess('');
    try {
      const res  = await fetch(`${API}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل استعادة النسخة الاحتياطية.');
      setSuccess(data.message || 'تم استعادة قاعدة البيانات بنجاح!');
      loadBackups();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  // ── حذف نسخة ────────────────────────────────────────────────
  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${filename}" نهائياً؟`)) return;
    setActionLoading(true); setError(''); setSuccess('');
    try {
      const res  = await fetch(`${API}/${filename}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الملف.');
      setSuccess(data.message || 'تم الحذف بنجاح.');
      loadBackups();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const isLoading = loading || actionLoading || importing;

  return (
    <div className="students-module">
      {/* hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".bak,.db"
        style={{ display: 'none' }}
        onChange={handleImportFileSelected}
      />

      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-area">
          <div className="page-icon"><Database size={22} /></div>
          <div>
            <h1 className="page-title">النسخ الاحتياطي والاستعادة</h1>
            <p className="page-sub" style={{ direction: 'ltr', textAlign: 'right' }}>
              النسخ المحفوظة: {backups.length} — مجلد الحفظ: {backupDir || '...'}
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn-import-excel" onClick={loadBackups} disabled={isLoading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> <span>تحديث</span>
          </button>

          {/* استيراد من فلاشة */}
          <button
            className="btn-import-excel"
            style={{ background: '#7c3aed', borderColor: '#7c3aed', color: '#fff' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="اختر ملف .bak أو .db من أي مكان (فلاشة، شبكة، ...)"
          >
            <Upload size={15} /> <span>{importing ? 'جاري الاستيراد...' : 'استيراد من ملف'}</span>
          </button>

          {/* إنشاء نسخة جديدة */}
          <button
            className="btn-add-student"
            style={{ background: '#10b981', borderColor: '#10b981' }}
            onClick={handleCreateBackup}
            disabled={isLoading}
          >
            <Plus size={17} /> <span>إنشاء نسخة احتياطية</span>
          </button>
        </div>
      </div>

      {/* إرشادات الاستخدام */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start'
      }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.8 }}>
          <strong>لنقل البيانات لجهاز جديد أو فلاشة:</strong><br />
          ① أنشئ نسخة احتياطية جديدة ← ② اضغط <strong>تصدير</strong> بجانبها واختر موقع الحفظ (فلاشة USB / مجلد شبكة)<br />
          ③ على الجهاز الجديد: افتح البرنامج ← اذهب لهذه الصفحة ← اضغط <strong>استيراد من ملف</strong> واختر الملف من الفلاشة.
        </div>
      </div>

      {error   && <div className="form-alert error"   style={{ marginBottom: 16 }}><AlertCircle  size={16} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 16 }}><CheckCircle2 size={16} /> {success}</div>}

      {/* جدول النسخ */}
      <div className="table-container glass-panel" style={{ marginTop: 0 }}>
        {loading && backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>جاري تحميل الملفات...</div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            لا توجد نسخ احتياطية. اضغط على «إنشاء نسخة احتياطية» للبدء.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="students-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم الملف</th>
                  <th>الحجم</th>
                  <th>تاريخ الإنشاء</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b, idx) => (
                  <tr key={b.id} className="table-row">
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', direction: 'ltr', textAlign: 'right' }}>
                      <FileArchive size={13} style={{ marginLeft: 6, color: '#10b981' }} />
                      {b.filename}
                    </td>
                    <td>{b.size}</td>
                    <td>
                      <div>{b.createdAt}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.createdTime}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* تصدير لفلاشة */}
                        <button
                          title="تصدير الملف لفلاشة USB أو أي مجلد"
                          onClick={() => handleExport(b.filename)}
                          disabled={isLoading}
                          style={{
                            background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
                            padding: '4px 8px', borderRadius: 6, fontSize: 11,
                            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                          }}
                        >
                          <Download size={12} /> تصدير
                        </button>

                        {/* استعادة من القائمة */}
                        <button
                          title="استعادة هذه النسخة"
                          onClick={() => handleRestoreBackup(b.filename)}
                          disabled={isLoading}
                          style={{
                            background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
                            padding: '4px 8px', borderRadius: 6, fontSize: 11,
                            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                          }}
                        >
                          <ArrowUpRight size={12} /> استعادة
                        </button>

                        {/* حذف */}
                        <button
                          title="حذف الملف"
                          className="btn-grid-action delete"
                          onClick={() => handleDeleteBackup(b.filename)}
                          disabled={isLoading}
                          style={{ padding: '4px 8px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
