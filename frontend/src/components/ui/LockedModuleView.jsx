import React from 'react';
import { Lock, ArrowRight, Sparkles, GraduationCap, ShieldAlert } from 'lucide-react';

export default function LockedModuleView({ moduleTitle, icon = '🔒', onGoToStudents }) {
  return (
    <div style={{
      maxWidth: 720,
      margin: '40px auto',
      background: '#fff',
      borderRadius: 16,
      padding: '36px 32px',
      textAlign: 'center',
      direction: 'rtl',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      border: '1.5px solid #e2e8f0'
    }}>
      <div style={{
        width: 76,
        height: 76,
        borderRadius: '50%',
        background: '#fef3c7',
        color: '#d97706',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: 32,
        boxShadow: '0 4px 14px rgba(217, 119, 6, 0.2)'
      }}>
        {icon}
      </div>

      <span style={{
        background: '#fffbeb',
        color: '#b45309',
        border: '1px solid #fde68a',
        padding: '5px 14px',
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 14
      }}>
        <Lock size={14} /> الإصدار التجريبي المخصص لشؤون الطلاب
      </span>

      <h2 style={{ fontSize: 21, fontWeight: 900, color: '#1e293b', margin: '0 0 10px' }}>
        وحدة {moduleTitle} قيد التطوير
      </h2>

      <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, maxWidth: 540, margin: '0 auto 24px' }}>
        تم إغلاق هذه الوحدة مؤقتاً في النسخة التجريبية الحالية لحين اكتمال عمليات التطوير والمعايير الوزارية في التحديث القادم.
        <br />
        <strong>النسخة الحالية مخصصة بالكامل وبكفاءة 100% لإدارة شؤون الطلاب، القيد المدرسي، السجلات، الإحصاء، وتسكين الفصول.</strong>
      </p>

      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 20px',
        textAlign: 'right',
        marginBottom: 26,
        fontSize: 13
      }}>
        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} color="#0284c7" /> المميزات المتاحة والمفعلة بالكامل في هذه النسخة:
        </div>
        <ul style={{ margin: 0, paddingRight: 20, color: '#475569', lineHeight: 1.9, fontWeight: 600 }}>
          <li>قائمة وسجلات الطلاب وقيد الدارسين وبطاقات البيانات الكاملة.</li>
          <li>سجل 41 مستجدين المعتمد وزارياً بالطباعة المعزولة وتصدير PDF.</li>
          <li>استمارة (1) إحصاء الاستقرار (أول أكتوبر) بالإجمالي والتفصيلي.</li>
          <li>منظومة التسكين وتوزيع الفصول الذكية مع طباعة القوائم الفردية والجماعية.</li>
          <li>إدارة ومتابعة الغياب والإنذارات ونظام الدمج والتربية الخاصة.</li>
        </ul>
      </div>

      <div>
        <button
          onClick={onGoToStudents}
          style={{
            background: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(2,132,199,0.35)'
          }}
        >
          <GraduationCap size={18} /> الانتقال إلى شؤون الطلاب وقيد الدارسين
        </button>
      </div>
    </div>
  );
}
