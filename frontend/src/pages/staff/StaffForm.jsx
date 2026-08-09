import React, { useState, useEffect } from 'react';
import { Save, X, User, FileText, Phone, Award, ShieldCheck, Briefcase } from 'lucide-react';
import './staff.css';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

const CADRE_TITLE_OPTIONS = [
  { group: 'كادر هيئة التعليم (معلمون)', options: ['كبير معلمين', 'معلم خبير', 'معلم أول (أ)', 'معلم أول', 'معلم', 'معلم مساعد'] },
  { group: 'كادر الأخصائيين', options: ['كبير أخصائيين', 'أخصائي خبير', 'أخصائي أول (أ)', 'أخصائي أول', 'أخصائي', 'أخصائي مساعد'] },
  { group: 'كادر الوظائف الإدارية (قانون 81)', options: ['كبير كاتبين', 'كاتب أول (سكرتير أول)', 'كاتب ثانٍ', 'كاتب ثالث', 'كاتب رابع', 'مسؤول شؤون طلاب', 'مسؤول شؤون عاملين', 'أمين مخزن', 'مسؤول حسابات'] },
  { group: 'كادر الخدمات المعاونة والحرفية', options: ['فني أول', 'فني ثانٍ', 'فني ثالث', 'فني رابع', 'مشرف وسائل', 'عامل خدمات معاونة', 'حارس مدرسة / خفير', 'سائق'] },
];

const FINANCIAL_GRADE_OPTIONS = [
  'الدرجة العالية / الممتازة',
  'درجة مدير عام',
  'الدرجة الأولى (أ / ب)',
  'الدرجة الثانية (أ / ب)',
  'الدرجة الثالثة (أ / ب / ج)',
  'الدرجة الرابعة',
  'الدرجة الخامسة والسادسة',
];

const SUBJECT_OPTIONS = [
  'لغة عربية ودين', 'لغة إنجليزية', 'لغة فرنسية', 'رياضيات', 'علوم',
  'دراسات إجتماعية', 'حاسب آلي متفرغ', 'تربية فنية', 'تربية رياضية',
  'مجال زراعي', 'مجال صناعي', 'تربية موسيقية', 'أخصائي اجتماعي',
  'أخصائي نفسي', 'أخصائي تطوير تكنولوجي', 'صحافة وإعلام', 'أمين مكتبة', 'إداري / سكرتير', 'خدمات معاونة'
];

export default function StaffForm({ staffId, onCancel, onSaved }) {
  const [formData, setFormData] = useState({
    full_name_ar: '', national_id: '', gender: 'ذكر', birth_date: '',
    employment_type: 'قوة أساسية', staff_category: 'معلم', org_name: '',
    cadre_title: 'معلم أول', financial_grade: 'الدرجة الثانية (أ / ب)', title: 'معلم أول',
    subject: 'لغة عربية ودين', teaching_stage: 'إعدادي', qualification: '',
    hire_date: '', cadre_date: '', phone: '', address: '', status: 'نشط', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (staffId) {
      setLoading(true);
      fetch(`${API}/staff/${staffId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const s = d.staff;
            setFormData({
              full_name_ar: s.full_name_ar || [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ') || '',
              national_id: s.national_id || '',
              gender: s.gender || 'ذكر',
              birth_date: s.birth_date || '',
              employment_type: s.employment_type || 'قوة أساسية',
              staff_category: s.staff_category || 'معلم',
              org_name: s.org_name || '',
              cadre_title: s.cadre_title || s.title || 'معلم أول',
              financial_grade: s.financial_grade || 'الدرجة الثانية (أ / ب)',
              title: s.title || 'معلم أول',
              subject: s.subject || 'لغة عربية ودين',
              teaching_stage: s.teaching_stage || 'إعدادي',
              qualification: s.qualification || '',
              hire_date: s.hire_date || '',
              cadre_date: s.cadre_date || '',
              phone: s.phone || '',
              address: s.address || '',
              status: s.status || 'نشط',
              notes: s.notes || ''
            });
          } else setError(d.error);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [staffId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.national_id.length !== 14 || isNaN(formData.national_id)) {
      setError('الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً.');
      return;
    }
    if (!formData.full_name_ar.trim()) {
      setError('يرجى كتابة الاسم الكامل للموظف.');
      return;
    }
    setLoading(true);
    setError('');

    const method = staffId ? 'PUT' : 'POST';
    const url = staffId ? `${API}/staff/${staffId}` : `${API}/staff`;

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) onSaved();
        else setError(d.error);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  if (loading && staffId) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>جاري تحميل بيانات الموظف...</div>;
  }

  return (
    <div className="staff-form-card">
      <div className="staff-form-header">
        <h2>
          <User size={22} color="#185fa5" />
          {staffId ? 'تعديل بيانات الموظف' : 'تسجيل موظف جديد'}
        </h2>
        <button onClick={onCancel} className="staff-page-btn" title="إغلاق">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="staff-form-body">
        {error && (
          <div style={{ padding: '14px', background: '#fef2f2', color: '#dc2626', borderRadius: '10px', border: '1px solid #fecaca', fontWeight: 700, fontSize: '13.5px' }}>
            {error}
          </div>
        )}

        <div className="staff-form-section">
          <h3 className="staff-form-section-title">
            <Briefcase size={16} /> بيانات نوع القوة والتصنيف
          </h3>
          <div className="staff-form-grid">
            <div className="staff-form-group">
              <label>نوع القوة / التواجد <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="employment_type" value={formData.employment_type} onChange={handleChange}>
                <option value="قوة أساسية">قوة أساسية (معين بالمدرسة الأصيلة)</option>
                <option value="منتدب">منتدب (منتدب من جهة أخرى)</option>
                <option value="بالأجر">بالأجر (حصة / عقد مؤقت)</option>
                <option value="معاش">معاش (متعاقد بعد السن القانوني)</option>
              </select>
            </div>

            <div className="staff-form-group">
              <label>التصنيف الوظيفي <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="staff_category" value={formData.staff_category} onChange={handleChange}>
                <option value="معلم">مدرس / هيئة التعليم</option>
                <option value="أخصائي">أخصائي (اجتماعي/نفسي/تكنولوجيا...)</option>
                <option value="إداري">إداري / سكرتارية / ماليات</option>
                <option value="عامل">عامل خدمات معاونة / حارس</option>
              </select>
            </div>

            <div className="staff-form-group">
              <label>الجهة / المدرسة الأصلية</label>
              <input name="org_name" value={formData.org_name} onChange={handleChange} placeholder="مثال: مدرسة الشهيد محمد سليمان سلامة" />
            </div>
          </div>
        </div>

        {/* البيانات الشخصية */}
        <div className="staff-form-section">
          <h3 className="staff-form-section-title">
            <User size={16} /> البيانات الشخصية والأساسية
          </h3>
          <div className="staff-form-grid">
            <div className="staff-form-group" style={{ gridColumn: 'span 2' }}>
              <label>الاسم الكامل رباعياً <span style={{ color: '#ef4444' }}>*</span></label>
              <input required name="full_name_ar" value={formData.full_name_ar} onChange={handleChange} placeholder="الاسم الكامل كما مدون بالرقم القومي" />
            </div>

            <div className="staff-form-group">
              <label>الرقم القومي (14 رقماً) <span style={{ color: '#ef4444' }}>*</span></label>
              <input required name="national_id" value={formData.national_id} onChange={handleChange} maxLength="14" dir="ltr" style={{ textAlign: 'left' }} placeholder="28008112101531" />
            </div>

            <div className="staff-form-group">
              <label>النوع <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>

            <div className="staff-form-group">
              <label>تاريخ الميلاد</label>
              <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} />
            </div>

            <div className="staff-form-group">
              <label>رقم المحمول / الهاتف</label>
              <input name="phone" value={formData.phone} onChange={handleChange} dir="ltr" style={{ textAlign: 'left' }} placeholder="01xxxxxxxxx" />
            </div>

            <div className="staff-form-group" style={{ gridColumn: 'span 3' }}>
              <label>العنوان السكني بالكامل</label>
              <input name="address" value={formData.address} onChange={handleChange} placeholder="مثال: شارع ياسين - الزهراء - العمرانية الغربية - الجيزة" />
            </div>
          </div>
        </div>

        {/* بيانات الكادر */}
        <div className="staff-form-section">
          <h3 className="staff-form-section-title">
            <Award size={16} /> بيانات الكادر والدرجة الوظيفية والمالية
          </h3>
          <div className="staff-form-grid">
            <div className="staff-form-group">
              <label>الوظيفة على الكادر <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="cadre_title" value={formData.cadre_title} onChange={handleChange}>
                {CADRE_TITLE_OPTIONS.map(grp => (
                  <optgroup key={grp.group} label={grp.group}>
                    {grp.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="staff-form-group">
              <label>الدرجة المالية <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="financial_grade" value={formData.financial_grade} onChange={handleChange}>
                {FINANCIAL_GRADE_OPTIONS.map(fg => <option key={fg} value={fg}>{fg}</option>)}
              </select>
            </div>

            <div className="staff-form-group">
              <label>المسمى الوظيفي الميداني</label>
              <input name="title" value={formData.title} onChange={handleChange} placeholder="مثال: معلم أول أ / كاتب أول" />
            </div>

            <div className="staff-form-group">
              <label>تاريخ التعيين الأصلي</label>
              <input type="date" name="hire_date" value={formData.hire_date} onChange={handleChange} />
            </div>

            <div className="staff-form-group">
              <label>تاريخ الترقية الكادر الحالي</label>
              <input type="date" name="cadre_date" value={formData.cadre_date} onChange={handleChange} />
            </div>

            <div className="staff-form-group">
              <label>حالة الخدمة <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="نشط">على رأس العمل (نشط)</option>
                <option value="موقوف">موقوف عن العمل</option>
                <option value="أجازة">في أجازة رسمية / بدون مرتب</option>
                <option value="منتهي">منتهي الخدمة / استقالة</option>
              </select>
            </div>
          </div>
        </div>

        {/* المؤهل والأكاديمي */}
        <div className="staff-form-section">
          <h3 className="staff-form-section-title">
            <FileText size={16} /> البيانات الأكاديمية ومادة التدريس
          </h3>
          <div className="staff-form-grid">
            <div className="staff-form-group">
              <label>المؤهل الدراسي والتربوي</label>
              <input name="qualification" value={formData.qualification} onChange={handleChange} placeholder="مثال: ليسانس آداب وتربية / بكالوريوس علوم" />
            </div>

            <div className="staff-form-group">
              <label>مادة التدريس / التخصص</label>
              <select name="subject" value={formData.subject} onChange={handleChange}>
                {SUBJECT_OPTIONS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>

            <div className="staff-form-group">
              <label>مرحلة التدريس</label>
              <select name="teaching_stage" value={formData.teaching_stage} onChange={handleChange}>
                <option value="إعدادي">إعدادي</option>
                <option value="ابتدائي">ابتدائي</option>
                <option value="ثانوي عام">ثانوي عام</option>
                <option value="ثانوي فني">ثانوي فني</option>
                <option value="جميع المراحل">جميع المراحل</option>
                <option value="غير سارٍ">غير سارٍ (للإداريين والعمال)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="staff-form-actions">
          <button type="button" onClick={onCancel} className="staff-cancel-btn">
            إلغاء
          </button>
          <button type="submit" disabled={loading} className="staff-save-btn">
            <Save size={16} />
            {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </button>
        </div>
      </form>
    </div>
  );
}
