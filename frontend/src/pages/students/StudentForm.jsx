import React, { useState, useEffect } from 'react';
import {
  GraduationCap, User, Phone, MapPin, BookOpen,
  ChevronRight, ChevronLeft, Save, X, AlertCircle, CheckCircle2,
  Sparkles, Heart, Award, Plane, RefreshCw, Users
} from 'lucide-react';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

const TABS = [
  { id: 'basic',    label: '👤 البيانات الأساسية والعنوان', icon: '👤' },
  { id: 'academic', label: '🎓 البيانات الأكاديمية والتوزيع', icon: '🎓' },
  { id: 'family',   label: '👨‍👩‍👧 بيانات الأسرة والولاية', icon: '👨‍👩‍👧' },
  { id: 'cases',    label: '⭐ الحالات الخاصة والتوجلات', icon: '⭐' },
];

const RELATION_OPTIONS = ['أب', 'أم', 'جد', 'جدة', 'عم', 'خال', 'أخ', 'أخت', 'وصي قانوني', 'آخر'];

export default function StudentForm({ studentId, onSaved, onCancel, activeSectionId }) {
  const isEdit = Boolean(studentId);
  const [activeTab,  setActiveTab]  = useState('basic');
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [formOpts,   setFormOpts]   = useState({
    sections: [], stages: [], grades: [], nationalities: [], academicYears: [],
    caseTypes: [], staff: [], specialNeeds: [], allStudents: [],
    foreignLanguages: [], educationSystems: [], schoolTracks: [], schoolSpecializations: [],
    guardianRelations: [], religions: [], genders: [], enrollmentStatuses: []
  });
  const [classrooms, setClassrooms] = useState([]);
  const [nationalIdStatus, setNationalIdStatus] = useState(null);
  
  const [staffSearch, setStaffSearch] = useState('');
  const [siblingSearch, setSiblingSearch] = useState('');

  const [form, setForm] = useState({
    // Header & Academic placement
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
    stageId: '', gradeId: '', academicYearId: '', classroomId: '',
    educationType: 'رسمي عربي',
    
    // Basic Info
    fullNameAr: '', fullNameEn: '', birthDate: '', birthPlace: '',
    nationalityId: '', nationalId: '', emisStudentCode: '', gender: 'ذكر', religion: 'مسلم',
    address: '', studentPhone: '',

    // Academic Details (Order: Status -> Classroom -> Track -> Specialization -> 1st Lang -> 2nd Lang -> Merge)
    status: 'promoted',
    schoolTrack: 'عام',
    schoolSpecialization: 'عام',
    firstLanguage: 'عربي',
    secondLanguage: 'لا يوجد',
    
    // Guardian Info
    guardianName: '', guardianRelation: 'أب', guardianNationalId: '',
    guardianPhone: '', guardianPhone2: '', guardianJob: '',
    motherName: '', motherNationalityId: '', motherNationalId: '',
    enrollmentDate: new Date().toISOString().split('T')[0],

    // Special Cases (Toggles)
    isParentStaff: false, parentStaffId: '', staffRelation: 'والد الطالب معلّم بالمدرسة',
    isSiblingOrTwin: false, siblingStudentIds: '', twinStudentId: '',
    isMerged: false, mergeType: 'صعوبات تعلم', mergeDecisionNumber: '', mergeDecisionDate: '', mergeNotes: '',
    isTalented: false, talentCategory: 'موهبة علمية وتكنولوجية', talentDescription: '',
    isReturnedFromAbroad: false, countryFrom: '', returnDate: '',
    isTransferred: false, transferredFromSchool: '', transferredFromDirectorate: '', transferredFromGovernorate: '',
    specialCases: []
  });

  // ─── Egyptian National ID Validator ──────────────────────────────────────
  const GOVERNORATES_MAP = {
    '01': 'القاهرة',    '02': 'الإسكندرية', '03': 'بورسعيد',    '04': 'السويس',
    '06': 'الجيزة',    '08': 'القاهرة (إضافي)', '11': 'دمياط',  '12': 'الدقهلية',
    '13': 'الشرقية',   '14': 'القليوبية',  '15': 'كفر الشيخ', '16': 'الغربية',
    '17': 'المنوفية',  '18': 'البحيرة',    '19': 'الإسماعيلية','21': 'الجيزة',
    '22': 'بني سويف',  '23': 'الفيوم',     '24': 'المنيا',     '25': 'أسيوط',
    '26': 'سوهاج',     '27': 'قنا',        '28': 'أسوان',      '29': 'الأقصر',
    '31': 'البحر الأحمر','32': 'الوادي الجديد','33': 'مطروح',  '34': 'شمال سيناء',
    '35': 'جنوب سيناء','88': 'خارج مصر'
  };

  const validateEgyptianNationalId = (id) => {
    if (!id || id.length !== 14 || !/^\d{14}$/.test(id)) return false;
    const centuryCode = parseInt(id[0]);
    if (centuryCode !== 2 && centuryCode !== 3) return false;
    const yearPart = id.substr(1, 2);
    const month    = parseInt(id.substr(3, 2));
    const day      = parseInt(id.substr(5, 2));
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;

    const fullYear = centuryCode === 2 ? 1900 + parseInt(yearPart) : 2000 + parseInt(yearPart);
    const dateObj  = new Date(fullYear, month - 1, day);
    if (dateObj.getFullYear() !== fullYear || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return false;
    }
    const today = new Date();
    if (dateObj > today) return false;

    const govCode = id.substr(7, 2);
    if (!GOVERNORATES_MAP[govCode]) return false;
    return true;
  };

  const extractFromNationalId = (id) => {
    if (!validateEgyptianNationalId(id)) { setNationalIdStatus('invalid'); return; }
    const centuryCode = parseInt(id[0]);
    const yearPart    = id.substr(1, 2);
    const monthPart   = id.substr(3, 2);
    const dayPart     = id.substr(5, 2);
    const birthYear   = centuryCode === 2 ? '19' + yearPart : '20' + yearPart;
    const genderDigit = parseInt(id.substr(12, 1));
    const govCode     = id.substr(7, 2);
    setNationalIdStatus('valid');
    setForm(f => ({
      ...f,
      birthDate:  `${birthYear}-${monthPart}-${dayPart}`,
      gender:     genderDigit % 2 === 0 ? 'أنثى' : 'ذكر',
      birthPlace: GOVERNORATES_MAP[govCode] || ''
    }));
  };

  useEffect(() => {
    if (form.nationalId && form.nationalId.length === 14) {
      extractFromNationalId(form.nationalId);
    } else if (form.nationalId && form.nationalId.length > 0) {
      setNationalIdStatus('invalid');
    } else {
      setNationalIdStatus(null);
    }
  }, [form.nationalId]);

  // Load form options
  useEffect(() => {
    fetch(`${API}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFormOpts(d);
          const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
          if (cur && !isEdit) setForm(f => ({ ...f, academicYearId: String(cur.id) }));
          if (activeSectionId && activeSectionId !== 'all' && !isEdit) {
            setForm(f => ({ ...f, sectionId: String(activeSectionId) }));
          }
          // Default nationality to Egyptian (EGY)
          const egypt = d.nationalities?.find(n => n.code === 'EGY' || n.name_ar?.includes('مصري'));
          if (egypt && !isEdit) {
            setForm(f => ({ ...f, nationalityId: String(egypt.id) }));
          }
        }
      });
  }, [activeSectionId]);

  // Load classrooms whenever gradeId or academicYearId changes
  useEffect(() => {
    if (form.gradeId && form.academicYearId) {
      fetch(`${API}/settings/classrooms?gradeId=${form.gradeId}&academicYearId=${form.academicYearId}`)
        .then(r => r.json())
        .then(d => setClassrooms(d.success ? d.classrooms : []))
        .catch(() => setClassrooms([]));
    } else {
      setClassrooms([]);
    }
  }, [form.gradeId, form.academicYearId]);

  // Load existing student for edit
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      fetch(`${API}/students/${studentId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const s = d.student;
            setForm({
              sectionId: String(s.section_id || ''), stageId: String(s.stage_id || ''),
              gradeId: String(s.grade_id || ''), academicYearId: String(s.academic_year_id || ''),
              classroomId: String(s.classroom_id || ''),
              educationType: s.education_type || 'رسمي عربي',
              fullNameAr: s.full_name_ar || '', fullNameEn: s.full_name_en || '',
              birthDate: s.birth_date || '', birthPlace: s.birth_place || '',
              nationalityId: String(s.nationality_id || ''), nationalId: s.national_id || '',
              emisStudentCode: s.emis_student_code || '',
              gender: s.gender || 'ذكر', religion: s.religion || 'مسلم',
              address: s.address || '', studentPhone: s.student_phone || '',
              status: s.status || 'promoted',
              schoolTrack: s.secondary_track || 'عام',
              schoolSpecialization: s.secondary_elective || 'عام',
              firstLanguage: s.first_language || 'عربي',
              secondLanguage: s.second_language || 'لا يوجد',
              guardianName: s.guardian_name || '', guardianRelation: s.guardian_relation || 'أب',
              guardianNationalId: s.guardian_national_id || '',
              guardianPhone: s.guardian_phone || '', guardianPhone2: s.guardian_phone_2 || '',
              guardianJob: s.guardian_job || '',
              motherName: s.mother_name || '', motherNationalityId: String(s.mother_nationality_id || ''),
              motherNationalId: s.mother_national_id || '',
              enrollmentDate: s.enrollment_date || new Date().toISOString().split('T')[0],
              
              // Toggles
              isParentStaff: Boolean(s.parent_staff_id), parentStaffId: String(s.parent_staff_id || ''),
              isSiblingOrTwin: Boolean(s.sibling_student_ids || s.twin_student_id),
              siblingStudentIds: s.sibling_student_ids || '', twinStudentId: String(s.twin_student_id || ''),
              isMerged: Boolean(s.is_merged), mergeType: s.merge_type || 'صعوبات تعلم',
              mergeDecisionNumber: s.merge_decision_number || '', mergeDecisionDate: s.merge_decision_date || '',
              mergeNotes: s.merge_notes || '',
              isTalented: Boolean(s.is_talented), talentCategory: 'موهبة عامة', talentDescription: s.talent_description || '',
              isReturnedFromAbroad: Boolean(s.is_returned_from_abroad), countryFrom: s.country_from || '',
              isTransferred: Boolean(s.transferred_from_school), transferredFromSchool: s.transferred_from_school || '',
              transferredFromDirectorate: s.transferred_from_directorate || '', transferredFromGovernorate: s.transferred_from_governorate || '',
              specialCases: (d.specialCases || []).map(c => c.case_type_id)
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [studentId]);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const selectedGradeObj = formOpts.grades?.find(g => String(g.id) === String(form.gradeId));
  const gradeName = selectedGradeObj ? (selectedGradeObj.grade_name_ar || selectedGradeObj.name_ar || '') : '';
  const isSec2Or3 = gradeName.includes('الثاني الثانوي') || gradeName.includes('الثالث الثانوي') || gradeName.includes('ثاني ثانوي') || gradeName.includes('ثالث ثانوي');

  useEffect(() => {
    if (form.gradeId) {
      if (!isSec2Or3) {
        setForm(f => ({ ...f, schoolTrack: 'عام', schoolSpecialization: 'عام' }));
      }
    }
  }, [form.gradeId, isSec2Or3]);

  const filteredStages = formOpts.stages?.filter(s => !form.sectionId || String(s.section_id) === form.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(g => !form.stageId  || String(g.stage_id)   === form.stageId)   || [];

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.fullNameAr.trim()) return setError('اسم الطالب بالعربية مطلوب.');
    if (!form.sectionId)         return setError('يرجى اختيار القسم في شريط التسجيل العلوي.');
    if (!form.stageId)           return setError('يرجى اختيار المرحلة في شريط التسجيل العلوي.');
    if (!form.gradeId)           return setError('يرجى اختيار الصف في شريط التسجيل العلوي.');

    // ─── National ID & Birth Date Validation ──────────────────
    const selectedNat = formOpts.nationalities?.find(n => String(n.id) === String(form.nationalityId));
    const isEgyptian  = !form.nationalityId || selectedNat?.code === 'EGY' || selectedNat?.name_ar?.includes('مصري') || selectedNat?.name_ar?.includes('مصر');

    if (isEgyptian || (form.nationalId && form.nationalId.trim().length > 0)) {
      if (!form.nationalId || !validateEgyptianNationalId(form.nationalId.trim())) {
        return setError('الرقم القومي المصري غير صحيح. يرجى التأكد من كتابة 14 رقم مطابقة لتاريخ ميلاد ومحافظة سارية.');
      }
    }

    if (!form.birthDate) {
      return setError('تاريخ الميلاد مطلوب.');
    } else {
      const parts = form.birthDate.split('-');
      if (parts.length !== 3) return setError('تاريخ الميلاد غير صحيح.');
      const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
      const dateObj = new Date(y, m - 1, d);
      if (dateObj.getFullYear() !== y || dateObj.getMonth() !== m - 1 || dateObj.getDate() !== d) {
        return setError('تاريخ الميلاد غير صحيح (تاريخ غير موجود بالتقويم مثل 31 فبراير).');
      }
      if (dateObj > new Date()) {
        return setError('تاريخ الميلاد لا يمكن أن يكون في المستقبل.');
      }
    }

    setSaving(true);
    try {
      const url    = isEdit ? `${API}/students/${studentId}` : `${API}/students`;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          parentStaffId: form.isParentStaff ? form.parentStaffId : null,
          siblingStudentIds: form.isSiblingOrTwin ? form.siblingStudentIds : null,
          twinStudentId: form.isSiblingOrTwin ? form.twinStudentId : null,
          isMerged: form.isMerged ? 1 : 0,
          isTalented: form.isTalented ? 1 : 0,
          isReturnedFromAbroad: form.isReturnedFromAbroad ? 1 : 0,
          transferredFromSchool: form.isTransferred ? form.transferredFromSchool : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ البيانات');

      const sid = data.studentId || studentId;
      if (form.classroomId && sid && form.academicYearId) {
        await fetch(`${API}/settings/classrooms/${form.classroomId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: sid, academicYearId: form.academicYearId }),
        });
      }

      setSuccess(data.message || 'تم الحفظ بنجاح');
      setTimeout(() => onSaved(data.studentId, data.studentCode), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="form-loading">
      <div className="loading-spinner" />
      <span>جاري تحميل سجل الطالب...</span>
    </div>
  );

  return (
    <div className="student-form-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="form-header">
        <div className="page-title-area">
          <div className="page-icon"><GraduationCap size={24} /></div>
          <div>
            <h1 className="page-title">{isEdit ? 'تعديل سجل طالب' : 'تسجيل طالب جديد'}</h1>
            <p className="page-sub">منظومة القبول والتوزيع الموحدة</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-cancel" onClick={onCancel}><X size={16} /> إلغاء</button>
          <button className="btn-add-student" disabled={saving} onClick={handleSubmit}>
            <Save size={18} />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ البيانات'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error   && <div className="form-alert error"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="form-alert success"><CheckCircle2 size={16} /> {success}</div>}

      {/* ── 📌 TOP HEADER PICKER: القسم -> المرحلة -> الصف -> نوع التعليم ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
        color: '#fff', padding: '14px 20px', borderRadius: 12, marginBottom: 14,
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🎯 التأسيس الأكاديمي المباشر</span>
          <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>(حدد القسم والمرحلة والصف لتصفية الخيارات تلقائياً)</span>
        </div>
        <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" style={{ color: '#e2e8f0' }}>القسم التعليمي <span className="required-star">*</span></label>
            <select
              className="field-input"
              value={form.sectionId}
              disabled={activeSectionId && activeSectionId !== 'all'}
              onChange={e => { setF('sectionId', e.target.value); setF('stageId', ''); setF('gradeId', ''); }}
            >
              <option value="">-- اختر القسم --</option>
              {formOpts.sections?.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" style={{ color: '#e2e8f0' }}>المرحلة الدراسية <span className="required-star">*</span></label>
            <select
              className="field-input"
              value={form.stageId}
              onChange={e => { setF('stageId', e.target.value); setF('gradeId', ''); }}
            >
              <option value="">-- اختر المرحلة --</option>
              {filteredStages.map(s => (
                <option key={s.id} value={String(s.id)}>{s.stage_name}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" style={{ color: '#e2e8f0' }}>الصف الدراسي <span className="required-star">*</span></label>
            <select
              className="field-input"
              value={form.gradeId}
              onChange={e => setF('gradeId', e.target.value)}
            >
              <option value="">-- اختر الصف --</option>
              {filteredGrades.map(g => (
                <option key={g.id} value={String(g.id)}>{g.grade_name_ar}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" style={{ color: '#e2e8f0' }}>نوعية التعليم</label>
            <select
              className="field-input"
              value={form.educationType}
              onChange={e => setF('educationType', e.target.value)}
            >
              {formOpts.educationSystems && formOpts.educationSystems.length > 0 ? (
                formOpts.educationSystems.map(es => (
                  <option key={es.id} value={es.name_ar}>{es.name_ar}</option>
                ))
              ) : (
                <>
                  <option value="رسمي عربي">رسمي عربي</option>
                  <option value="رسمي لغات">رسمي لغات</option>
                  <option value="دولي">دولي</option>
                  <option value="خاص">خاص</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ── Form Body Card ────────────────────────────────────── */}
      <div className="form-body glass-panel" style={{ background: '#fff', borderRadius: 14, border: '1px solid #cbd5e1' }}>
        {/* Navigation Tabs */}
        <div className="form-tabs">
          {TABS.map(t => (
            <button 
              key={t.id} 
              type="button"
              className={`form-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: البيانات الأساسية والعنوان ────────────────── */}
        {activeTab === 'basic' && (() => {
          const selectedNat = formOpts.nationalities?.find(n => String(n.id) === String(form.nationalityId));
          const isEgyptian = !form.nationalityId || form.nationalityId === '1' || selectedNat?.code === 'EGY' || selectedNat?.name_ar?.includes('مصري') || selectedNat?.name_ar?.includes('مصر') || selectedNat?.name?.includes('مصري');
          const isAutofilled = isEgyptian && nationalIdStatus === 'valid';

          return (
            <div className="tab-content">
              <div className="section-title">👤 البيانات الشخصية والهوية الرسمية</div>
              
              <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="field-group col-span-2">
                  <label className="field-label">الاسم الرباعي بالعربية <span className="required-star">*</span></label>
                  <input type="text" className="field-input" placeholder="أحمد محمد علي السيد"
                    value={form.fullNameAr} onChange={e => setF('fullNameAr', e.target.value)} required />
                </div>

                <div className="field-group col-span-2">
                  <label className="field-label">الاسم بالإنجليزية</label>
                  <input type="text" className="field-input" placeholder="Ahmed Mohamed Ali El-Sayed" dir="ltr"
                    value={form.fullNameEn} onChange={e => setF('fullNameEn', e.target.value)} />
                </div>

                <div className="field-group col-span-1">
                  <label className="field-label">الجنسية <span className="required-star">*</span></label>
                  <select className="field-input" value={form.nationalityId}
                    onChange={e => { setF('nationalityId', e.target.value); setNationalIdStatus(null); setF('nationalId', ''); }} required>
                    <option value="">-- اختر الجنسية --</option>
                    {formOpts.nationalities && formOpts.nationalities.length > 0 ? (
                      formOpts.nationalities.map(n => (
                        <option key={n.id} value={String(n.id)}>{n.name_ar || n.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="1">مصري 🇪🇬</option>
                        <option value="2">سعودي 🇸🇦</option>
                        <option value="3">سوداني 🇸🇩</option>
                        <option value="4">سوري 🇸🇾</option>
                        <option value="5">يمني 🇾🇪</option>
                        <option value="6">أردني 🇯🇴</option>
                        <option value="7">فلسطيني 🇵🇸</option>
                        <option value="8">أخرى 🌐</option>
                      </>
                    )}
                  </select>
                </div>

                {isEgyptian ? (
                  <div className="field-group col-span-1">
                    <label className="field-label">الرقم القومي (14 رقم) <span className="required-star">*</span></label>
                    <input type="text" dir="ltr" maxLength={14}
                      className={`field-input ${nationalIdStatus === 'valid' ? 'input-valid' : nationalIdStatus === 'invalid' ? 'input-invalid' : ''}`}
                      placeholder="30101..." value={form.nationalId} onChange={e => setF('nationalId', e.target.value)} />
                  </div>
                ) : (
                  <div className="field-group col-span-1">
                    <label className="field-label">رقم جواز السفر / الهوية</label>
                    <input type="text" className="field-input" dir="ltr" placeholder="A1234567"
                      value={form.nationalId} onChange={e => setF('nationalId', e.target.value)} />
                  </div>
                )}

                <div className="field-group col-span-1">
                  <label className="field-label">كود الطالب الوزاري (EMIS)</label>
                  <input type="text" className="field-input" dir="ltr" placeholder="21024219"
                    value={form.emisStudentCode} onChange={e => setF('emisStudentCode', e.target.value)} />
                </div>

                <div className="field-group col-span-1">
                  <label className="field-label">تاريخ الميلاد <span className="required-star">*</span></label>
                  <input type="date" className="field-input" value={form.birthDate}
                    onChange={e => setF('birthDate', e.target.value)} disabled={isAutofilled} required />
                </div>

                <div className="field-group col-span-1">
                  <label className="field-label">الجنس <span className="required-star">*</span></label>
                  <select className="field-input" value={form.gender} onChange={e => setF('gender', e.target.value)} disabled={isAutofilled} required>
                    {formOpts.genders && formOpts.genders.length > 0 ? (
                      formOpts.genders.map(g => (
                        <option key={g.id} value={g.name_ar}>{g.name_ar}</option>
                      ))
                    ) : (
                      <>
                        <option value="ذكر">ذكر 👦</option>
                        <option value="أنثى">أنثى 👧</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="field-group col-span-1">
                  <label className="field-label">الديانة</label>
                  <select className="field-input" value={form.religion} onChange={e => setF('religion', e.target.value)}>
                    {formOpts.religions && formOpts.religions.length > 0 ? (
                      formOpts.religions.map(r => (
                        <option key={r.id} value={r.name_ar}>{r.name_ar}</option>
                      ))
                    ) : (
                      <>
                        <option value="مسلم">مسلم</option>
                        <option value="مسيحي">مسيحي</option>
                        <option value="أخرى">أخرى</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="field-group col-span-2">
                  <label className="field-label">محل الميلاد (المحافظة / المدينة)</label>
                  <input type="text" className="field-input" placeholder="القاهرة - مصر الجديدة"
                    value={form.birthPlace} onChange={e => setF('birthPlace', e.target.value)} disabled={isAutofilled} />
                </div>
              </div>

              <div className="section-title" style={{ marginTop: 20 }}>📍 العنوان وبيانات التواصل الشخصي</div>
              <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="field-group col-span-3">
                  <label className="field-label">العنوان التفصيلي</label>
                  <input type="text" className="field-input" placeholder="المحافظة - المدينة - الشارع - رقم العقار"
                    value={form.address} onChange={e => setF('address', e.target.value)} />
                </div>

                <div className="field-group col-span-1">
                  <label className="field-label">هاتف الطالب الشخصي</label>
                  <input type="text" className="field-input" dir="ltr" placeholder="01xxxxxxxxx"
                    value={form.studentPhone} onChange={e => setF('studentPhone', e.target.value)} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TAB 2: البيانات الأكاديمية والتوزيع ──────────────── */}
        {activeTab === 'academic' && (
          <div className="tab-content">
            <div className="section-title">🎓 التوزيع الأكاديمي والخيارات الحاكمة (أسفل العنوان والتأصيل)</div>

            <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {/* 1. حالة القيد */}
              <div className="field-group col-span-1">
                <label className="field-label">1️⃣ حالة القيد <span className="required-star">*</span></label>
                <select className="field-input" value={form.status} onChange={e => setF('status', e.target.value)} required>
                  {formOpts.enrollmentStatuses && formOpts.enrollmentStatuses.length > 0 ? (
                    formOpts.enrollmentStatuses.map(s => (
                      <option key={s.id} value={s.code.toLowerCase()}>{s.name_ar}</option>
                    ))
                  ) : (
                    <>
                      <option value="new">مستجد</option>
                      <option value="promoted">منقول</option>
                      <option value="retained">باقٍ للإعادة</option>
                      <option value="suspended">موقوف قيده</option>
                      <option value="disconnected">منقطع</option>
                      <option value="excluded">مستبعد</option>
                    </>
                  )}
                </select>
              </div>

              {/* 2. الفصل */}
              <div className="field-group col-span-1">
                <label className="field-label">2️⃣ الفصل الدراسي (Classroom)</label>
                <select className="field-input" value={form.classroomId} onChange={e => setF('classroomId', e.target.value)}>
                  <option value="">-- بدون فصل (موزع لاحقاً) --</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.class_name} {c.capacity ? `(سعة ${c.capacity})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* 3. الشعبة */}
              <div className="field-group col-span-1">
                <label className="field-label">3️⃣ الشعبة (Track)</label>
                <select
                  className="field-input"
                  value={isSec2Or3 ? (form.schoolTrack || 'عام') : 'عام'}
                  disabled={!isSec2Or3}
                  onChange={e => setF('schoolTrack', e.target.value)}
                >
                  <option value="عام">عام</option>
                  {formOpts.schoolTracks && formOpts.schoolTracks.length > 0 ? (
                    formOpts.schoolTracks.filter(t => t.name_ar !== 'عام').map(t => (
                      <option key={t.id} value={t.name_ar}>{t.name_ar}</option>
                    ))
                  ) : (
                    <>
                      <option value="علمي">علمي</option>
                      <option value="أدبي">أدبي</option>
                    </>
                  )}
                </select>
                {!isSec2Or3 && (
                  <span style={{ fontSize: 11, color: '#0284c7', marginTop: 4, display: 'block', fontWeight: 600 }}>
                    🔒 (عام) تلقائياً لجميع الصفوف عدا الثاني والثالث الثانوي
                  </span>
                )}
              </div>

              {/* 4. التخصص */}
              <div className="field-group col-span-1">
                <label className="field-label">4️⃣ التخصص / المسار</label>
                <select
                  className="field-input"
                  value={isSec2Or3 ? (form.schoolSpecialization || 'عام') : 'عام'}
                  disabled={!isSec2Or3}
                  onChange={e => setF('schoolSpecialization', e.target.value)}
                >
                  <option value="عام">عام</option>
                  {formOpts.schoolSpecializations && formOpts.schoolSpecializations.length > 0 ? (
                    formOpts.schoolSpecializations.filter(sp => sp.name_ar !== 'عام').map(sp => (
                      <option key={sp.id} value={sp.name_ar}>{sp.name_ar}</option>
                    ))
                  ) : (
                    <>
                      <option value="علمي علوم">علمي علوم</option>
                      <option value="علمي رياضيات">علمي رياضيات</option>
                      <option value="أدبي">أدبي</option>
                    </>
                  )}
                </select>
                {!isSec2Or3 && (
                  <span style={{ fontSize: 11, color: '#0284c7', marginTop: 4, display: 'block', fontWeight: 600 }}>
                    🔒 (عام) تلقائياً لجميع الصفوف عدا الثاني والثالث الثانوي
                  </span>
                )}
              </div>

              {/* 5. اللغة الأولى */}
              <div className="field-group col-span-1">
                <label className="field-label">5️⃣ اللغة الأجنبية الأولى</label>
                <select className="field-input" value={form.firstLanguage} onChange={e => setF('firstLanguage', e.target.value)}>
                  {formOpts.foreignLanguages && formOpts.foreignLanguages.length > 0 ? (
                    formOpts.foreignLanguages.map(fl => (
                      <option key={fl.id} value={fl.name_ar}>{fl.name_ar}</option>
                    ))
                  ) : (
                    <>
                      <option value="عربي">عربي</option>
                      <option value="إنجليزي">إنجليزي</option>
                      <option value="فرنسي">فرنسي</option>
                    </>
                  )}
                </select>
              </div>

              {/* 6. اللغة الثانية (تستثني خيار اللغة الأولى تلقائياً) */}
              <div className="field-group col-span-1">
                <label className="field-label">6️⃣ اللغة الأجنبية الثانية</label>
                <select className="field-input" value={form.secondLanguage} onChange={e => setF('secondLanguage', e.target.value)}>
                  <option value="لا يوجد">لا يوجد / معفى</option>
                  {(formOpts.foreignLanguages || []).filter(fl => fl.name_ar !== form.firstLanguage).map(fl => (
                    <option key={fl.id} value={fl.name_ar}>{fl.name_ar}</option>
                  ))}
                  {!formOpts.foreignLanguages?.length && (
                    <>
                      <option value="فرنسي">فرنسي</option>
                      <option value="ألماني">ألماني</option>
                      <option value="إيطالي">إيطالي</option>
                      <option value="إسباني">إسباني</option>
                    </>
                  )}
                </select>
              </div>

              {/* 7. تاريخ الالتحاق */}
              <div className="field-group col-span-1">
                <label className="field-label">7️⃣ تاريخ الالتحاق</label>
                <input type="date" className="field-input" value={form.enrollmentDate} onChange={e => setF('enrollmentDate', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: بيانات الأسرة والولاية ───────────────────── */}
        {activeTab === 'family' && (
          <div className="tab-content">
            <div className="section-title">👨 بيانات ولي الأمر (الأب / الوصي)</div>
            <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="field-group col-span-2">
                <label className="field-label">اسم ولي الأمر بالكامل</label>
                <input type="text" className="field-input" placeholder="اسم الأب أو الوصي"
                  value={form.guardianName} onChange={e => setF('guardianName', e.target.value)} />
              </div>

              <div className="field-group col-span-1">
                <label className="field-label">صفة ولي الأمر</label>
                <select className="field-input" value={form.guardianRelation} onChange={e => setF('guardianRelation', e.target.value)}>
                  {formOpts.guardianRelations && formOpts.guardianRelations.length > 0 ? (
                    formOpts.guardianRelations.map(gr => (
                      <option key={gr.id} value={gr.name_ar}>{gr.name_ar}</option>
                    ))
                  ) : (
                    RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)
                  )}
                </select>
              </div>

              <div className="field-group col-span-1">
                <label className="field-label">الرقم القومي لولي الأمر</label>
                <input type="text" className="field-input" dir="ltr" maxLength={14} placeholder="14 رقم"
                  value={form.guardianNationalId} onChange={e => setF('guardianNationalId', e.target.value)} />
              </div>

              <div className="field-group col-span-1">
                <label className="field-label">هاتف ولي الأمر الأساسي</label>
                <input type="text" className="field-input" dir="ltr" placeholder="01xxxxxxxxx"
                  value={form.guardianPhone} onChange={e => setF('guardianPhone', e.target.value)} />
              </div>

              <div className="field-group col-span-1">
                <label className="field-label">هاتف إضافي (واتساب)</label>
                <input type="text" className="field-input" dir="ltr" placeholder="01xxxxxxxxx"
                  value={form.guardianPhone2} onChange={e => setF('guardianPhone2', e.target.value)} />
              </div>

              <div className="field-group col-span-2">
                <label className="field-label">مهنة / وظيفة ولي الأمر</label>
                <input type="text" className="field-input" placeholder="مهندس / معلم / طبيب ..."
                  value={form.guardianJob} onChange={e => setF('guardianJob', e.target.value)} />
              </div>
            </div>

            <div className="section-title" style={{ marginTop: 20 }}>👩 بيانات الأم الرسمية</div>
            <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="field-group col-span-2">
                <label className="field-label">اسم الأم بالكامل</label>
                <input type="text" className="field-input" placeholder="اسم الأم الثلاثي أو الرباعي"
                  value={form.motherName} onChange={e => setF('motherName', e.target.value)} />
              </div>

              <div className="field-group col-span-1">
                <label className="field-label">جنسية الأم</label>
                <select className="field-input" value={form.motherNationalityId} onChange={e => setF('motherNationalityId', e.target.value)}>
                  <option value="">-- اختر --</option>
                  {formOpts.nationalities?.map(n => (
                    <option key={n.id} value={String(n.id)}>{n.name_ar || n.name}</option>
                  ))}
                </select>
              </div>

              <div className="field-group col-span-1">
                <label className="field-label">الرقم القومي للأم</label>
                <input type="text" className="field-input" dir="ltr" maxLength={14} placeholder="14 رقم"
                  value={form.motherNationalId} onChange={e => setF('motherNationalId', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: الحالات الخاصة والتوجلات ───────────────────── */}
        {activeTab === 'cases' && (() => {
          const filteredStaff = (formOpts.staff || []).filter(st =>
            !staffSearch || st.full_name_ar?.includes(staffSearch) || st.job_title?.includes(staffSearch)
          );
          const filteredAllStudents = (formOpts.allStudents || []).filter(st =>
            !siblingSearch || st.full_name_ar?.includes(siblingSearch) || st.student_code?.includes(siblingSearch)
          );

          return (
            <div className="tab-content">
              <div className="section-title">⭐ خيارات وحالات الطالب الخاصة (مفاتيح التفعيل Toggles)</div>
              <p className="section-hint">قم بتشغيل مفتاح التفعيل للحالة المطلوبة لفتح الحقول الخاصة بها مباشرةً بدون مكررات.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                
                {/* 1. أبناء العاملين */}
                <div style={{ background: form.isParentStaff ? '#eff6ff' : '#f8fafc', border: `1px solid ${form.isParentStaff ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 12, padding: 14, transition: 'all 0.2s' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 800, fontSize: 14.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>👔</span>
                      <span>طالب من أبناء العاملين بالمؤسسة / المدرسة</span>
                    </div>
                    <input type="checkbox" checked={form.isParentStaff} onChange={e => setF('isParentStaff', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </label>
                  {form.isParentStaff && (
                    <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12, paddingTop: 12, borderTop: '1px solid #bfdbfe' }}>
                      <div className="field-group col-span-2">
                        <label className="field-label">اختر الموظف / المعلم من الكادر</label>
                        <input type="text" className="field-input" placeholder="بحث بالاسم..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)} style={{ marginBottom: 6 }} />
                        <select className="field-input" value={form.parentStaffId} onChange={e => setF('parentStaffId', e.target.value)}>
                          <option value="">-- اختر الموظف --</option>
                          {filteredStaff.map(st => (
                            <option key={st.id} value={String(st.id)}>{st.full_name_ar} ({st.job_title})</option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group col-span-1">
                        <label className="field-label">صلة القرابة</label>
                        <input type="text" className="field-input" value={form.staffRelation} onChange={e => setF('staffRelation', e.target.value)} placeholder="والد الطالب / والدة الطالب" />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. الإخوة والتوائم */}
                <div style={{ background: form.isSiblingOrTwin ? '#f0fdf4' : '#f8fafc', border: `1px solid ${form.isSiblingOrTwin ? '#10b981' : '#e2e8f0'}`, borderRadius: 12, padding: 14, transition: 'all 0.2s' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 800, fontSize: 14.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>👨‍👩‍👦</span>
                      <span>ربط الإخوة أو التوائم المسجلين بالمدرسة</span>
                    </div>
                    <input type="checkbox" checked={form.isSiblingOrTwin} onChange={e => setF('isSiblingOrTwin', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </label>
                  {form.isSiblingOrTwin && (
                    <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 12, paddingTop: 12, borderTop: '1px solid #a7f3d0' }}>
                      <div className="field-group col-span-1">
                        <label className="field-label">بحث وااختيار الأخ / الأخت المسجل</label>
                        <input type="text" className="field-input" placeholder="بحث باسم الطالب..." value={siblingSearch} onChange={e => setSiblingSearch(e.target.value)} style={{ marginBottom: 6 }} />
                        <select className="field-input" value={form.siblingStudentIds} onChange={e => setF('siblingStudentIds', e.target.value)}>
                          <option value="">-- اختر الأخ --</option>
                          {filteredAllStudents.map(st => (
                            <option key={st.id} value={String(st.id)}>{st.full_name_ar} ({st.student_code})</option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group col-span-1">
                        <label className="field-label">اختر التوأم المباشر (إن وجد)</label>
                        <select className="field-input" value={form.twinStudentId} onChange={e => setF('twinStudentId', e.target.value)} style={{ marginTop: 34 }}>
                          <option value="">-- اختر التوأم --</option>
                          {filteredAllStudents.map(st => (
                            <option key={st.id} value={String(st.id)}>{st.full_name_ar} ({st.student_code})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. الدمج التعليمي وذوي الاحتياجات (موحد برمجياً) */}
                <div style={{ background: form.isMerged ? '#fffbeb' : '#f8fafc', border: `1px solid ${form.isMerged ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 12, padding: 14, transition: 'all 0.2s' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 800, fontSize: 14.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>♿</span>
                      <span>الدمج التعليمي وذوو الاحتياجات الخاصة (قرار وزاري)</span>
                    </div>
                    <input type="checkbox" checked={form.isMerged} onChange={e => setF('isMerged', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </label>
                  {form.isMerged && (
                    <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12, paddingTop: 12, borderTop: '1px solid #fde68a' }}>
                      <div className="field-group col-span-1">
                        <label className="field-label">نوع الإعاقة / الدمج</label>
                        <select className="field-input" value={form.mergeType} onChange={e => setF('mergeType', e.target.value)}>
                          {formOpts.specialNeeds && formOpts.specialNeeds.length > 0 ? (
                            formOpts.specialNeeds.map(sn => (
                              <option key={sn.id} value={sn.name_ar}>{sn.name_ar}</option>
                            ))
                          ) : (
                            <>
                              <option value="صعوبات تعلم">صعوبات تعلم</option>
                              <option value="إعاقة سمعية">إعاقة سمعية</option>
                              <option value="إعاقة بصرية">إعاقة بصرية</option>
                              <option value="إعاقة حركية">إعاقة حركية</option>
                              <option value="توحد">توحد</option>
                              <option value="اضطراب نطق">اضطراب نطق</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="field-group col-span-1">
                        <label className="field-label">رقم القرار الوزاري للدمج</label>
                        <input type="text" className="field-input" placeholder="مثال: 252 لسنة 2017" value={form.mergeDecisionNumber} onChange={e => setF('mergeDecisionNumber', e.target.value)} />
                      </div>

                      <div className="field-group col-span-1">
                        <label className="field-label">تاريخ صدور القرار</label>
                        <input type="date" className="field-input" value={form.mergeDecisionDate} onChange={e => setF('mergeDecisionDate', e.target.value)} />
                      </div>

                      <div className="field-group col-span-3">
                        <label className="field-label">ملاحظات والتسهيلات المطلوبة للدمج</label>
                        <input type="text" className="field-input" placeholder="ملاحظات اللجنة الطبية والمرافقين..." value={form.mergeNotes} onChange={e => setF('mergeNotes', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. طالب موهوب (موحد) */}
                <div style={{ background: form.isTalented ? '#fef2f2' : '#f8fafc', border: `1px solid ${form.isTalented ? '#ef4444' : '#e2e8f0'}`, borderRadius: 12, padding: 14, transition: 'all 0.2s' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 800, fontSize: 14.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🏆</span>
                      <span>طالب موهوب وذو تفوق (رياضي / فني / علمي / تقني / تكوين وطني)</span>
                    </div>
                    <input type="checkbox" checked={form.isTalented} onChange={e => setF('isTalented', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </label>
                  {form.isTalented && (
                    <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12, paddingTop: 12, borderTop: '1px solid #fca5a5' }}>
                      <div className="field-group col-span-1">
                        <label className="field-label">مجال الموهبة والتفوق</label>
                        <select className="field-input" value={form.talentCategory} onChange={e => setF('talentCategory', e.target.value)}>
                          <option value="موهبة علمية وتكنولوجية">موهبة علمية وتكنولوجية</option>
                          <option value="تفوق رياضي وبطولات">تفوق رياضي وبطولات</option>
                          <option value="موهبة فنية وأدبية">موهبة فنية وأدبية</option>
                          <option value="تكوين وطني وقيادي">تكوين وطني وقيادي</option>
                        </select>
                      </div>

                      <div className="field-group col-span-2">
                        <label className="field-label">وصف الموهبة والجوائز الحاصل عليها</label>
                        <input type="text" className="field-input" placeholder="المركز الأول في الابتكارات / بطولة الجمهورية..." value={form.talentDescription} onChange={e => setF('talentDescription', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. عائد من الخارج */}
                <div style={{ background: form.isReturnedFromAbroad ? '#f5f3ff' : '#f8fafc', border: `1px solid ${form.isReturnedFromAbroad ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: 12, padding: 14, transition: 'all 0.2s' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 800, fontSize: 14.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>✈️</span>
                      <span>طالب عائد من الخارج (معادلات الشهادات الخارجية)</span>
                    </div>
                    <input type="checkbox" checked={form.isReturnedFromAbroad} onChange={e => setF('isReturnedFromAbroad', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </label>
                  {form.isReturnedFromAbroad && (
                    <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 12, paddingTop: 12, borderTop: '1px solid #ddd6fe' }}>
                      <div className="field-group col-span-1">
                        <label className="field-label">الدولة العائد منها</label>
                        <input type="text" className="field-input" placeholder="المملكة العربية السعودية / الإمارات / الكويت..." value={form.countryFrom} onChange={e => setF('countryFrom', e.target.value)} />
                      </div>

                      <div className="field-group col-span-1">
                        <label className="field-label">تاريخ العودة والمعادلة</label>
                        <input type="date" className="field-input" value={form.returnDate} onChange={e => setF('returnDate', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. محول من مدرسة أخرى */}
                <div style={{ background: form.isTransferred ? '#ecfeff' : '#f8fafc', border: `1px solid ${form.isTransferred ? '#06b6d4' : '#e2e8f0'}`, borderRadius: 12, padding: 14, transition: 'all 0.2s' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 800, fontSize: 14.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🔄</span>
                      <span>طالب محوّل من مدرسة أخرى</span>
                    </div>
                    <input type="checkbox" checked={form.isTransferred} onChange={e => setF('isTransferred', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </label>
                  {form.isTransferred && (
                    <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12, paddingTop: 12, borderTop: '1px solid #a5f3fc' }}>
                      <div className="field-group col-span-1">
                        <label className="field-label">اسم المدرسة السابقة</label>
                        <input type="text" className="field-input" placeholder="مدرسة النور الخاصة" value={form.transferredFromSchool} onChange={e => setF('transferredFromSchool', e.target.value)} />
                      </div>

                      <div className="field-group col-span-1">
                        <label className="field-label">الإدارة التعليمية السابقة</label>
                        <input type="text" className="field-input" placeholder="إدارة شمال الجيزة" value={form.transferredFromDirectorate} onChange={e => setF('transferredFromDirectorate', e.target.value)} />
                      </div>

                      <div className="field-group col-span-1">
                        <label className="field-label">المحافظة</label>
                        <input type="text" className="field-input" placeholder="الجيزة" value={form.transferredFromGovernorate} onChange={e => setF('transferredFromGovernorate', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()}

        {/* ── Sticky Bottom Action Bar ────────────────────────────── */}
        <div style={{
          position: 'sticky',
          bottom: '12px',
          zIndex: 100,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #cbd5e1',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          borderRadius: '12px',
          padding: '12px 20px',
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '13px', fontWeight: 800 }}>
            <span>💡 يمكنك مراجعة البيانات ثم الضغط على زر الحفظ في أي وقت.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-cancel" onClick={onCancel} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 800 }}>
              <X size={16} /> إلغاء
            </button>
            <button
              type="button"
              className="btn-add-student"
              disabled={saving}
              onClick={handleSubmit}
              style={{ background: '#16a34a', borderColor: '#16a34a', padding: '10px 24px', fontSize: '13.5px', fontWeight: 900, boxShadow: '0 3px 10px rgba(22,163,74,0.3)', cursor: 'pointer' }}
            >
              <Save size={18} />
              <span>{saving ? 'جارٍ حفظ البيانات...' : '💾 حفظ وتأكيد بيانات الطالب'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
