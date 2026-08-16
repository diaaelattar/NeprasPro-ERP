import React, { useState, useEffect } from 'react';
import { DollarSign, Receipt, CreditCard, PieChart, ShieldCheck, Download, Search, Plus, CheckCircle, Clock } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { useToast } from '../../context/ToastContext';

export default function FinancePage({ activeSectionId, academicYears, currentUser }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('fees');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock initial transactions for realistic finance operational view
  const [transactions, setTransactions] = useState([
    { id: 'REC-101', studentName: 'أحمد محمود حسن', grade: 'الصف الأول', classroom: '1 / 1 ع', amount: 3500, type: 'قسط أول', date: '2026-08-10', status: 'paid', collector: 'سيد المحاسب' },
    { id: 'REC-102', studentName: 'مريم علي الشريف', grade: 'الصف الثاني', classroom: '2 / 1 ع', amount: 2500, type: 'رسوم خدمات وأنشطة', date: '2026-08-11', status: 'paid', collector: 'سيد المحاسب' },
    { id: 'REC-103', studentName: 'عمر إبراهيم كمال', grade: 'الصف الثالث', classroom: '3 / 1 ع', amount: 4000, type: 'قسط أول', date: '2026-08-12', status: 'paid', collector: 'سيد المحاسب' },
    { id: 'REC-104', studentName: 'نور الدين سامي', grade: 'الصف الأول', classroom: '1 / 2 ع', amount: 1500, type: 'رسوم حافلة', date: '2026-08-13', status: 'paid', collector: 'سيد المحاسب' },
  ]);

  const [newReceiptModal, setNewReceiptModal] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    studentName: '',
    grade: 'الصف الأول',
    classroom: '1 / 1 ع',
    amount: '',
    type: 'قسط دراسي',
  });

  const totalCollected = transactions.reduce((sum, t) => sum + t.amount, 0);

  const handleAddReceipt = (e) => {
    e.preventDefault();
    if (!receiptForm.studentName || !receiptForm.amount) {
      return toast.error('يرجى كتابة اسم الطالب وقيمة المبلغ.');
    }
    const newId = `REC-${100 + transactions.length + 1}`;
    const newTx = {
      id: newId,
      studentName: receiptForm.studentName,
      grade: receiptForm.grade,
      classroom: receiptForm.classroom,
      amount: parseFloat(receiptForm.amount) || 0,
      type: receiptForm.type,
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      collector: currentUser?.full_name || 'مسؤول الخزينة'
    };
    setTransactions([newTx, ...transactions]);
    setNewReceiptModal(false);
    setReceiptForm({ studentName: '', grade: 'الصف الأول', classroom: '1 / 1 ع', amount: '', type: 'قسط دراسي' });
    toast.success(`تم إصدار سند القبض رقم (${newId}) بنجاح.`);
  };

  const filteredTx = transactions.filter(t => 
    t.studentName.includes(searchQuery) || t.id.includes(searchQuery) || t.type.includes(searchQuery)
  );

  return (
    <div className="finance-page-container" style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            💰 قطاع الحسابات والخزينة المدرسية
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            إدارة تحصيل المصروفات والأقساط، إصدار إيصالات وسندات القبض، ومتابعة الخزينة.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="button" 
            className="btn-add-student" 
            style={{ padding: '8px 18px', fontSize: 13 }}
            onClick={() => setNewReceiptModal(true)}
          >
            <Plus size={16} /> إصدار إيصال / سند قبض جديد
          </button>
        </div>
      </header>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="glass-panel" style={{ padding: '20px 24px', borderRight: '4px solid #10b981', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>إجمالي المتحصلات بالخزينة</span>
            <span style={{ fontSize: 18 }}>💵</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981' }}>
            {totalCollected.toLocaleString('ar-EG')} <span style={{ fontSize: 14, fontWeight: 700 }}>ج.م</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>العام الدراسي الحالي</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', borderRight: '4px solid #6366f1', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>عدد سندات القبض الصادرة</span>
            <span style={{ fontSize: 18 }}>🧾</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#6366f1' }}>
            {transactions.length} <span style={{ fontSize: 14, fontWeight: 700 }}>إيصال</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>عمليات تحصيل معتمدة</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', borderRight: '4px solid #f59e0b', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>مسؤول الخزينة الحالي</span>
            <span style={{ fontSize: 18 }}>👤</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            {currentUser?.full_name || currentUser?.username || 'مسؤول الحسابات'}
          </div>
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>جلسة عمل نشطة</span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div className="form-tabs" style={{ margin: 0 }}>
            <button className={`form-tab ${activeTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveTab('fees')}>
              🧾 سجل سندات القبض والإيصالات ({filteredTx.length})
            </button>
            <button className={`form-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
              📊 ميزانية وخزينة العام الدراسي
            </button>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              className="field-input"
              style={{ paddingRight: 36 }}
              placeholder="بحث باسم الطالب أو رقم الإيصال..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Table of Transactions */}
        <div className="table-scroll">
          <table className="students-table">
            <thead>
              <tr>
                <th>رقم الإيصال</th>
                <th>اسم الطالب</th>
                <th>الصف والفصل</th>
                <th>نوع البيان / القسط</th>
                <th>المبلغ المحصل</th>
                <th>تاريخ التحصيل</th>
                <th>المحصل</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    لا توجد سندات قبض مسجلة مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                filteredTx.map(t => (
                  <tr key={t.id} className="table-row">
                    <td><code className="student-code" style={{ fontWeight: 800 }}>{t.id}</code></td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.studentName}</td>
                    <td style={{ fontSize: 12 }}>{t.grade} ({t.classroom})</td>
                    <td><span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11.5 }}>{t.type}</span></td>
                    <td style={{ fontWeight: 800, color: '#10b981', fontSize: 13.5 }}>{t.amount.toLocaleString('ar-EG')} ج.م</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }} dir="ltr">{t.date}</td>
                    <td style={{ fontSize: 12 }}>{t.collector}</td>
                    <td>
                      <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> مسدد
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding new receipt */}
      {newReceiptModal && (
        <div className="modal-overlay" onClick={() => setNewReceiptModal(false)}>
          <div className="modal-card glass-panel text-right" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>🧾 إصدار سند تحصيل جديد</h3>
              <button type="button" className="btn-icon" onClick={() => setNewReceiptModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddReceipt} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">اسم الطالب المسدد ★</label>
                <input
                  type="text"
                  className="field-input"
                  required
                  placeholder="اسم الطالب ثلاثي أو رباعي"
                  value={receiptForm.studentName}
                  onChange={e => setReceiptForm({ ...receiptForm, studentName: e.target.value })}
                />
              </div>

              <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="field-group">
                  <label className="field-label">الصف الدراسي</label>
                  <select
                    className="field-input"
                    value={receiptForm.grade}
                    onChange={e => setReceiptForm({ ...receiptForm, grade: e.target.value })}
                  >
                    <option value="الصف الأول">الصف الأول</option>
                    <option value="الصف الثاني">الصف الثاني</option>
                    <option value="الصف الثالث">الصف الثالث</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">الفصل</label>
                  <input
                    type="text"
                    className="field-input"
                    value={receiptForm.classroom}
                    onChange={e => setReceiptForm({ ...receiptForm, classroom: e.target.value })}
                  />
                </div>
              </div>

              <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="field-group">
                  <label className="field-label">المبلغ المحصل (ج.م) ★</label>
                  <input
                    type="number"
                    className="field-input"
                    required
                    min={1}
                    placeholder="مثال: 2500"
                    value={receiptForm.amount}
                    onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">نوع البند المسدد</label>
                  <select
                    className="field-input"
                    value={receiptForm.type}
                    onChange={e => setReceiptForm({ ...receiptForm, type: e.target.value })}
                  >
                    <option value="قسط أول">قسط أول</option>
                    <option value="قسط ثان">قسط ثان</option>
                    <option value="رسوم خدمات وأنشطة">رسوم خدمات وأنشطة</option>
                    <option value="رسوم كتب مدرسية">رسوم كتب مدرسية</option>
                    <option value="رسوم حافلة">رسوم حافلة</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="submit" className="btn-save" style={{ padding: '8px 20px', fontSize: 13 }}>
                  💾 تأكيد وطباعة الإيصال
                </button>
                <button type="button" className="btn-cancel" style={{ padding: '8px 18px', fontSize: 13 }} onClick={() => setNewReceiptModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
