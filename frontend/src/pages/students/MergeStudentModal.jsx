// ════════════════════════════════════════════════════════════════
//  MergeStudentModal: نافذة تسجيل وتحديث وطباعة بيانات طلاب الدمج
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Printer, Save, Search, UserCheck } from 'lucide-react';
import API_BASE_URL from '../../config/api';
import { DISABILITY_TYPES } from '../../constants/lookupOptions';

const EXAM_FACILITIES_PRESETS = [
  'امتحان موضوعي بنسبة 100% بدون أسئلة مقالية',
  'وجود مرافق في الامتحانات للقراءة والكتابة',
  'منح وقت إضافي 30 دقيقة في زمن الامتحان',
  'تكبير خط ورقة الأسئلة (A3 / خط 18+)',
  'الإعفاء من الرسم الهندسي والخرائط الدقيقة',
  'الإعفاء من دراسة اللغة الأجنبية الثانية',
  'لجنة امتحانية خاصة بالدور الأرضي'
];

export default function MergeStudentModal({ student, isOpen, onClose, onSaved, allStudents = [] }) {
  if (!isOpen) return null;

  const [selectedStudent, setSelectedStudent] = useState(student || null);
  const [studentSearch, setStudentSearch] = useState('');
  
  const [isMerged, setIsMerged] = useState(false);
  const [disabilityId, setDisabilityId] = useState('1');
  const [mergeType, setMergeType] = useState('إعاقة بصرية (ضعاف بصر / مكفوفين)');
  const [mergeDecisionNumber, setMergeDecisionNumber] = useState('');
  const [mergeDecisionDate, setMergeDecisionDate] = useState('');
  const [mergeNotes, setMergeNotes] = useState('');
  const [schoolInfo, setSchoolInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch school master info for official printing
  useEffect(() => {
    fetch(`${API_BASE_URL}/setup/status`)
      .then(r => r.json())
      .then(d => { if (d.success) setSchoolInfo(d); })
      .catch(() => {});
  }, []);

  // Update form fields when student changes
  useEffect(() => {
    const cur = student || selectedStudent;
    if (cur) {
      setSelectedStudent(cur);
      const isM = cur.is_merged === 1 || cur.is_merged === '1' || cur.is_merged === true;
      setIsMerged(isM);
      const foundDis = DISABILITY_TYPES.find(d => String(d.id) === String(cur.disability_id)) ||
                       DISABILITY_TYPES.find(d => d.typeName && cur.merge_type && cur.merge_type.includes(d.typeName));
      setDisabilityId(foundDis ? String(foundDis.id) : (cur.disability_id ? String(cur.disability_id) : '1'));
      setMergeType(cur.merge_type || foundDis?.name || 'إعاقة بصرية (ضعاف بصر / مكفوفين)');
      setMergeDecisionNumber(cur.merge_decision_number || cur.merge_decision_num || '');
      setMergeDecisionDate(cur.merge_decision_date || '');
      setMergeNotes(cur.merge_notes || cur.notes || '');
      setError('');
      setSuccess('');
    } else {
      setIsMerged(true);
      setDisabilityId('1');
      setMergeType('إعاقة بصرية (ضعاف بصر / مكفوفين)');
      setMergeDecisionNumber('');
      setMergeDecisionDate('');
      setMergeNotes('');
    }
  }, [student]);

  const filteredStudentsList = (allStudents || []).filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.trim().toLowerCase();
    return (s.full_name_ar || '').toLowerCase().includes(q) ||
           (s.student_code || '').toLowerCase().includes(q) ||
           (s.national_id || '').includes(q);
  }).slice(0, 15);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    const isM = s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true;
    setIsMerged(isM);
    const foundDis = DISABILITY_TYPES.find(d => String(d.id) === String(s.disability_id)) ||
                     DISABILITY_TYPES.find(d => d.typeName && s.merge_type && s.merge_type.includes(d.typeName));
    setDisabilityId(foundDis ? String(foundDis.id) : (s.disability_id ? String(s.disability_id) : '1'));
    setMergeType(s.merge_type || foundDis?.name || 'إعاقة بصرية (ضعاف بصر / مكفوفين)');
    setMergeDecisionNumber(s.merge_decision_number || s.merge_decision_num || '');
    setMergeDecisionDate(s.merge_decision_date || '');
    setMergeNotes(s.merge_notes || s.notes || '');
  };

  const handleDisabilityChange = (idVal) => {
    setDisabilityId(idVal);
    const found = DISABILITY_TYPES.find(d => String(d.id) === String(idVal));
    if (found) {
      setMergeType(found.name);
      if (found.id === 0) {
        setIsMerged(false);
      } else {
        setIsMerged(true);
      }
    }
  };

  const addPresetFacility = (preset) => {
    if (mergeNotes.includes(preset)) return;
    setMergeNotes(prev => prev ? `${prev} - ${preset}` : preset);
  };

  // Save student merge data
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStudent?.id) {
      setError('يرجى اختيار الطالب أولاً.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/students/${selectedStudent.id}/merge-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_merged: isMerged ? 1 : 0,
          disability_id: isMerged ? parseInt(disabilityId) : null,
          merge_type: isMerged ? mergeType : null,
          merge_decision_number: isMerged ? mergeDecisionNumber : null,
          merge_decision_date: isMerged ? mergeDecisionDate : null,
          merge_notes: mergeNotes
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'فشل في حفظ بيانات الدمج');
      }

      setSuccess('تم حفظ وتحديث بيانات الدمج بنجاح!');
      if (onSaved) {
        onSaved({
          ...selectedStudent,
          is_merged: isMerged ? 1 : 0,
          disability_id: isMerged ? parseInt(disabilityId) : null,
          merge_type: isMerged ? mergeType : null,
          merge_decision_number: isMerged ? mergeDecisionNumber : null,
          merge_decision_date: isMerged ? mergeDecisionDate : null,
          merge_notes: mergeNotes
        });
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Official Print Decision & Merge Certificate ────────────────────────
  const handlePrintCertificate = () => {
    if (!selectedStudent) {
      alert('يرجى اختيار طالب أولاً للطباعة.');
      return;
    }

    const rawSchool   = schoolInfo?.school_name || schoolInfo?.schoolName || '';
    const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
    const rawAdmin    = schoolInfo?.directorate || schoolInfo?.administration || '';
    const cleanAdmin  = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
    const gov         = schoolInfo?.governorate || '...............';
    const logo        = schoolInfo?.logo_url || schoolInfo?.logoUrl || '';
    const academicYear = schoolInfo?.academicYear || schoolInfo?.academic_year || '....../......';

    const now     = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8" />
          <title>إفادة وقرار دمج - ${selectedStudent.full_name_ar}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif;
              color: #000;
              line-height: 1.7;
              padding: 10px;
              direction: rtl;
              text-align: right;
              font-size: 11.5pt;
            }
            .header-box {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2pt solid #000;
              padding-bottom: 8pt;
              margin-bottom: 14pt;
            }
            .hd-right { text-align: right; font-size: 11pt; font-weight: 700; line-height: 1.5; min-width: 55mm; }
            .hd-center { text-align: center; flex: 1; padding: 0 6mm; }
            .main-title { font-size: 17pt; font-weight: 900; color: #000; margin: 0 0 3pt; text-decoration: underline; }
            .sub-title { font-size: 12pt; font-weight: 800; text-decoration: underline; }
            .hd-left { text-align: left; min-width: 55mm; font-size: 9.5pt; font-weight: 600; }
            .hd-left img { max-height: 42pt; max-width: 80pt; object-fit: contain; display: block; margin-bottom: 2pt; }
            .logo-box { display: inline-block; border: 1pt dashed #cbd5e1; padding: 3pt 6pt; font-size: 9.5pt; font-weight: 700; }

            .doc-frame {
              border: 1.5pt solid #000;
              border-radius: 6pt;
              padding: 12pt 16pt;
              margin: 12pt 0;
              background: #fff;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8pt 16pt;
              font-size: 11.5pt;
            }
            .decision-box {
              border: 1.5pt dashed #0284c7;
              background: #f8fafc;
              border-radius: 6pt;
              padding: 12pt 16pt;
              margin: 14pt 0;
              font-size: 12pt;
              line-height: 1.9;
            }
            .signatures-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-top: 30pt;
              font-weight: 800;
              font-size: 11pt;
              text-align: center;
            }
            .signatures-table td { border: none; padding: 4pt; }
            .sig-line { width: 70%; height: 1pt; border-bottom: 1pt dotted #000; margin: 25pt auto 0; }
            .stamp-box {
              width: 65pt; height: 65pt; border: 1.5pt dashed #94a3b8; border-radius: 50%;
              margin: 8pt auto 0 auto; display: flex; align-items: center; justify-content: center;
              font-size: 9pt; color: #64748b; font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div class="hd-right">
              <div>محافظة: <strong>${gov}</strong></div>
              <div>إدارة: <strong>${cleanAdmin} التعليمية</strong></div>
              <div>مدرسة: <strong>${cleanSchool}</strong></div>
            </div>
            <div class="hd-center">
              <h2 class="main-title">إفادة قيد وتطبيق نظام الدمج التعليمي</h2>
              <div class="sub-title">للعام الدراسي: ${academicYear} م</div>
            </div>
            <div class="hd-left">
              ${logo ? `<img src="${logo}" alt="شعار" />` : '<div class="logo-box">شعار المدرسة</div>'}
              <div>التاريخ: ${dateStr}</div>
            </div>
          </div>

          <div style="font-size: 12.5pt; font-weight: bold; margin: 10pt 0;">
            تشهد إدارة المدرسة وقسم التربية الخاصة والدمج بأن الطالب الموضحة بياناته أدناه مقيد بالمدرسة ومطبق عليه نظام الدمج التعليمي:
          </div>

          <div class="doc-frame">
            <div class="info-grid">
              <div class="info-item"><strong>اسم الطالب رباعياً:</strong> ${selectedStudent.full_name_ar}</div>
              <div class="info-item"><strong>الرقم القومي:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: bold;">${selectedStudent.national_id || '—'}</span></div>
              <div class="info-item"><strong>كود الطالب الوزاري:</strong> ${selectedStudent.student_code || selectedStudent.emis_student_code || '—'}</div>
              <div class="info-item"><strong>النوع:</strong> ${selectedStudent.gender || '—'} | <strong>الديانة:</strong> ${selectedStudent.religion || '—'}</div>
              <div class="info-item"><strong>الصف الدراسي:</strong> ${selectedStudent.grade_name_ar || '—'}</div>
              <div class="info-item"><strong>الفصل:</strong> ${selectedStudent.classroom_name || selectedStudent.class_name || '—'}</div>
              <div class="info-item"><strong>حالة القيد:</strong> ${selectedStudent.enrollment_status || selectedStudent.status || 'مقيد'}</div>
              <div class="info-item"><strong>اسم ولي الأمر:</strong> ${selectedStudent.guardian_name || '—'}</div>
            </div>
          </div>

          <div class="decision-box">
            <div style="font-weight: 900; color: #0369a1; font-size: 15px; margin-bottom: 6px; text-decoration: underline;">
              📋 بيانات وتوصيف قرار الدمج التعليمي والتسهيلات المقررة:
            </div>
            <div><strong>1. نوع الإعاقة وفئة الدمج:</strong> <span style="color: #1e3a8a; font-weight: bold;">${mergeType || 'دمج تعليمي عام'}</span></div>
            <div><strong>2. رقم قرار الدمج / التأمين الصحي:</strong> ${mergeDecisionNumber || 'مرفق بالملف الورقي'} | <strong>تاريخ الصدور:</strong> ${mergeDecisionDate || '—'}</div>
            <div><strong>3. التسهيلات الامتحانية المقررة للطالب:</strong></div>
            <div style="padding: 6px 12px; background: #fff; border-radius: 6px; border: 1px solid #bae6fd; margin-top: 4px; font-weight: bold;">
              ${mergeNotes || 'تطبيق المواصفات الامتحانية المخففة لطلاب الدمج طبقاً للقرار الوزاري المنظم.'}
            </div>
          </div>

          <div style="font-size: 13.5px; font-weight: bold; margin-top: 15px;">
            أعطيت هذه الإفادة الرسمية بناءً على طلب ولي الأمر لتقديمها إلى من يهمه الأمر دون أدنى مسؤولية على المدرسة فيما يخص مستحقات الغير.
          </div>

          <table class="signatures-table">
            <tr>
              <td style="width: 25%;">
                <div>الأخصائي النفسي / الاجتماعي</div>
                <div class="sig-line"></div>
              </td>
              <td style="width: 25%;">
                <div>مسؤول الدمج والتربية الخاصة</div>
                <div class="sig-line"></div>
              </td>
              <td style="width: 25%;">
                <div>وكيل شؤون الطلاب</div>
                <div class="sig-line"></div>
              </td>
              <td style="width: 25%;">
                <div>مدير المدرسة</div>
                <div class="sig-line"></div>
              </td>
            </tr>
            <tr>
              <td colspan="4" style="padding-top: 25px;">
                <div class="stamp-box">خاتم المدرسة الرسمي</div>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
      padding: 16
    }}>
      <div className="modal-card" style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden', direction: 'rtl', textAlign: 'right', maxHeight: '92vh', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>♿</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>تسجيل وإدارة بيانات الدمج والتربية الخاصة</h3>
              <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2 }}>
                {selectedStudent ? (
                  <>الطالب: <strong>{selectedStudent.full_name_ar}</strong> ({selectedStudent.grade_name_ar || '—'})</>
                ) : 'يرجى اختيار الطالب لتسجيل قرار وفئة الدمج'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, marginBottom: 14, fontSize: 12.5, fontWeight: 700 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0fdf4', color: '#166534', borderRadius: 6, marginBottom: 14, fontSize: 12.5, fontWeight: 700 }}>
              <CheckCircle size={16} /> {success}
            </div>
          )}

          {/* Student Selector if not pre-passed */}
          {!student && (
            <div style={{ marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1.5px solid #cbd5e1' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                🔍 البحث واختيار الطالب من القيد:
              </label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={15} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="اكتب اسم الطالب أو الرقم القومي أو الكود..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  style={{ width: '100%', padding: '7px 32px 7px 10px', borderRadius: 6, border: '1px solid #94a3b8', fontSize: 13, fontWeight: 700 }}
                />
              </div>

              {filteredStudentsList.length > 0 && (
                <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}>
                  {filteredStudentsList.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      style={{
                        padding: '6px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 12.5,
                        background: selectedStudent?.id === s.id ? '#e0f2fe' : 'transparent',
                        fontWeight: selectedStudent?.id === s.id ? 800 : 600,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <span>{s.full_name_ar} ({s.grade_name_ar || '—'})</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{s.student_code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Toggle Is Merged */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: isMerged ? '#f0f9ff' : '#f8fafc',
            border: isMerged ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: 8, marginBottom: 16
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: isMerged ? '#0369a1' : '#334155' }}>
                {isMerged ? '✅ الطالب مسجل بحالة دمج / تربية خاصة' : '⭕ الطالب بقيد عام عادي (غير مدمج)'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                تفعيل هذا الخيار لإدراج الطالب في سجل طلاب الدمج وتثبيت القرار الرسمي
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isMerged}
                onChange={e => setIsMerged(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isMerged ? '#0284c7' : '#cbd5e1',
                borderRadius: 24, transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', height: 18, width: 18, left: isMerged ? 24 : 4, bottom: 3,
                  backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
          </div>

          {isMerged && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              {/* Type of Merge */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, marginBottom: 5, color: '#1e293b' }}>
                  نوع الإعاقة / فئة الدمج (المعتمدة وزارياً) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={disabilityId}
                  onChange={e => handleDisabilityChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #94a3b8', fontSize: 13, fontWeight: 800, background: '#fff' }}
                  required
                >
                  {DISABILITY_TYPES.filter(d => d.id !== 0).map(d => (
                    <option key={d.id} value={d.id}>{d.label || d.name}</option>
                  ))}
                </select>
              </div>

              {/* Decision Number & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4, color: '#334155' }}>
                    رقم قرار الدمج الوزاري / الإداري
                  </label>
                  <input
                    type="text"
                    value={mergeDecisionNumber}
                    onChange={e => setMergeDecisionNumber(e.target.value)}
                    placeholder="مثال: ق/482 لسنة 2024"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4, color: '#334155' }}>
                    تاريخ صدور القرار
                  </label>
                  <input
                    type="date"
                    value={mergeDecisionDate}
                    onChange={e => setMergeDecisionDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Quick Facility Presets */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, color: '#334155' }}>
                  تسهيلات امتحانية جاهزة (انقر للإضافة السريعة):
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EXAM_FACILITIES_PRESETS.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => addPresetFacility(preset)}
                      style={{
                        padding: '4px 8px', fontSize: 11, background: '#f0fdf4', color: '#166534',
                        border: '1px solid #bbf7d0', borderRadius: 4, cursor: 'pointer', fontWeight: 700
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Merge Notes / Exam Facilities */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4, color: '#334155' }}>
                  التسهيلات الامتحانية المعتمدة والملاحظات
                </label>
                <textarea
                  rows={3}
                  value={mergeNotes}
                  onChange={e => setMergeNotes(e.target.value)}
                  placeholder="اكتب تفاصيل التسهيلات المقررة للطالب في الامتحانات والدراسة..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, resize: 'vertical' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderTop: '1.5px solid #e2e8f0', background: '#f8fafc', flexShrink: 0
        }}>
          <div>
            {selectedStudent && (
              <button
                type="button"
                onClick={handlePrintCertificate}
                style={{
                  padding: '8px 16px', borderRadius: 6, border: '1.5px solid #0284c7',
                  background: '#f0f9ff', color: '#0369a1', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
                }}
              >
                <Printer size={16} /> 🖨️ طباعة إفادة وقرار الدمج
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedStudent}
              style={{
                padding: '8px 20px', borderRadius: 6, border: 'none',
                background: isMerged ? '#0284c7' : '#059669', color: '#fff',
                fontWeight: 900, cursor: (!selectedStudent || loading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5
              }}
            >
              <Save size={16} />
              {loading ? 'جاري الحفظ...' : (isMerged ? '💾 حفظ بيانات الدمج' : '💾 حفظ الحالة')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
