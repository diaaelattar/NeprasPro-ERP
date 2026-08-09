import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Search, Filter, ChevronRight, ChevronLeft,
  Briefcase, Phone, Award, Edit2, Trash2, ShieldCheck, CheckCircle, FileText, Star, Clock, Calendar,
  Printer, Download, Grid, Layers, RefreshCw
} from 'lucide-react';
import './staff.css';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

const STATUS_BADGES = {
  'نشط': { label: 'على رأس العمل', className: 'active' },
  'موقوف': { label: 'موقوف عن العمل', className: 'suspended' },
  'أجازة': { label: 'أجازة رسمية', className: 'leave' },
  'منتهي': { label: 'منتهي الخدمة', className: 'ended' },
};

const EMPLOYMENT_TYPES = [
  { id: 'all', label: 'جميع العاملين' },
  { id: 'قوة أساسية', label: 'قوة أساسية' },
  { id: 'منتدب', label: 'منتدبون' },
  { id: 'بالأجر', label: 'بالأجر / بالحصة' },
  { id: 'معاش', label: 'معاش / بعد السن' },
];

const STAFF_CATEGORIES = [
  { id: 'all', label: 'جميع التصنيفات' },
  { id: 'معلم', label: 'معلمون' },
  { id: 'أخصائي', label: 'أخصائيون' },
  { id: 'إداري', label: 'إداريون' },
  { id: 'عامل', label: 'عمال وخدمات' },
];

/* ── Staff Reports Panel Sub-Component ────────────────────────────────────── */
function StaffReportsPanel({ staffList, onBack }) {
  const [selectedReport, setSelectedReport] = useState('promotions');

  const reportsList = [
    { id: 'promotions', title: '⭐ كشف المستحقين للترقية للأكاديمية (5 سنوات+)', desc: 'قائمة المعلمين المكتمل لهم 5 سنوات في المسمى الوظيفي الحالي' },
    { id: 'workload', title: '📊 بيان الأنصبة والحصص الأسبوعية للمعلمين', desc: 'توزيع الحصص والأنصبة التعليمية للمدرسين حسب المرحلة والتخصص' },
    { id: 'strength', title: '🏢 بيان قوة الهيئة الوظيفية بالمدرسة', desc: 'إحصائية شاملة للقوة الأساسية والمنتدبين وبالأجر حسب الدرجة والوظيفة' },
    { id: 'leaves', title: '📜 سجل الإجازات الرسمية والغياب', desc: 'بيان متابعة إجازات الموظفين (اعتيادي، عارضة، مرضي)' },
    { id: 'service_sheet', title: '📋 صحيفة البيانات الوظيفية للموظف', desc: 'طباعة صحيفة حالة إلكترونية تفصيلية لموظف محدد' },
    { id: 'badges', title: '🆔 طباعة بطاقات وعصائب الهوية المدرسية', desc: 'طباعة بادجات وكروت التعريف الشخصية لكادر المدرسة' },
  ];

  const promoEligible = staffList.filter(s => {
    if (!s.cadre_date) return false;
    const diffYears = (new Date() - new Date(s.cadre_date)) / (1000 * 60 * 60 * 24 * 365.25);
    return diffYears >= 5;
  });

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#4338ca" /> وحدة تقارير ومخرجات شؤون العاملين
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 700 }}>دليل المطبوعات الرسمية وكشوف الكادر والترقيات والأنصبة</p>
        </div>
        <button onClick={onBack} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
          الرجوع للقائمة الرئيسية
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        {/* قائمة التقارير المتاحة */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {reportsList.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              style={{
                textAlign: 'right', padding: '12px 14px', borderRadius: '10px',
                border: selectedReport === r.id ? '2px solid #4338ca' : '1px solid #e2e8f0',
                background: selectedReport === r.id ? '#e0e7ff' : '#f8fafc',
                color: selectedReport === r.id ? '#312e81' : '#334155',
                fontWeight: selectedReport === r.id ? 900 : 700,
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <div style={{ fontSize: '13px' }}>{r.title}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{r.desc}</div>
            </button>
          ))}
        </div>

        {/* عرض ومطبوع التقرير المحدد */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px', background: '#fafafa' }}>
          {selectedReport === 'promotions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '16px', color: '#b45309' }}>⭐ كشف المعلمين المستحقين للترقية (اكتمال 5 سنوات فأكثر)</h4>
                <button onClick={() => window.print()} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={15} /> طباعة الكشف
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', background: '#fff' }}>
                <thead>
                  <tr style={{ background: '#fef3c7', color: '#92400e', textAlign: 'right' }}>
                    <th style={{ padding: '10px', fontWeight: 900 }}>م</th>
                    <th style={{ padding: '10px', fontWeight: 900 }}>الاسم الكامل</th>
                    <th style={{ padding: '10px', fontWeight: 900 }}>الوظيفة الحالية</th>
                    <th style={{ padding: '10px', fontWeight: 900 }}>الدرجة المالية</th>
                    <th style={{ padding: '10px', fontWeight: 900 }}>تاريخ آخر ترقية</th>
                    <th style={{ padding: '10px', fontWeight: 900 }}>سنوات الخدمة بالدرجة</th>
                  </tr>
                </thead>
                <tbody>
                  {promoEligible.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>لا يوجد معلمين مستحقين للترقية حالياً (أقل من 5 سنوات).</td></tr>
                  ) : (
                    promoEligible.map((s, idx) => {
                      const yrs = Math.floor((new Date() - new Date(s.cadre_date)) / (1000 * 60 * 60 * 24 * 365.25));
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', fontWeight: 800 }}>{idx + 1}</td>
                          <td style={{ padding: '10px', fontWeight: 900, color: '#0f172a' }}>{s.full_name_ar}</td>
                          <td style={{ padding: '10px', fontWeight: 800 }}>{s.cadre_title || s.title}</td>
                          <td style={{ padding: '10px', fontWeight: 800 }}>{s.financial_grade || 'غير محدد'}</td>
                          <td style={{ padding: '10px', fontWeight: 800, color: '#d97706' }}>{s.cadre_date || '—'}</td>
                          <td style={{ padding: '10px', fontWeight: 900, color: '#047857' }}>⭐ {yrs} سنوات</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'strength' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '16px', color: '#1e1b4b' }}>🏢 بيان إحصائي بقوة العاملين بالمدرسة</h4>
                <button onClick={() => window.print()} style={{ background: '#4338ca', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={15} /> طباعة البيان
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 800 }}>إجمالي قوة المدرسة</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#1d4ed8' }}>{staffList.length}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 800 }}>قوة أساسية</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#047857' }}>{staffList.filter(s => s.employment_type === 'قوة أساسية').length}</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 800 }}>منتدبون</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309' }}>{staffList.filter(s => s.employment_type === 'منتدب').length}</div>
                </div>
                <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '11px', color: '#374151', fontWeight: 800 }}>بالأجر / بالحصة</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#1f2937' }}>{staffList.filter(s => s.employment_type === 'بالأجر').length}</div>
                </div>
              </div>
            </div>
          )}

          {selectedReport !== 'promotions' && selectedReport !== 'strength' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <FileText size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
              <h4 style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#334155' }}>تقرير جاهز للطباعة والاستخراج</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>اضغط على زر الطباعة أدناه لاستخراج التقرير بصيغة رسمية معتمدة.</p>
              <button onClick={() => window.print()} style={{ marginTop: '16px', background: '#059669', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={16} /> طباعة التقرير المعتمد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main StaffList Component ───────────────────────────────────────────── */
export default function StaffList({ onAdd, onView }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeType, setActiveType] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'reports'
  const [showMoreOps, setShowMoreOps] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });

  const loadStaff = useCallback(() => {
    setLoading(true);
    setError('');
    const queryObj = {
      page,
      limit: 50,
      employment_type: activeType,
      staff_category: activeCategory,
      promotion_eligible: showPromoOnly ? 'true' : 'false',
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    };
    const q = new URLSearchParams(queryObj);
    fetch(`${API}/staff?${q}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStaffList(d.staff);
          setTotal(d.total);
        } else {
          setError(d.error || 'فشل في تحميل بيانات العاملين');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, activeType, activeCategory, showPromoOnly, filters]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleDelete = (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف الموظف "${name}" نهائياً من سجلات الشؤون؟`)) return;
    fetch(`${API}/staff/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(d => {
        if (d.success) loadStaff();
        else alert(d.error);
      });
  };

  const totalPages = Math.ceil(total / 50) || 1;

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'منتدب': return 'seconded';
      case 'بالأجر': return 'pay';
      case 'معاش': return 'pension';
      default: return 'basic';
    }
  };

  return (
    <div className="staff-container">
      {/* الهيدر العلوي */}
      <div className="staff-header">
        <div className="staff-title-box">
          <h2>
            <Users className="w-6 h-6 text-[#185fa5]" />
            سجلات شؤون العاملين بالمدرسة
          </h2>
          <p>إدارة الوظائف والأنصبة الأسبوعية، قوة العاملين، الترقية بالأكاديمية، والأجازات</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowPromoOnly(!showPromoOnly)}
            className={`staff-tab-btn ${showPromoOnly ? 'active' : ''}`}
            style={{ background: showPromoOnly ? '#d97706' : '#fff8f0', color: showPromoOnly ? '#fff' : '#b45309', border: '1px solid #fde68a' }}
          >
            <Star size={15} style={{ display: 'inline', marginLeft: 4 }} />
            {showPromoOnly ? 'عرض جميع المعلمين' : '⭐ المستحقون للترقية (5 سنوات+)'}
          </button>

          {/* زر التبديل لوحدة التقارير */}
          <button
            onClick={() => setViewMode(v => v === 'reports' ? 'list' : 'reports')}
            className="staff-tab-btn"
            style={{ background: viewMode === 'reports' ? '#4338ca' : '#e0e7ff', color: viewMode === 'reports' ? '#fff' : '#3730a3', fontWeight: 800 }}
          >
            <FileText size={15} style={{ display: 'inline', marginLeft: 4 }} />
            {viewMode === 'reports' ? 'الرجوع للقائمة' : '📊 وحدة التقارير'}
          </button>

          {/* قائمة إجراءات إضافية */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="staff-tab-btn"
              onClick={() => setShowMoreOps(!showMoreOps)}
              style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 800 }}
            >
              <span>⚙️ إجراءات إضافية {showMoreOps ? '▲' : '▼'}</span>
            </button>

            {showMoreOps && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setShowMoreOps(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 99999,
                  display: 'flex', flexDirection: 'column', gap: 4, padding: 8, minWidth: 220,
                  background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, boxShadow: '0 10px 25px rgba(15,23,42,0.18)'
                }}>
                  <button className="more-ops-menu-item" onClick={() => { setViewMode('reports'); setShowMoreOps(false); }}>
                    <FileText size={14} style={{ marginLeft: 8, color: '#2563eb' }} /> <span>📊 وحدة تقارير شؤون العاملين</span>
                  </button>
                  <button className="more-ops-menu-item" onClick={() => { setShowPromoOnly(true); setViewMode('list'); setShowMoreOps(false); }}>
                    <Star size={14} style={{ marginLeft: 8, color: '#d97706' }} /> <span>⭐ كشف ترقيات الكادر والأكاديمية</span>
                  </button>
                  <button className="more-ops-menu-item" onClick={() => { window.print(); setShowMoreOps(false); }}>
                    <Printer size={14} style={{ marginLeft: 8, color: '#059669' }} /> <span>🖨️ طباعة كشف قوة العاملين الحالية</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={onAdd} className="staff-add-btn">
            <UserPlus size={18} /> إضافة موظف جديد
          </button>
        </div>
      </div>

      {viewMode === 'reports' ? (
        <StaffReportsPanel staffList={staffList} onBack={() => setViewMode('list')} />
      ) : (
        <>
          {/* شريط تبويبات نوع القوة */}
          <div className="staff-tabs-container">
            {EMPLOYMENT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveType(t.id); setPage(1); }}
                className={`staff-tab-btn ${activeType === t.id ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* شريط الفلاتر والتصنيفات الفرعية */}
          <div className="staff-filter-bar">
            {/* تصنيف الفئة */}
            <div className="staff-chips-group">
              {STAFF_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setActiveCategory(c.id); setPage(1); }}
                  className={`staff-chip-btn ${activeCategory === c.id ? 'active' : ''}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* البحث والحالة */}
            <div className="staff-search-controls">
              <div className="staff-search-input-wrapper">
                <Search size={16} className="staff-search-icon" />
                <input
                  type="text"
                  placeholder="بحث بالاسم، الرقم القومي، الوظيفة، أو المادة..."
                  value={filters.search}
                  onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                className="staff-select-filter"
              >
                <option value="">جميع الحالات</option>
                <option value="نشط">على رأس العمل</option>
                <option value="موقوف">موقوف عن العمل</option>
                <option value="أجازة">أجازة رسمية</option>
                <option value="منتهي">منتهي الخدمة</option>
              </select>
            </div>
          </div>

          {/* جدول عرض الموظفين */}
          <div className="staff-table-card">
            {error && <div className="staff-alert-error">{error}</div>}

            <div className="table-responsive">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>كود الموظف / الاسم الكامل</th>
                    <th>نوع القوة والتصنيف</th>
                    <th>مسمى الوظيفة والدرجة</th>
                    <th>المادة والتخصص</th>
                    <th>الرقم القومي والعمل</th>
                    <th>حالة الترقية بالأكاديمية</th>
                    <th>حالة الخدمة</th>
                    <th style={{ textAlign: 'center' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        جاري جلب بيانات العاملين بالمدرسة...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        لا توجد نتائج مطابقة لخيارات البحث المحددة.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((st) => {
                      const fullName = st.full_name_ar || 'بدون اسم';
                      const code = st.national_id ? `ID-${st.national_id.slice(-6)}` : `ST-${st.id}`;
                      const statusInfo = STATUS_BADGES[st.status] || { label: st.status, className: 'basic' };
                      const typeClass = getTypeBadgeClass(st.employment_type);

                      return (
                        <tr key={st.id} className="staff-table-row">
                          <td>
                            <div className="staff-name-box">
                              <span className="staff-code">{code}</span>
                              <span className="staff-name">{fullName}</span>
                            </div>
                          </td>
                          <td>
                            <div className="staff-type-box">
                              <span className={`staff-badge type-${typeClass}`}>{st.employment_type || 'قوة أساسية'}</span>
                              <span className="staff-cat-label">{st.staff_category || 'معلم'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="staff-role-box">
                              <span className="staff-title">{st.cadre_title || st.title || 'غير محدد'}</span>
                              <span className="staff-grade">{st.financial_grade || 'بدون درجة'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="staff-subject-box">
                              <span className="staff-subj">{st.subject || '—'}</span>
                              <span className="staff-stage">{st.teaching_stage || 'الكل'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="staff-contact-box">
                              <span className="staff-nid">{st.national_id || '—'}</span>
                              <span className="staff-phone">{st.phone || '—'}</span>
                            </div>
                          </td>
                          <td>
                            {st.cadre_date ? (
                              <div className="staff-cadre-box">
                                <span className="cadre-date">{st.cadre_date}</span>
                                {Math.floor((new Date() - new Date(st.cadre_date)) / (1000 * 60 * 60 * 24 * 365.25)) >= 5 ? (
                                  <span className="cadre-promo-badge">⭐ مستحق للترقية</span>
                                ) : (
                                  <span className="cadre-normal-badge">مستقر بالدرجة</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`staff-status-badge ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>
                            <div className="staff-actions-cell">
                              <button onClick={() => onView(st.id)} title="عرض الملف" className="staff-action-btn view">
                                <FileText size={15} />
                              </button>
                              <button onClick={() => onAdd(st.id)} title="تعديل" className="staff-action-btn edit">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => handleDelete(st.id, fullName)} title="حذف" className="staff-action-btn delete">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* الترقيم السفلي */}
            {totalPages > 1 && (
              <div className="staff-pagination">
                <span>إجمالي العدد: {total} موظف</span>
                <div className="staff-page-controls">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="staff-page-btn"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <span style={{ padding: '0 8px', color: '#0f172a', fontWeight: 800 }}>{page}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="staff-page-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
