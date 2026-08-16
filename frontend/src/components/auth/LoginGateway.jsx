import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Users, FileSpreadsheet, DollarSign, 
  Shield, ArrowRight, Lock, User, ArrowLeft, KeyRound, 
  CheckCircle2, Settings, Database, Layers, Sparkles, Building2
} from 'lucide-react';
import API_BASE_URL from '../../config/api';
import './LoginGateway.css';

const DOMAINS = [
  {
    key: 'students',
    title: 'شؤون الطلاب والقبول',
    icon: '🎓',
    iconImg: '/assets/icons/domains/students.png',
    badge: 'تسجيل وقيد وإحصاء',
    desc: 'سجلات وقوائم الطلاب، تسكين الفصول، شهادات القيد، والتحويلات',
    color: '#1a3c6e',
    accent: '#3b82f6',
    requireStage: false,
    isLocked: false
  },
  {
    key: 'admin',
    title: 'الإدارة العامة والتحكم',
    icon: '👑',
    iconImg: '/assets/icons/domains/admin.png',
    badge: 'الإدارة والضبط',
    desc: 'الرؤية الشاملة للمؤسسة، إعدادات المراحل والفصول، إدارة الصلاحيات، والنسخ الاحتياطي',
    color: '#0f172a',
    accent: '#6366f1',
    requireStage: false,
    isLocked: false
  },
  {
    key: 'control',
    title: 'الكنترول والامتحانات',
    icon: '📋',
    iconImg: '/assets/icons/domains/control.png',
    badge: 'الامتحانات والشهادات',
    desc: 'أرقام الجلوس، اللجان، الترقيم السري، رصد الدرجات، الشيتات، وطباعة الشهادات',
    color: '#831843',
    accent: '#ec4899',
    requireStage: true,
    isLocked: true,
    lockedReason: 'قسم الكنترول والامتحانات مغلق في هذه النسخة للجميع بما فيهم المدير.'
  },
  {
    key: 'staff',
    title: 'شؤون العاملين (HR)',
    icon: '👔',
    iconImg: '/assets/icons/domains/staff.png',
    badge: 'الكوادر والإشراف',
    desc: 'بيانات المعلمين والإداريين، النصاب الأسبوعي، جدول الإشراف، والإفادات الإدارية',
    color: '#065f46',
    accent: '#10b981',
    requireStage: false,
    defaultAll: true,
    isLocked: true,
    lockedReason: 'قسم شؤون العاملين مغلق في هذه النسخة للجميع بما فيهم المدير.'
  },
  {
    key: 'finance',
    title: 'الحسابات والخزينة',
    icon: '💰',
    iconImg: '/assets/icons/domains/finance.png',
    badge: 'المصروفات والأقساط',
    desc: 'تحصيل المصروفات الدراسية، أقساط الباص والكتب، أذونات الصرف، وسندات القبض',
    color: '#78350f',
    accent: '#f59e0b',
    requireStage: false,
    isLocked: true,
    lockedReason: 'قسم الحسابات والماليات مغلق في هذه النسخة للجميع بما فيهم المدير.'
  }
];

const LoginGateway = ({ 
  schoolName, 
  schoolLogo, 
  onLogin, 
  loginLoading, 
  loginError, 
  onOpenRecover 
}) => {
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const [selectedStageId, setSelectedStageId] = useState('all');
  const [selectedGradeId, setSelectedGradeId] = useState('all');
  const [targetAdminTab, setTargetAdminTab] = useState(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [sections, setSections] = useState([]);
  const [stages, setStages] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loadingStructure, setLoadingStructure] = useState(true);

  // Fetch school structure (sections, stages, grades)
  useEffect(() => {
    fetch(`${API_BASE_URL}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (d.sections) setSections(d.sections);
          if (d.stages) setStages(d.stages);
          if (d.grades) setGrades(d.grades);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStructure(false));
  }, []);

  const [lockedModalInfo, setLockedModalInfo] = useState(null);

  const handleSelectDomain = (domainKey, adminDirectTab = null) => {
    const domObj = DOMAINS.find(d => d.key === domainKey);
    if (domObj && domObj.isLocked) {
      setLockedModalInfo(domObj);
      return;
    }

    setSelectedDomain(domainKey);
    setTargetAdminTab(adminDirectTab);

    // Apply smart defaults based on domain
    if (domainKey === 'staff') {
      setSelectedSectionId('all');
      setSelectedStageId('all');
      setSelectedGradeId('all');
    } else if (domainKey === 'control') {
      // Pick first available section & stage if available
      const firstSec = sections[0]?.id || 'all';
      setSelectedSectionId(firstSec);
      const firstStg = stages.find(s => String(s.section_id) === String(firstSec))?.id || 'all';
      setSelectedStageId(firstStg);
    } else if (domainKey === 'admin') {
      setSelectedSectionId('all');
      setSelectedStageId('all');
      setSelectedGradeId('all');
      if (!loginForm.username) {
        setLoginForm(prev => ({ ...prev, username: 'admin' }));
      }
    } else {
      setSelectedSectionId(sections[0]?.id || 'all');
      setSelectedStageId('all');
      setSelectedGradeId('all');
    }
  };

  // Filter available stages by selected section
  const availableStages = stages.filter(s => 
    selectedSectionId === 'all' || String(s.section_id) === String(selectedSectionId)
  );

  // Filter available grades by selected stage
  const availableGrades = grades.filter(g => 
    selectedStageId === 'all' || String(g.stage_id) === String(selectedStageId)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) {
      const secObj = sections.find(s => String(s.id) === String(selectedSectionId));
      const stgObj = stages.find(s => String(s.id) === String(selectedStageId));
      const grdObj = grades.find(g => String(g.id) === String(selectedGradeId));

      onLogin({
        username: loginForm.username,
        password: loginForm.password,
        domain: selectedDomain,
        sectionId: selectedSectionId,
        stageId: selectedStageId,
        gradeId: selectedGradeId,
        sectionName: secObj ? secObj.name : 'كافة الأقسام',
        stageName: stgObj ? stgObj.stage_name : 'كافة المراحل',
        gradeName: grdObj ? grdObj.grade_name_ar : 'كافة الصفوف',
        targetAdminTab
      });
    }
  };

  const activeDomainObj = DOMAINS.find(d => d.key === selectedDomain);

  return (
    <div className="gateway-container">
      {/* Background Ornaments */}
      <div className="gateway-glow top-right" />
      <div className="gateway-glow bottom-left" />

      <div className="gateway-card">
        
        {/* Gateway Brand Header */}
        <header className="gateway-header">
          <div className="gateway-header-top">
            <div className="gateway-brand-info">
              <div className="gateway-logo-wrapper">
                <img 
                  src={schoolLogo || '/app-logo.png'} 
                  alt="Logo" 
                  className="gateway-school-logo" 
                  onError={(e) => { e.currentTarget.src = '/app-logo.png'; }}
                />
              </div>
              <div>
                <h1 className="gateway-school-name">{schoolName || 'منظومة نبراس برو التعليمية'}</h1>
                <p className="gateway-subtitle">
                  بوابة الدخول الموحدة لمنظومة الإدارة المدرسية المتكاملة 
                  <span style={{ marginRight: 8, padding: '1px 8px', background: 'rgba(59,130,246,0.1)', color: '#2563eb', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>v1.3.0</span>
                </p>
              </div>
            </div>

            {/* Admin Quick Action Portal Button */}
            <button 
              type="button" 
              className="gateway-admin-quick-btn"
              onClick={() => handleSelectDomain('admin', 'settings')}
              title="الدخول المباشر للوحة إعدادات المؤسسة والهياكل والصلاحيات (خاص بالمسؤول الرئيسي)"
            >
              <Shield size={16} />
              <span>إعدادات المؤسسة والصلاحيات (Admin)</span>
            </button>
          </div>
        </header>

        {loginError && (
          <div className="gateway-alert alert-danger">
            ⚠️ {loginError}
          </div>
        )}

        {/* VIEW 1: DOMAIN CARDS SELECTION */}
        {!selectedDomain ? (
          <div className="gateway-body">
            <div className="gateway-prompt">
              <span>اختر قطاع وسجل العمل المطلوب للبدء:</span>
            </div>

            <div className="gateway-domains-grid">
              {DOMAINS.map(dom => (
                <div 
                  key={dom.key}
                  className={`gateway-domain-card ${dom.isLocked ? 'is-locked-card' : ''}`}
                  onClick={() => handleSelectDomain(dom.key)}
                  style={{ 
                    '--accent-color': dom.accent,
                    opacity: dom.isLocked ? 0.78 : 1,
                    position: 'relative'
                  }}
                >
                  <div className="domain-header">
                    <span className="domain-icon">
                      {dom.iconImg ? (
                        <img src={dom.iconImg} alt={dom.title} style={{ width: 44, height: 44, objectFit: 'contain', filter: dom.isLocked ? 'grayscale(40%) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }} />
                      ) : (
                        dom.icon
                      )}
                    </span>
                    {dom.isLocked ? (
                      <span className="domain-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 800 }}>
                        🔒 مغلق في هذه النسخة
                      </span>
                    ) : (
                      <span className="domain-badge">{dom.badge}</span>
                    )}
                  </div>
                  <h3 className="domain-title">{dom.title}</h3>
                  <p className="domain-description">{dom.desc}</p>
                  <div className="domain-card-action" style={{ color: dom.isLocked ? '#92400e' : undefined }}>
                    {dom.isLocked ? (
                      <>
                        <span>🔒 محمي ومغلق للجميع</span>
                        <Lock size={15} />
                      </>
                    ) : (
                      <>
                        <span>دخول وتخصيص النطاق</span>
                        <ArrowLeft size={15} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="gateway-footer">
              <button 
                type="button"
                className="btn-link-recover"
                onClick={onOpenRecover}
              >
                <KeyRound size={14} />
                <span>استعادة كلمة مرور حساب المسؤول الرئيسي (Super Admin)</span>
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: DEDICATED LOGIN & SCOPE CUSTOMIZATION */
          <div className="gateway-login-wrapper">
            
            {/* Active Domain Indicator Banner */}
            <div 
              className="active-domain-banner"
              style={{
                background: `linear-gradient(135deg, ${activeDomainObj?.color || '#0f172a'} 0%, ${activeDomainObj?.accent || '#3b82f6'} 100%)`
              }}
            >
              <div className="banner-icon">
                {activeDomainObj?.iconImg ? (
                  <img src={activeDomainObj.iconImg} alt={activeDomainObj.title} style={{ width: 42, height: 42, objectFit: 'contain', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.3))' }} />
                ) : (
                  activeDomainObj?.icon
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h2>{activeDomainObj?.title}</h2>
                <p>{activeDomainObj?.badge} — حدد نطاق العمل وسجل الدخول</p>
              </div>
              <button 
                type="button" 
                className="btn-banner-change"
                onClick={() => { setSelectedDomain(null); setTargetAdminTab(null); }}
              >
                تغيير القطاع ↺
              </button>
            </div>

            <form onSubmit={handleSubmit} className="gateway-form">
              
              {/* SCOPE SELECTION (القسم والمرحلة) */}
              {selectedDomain !== 'admin' && (
                <div className="gateway-scope-box">
                  <div className="scope-box-title">
                    <Building2 size={15} />
                    <span>تحديد نطاق بيئة العمل المدرسية (Scope):</span>
                  </div>

                  <div className="gateway-scope-grid">
                    {/* Section Selector */}
                    <div className="gateway-form-group">
                      <label>القسم التعليمي</label>
                      <select 
                        className="gateway-select"
                        value={selectedSectionId}
                        onChange={e => {
                          setSelectedSectionId(e.target.value);
                          setSelectedStageId('all');
                          setSelectedGradeId('all');
                        }}
                      >
                        {selectedDomain !== 'control' && (
                          <option value="all">🏢 كافة الأقسام المدرسية</option>
                        )}
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stage Selector */}
                    <div className="gateway-form-group">
                      <label>المرحلة الدراسية</label>
                      <select 
                        className="gateway-select"
                        value={selectedStageId}
                        onChange={e => {
                          setSelectedStageId(e.target.value);
                          setSelectedGradeId('all');
                        }}
                      >
                        {selectedDomain !== 'control' && (
                          <option value="all">🎓 كافة المراحل</option>
                        )}
                        {availableStages.map(stg => (
                          <option key={stg.id} value={stg.id}>{stg.stage_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CREDENTIALS */}
              <div className="gateway-credentials-box">
                <div className="gateway-form-group">
                  <label>اسم المستخدم</label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <input 
                      type="text"
                      required
                      placeholder="أدخل اسم المستخدم"
                      value={loginForm.username}
                      onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="gateway-form-group">
                  <label>كلمة المرور</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type="password"
                      required
                      placeholder="أدخل كلمة المرور"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="gateway-form-actions">
                <button 
                  type="button" 
                  className="btn-gateway-back"
                  onClick={() => { setSelectedDomain(null); setTargetAdminTab(null); }}
                >
                  <ArrowRight size={16} />
                  <span>رجوع لاختيار القطاع</span>
                </button>

                <button 
                  type="submit" 
                  className="btn-gateway-submit"
                  disabled={loginLoading}
                >
                  {loginLoading ? '⏳ جاري التحقق...' : '🚀 بدء العمل في هذا القطاع ←'}
                </button>
              </div>
            </form>

            <div className="gateway-footer">
              <button 
                type="button"
                className="btn-link-recover"
                onClick={onOpenRecover}
              >
                <KeyRound size={14} />
                <span>نسيت كلمة المرور؟ استعادة حساب المشرف الرئيسي</span>
              </button>
            </div>

          </div>
        )}

        {/* LOCKED MODULE NOTIFICATION MODAL */}
        {lockedModalInfo && (
          <div className="modal-overlay" onClick={() => setLockedModalInfo(null)}>
            <div className="modal-card glass-panel text-right" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, border: '2px solid #f59e0b', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  🔒
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#92400e', fontWeight: 900 }}>
                    القسم مغلق ومحمي في هذه النسخة
                  </h3>
                  <span style={{ fontSize: 12, color: '#78350f' }}>{lockedModalInfo.title}</span>
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px 16px', borderRadius: 8, fontSize: 13.5, color: '#92400e', lineHeight: 1.8, marginBottom: 20 }}>
                {lockedModalInfo.lockedReason || 'هذا القسم مغلق في هذه النسخة للجميع بما فيهم المدير العام.'}<br />
                ✨ <strong>المنظومة مفعلة حالياً بالكامل لـ:</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>شؤون الطلاب والقبول وسجلات القيد وسجل 41.</li>
                  <li>الإدارة العامة والتحكم وإعدادات الهياكل والنسخ الاحتياطي.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => setLockedModalInfo(null)}
                  style={{ padding: '10px 24px', fontSize: 13, fontWeight: 800 }}
                >
                  فهمت ذلك
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginGateway;
