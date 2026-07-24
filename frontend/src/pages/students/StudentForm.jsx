import React, { useState, useEffect } from 'react';
import {
  GraduationCap, User, Phone, MapPin, BookOpen,
  ChevronRight, ChevronLeft, Save, X, AlertCircle, CheckCircle2
} from 'lucide-react';

const API = `http://${window.location.hostname}:3001/api`;

const TABS = [
  { id: 'basic',    label: 'البيانات الأساسية', icon: '👤' },
  { id: 'family',   label: 'بيانات الأسرة',     icon: '👨‍👩‍👧' },
  { id: 'academic', label: 'البيانات الأكاديمية', icon: '🎓' },
  { id: 'cases',    label: 'الحالات الخاصة',    icon: '⭐' },
];

const BACCALAUREATE_TRACKS = [
  { value: 'medicine_life',   label: 'مسار الطب وعلوم الحياة'    },
  { value: 'engineering_cs',  label: 'مسار الهندسة وعلوم الحاسب' },
  { value: 'business',        label: 'مسار الأعمال'               },
  { value: 'arts_humanities', label: 'مسار الآداب والفنون'        },
];
const OLD_TRACKS = [
  { value: 'science_bio',  label: 'علمي - علوم' },
  { value: 'science_math', label: 'علمي - رياضيات' },
  { value: 'literary',     label: 'أدبي' },
];

const ELECTIVES = {
  medicine_life:   ['الرياضيات (اختياري)', 'الفيزياء (اختياري)'],
  engineering_cs:  ['الكيمياء (اختياري)', 'البرمجة (اختياري)'],
  business:        ['المحاسبة (اختياري)', 'إدارة الأعمال (اختياري)'],
  arts_humanities: ['علم النفس (اختياري)', 'اللغة الأجنبية الثانية (اختياري)'],
};

const RELATION_OPTIONS = ['أب', 'أم', 'جد', 'جدة', 'عم', 'خال', 'أخ', 'أخت', 'وصي قانوني', 'آخر'];

export default function StudentForm({ studentId, onSaved, onCancel, activeSectionId }) {
  const isEdit = Boolean(studentId);
  const [activeTab,  setActiveTab]  = useState('basic');
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [formOpts,   setFormOpts]   = useState({ sections: [], stages: [], grades: [], nationalities: [], academicYears: [], caseTypes: [] });
  const [classrooms, setClassrooms] = useState([]);

  const [form, setForm] = useState({
    // Academic placement
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '', stageId: '', gradeId: '', academicYearId: '', classroomId: '',
    // Basic info
    fullNameAr: '', fullNameEn: '', birthDate: '', birthPlace: '',
    nationalityId: '', nationalId: '', emisStudentCode: '', gender: '', religion: '',
    // Guardian (father/guardian)
    guardianName: '', guardianRelation: 'أب', guardianNationalId: '',
    guardianPhone: '', guardianPhone2: '', guardianJob: '',
    // Mother
    motherName: '', motherNationalityId: '', motherNationalId: '',
    // Address & Contact
    address: '', studentPhone: '',
    // Academic options
    secondLanguage: '', secondaryTrack: '', secondaryElective: '',
    // Merge
    isMerged: false, mergedGradeId: '', mergeType: '', mergeNotes: '',
    // Enrollment
    enrollmentDate: new Date().toISOString().split('T')[0],
    status: 'promoted',
    // Special cases (array of case_type_id numbers)
    specialCases: [],
  });

  // Extract date of birth, gender, and governorate from Egyptian National ID
  const extractFromNationalId = (id) => {
    if (!id || id.length !== 14 || isNaN(id)) return;
    
    // Century code
    const centuryCode = parseInt(id.substr(0, 1));
    const yearPart = id.substr(1, 2);
    const monthPart = id.substr(3, 2);
    const dayPart = id.substr(5, 2);
    
    let birthYear = '';
    if (centuryCode === 2) {
      birthYear = '19' + yearPart;
    } else if (centuryCode === 3) {
      birthYear = '20' + yearPart;
    } else {
      return;
    }
    
    const formattedBirthDate = `${birthYear}-${monthPart}-${dayPart}`;
    
    // Gender
    const genderDigit = parseInt(id.substr(12, 1));
    const extractedGender = (genderDigit % 2 === 0) ? 'أنثى' : 'ذكر';
    
    // Governorate
    const govCode = id.substr(7, 2);
    const GOVERNORATES = {
      '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس',
      '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
      '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
      '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
      '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
      '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
      '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج مصر'
    };
    const extractedGov = GOVERNORATES[govCode] || '';
    
    setForm(f => ({
      ...f,
      birthDate: formattedBirthDate,
      gender: extractedGender,
      birthPlace: extractedGov
    }));
  };

  // Watch nationalId changes to trigger auto extraction
  useEffect(() => {
    if (form.nationalId && form.nationalId.length === 14) {
      extractFromNationalId(form.nationalId);
    }
  }, [form.nationalId]);

  // Load form options
  useEffect(() => {
    fetch(`${API}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFormOpts(d);
          // Auto-select current academic year
          const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
          if (cur && !isEdit) setForm(f => ({ ...f, academicYearId: String(cur.id) }));
          
          // Auto-select section if activeSectionId is restricted
          if (activeSectionId && activeSectionId !== 'all' && !isEdit) {
            setForm(f => ({ ...f, sectionId: String(activeSectionId) }));
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
              fullNameAr: s.full_name_ar || '', fullNameEn: s.full_name_en || '',
              birthDate: s.birth_date || '', birthPlace: s.birth_place || '',
              nationalityId: String(s.nationality_id || ''), nationalId: s.national_id || '',
              emisStudentCode: s.emis_student_code || '',
              gender: s.gender || '', religion: s.religion || '',
              guardianName: s.guardian_name || '', guardianRelation: s.guardian_relation || 'أب',
              guardianNationalId: s.guardian_national_id || '',
              guardianPhone: s.guardian_phone || '', guardianPhone2: s.guardian_phone_2 || '',
              guardianJob: s.guardian_job || '',
              motherName: s.mother_name || '',
              motherNationalityId: String(s.mother_nationality_id || ''),
              motherNationalId: s.mother_national_id || '',
              address: s.address || '',
              studentPhone: s.student_phone || '',
              secondLanguage: s.second_language || '', secondaryTrack: s.secondary_track || '',
              secondaryElective: s.secondary_elective || '',
              isMerged: Boolean(s.is_merged), mergedGradeId: String(s.merged_grade_id || ''),
              mergeType: s.merge_type || '',
              mergeDecisionNumber: s.merge_decision_number || '',
              mergeDecisionDate: s.merge_decision_date || '',
              mergeNotes: s.merge_notes || '',
              enrollmentDate: s.enrollment_date || new Date().toISOString().split('T')[0],
              status: s.status || 'promoted',
              specialCases: (d.specialCases || []).map(c => c.case_type_id),
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [studentId]);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const filteredStages = formOpts.stages?.filter(s => !form.sectionId || String(s.section_id) === form.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(g => !form.stageId  || String(g.stage_id)   === form.stageId)   || [];

  // Determine if secondary track selection is needed
  const selectedGrade = formOpts.grades?.find(g => String(g.id) === form.gradeId);
  const isSecondary   = formOpts.stages?.find(s => String(s.id) === form.stageId)?.stage_name === 'ثانوي';
  const selectedStage = formOpts.stages?.find(s => String(s.id) === form.stageId);
  const isBaccalaureate = selectedGrade?.secondary_system === 'baccalaureate';
  const isOldSecondary  = selectedGrade?.secondary_system === 'old';

  const toggleCase = (caseId) => {
    setForm(f => ({
      ...f,
      specialCases: f.specialCases.includes(caseId)
        ? f.specialCases.filter(c => c !== caseId)
        : [...f.specialCases, caseId]
    }));
  };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.fullNameAr.trim()) return setError('اسم الطالب بالعربية مطلوب.');
    if (!form.gender)            return setError('جنس الطالب مطلوب.');
    if (!form.sectionId)         return setError('يرجى اختيار القسم.');
    if (!form.stageId)           return setError('يرجى اختيار المرحلة.');
    if (!form.gradeId)           return setError('يرجى اختيار الصف.');
    if (!form.academicYearId)    return setError('يرجى اختيار العام الدراسي.');

    setSaving(true);
    try {
      const url    = isEdit ? `${API}/students/${studentId}` : `${API}/students`;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ البيانات');

      // Assign/update classroom enrollment
      const sid = data.studentId || studentId;
      if (form.classroomId && sid) {
        await fetch(`${API}/settings/classrooms/${form.classroomId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: sid, academicYearId: form.academicYearId }),
        });
      }

      setSuccess(data.message || 'تم الحفظ بنجاح');
      setTimeout(() => onSaved(data.studentId, data.studentCode), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="form-loading">
      <div className="loading-spinner" />
      <span>جاري تحميل بيانات الطالب...</span>
    </div>
  );

  return (
    <div className="student-form-page">
      {/* Header */}
      <div className="form-header">
        <div className="page-title-area">
          <div className="page-icon"><GraduationCap size={22} /></div>
          <div>
            <h1 className="page-title">{isEdit ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد'}</h1>
            <p className="page-sub">{isEdit ? 'تحديث السجل الأكاديمي للطالب' : 'إضافة طالب جديد إلى قاعدة البيانات'}</p>
          </div>
        </div>
        <button className="btn-cancel" onClick={onCancel}><X size={16} /> إلغاء</button>
      </div>

      {/* Alerts */}
      {error   && <div className="form-alert error"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="form-alert success"><CheckCircle2 size={16} /> {success}</div>}

      {/* Tab Content & Body */}
      <div className="form-body glass-panel">
        {/* Tabs inside the glass-panel card for guaranteed visibility */}
        <div className="form-tabs">
          {TABS.map(t => (
            <button 
              key={t.id} 
              type="button"
              className={`form-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span style={{ marginLeft: 6 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab 1: البيانات الأساسية ───────────────────── */}
        {activeTab === 'basic' && (() => {
          const selectedNationality = formOpts.nationalities?.find(n => String(n.id) === form.nationalityId);
          const isEgyptian = selectedNationality?.name === 'مصري';
          const isAutofilled = isEgyptian && form.nationalId?.length === 14;

          return (
            <div className="tab-content">
              <h3 className="section-title">🪪 الهوية الشخصية</h3>
              <div className="fields-grid">
                <InputField label="الاسم الرباعي بالعربية" value={form.fullNameAr}
                  onChange={v => setF('fullNameAr', v)} placeholder="مثال: أحمد محمد علي السيد" required />
                
                <InputField label="الاسم بالإنجليزية" value={form.fullNameEn}
                  onChange={v => setF('fullNameEn', v)} placeholder="Ahmed Mohamed Ali El-Sayed" dir="ltr" />
                
                <SelectField label="الجنسية" value={form.nationalityId}
                  onChange={v => setF('nationalityId', v)}
                  options={formOpts.nationalities?.map(n => ({ value: String(n.id), label: n.name })) || []} required />

                {isEgyptian ? (
                  <InputField label="الرقم القومي (14 رقم)" value={form.nationalId}
                    onChange={v => setF('nationalId', v)} placeholder="30101..." dir="ltr" required />
                ) : (
                  <InputField label="رقم جواز السفر / هوية الوافد" value={form.nationalId}
                    onChange={v => setF('nationalId', v)} placeholder="أدخل رقم جواز السفر أو الإقامة" dir="ltr" />
                )}

                <InputField label="كود الطالب على الحكومة الإلكترونية (EMIS)" value={form.emisStudentCode}
                  onChange={v => setF('emisStudentCode', v)} placeholder="مثال: 21024219" dir="ltr" />

                <InputField label="تاريخ الميلاد" value={form.birthDate} type="date"
                  onChange={v => setF('birthDate', v)} disabled={isAutofilled} required />
                
                <SelectField label="الجنس" value={form.gender} onChange={v => setF('gender', v)}
                  options={[{ value: 'ذكر', label: 'ذكر 👦' }, { value: 'أنثى', label: 'أنثى 👧' }]} 
                  disabled={isAutofilled} required />

                <InputField label="محل الميلاد" value={form.birthPlace}
                  onChange={v => setF('birthPlace', v)} placeholder="المحافظة - المركز" disabled={isAutofilled} />

                <SelectField label="الديانة" value={form.religion} onChange={v => setF('religion', v)}
                  options={[{ value: 'مسلم', label: 'مسلم' }, { value: 'مسيحي', label: 'مسيحي' }, { value: 'أخرى', label: 'أخرى' }]} />
              </div>

              <h3 className="section-title" style={{ marginTop: 28 }}>📍 العنوان وحالة القيد</h3>
              <div className="fields-grid">
                <div className="field-group col-span-2">
                  <label className="field-label">العنوان</label>
                  <input type="text" className="field-input" placeholder="المحافظة - المدينة - الشارع" 
                    value={form.address} onChange={e => setF('address', e.target.value)} />
                </div>
                <InputField label="هاتف الطالب الشخصي" value={form.studentPhone}
                  onChange={v => setF('studentPhone', v)} placeholder="01xxxxxxxxx" dir="ltr" />
                
                <InputField label="تاريخ الالتحاق" value={form.enrollmentDate} type="date"
                  onChange={v => setF('enrollmentDate', v)} required />

                <SelectField label="حالة القيد" value={form.status} onChange={v => setF('status', v)}
                  options={[
                    { value: 'promoted', label: 'منقول' },
                    { value: 'retained', label: 'باقٍ للإعادة' },
                    { value: 'disconnected', label: 'منقطع' },
                    { value: 'excluded', label: 'مستبعد' },
                    { value: 'suspended', label: 'موقوف قيده' },
                  ]} required />
              </div>
            </div>
          );
        })()}

        {/* ── Tab 2: بيانات الأسرة ─────────────────────── */}
        {activeTab === 'family' && (
          <div className="tab-content">
            <h3 className="section-title">👨 بيانات ولي الأمر (الأب / الوصي)</h3>
            <div className="fields-grid">
              <InputField label="اسم ولي الأمر" value={form.guardianName}
                onChange={v => setF('guardianName', v)} placeholder="الاسم بالكامل" />
              <SelectField label="صفة ولي الأمر" value={form.guardianRelation}
                onChange={v => setF('guardianRelation', v)}
                options={RELATION_OPTIONS.map(r => ({ value: r, label: r }))} />
              <InputField label="الرقم القومي لولي الأمر" value={form.guardianNationalId}
                onChange={v => setF('guardianNationalId', v)} placeholder="14 رقم" dir="ltr" />
              <InputField label="رقم الهاتف الأساسي" value={form.guardianPhone}
                onChange={v => setF('guardianPhone', v)} placeholder="01xxxxxxxxx" dir="ltr" />
              <InputField label="رقم الهاتف الإضافي" value={form.guardianPhone2}
                onChange={v => setF('guardianPhone2', v)} placeholder="01xxxxxxxxx" dir="ltr" />
              <InputField label="الوظيفة" value={form.guardianJob}
                onChange={v => setF('guardianJob', v)} placeholder="مهندس / معلم / تاجر ..." />
            </div>

            <h3 className="section-title" style={{ marginTop: 28 }}>👩 بيانات الأم</h3>
            <div className="fields-grid">
              <InputField label="اسم الأم" value={form.motherName}
                onChange={v => setF('motherName', v)} placeholder="الاسم بالكامل" />
              <SelectField label="جنسية الأم" value={form.motherNationalityId}
                onChange={v => setF('motherNationalityId', v)}
                options={formOpts.nationalities?.map(n => ({ value: String(n.id), label: n.name })) || []} />
              <InputField label="الرقم القومي للأم" value={form.motherNationalId}
                onChange={v => setF('motherNationalId', v)} placeholder="14 رقم" dir="ltr" />
            </div>
          </div>
        )}

        {/* ── Tab 3: البيانات الأكاديمية ───────────────── */}
        {activeTab === 'academic' && (
          <div className="tab-content">
            <h3 className="section-title">🏫 التوزيع الأكاديمي</h3>
            <div className="fields-grid">
              <SelectField label="العام الدراسي" value={form.academicYearId}
                onChange={v => setF('academicYearId', v)} required
                options={formOpts.academicYears?.map(y => ({ value: String(y.id), label: y.year_label })) || []} />

              <SelectField label="القسم" value={form.sectionId}
                onChange={v => { setF('sectionId', v); setF('stageId', ''); setF('gradeId', ''); }} required
                disabled={activeSectionId && activeSectionId !== 'all'}
                options={activeSectionId && activeSectionId !== 'all' ? (
                  formOpts.sections?.filter(s => String(s.id) === String(activeSectionId)).map(s => ({ value: String(s.id), label: s.name }))
                ) : (
                  formOpts.sections?.map(s => ({ value: String(s.id), label: s.name }))
                ) || []} />

              <SelectField label="المرحلة الدراسية" value={form.stageId}
                onChange={v => { setF('stageId', v); setF('gradeId', ''); setF('secondaryTrack', ''); }} required
                options={filteredStages.map(s => ({ value: String(s.id), label: s.stage_name }))} />

              <SelectField label="الصف الدراسي" value={form.gradeId}
                onChange={v => { setF('gradeId', v); setF('secondaryTrack', ''); setF('classroomId', ''); }} required
                options={filteredGrades.map(g => ({ value: String(g.id), label: g.grade_name_ar }))} />

              <SelectField label="الفصل الدراسي" value={form.classroomId}
                onChange={v => setF('classroomId', v)}
                options={classrooms.map(c => ({ value: String(c.id), label: `\u200E${c.class_name}` + (c.capacity ? ` (سعة ${c.capacity})` : '') }))} />
            </div>

            <h3 className="section-title" style={{ marginTop: 28 }}>📚 خيارات أكاديمية</h3>
            <div className="fields-grid">
              <SelectField label="اللغة الأجنبية الثانية" value={form.secondLanguage}
                onChange={v => setF('secondLanguage', v)}
                options={[
                  { value: 'فرنسي', label: 'فرنسي' }, { value: 'ألماني', label: 'ألماني' },
                  { value: 'إيطالي', label: 'إيطالي' }, { value: 'إسباني', label: 'إسباني' },
                  { value: 'لا يوجد', label: 'لا يوجد' },
                ]} />
            </div>

            {/* Secondary track selection */}
            {isSecondary && isBaccalaureate && (
              <div className="secondary-tracks-block">
                <h4 className="tracks-title">🎯 مسار نظام البكالوريا (الصف {selectedGrade?.grade_number === 2 ? 'الثاني' : 'الأول'})</h4>
                <div className="tracks-grid">
                  {BACCALAUREATE_TRACKS.map(t => (
                    <button key={t.value} className={`track-btn ${form.secondaryTrack === t.value ? 'selected' : ''}`}
                      type="button" onClick={() => { setF('secondaryTrack', t.value); setF('secondaryElective', ''); }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Elective for Grade 2 */}
                {selectedGrade?.grade_number === 2 && form.secondaryTrack && ELECTIVES[form.secondaryTrack] && (
                  <div style={{ marginTop: 16 }}>
                    <label className="field-label">المادة الاختيارية (الصف الثاني ثانوي)</label>
                    <div className="elective-options">
                      {ELECTIVES[form.secondaryTrack].map(e => (
                        <button key={e} type="button"
                          className={`elective-btn ${form.secondaryElective === e ? 'selected' : ''}`}
                          onClick={() => setF('secondaryElective', e)}>{e}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSecondary && isOldSecondary && (
              <div className="secondary-tracks-block">
                <h4 className="tracks-title">📖 شعبة النظام القديم (الصف الثالث الثانوي — مؤقت)</h4>
                <div className="tracks-grid">
                  {OLD_TRACKS.map(t => (
                    <button key={t.value} className={`track-btn ${form.secondaryTrack === t.value ? 'selected' : ''}`}
                      type="button" onClick={() => setF('secondaryTrack', t.value)}>{t.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Merge status */}
            <div className="merge-block" style={{ marginTop: 24 }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.isMerged} onChange={e => setF('isMerged', e.target.checked)} />
                <span>حالة دمج — الطالب مسجل بالدمج التعليمي</span>
              </label>
              {form.isMerged && (
                <div className="fields-grid" style={{ marginTop: 12 }}>
                  <InputField label="نوع الدمج / الإعاقة" value={form.mergeType}
                    onChange={v => setF('mergeType', v)} placeholder="مثال: صعوبات تعلم / توحد" />
                  <InputField label="رقم القرار الوزاري للدمج" value={form.mergeDecisionNumber}
                    onChange={v => setF('mergeDecisionNumber', v)} placeholder="رقم القرار" />
                  <InputField label="تاريخ القرار الوزاري" value={form.mergeDecisionDate} type="date"
                    onChange={v => setF('mergeDecisionDate', v)} />
                  <div className="field-group col-span-2">
                    <label className="field-label">ملاحظات الدمج</label>
                    <input type="text" className="field-input" placeholder="تفاصيل إضافية عن حالة الدمج" 
                      value={form.mergeNotes} onChange={e => setF('mergeNotes', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 4: الحالات الخاصة ────────────────────── */}
        {activeTab === 'cases' && (
          <div className="tab-content">
            <h3 className="section-title">⭐ الحالات الخاصة للطالب</h3>
            <p className="section-hint">يمكن تحديد أكثر من حالة واحدة. الحالات المحددة تظهر في ملف الطالب وتُستخدم لاحقاً في تطبيق الخصومات.</p>
            <div className="cases-grid">
              {formOpts.caseTypes?.map(c => (
                <label key={c.id} className={`case-item ${form.specialCases.includes(c.id) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.specialCases.includes(c.id)}
                    onChange={() => toggleCase(c.id)} style={{ display: 'none' }} />
                  <span className="case-check">{form.specialCases.includes(c.id) ? '✅' : '⬜'}</span>
                  <span className="case-name">{c.name_ar}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="form-footer">
        <div className="tab-nav">
          <button className="tab-prev" onClick={() => {
            const i = TABS.findIndex(t => t.id === activeTab);
            if (i > 0) setActiveTab(TABS[i - 1].id);
          }} disabled={activeTab === TABS[0].id}>
            <ChevronRight size={16} /> السابق
          </button>
          <span className="tab-progress">{TABS.findIndex(t => t.id === activeTab) + 1} / {TABS.length}</span>
          <button className="tab-next" onClick={() => {
            const i = TABS.findIndex(t => t.id === activeTab);
            if (i < TABS.length - 1) setActiveTab(TABS[i + 1].id);
          }} disabled={activeTab === TABS[TABS.length - 1].id}>
            التالي <ChevronLeft size={16} />
          </button>
        </div>

        <button className="btn-save" onClick={handleSubmit} disabled={saving}>
          {saving ? <><div className="loading-spinner sm" /> جاري الحفظ...</> : <><Save size={16} /> حفظ الطالب</>}
        </button>
      </div>
    </div>
  );
}

// Helper components declared outside main component to prevent recreation on every state update (fixes typing focus loss)
const InputField = ({ label, value, onChange, type = 'text', placeholder = '', required = false, dir = 'rtl', disabled = false }) => (
  <div className="field-group">
    <label className="field-label">{label}{required && <span className="required-star">*</span>}</label>
    <input type={type} className="field-input" placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)} dir={dir} required={required} disabled={disabled} />
  </div>
);

const SelectField = ({ label, value, onChange, options, placeholder = 'اختر...', required = false, disabled = false }) => (
  <div className="field-group">
    <label className="field-label">{label}{required && <span className="required-star">*</span>}</label>
    <select className="field-input" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
