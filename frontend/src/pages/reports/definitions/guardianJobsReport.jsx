// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف وظائف وأرقام هواتف أولياء الأمور (مخصص)
// ════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { Search, Briefcase, Phone, Filter } from 'lucide-react';

function GuardianJobsPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedStage, selectedClassroom, classroomLabel } = meta;
  const [jobFilter, setJobFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');

  // استخراج قائمة الوظائف الفريدة المتوفرة
  const availableJobs = useMemo(() => {
    const jobs = new Set();
    students.forEach(s => {
      const job = (s.guardian_job || '').trim();
      if (job && job !== '—' && job !== '-') jobs.add(job);
    });
    return Array.from(jobs).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  // تصفية الطلاب حسب وظيفة الأب والاسم
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const job = (s.guardian_job || '').trim().toLowerCase();
      const name = (s.full_name_ar || '').trim().toLowerCase();
      const matchesJob = !jobFilter || job.includes(jobFilter.toLowerCase());
      const matchesName = !nameSearch || name.includes(nameSearch.toLowerCase());
      return matchesJob && matchesName;
    });
  }, [students, jobFilter, nameSearch]);

  const perPage = 30;
  const pageCount = Math.ceil(filteredStudents.length / perPage) || 1;

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait">
      {/* Interactive Controls (Hidden during print) */}
      <div className="no-print" style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="بحث سريع باسم الطالب..."
            style={{
              width: '100%',
              padding: '6px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 12.5
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
          <Briefcase size={16} color="#4f46e5" />
          <select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              color: '#334155'
            }}
          >
            <option value="">-- فرز بكل وظائف أولياء الأمور ({availableJobs.length}) --</option>
            {availableJobs.map(job => (
              <option key={job} value={job}>{job}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
          عدد الطلاب المطابقين: <span style={{ color: '#2563eb' }}>{filteredStudents.length}</span> من أصل {students.length}
        </div>
      </div>

      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const pageStudents = filteredStudents.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
        return (
          <div key={pageIdx} className="printable-page-block" style={{ marginBottom: 30, pageBreakAfter: 'always' }}>
            {/* Standard Official Header */}
            <div className="report-official-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #334155',
              paddingBottom: 10,
              marginBottom: 14
            }}>
              <div className="header-col-right" style={{ textAlign: 'right', fontSize: 11.5, lineHeight: 1.6, color: '#1e293b' }}>
                <div>مديرية التربية والتعليم بمحافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
                <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
                <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
              </div>

              <div className="header-col-center" style={{ textAlign: 'center' }}>
                <h2 className="report-title-main" style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  كشف وظائف وأرقام هواتف أولياء الأمور
                </h2>
                <div className="report-subtitle-meta" style={{ fontSize: 12, color: '#475569', marginTop: 4, fontWeight: 700 }}>
                  {selectedStage?.stage_name ? `المرحلة: ${selectedStage.stage_name} | ` : ''}
                  {selectedGrade?.grade_name_ar ? `${selectedGrade.grade_name_ar} | ` : ''}
                  {classroomLabel ? `فصل: ${classroomLabel} | ` : ''}
                  العام الدراسي: {selectedYear?.year_label || '2025/2026'}
                </div>
              </div>

              <div className="header-col-left" style={{ textAlign: 'left', fontSize: 11, color: '#64748b' }}>
                {schoolInfo.logoUrl ? (
                  <img src={schoolInfo.logoUrl} alt="Logo" style={{ maxHeight: 50, maxWidth: 100, objectFit: 'contain' }} />
                ) : (
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>نظام نبراس برو ERP</div>
                )}
                <div style={{ marginTop: 4 }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
                <div style={{ fontSize: 10 }}>صفحة ({pageIdx + 1} من {pageCount})</div>
              </div>
            </div>

            {/* Table */}
            <div className="register-table-wrap">
              <table className="register-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, direction: 'rtl' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#1e293b' }}>
                    <th style={{ width: 35, padding: '7px 4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>م</th>
                    <th style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'right' }}>اسم الطالب بالكامل</th>
                    <th style={{ width: 140, padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>الصف والمرحلة</th>
                    <th style={{ width: 100, padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>الفصل</th>
                    <th style={{ width: 150, padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>وظيفة ولي الأمر</th>
                    <th style={{ width: 110, padding: '7px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>رقم الهاتف (1)</th>
                    <th style={{ width: 110, padding: '7px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>رقم الهاتف (2)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageStudents.map((s, idx) => {
                    const rowNum = pageIdx * perPage + idx + 1;
                    const stageGrade = `${s.grade_name_ar || selectedGrade?.grade_name_ar || ''} ${s.stage_name || selectedStage?.stage_name ? `(${s.stage_name || selectedStage?.stage_name})` : ''}`.trim();
                    return (
                      <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{rowNum}</td>
                        <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a' }}>{s.full_name_ar}</td>
                        <td style={{ textAlign: 'center', padding: '6px 6px', border: '1px solid #cbd5e1' }}>{stageGrade || '—'}</td>
                        <td style={{ textAlign: 'center', padding: '6px 6px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#2563eb' }}>{s.classroom_name || classroomLabel || '—'}</td>
                        <td style={{ textAlign: 'center', padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#047857' }}>
                          {s.guardian_job || '—'}
                        </td>
                        <td dir="ltr" style={{ textAlign: 'center', padding: '6px 6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700 }}>
                          {s.guardian_phone || s.phone || '—'}
                        </td>
                        <td dir="ltr" style={{ textAlign: 'center', padding: '6px 6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', color: '#64748b' }}>
                          {s.guardian_phone_2 || s.student_phone || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {pageStudents.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: 25, color: '#64748b', border: '1px solid #cbd5e1' }}>
                        لا توجد بيانات مطابقة لخيارات الفرز الحالية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Official 4-Signatures Footer */}
            <div className="report-signatures" style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#334155'
            }}>
              <div>
                <div>مسؤول شؤون الطلاب</div>
                <div style={{ marginTop: 28 }}>..............................</div>
              </div>
              <div>
                <div>أخصائي التطوير والتسجيل</div>
                <div style={{ marginTop: 28 }}>..............................</div>
              </div>
              <div>
                <div>وكيل شؤون التعليم</div>
                <div style={{ marginTop: 28 }}>..............................</div>
              </div>
              <div>
                <div>مدير المدرسة (يعتمد)</div>
                <div style={{ marginTop: 28 }}>..............................</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const guardianJobsReport = {
  id:          'guardian_jobs_report',
  name:        'كشف وظائف وأرقام هواتف أولياء الأمور',
  desc:        'تقرير مخصص لحصر وتصنيف وظائف أولياء الأمور مع الفرز السريع والاتصال بالهاتف 1 و 2',
  category:    'السجلات المتخصصة',
  icon:        '💼',
  orientation: 'portrait',
  available:   true,
  filters: {
    requiresYear: true,
  },
  buildQuery: (f) => {
    const q = new URLSearchParams();
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage' && f.gradeId !== 'all_grade') q.set('gradeId', f.gradeId);
    if (f.classId && f.classId !== 'all_stage' && f.classId !== 'all_grade') q.set('classId', f.classId);
    q.set('limit', '1000');
    return q.toString();
  },
  excelEndpoint: (f) => {
    const q = new URLSearchParams();
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    if (f.classId)        q.set('classId', f.classId);
    return `/api/students/export/excel?${q.toString()}`;
  },
  excelFileName: (f, meta) => {
    const grade = meta?.selectedGrade?.grade_name_ar || '';
    const cls = meta?.classroomLabel || '';
    return `كشف_وظائف_اولياء_الامور_${grade}_${cls}_${new Date().toISOString().slice(0,10)}.xlsx`;
  },
  PreviewComponent: GuardianJobsPreview,
};

export default guardianJobsReport;
