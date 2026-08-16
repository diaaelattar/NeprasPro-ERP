import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ChevronUp, ChevronDown, Save, CheckCircle2,
  AlertCircle, X, Loader2, UserCheck, School, Phone, Mail, MapPin, Briefcase
} from 'lucide-react';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

import { EGYPTIAN_DIRECTORATES } from '../../data/egyptianDirectorates';

const AFFILIATIONS = [
  'رسمي عربي (حكومي)',
  'رسمي لغات (تجريبي)',
  'رسمي متميز لغات',
  'خاص عربي',
  'خاص لغات',
  'دولي (International)',
  'تعليم فني',
  'أزهر شريف'
];

export default function TransferForm({ initialStudentId, onSaved, onCancel }) {
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Selected Student Details (Auto-filled)
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Collapsible Sections States
  const [openStudentSection, setOpenStudentSection] = useState(true);
  const [openGuardianSection, setOpenGuardianSection] = useState(true);
  const [openDestinationSection, setOpenDestinationSection] = useState(true);

  // Form Fields State
  const [form, setForm] = useState({
    // Student Info (Read-only)
    studentName: '',
    nationalId: '',
    nationality: 'مصرى',
    gradeName: '',
    className: '',
    seatingNo: '',
    durationInGrade: 'سنة أولى (مستجد)',
    feesStatus: 'سدد',
    booksStatus: 'استلم',

    // Guardian Info (Editable)
    guardianName: '',
    guardianNationalId: '',
    guardianJob: '',
    guardianEmail: '',
    address: '',
    guardianPhone: '',
    guardianMobile: '',

    // Destination School Info
    toDirectorate: '',
    toAdministration: '',
    affiliation: '',
    toSchool: '',
    reason: '',
    academicYearId: '',
    transferDate: new Date().toISOString().split('T')[0],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [academicYears, setAcademicYears] = useState([]);

  // Load Form Options
  useEffect(() => {
    fetch(`${API}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAcademicYears(d.academicYears || []);
          const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
          if (cur) setForm(f => ({ ...f, academicYearId: String(cur.id) }));
        }
      });
  }, []);

  // Handle Initial Student ID if passed
  useEffect(() => {
    if (initialStudentId) {
      loadStudentById(initialStudentId);
    }
  }, [initialStudentId]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Live as User Types (Debounced)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const q = encodeURIComponent(searchTerm.trim());
        const res = await fetch(`${API}/students?search=${q}&limit=20`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.students || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Select and Populate Student
  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearchTerm(student.full_name_ar);
    setShowDropdown(false);

    setForm(prev => ({
      ...prev,
      studentName: student.full_name_ar || '',
      nationalId: student.national_id || '',
      nationality: student.nationality_name || 'مصرى',
      gradeName: student.grade_name || student.grade_name_ar || '—',
      className: student.classroom_name || student.class_name || (student.class_id ? String(student.class_id) : '—'),
      seatingNo: student.seating_no || student.student_serial_in_class || '',
      
      // Guardian Pre-fill
      guardianName: student.guardian_name || [student.father_name, student.g_father_name, student.family_name].filter(Boolean).join(' ') || (student.full_name_ar ? student.full_name_ar.trim().split(/\s+/).slice(1).join(' ') : '') || '',
      guardianNationalId: student.guardian_national_id || student.father_national_id || '',
      guardianJob: student.guardian_job || student.father_job || '',
      guardianEmail: student.guardian_email || '',
      address: student.address || '',
      guardianPhone: student.guardian_phone || '',
      guardianMobile: student.guardian_phone_2 || student.guardian_mobile || student.guardian_phone || '',
    }));
  };

  const loadStudentById = async (sid) => {
    try {
      const res = await fetch(`${API}/students/${sid}`);
      const data = await res.json();
      if (data.success && data.student) {
        selectStudent(data.student);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStudent) {
      setError('يرجى البحث واختيار التلميذ أولاً.');
      return;
    }
    if (!form.guardianName.trim()) {
      setError('يرجى إدخال اسم ولي الأمر.');
      return;
    }
    if (!form.guardianNationalId.trim()) {
      setError('يرجى إدخال الرقم القومي لولي الأمر.');
      return;
    }
    if (!form.toDirectorate) {
      setError('يرجى اختيار مديرية محول إليها.');
      return;
    }
    if (!form.toAdministration.trim()) {
      setError('يرجى إدخال إدارة محول إليها.');
      return;
    }
    if (!form.affiliation) {
      setError('يرجى اختيار التبعية.');
      return;
    }
    if (!form.toSchool.trim()) {
      setError('يرجى إدخال اسم المدرسة المحول إليها.');
      return;
    }
    if (!form.reason.trim()) {
      setError('يرجى إدخال سبب النقل.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        transferType: 'out',
        studentId: selectedStudent.id,
        toSchool: form.toSchool,
        toDirectorate: `${form.toDirectorate} - ${form.toAdministration} (${form.affiliation})`,
        reason: form.reason,
        transferDate: form.transferDate,
        academicYearId: form.academicYearId,
        feesStatus: form.feesStatus || 'سدد',
        booksStatus: form.booksStatus || 'استلم',
        durationInGrade: form.durationInGrade || 'سنة أولى (مستجد)',
        notes: `ولي الأمر: ${form.guardianName} | تليفون: ${form.guardianMobile} | المصروفات: ${form.feesStatus || 'سدد'} | الكتب: ${form.booksStatus || 'استلم'} | مدة بقائه بالصف: ${form.durationInGrade || 'سنة أولى (مستجد)'} | العنوان: ${form.address}`,
        guardianName: form.guardianName,
        guardianNationalId: form.guardianNationalId,
        guardianJob: form.guardianJob,
        guardianPhone: form.guardianMobile || form.guardianPhone,
        address: form.address,
      };

      const res = await fetch(`${API}/students/${selectedStudent.id}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ طلب النقل.');

      setSuccess('✅ تم تسجيل طلب النقل بنجاح!');
      setTimeout(() => {
        if (onSaved) onSaved(data);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '16px 20px', direction: 'rtl', fontFamily: 'inherit' }}>
      
      {/* ── Top Bar with Search ──────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 24px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📝</span> تسجيل طلب نقل من المدرسة
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>
              ابحث عن الطالب بالاسم، الكود، الرقم القومي، أو رقم الجلوس لملء البيانات تلقائياً
            </p>
          </div>
          {onCancel && (
            <button className="btn-icon" onClick={onCancel} title="إغلاق">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Live Search Input with Autocomplete */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', right: 14, color: '#00838f' }} />
            <input
              type="text"
              style={{
                width: '100%',
                padding: '12px 42px 12px 16px',
                borderRadius: 10,
                border: '2px solid #00838f',
                fontSize: 14,
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none',
                background: '#f8fafc',
                boxShadow: '0 2px 8px rgba(0,131,143,0.1)'
              }}
              placeholder="🔍 ابحث باسم التلميذ أو جزء من الاسم أو الكود أو الرقم القومي أو رقم الجلوس..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            />
            {searchLoading && (
              <Loader2 size={18} className="spin" style={{ position: 'absolute', left: 14, color: '#00838f' }} />
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              left: 0,
              zIndex: 9999,
              marginTop: 6,
              background: '#fff',
              border: '1.5px solid #cbd5e1',
              borderRadius: 10,
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
              maxHeight: 280,
              overflowY: 'auto'
            }}>
              {searchResults.map(st => (
                <div
                  key={st.id}
                  onClick={() => selectStudent(st)}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e0f2f1'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>{st.full_name_ar}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', gap: 12, marginTop: 2 }}>
                      <span><strong>القومي:</strong> {st.national_id || '—'}</span>
                      <span><strong>الكود:</strong> {st.student_code || st.emis_student_code || '—'}</span>
                      {st.seating_no && <span><strong>رقم الجلوس:</strong> {st.seating_no}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11.5, background: '#e0f7fa', color: '#00695c', padding: '4px 10px', borderRadius: 8, fontWeight: 800 }}>
                    {st.grade_name || st.grade_name_ar || 'الصف'} • فصل {st.classroom_name || st.class_name || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px 18px', borderRadius: 10, marginBottom: 16, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #4ade80', color: '#15803d', padding: '12px 18px', borderRadius: 10, marginBottom: 16, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* ══ SECTION 1: بيانات التلميذ ════════════════════════════════ */}
      <div style={{ marginBottom: 18, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: '#fff' }}>
        {/* Teal Header Banner */}
        <div
          onClick={() => setOpenStudentSection(!openStudentSection)}
          style={{
            background: '#00838f',
            color: '#fff',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 14.5,
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {openStudentSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <span>بيانات التلميذ</span>
          </div>
          {selectedStudent && (
            <span style={{ fontSize: 11.5, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6 }}>
              تم التحميل تلقائياً
            </span>
          )}
        </div>

        {/* Section Content */}
        {openStudentSection && (
          <div style={{ padding: '20px 24px' }}>
            {/* Row 1: اسم التلميذ | الرقم القومي | الجنسية */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  اسم التلميذ
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.studentName}
                  placeholder="يظهر تلقائياً عند البحث..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f1f5f9',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  الرقم القومي للتلميذ
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.nationalId}
                  placeholder="الرقم القومي..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f1f5f9',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  الجنسيه
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.nationality}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f1f5f9',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
              </div>
            </div>

            {/* Row 2: الصف | الفصل */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  الصف
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.gradeName}
                  placeholder="الصف الدراسي..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f1f5f9',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  الفصل
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.className}
                  placeholder="الفصل..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f1f5f9',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
              </div>
            </div>

            {/* Row 3: مدة بقائه بالصف | بيان سداد المصروفات | موقف استلام الكتب */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  ⏱️ مدة بقائه بالصف <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.durationInGrade}
                  onChange={e => setF('durationInGrade', e.target.value)}
                  placeholder="سنة أولى (مستجد) / سنة ثانية (باق)..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  💳 سداد المصروفات <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={form.feesStatus}
                  onChange={e => setF('feesStatus', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 800,
                    color: form.feesStatus === 'لم يسدد' ? '#b91c1c' : '#15803d',
                    background: form.feesStatus === 'لم يسدد' ? '#fef2f2' : '#f0fdf4',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="سدد">سدد</option>
                  <option value="لم يسدد">لم يسدد</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  📚 استلام الكتب <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={form.booksStatus}
                  onChange={e => setF('booksStatus', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 800,
                    color: form.booksStatus === 'لم يستلم' ? '#b91c1c' : '#15803d',
                    background: form.booksStatus === 'لم يستلم' ? '#fef2f2' : '#f0fdf4',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="استلم">استلم</option>
                  <option value="لم يستلم">لم يستلم</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 2: بيانات ولى الأمر ══════════════════════════════ */}
      <div style={{ marginBottom: 18, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: '#fff' }}>
        {/* Teal Header Banner */}
        <div
          onClick={() => setOpenGuardianSection(!openGuardianSection)}
          style={{
            background: '#00838f',
            color: '#fff',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 14.5,
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {openGuardianSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <span>بيانات ولى الأمر</span>
          </div>
        </div>

        {/* Section Content */}
        {openGuardianSection && (
          <div style={{ padding: '20px 24px' }}>
            {/* Row 1: اسم ولى الأمر* | الرقم القومى* | الوظيفة | البريد الالكترونى */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.4fr 1.2fr 1.4fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  اسم ولى الأمر <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.guardianName}
                  onChange={e => setF('guardianName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  الرقم القومى <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={form.guardianNationalId}
                  onChange={e => setF('guardianNationalId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  الوظيفة
                </label>
                <input
                  type="text"
                  value={form.guardianJob}
                  onChange={e => setF('guardianJob', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  البريد الالكترونى
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={form.guardianEmail}
                  onChange={e => setF('guardianEmail', e.target.value)}
                  placeholder="example@mail.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
            </div>

            {/* Row 2: العنوان* | التليفون | التليفون المحمول* */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  العنوان <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setF('address', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  التليفون
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.guardianPhone}
                  onChange={e => setF('guardianPhone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  التليفون المحمول <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.guardianMobile}
                  onChange={e => setF('guardianMobile', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 3: بيانات المدرسة المحول إليها ════════════════════ */}
      <div style={{ marginBottom: 24, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: '#fff' }}>
        {/* Teal Header Banner */}
        <div
          onClick={() => setOpenDestinationSection(!openDestinationSection)}
          style={{
            background: '#00838f',
            color: '#fff',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 14.5,
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {openDestinationSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <span>بيانات المدرسة المحول إليها</span>
          </div>
        </div>

        {/* Section Content */}
        {openDestinationSection && (
          <div style={{ padding: '20px 24px' }}>
            {/* Row 1: مديرية محول إليها* | ادارة محول إليها* | التبعية* | مدرسة محول إليها* */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  مديرية محول إليها <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={form.toDirectorate}
                  onChange={e => {
                    const newDir = e.target.value;
                    setForm(prev => ({ ...prev, toDirectorate: newDir, toAdministration: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#fff',
                    outline: 'none'
                  }}
                >
                  <option value="">-------</option>
                  {EGYPTIAN_DIRECTORATES.map(gov => (
                    <option key={gov.id} value={gov.name}>{gov.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  ادارة محول إليها <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {(() => {
                  const selectedDir = EGYPTIAN_DIRECTORATES.find(d => d.name === form.toDirectorate);
                  const availableEdarat = selectedDir?.edarat || [];
                  return (
                    <select
                      value={form.toAdministration}
                      onChange={e => setF('toAdministration', e.target.value)}
                      disabled={!form.toDirectorate}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        background: !form.toDirectorate ? '#f1f5f9' : '#fff',
                        outline: 'none',
                        cursor: !form.toDirectorate ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="">{form.toDirectorate ? 'اختر الإدارة التعليمية--' : 'اختر المديرية أولاً--'}</option>
                      {availableEdarat.map(ed => (
                        <option key={ed.id} value={ed.name}>{ed.name}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  التبعية <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={form.affiliation}
                  onChange={e => setF('affiliation', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#fff',
                    outline: 'none'
                  }}
                >
                  <option value="">اختر--</option>
                  {AFFILIATIONS.map(aff => (
                    <option key={aff} value={aff}>{aff}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  مدرسة محول إليها <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="اسم المدرسة..."
                  value={form.toSchool}
                  onChange={e => setF('toSchool', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
            </div>

            {/* Row 2: سبب النقل* */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                سبب النقل <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={4}
                value={form.reason}
                onChange={e => setF('reason', e.target.value)}
                placeholder="أدخل سبب النقل بالتفصيل (مثل: تغيير محل السكن / ظروف عمل ولي الأمر / رغبة ولي الأمر)..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ══ BOTTOM ACTION BAR: Green Save Button ═════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            background: '#43a047',
            color: '#fff',
            border: 'none',
            borderRadius: 22,
            padding: '10px 48px',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(67,160,71,0.3)',
            transition: 'background 0.15s, transform 0.1s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#388e3c'}
          onMouseLeave={e => e.currentTarget.style.background = '#43a047'}
        >
          {saving ? <Loader2 size={17} className="spin" /> : null}
          <span>حفظ</span>
        </button>

        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            style={{ padding: '10px 24px', borderRadius: 22, fontSize: 14 }}
          >
            إلغاء
          </button>
        )}
      </div>

    </div>
  );
}
