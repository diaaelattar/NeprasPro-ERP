import React, { useState } from 'react';

function SchoolPrintsPreview({ students, meta, schoolInfo }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [printType, setPrintType] = useState('summons'); // 'summons' | 'health'

  const student = students.find(s => String(s.id) === selectedStudentId);

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait" style={{ padding: 20 }}>
      {/* Selector Panel - Hidden during printing */}
      <div className="no-print" style={{ display: 'flex', gap: 15, marginBottom: 25, background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'var(--text-secondary)' }}>اختر نوع النموذج:</label>
          <select className="form-control" style={{ fontSize: 13, padding: '6px 12px' }} value={printType} onChange={e => setPrintType(e.target.value)}>
            <option value="summons">✉️ استدعاء ولي أمر طالب</option>
            <option value="health">🏥 تحويل إلى التأمين الصحي</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'var(--text-secondary)' }}>اختر الطالب:</label>
          <select className="form-control" style={{ fontSize: 13, padding: '6px 12px' }} value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
            <option value="">-- اختر طالباً من الفصل --</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name_ar} (كود: {s.student_code || '—'})</option>
            ))}
          </select>
        </div>
      </div>

      {!student ? (
        <div style={{ textAlign: 'center', padding: 40, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-secondary)' }}>
          يرجى اختيار طالب من القائمة المنسدلة أعلاه لتوليد النموذج المخصص للطباعة.
        </div>
      ) : printType === 'summons' ? (
        /* ✉️ Summons Form */
        <div style={{ border: '2px solid #000', padding: 30, direction: 'rtl', fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>محافظة: {schoolInfo.governorate || '................'}</div>
            <div>إدارة: {schoolInfo.directorate || '................'}</div>
            <div>مدرسة: {schoolInfo.schoolName || '................'}</div>
          </div>
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h2 style={{ textDecoration: 'underline', fontSize: 22, fontWeight: 'bold' }}>إخطار استدعاء ولي أمر</h2>
          </div>
          <div style={{ fontSize: 16, lineHeight: 2 }}>
            السيد ولي أمر الطالب/الطالبة: <strong>{student.full_name_ar}</strong><br />
            المقيد بالصف الدراسي: <strong>{student.grade_name_ar || '—'}</strong> | فصل: <strong>{student.classroom_name || '—'}</strong><br />
            تحية طيبة وبعد،،<br />
            يرجى من سيادتكم الحضور إلى المدرسة في أقرب وقت ممكن بمكتب الأخصائي الاجتماعي بالمدرسة، وذلك لأمر هام يخص ابنكم/ابنتكم.<br />
            شاكرين حسن تعاونكم معنا لمصلحة الطالب الأكاديمية والتربوية.
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 65, fontSize: 14 }}>
            <div>تاريخ الإخطار: {new Date().toLocaleDateString('ar-EG')}</div>
            <div style={{ textAlign: 'center' }}>الأخصائي الاجتماعي<br /><br />............................</div>
            <div style={{ textAlign: 'center' }}>يعتمد؛ مدير المدرسة<br /><br />............................</div>
          </div>
        </div>
      ) : (
        /* 🏥 Health Insurance Form */
        <div style={{ border: '2px solid #000', padding: 30, direction: 'rtl', fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>محافظة: {schoolInfo.governorate || '................'}</div>
            <div>إدارة: {schoolInfo.directorate || '................'}</div>
            <div>مدرسة: {schoolInfo.schoolName || '................'}</div>
          </div>
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h2 style={{ textDecoration: 'underline', fontSize: 20, fontWeight: 'bold' }}>خطاب تحويل طالب إلى التأمين الصحي</h2>
          </div>
          <div style={{ fontSize: 16, lineHeight: 2 }}>
            السيد الدكتور/ مدير العيادة الطبية للتأمين الصحي<br />
            تحية طيبة وبعد،،<br />
            نرجو من سيادتكم التكرم بتوقيع الكشف الطبي على الطالب/الطالبة: <strong>{student.full_name_ar}</strong><br />
            الرقم القومي: <strong>{student.national_id || '—'}</strong> | كود الطالب: <strong>{student.student_code || '—'}</strong><br />
            المقيد بالصف الدراسي: <strong>{student.grade_name_ar || '—'}</strong> | فصل: <strong>{student.classroom_name || '—'}</strong><br />
            وإفادتنا بالتقرير الطبي والتوجيهات الطبية اللازمة لحالته.<br />
            وتفضلوا بقبول وافر الاحترام والتقدير،،
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 65, fontSize: 14 }}>
            <div>تاريخ التحويل: {new Date().toLocaleDateString('ar-EG')}</div>
            <div style={{ textAlign: 'center' }}>زائرة صحية المدرسة<br /><br />............................</div>
            <div style={{ textAlign: 'center' }}>يعتمد؛ مدير المدرسة<br /><br />............................</div>
          </div>
        </div>
      )}
    </div>
  );
}

const schoolPrints = {
  id:          'school_prints',
  name:        'مطبوعات ونماذج المدرسة (استدعاء/تأمين)',
  desc:        'نماذج استدعاء ولي الأمر والتحويلات الصحية الفردية',
  category:    'سجلات أخرى',
  icon:        '🏥',
  orientation: 'portrait',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresClass:   true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) => `/api/students?classId=${f.classId}&limit=100`,
  excelFileName: (f, meta) => `مطبوعات_الفصل_${meta.selectedClassroom?.class_name || ''}.xlsx`,
  
  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      classId: f.classId,
      limit: 100,
      status: 'all',
    });
    return q.toString();
  },

  PreviewComponent: SchoolPrintsPreview,
};

export default schoolPrints;
