// ════════════════════════════════════════════════════════════════
//  Report Definition: إخطار الغياب (نموذج رسمي)
//  نموذج يُطبع لإخطار ولي أمر الطالب الغائب
// ════════════════════════════════════════════════════════════════
import React, { useState } from 'react';

function AbsenceNoticePreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [absenceDays, setAbsenceDays] = useState(1);
  const [absenceReason, setAbsenceReason] = useState('بدون عذر');

  const student = selectedStudent
    ? students.find(s => String(s.id) === String(selectedStudent))
    : null;

  const REASONS = ['بدون عذر', 'مرض', 'غياب متكرر', 'ظروف أسرية', 'أخرى'];

  const now = new Date();
  const today = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait">
      {/* Controls */}
      <div className="no-print" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="form-label" style={{ fontSize: 13 }}>اختر الطالب</label>
          <select
            className="form-control"
            style={{ fontSize: 13 }}
            value={selectedStudent || ''}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="">— اختر طالباً —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name_ar}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 13 }}>سبب الغياب</label>
          <select className="form-control" style={{ fontSize: 13 }} value={absenceReason} onChange={e => setAbsenceReason(e.target.value)}>
            {REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 13 }}>تاريخ الغياب</label>
          <input type="date" className="form-control" style={{ fontSize: 13 }} value={absenceDate} onChange={e => setAbsenceDate(e.target.value)} />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 13 }}>عدد أيام الغياب</label>
          <input type="number" className="form-control" style={{ fontSize: 13 }} value={absenceDays} min={1} max={30} onChange={e => setAbsenceDays(parseInt(e.target.value) || 1)} />
        </div>
      </div>

      {/* Official Notice */}
      {!student && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 40, fontSize: 14 }}>
          اختر طالباً من القائمة أعلاه لمعاينة نموذج الإخطار
        </div>
      )}

      {student && (
        <div style={{ fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl', maxWidth: 700, margin: '0 auto', border: '2px solid #1e3a5f', padding: 30 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'right', fontSize: 11 }}>
                <div>محافظة: {schoolInfo.governorate || '....'}</div>
                <div>الإدارة التعليمية: {schoolInfo.directorate || '....'}</div>
                <div>المدرسة: {schoolInfo.schoolName || '....'}</div>
              </div>
              <div style={{ width: 70, height: 70, border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>
                شعار<br />المدرسة
              </div>
              <div style={{ textAlign: 'left', fontSize: 11 }}>
                <div>التاريخ: {today}</div>
                <div>السنة الدراسية: {selectedYear?.year_label || '....'}</div>
              </div>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: '15px 0 5px', borderBottom: '2px solid #1e3a5f', paddingBottom: 8, color: '#1e3a5f' }}>
              إخطار غياب
            </h2>
          </div>

          {/* Body */}
          <p style={{ fontSize: 13, lineHeight: 2, marginBottom: 15 }}>
            السيد الفاضل / ولي أمر الطالب:
            <span style={{ borderBottom: '1px dotted #333', display: 'inline-block', minWidth: 200, marginRight: 8, fontWeight: 700 }}>
              {student.full_name_ar}
            </span>
          </p>

          <p style={{ fontSize: 13, lineHeight: 2 }}>
            نُحيطكم علماً بأن نجلكم الطالب المذكور أعلاه
            قد غاب عن حضور الدراسة بتاريخ <strong>{absenceDate}</strong> لمدة
            <strong> {absenceDays} {absenceDays === 1 ? 'يوم' : 'أيام'} </strong>
            وذلك <strong>{absenceReason}</strong>.
          </p>

          <div style={{ margin: '15px 0', padding: 12, background: '#fef9c3', border: '1px solid #fbbf24', borderRadius: 6, fontSize: 12 }}>
            <strong>بيانات الطالب:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>الاسم: <strong>{student.full_name_ar}</strong></div>
              <div>الصف: <strong>{selectedGrade?.grade_name_ar || '...'}</strong></div>
              <div>الفصل: <strong>{selectedClassroom?.class_name || '...'}</strong></div>
              <div>الرقم القومي: <strong>{student.national_id || '—'}</strong></div>
            </div>
          </div>

          <p style={{ fontSize: 13, lineHeight: 2 }}>
            لذا نرجو التكرم بالحضور إلى المدرسة لمعرفة أسباب الغياب واتخاذ اللازم.
          </p>

          <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 10 }}>
            ⚠ ملاحظة: الغياب المتكرر بدون عذر يُعرض الطالب لتطبيق اللوائح المدرسية.
          </p>

          {/* Signatures */}
          <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20 }}>الأخصائي الاجتماعي</div>
              <div style={{ borderTop: '1px solid #333', width: 120, margin: 'auto' }}></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20 }}>ولي الأمر (استلمت)</div>
              <div style={{ borderTop: '1px solid #333', width: 120, margin: 'auto' }}></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20 }}>مدير المدرسة</div>
              <div style={{ borderTop: '1px solid #333', width: 120, margin: 'auto' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const absenceNotice = {
  id:          'absence_notice',
  name:        'إخطار غياب (نموذج رسمي)',
  desc:        'نموذج رسمي لإخطار ولي الأمر بغياب نجله عن الدراسة مع تفاصيل الغياب',
  category:    'المطبوعات والنماذج',
  icon:        '📩',
  orientation: 'portrait',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      limit: 500,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.classId)   q.set('classId',   f.classId);
    return q.toString();
  },

  PreviewComponent: AbsenceNoticePreview,
};

export default absenceNotice;
