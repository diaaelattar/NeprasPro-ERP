import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Search, Filter, ChevronRight, ChevronLeft,
  Briefcase, Phone, Award, Edit2, Trash2, ShieldCheck, CheckCircle, FileText, Star, Clock, Calendar
} from 'lucide-react';
import './staff.css';

const API = `http://${window.location.hostname}:3001/api`;

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

export default function StaffList({ onAdd, onView }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeType, setActiveType] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showPromoOnly, setShowPromoOnly] = useState(false);
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
          <p>إدارة الكادر والأنصبة الأسبوعية، قوة العاملين، الترقية بالأكاديمية، والأجازات</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowPromoOnly(!showPromoOnly)}
            className={`staff-tab-btn ${showPromoOnly ? 'active' : ''}`}
            style={{ background: showPromoOnly ? '#d97706' : '#fff8f0', color: showPromoOnly ? '#fff' : '#b45309', border: '1px solid #fde68a' }}
          >
            <Star size={15} style={{ display: 'inline', marginLeft: 4 }} />
            {showPromoOnly ? 'عرض جميع المعلمين' : '⭐ المستحقون للترقية (5 سنوات+)'}
          </button>
          <button onClick={onAdd} className="staff-add-btn">
            <UserPlus size={18} /> إضافة موظف كادر جديد
          </button>
        </div>
      </div>

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
            <option value="موقوف">موقوف</option>
            <option value="أجازة">أجازة</option>
            <option value="منتهي">منتهي الخدمة</option>
          </select>
        </div>
      </div>

      {/* الجدول الرئيسي لكشف العاملين */}
      {error ? (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', fontWeight: 700 }}>
          {error}
        </div>
      ) : loading ? (
        <div className="staff-table-card" style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
          جاري تحميل بيانات الموظفين والأنصبة الأسبوعية...
        </div>
      ) : (
        <div className="staff-table-card">
          <div className="staff-table-scroll">
            <table className="staff-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>م</th>
                  <th>الاسم الكامل</th>
                  <th>الرقم القومي</th>
                  <th>نوع القوة</th>
                  <th>الوظيفة على الكادر</th>
                  <th>نصاب الحصص</th>
                  <th>الدرجة المالية</th>
                  <th>مادة التدريس</th>
                  <th>الترقية الأكاديمية</th>
                  <th>المحمول</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontWeight: 700 }}>
                      لا توجد نتائج مطابقة لبيانات العاملين
                    </td>
                  </tr>
                ) : (
                  staffList.map((st, idx) => {
                    const stBadge = STATUS_BADGES[st.status] || { label: st.status || 'نشط', className: 'active' };
                    const fullName = st.full_name_ar || [st.first_name, st.middle_name, st.last_name].filter(Boolean).join(' ');
                    const isPromo = st.promotion_info && st.promotion_info.eligible;

                    return (
                      <tr key={st.id} style={{ background: isPromo ? '#fffdf5' : 'transparent' }}>
                        <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                          {(page - 1) * 50 + idx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {fullName}
                            {isPromo && <Star size={14} color="#d97706" fill="#f59e0b" title="مستحق للترقية بالأكاديمية" />}
                          </div>
                          {st.org_name && <div style={{ fontSize: '11px', color: '#64748b' }}>{st.org_name}</div>}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }} dir="ltr">{st.national_id}</td>
                        <td>
                          <span className={`staff-badge-type ${getTypeBadgeClass(st.employment_type)}`}>
                            {st.employment_type || 'قوة أساسية'}
                          </span>
                        </td>
                        <td>
                          <span className="staff-cadre-chip">
                            <Award size={13} />
                            {st.cadre_title || st.title || 'غير محدد'}
                          </span>
                        </td>
                        <td>
                          {st.class_quota > 0 ? (
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#166534', fontWeight: 800, fontSize: '12px', border: '1px solid #bbf7d0' }}>
                              {st.class_quota} حصة / أسبوع
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#475569' }}>{st.financial_grade || '-'}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{st.subject || '-'}</td>
                        <td>
                          {isPromo ? (
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '11.5px', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} />
                              مستحق للترقية ({st.promotion_info.years}س)
                            </span>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {st.promotion_info ? st.promotion_info.statusLabel : '-'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }} dir="ltr">{st.phone || '-'}</td>
                        <td>
                          <span className={`staff-status-badge ${stBadge.className}`}>
                            {stBadge.label}
                          </span>
                        </td>
                        <td>
                          <div className="staff-actions">
                            <button onClick={() => onView(st.id)} title="تعديل البيانات" className="staff-action-btn edit">
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
      )}
    </div>
  );
}
