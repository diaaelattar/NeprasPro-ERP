import React, { useState, useEffect } from 'react';
import { 
  Database, Shield, Layers, ArrowLeft, ArrowRight, CheckCircle2, 
  Activity, Settings, Lock, FileText, UserPlus, HelpCircle,
  GraduationCap, Users, UserCheck, Calendar, DollarSign, BookOpen, FileSpreadsheet
} from 'lucide-react';
import './App.css';
import StudentsList   from './pages/students/StudentsList';
import StudentForm    from './pages/students/StudentForm';
import StudentProfile from './pages/students/StudentProfile';
import SettingsPage   from './pages/settings/SettingsPage';
import BackupPage     from './pages/settings/BackupPage';
import StaffList      from './pages/staff/StaffList';
import StaffForm      from './pages/staff/StaffForm';
import StudentImport  from './pages/students/StudentImport';
import EMISSyncPage  from './pages/students/EMISSyncPage';
import ClassroomDistribution from './pages/students/ClassroomDistribution';
import StudentTransfersPage from './pages/students/StudentTransfersPage';
import StudentQuickEditPage from './pages/students/StudentQuickEditPage';
import ReportsPage          from './pages/reports/ReportsPage';
import StudentAbsenceManager from './pages/students/StudentAbsenceManager';
import StudentSeatingLists   from './pages/students/StudentSeatingLists';
import ControlMainPage       from './pages/control/ControlMainPage';

import './pages/students/students.css';

function App() {
  // Status check states
  const [loading, setLoading] = useState(true);
  const [dbConfigured, setDbConfigured] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState(null);
  
  // Current active step in Setup Wizard (1: Database, 2: School info, 3: Sections/Stages, 4: Lang, 5: Admin, 6: Success)
  const [step, setStep] = useState(1);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [wizardSuccess, setWizardSuccess] = useState('');

  // Form states
  const [dbForm, setDbForm] = useState({
    host: 'localhost',
    port: '5432',
    user: 'postgres',
    password: '',
    database: 'nepras_pro'
  });

  const [schoolForm, setSchoolForm] = useState({
    schoolCode: '',
    schoolName: '',
    governorate: 'القاهرة',
    directorate: '',
    address: '',
    phone: '',
    email: ''
  });

  const [sectionArab, setSectionArab] = useState(true);
  const [arabStages, setArabStages] = useState({ primary: true, prep: true, secondary: true });
  
  const [sectionLang, setSectionLang] = useState(false);
  const [langStages, setLangStages] = useState({ primary: true, prep: true, secondary: true });
  
  const [sectionKG, setSectionKG] = useState(false);

  const [secondLanguage, setSecondLanguage] = useState('فرنسي');

  const [adminForm, setAdminForm] = useState({
    username: '',
    nationalId: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  // App shell state after initialization
  const [isLoggedIn,        setIsLoggedIn]        = useState(false);
  const [loginForm,         setLoginForm]         = useState({ username: '', password: '' });
  const [loginError,        setLoginError]        = useState('');
  const [loginLoading,      setLoginLoading]      = useState(false);
  const [currentUser,       setCurrentUser]       = useState(null);
  const [activeSectionId,   setActiveSectionId]   = useState('all'); // 'all' or numeric section id
  const [schoolSections,    setSchoolSections]    = useState([]); // all available school sections
  // Internal page routing
  const [currentPage,             setCurrentPage]             = useState('dashboard');
  const [controlActiveTab,         setControlActiveTab]         = useState('term1');
  const [controlSubTabSetup,       setControlSubTabSetup]       = useState('subjects');
  const [controlSubTabTerm1,       setControlSubTabTerm1]       = useState('work');
  const [controlSubTabTerm2,       setControlSubTabTerm2]       = useState('work');
  const [controlSubTabSecondRound, setControlSubTabSecondRound] = useState('seats');
  const [selectedStudentId,       setSelectedStudentId]       = useState(null);
  const [selectedStaffId,   setSelectedStaffId]   = useState(null);
  const [dashboardStats,    setDashboardStats]    = useState({ students: 0, staff: 0, revenue: '0.00' });

  const checkStatus = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/setup/status`);
      const data = await res.json();
      if (data.success) {
        setDbConfigured(data.databaseConfigured);
        setInitialized(data.initialized);
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.logoUrl) setSchoolLogo(data.logoUrl);
        
        // If DB is configured but school is not initialized, start at wizard step 2
        if (data.databaseConfigured && !data.initialized) {
          setStep(2);
        } else if (!data.databaseConfigured) {
          setStep(1);
        }
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = () => {
    fetch(`http://${window.location.hostname}:3001/api/setup/dashboard-stats`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setDashboardStats(d.stats);
      })
      .catch(() => {});
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentPage === 'dashboard') {
      loadDashboardStats();
    }
  }, [isLoggedIn, currentPage]);

  const [dbTypeChoice, setDbTypeChoice] = useState('sqlite'); // 'sqlite' | 'postgres'

  const handleSQLiteInit = async () => {
    setWizardLoading(true);
    setWizardError('');
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/setup/sqlite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تهيئة قاعدة البيانات المدمجة');
      setDbConfigured(true);
      setWizardSuccess('تم تهيئة قاعدة البيانات المدمجة بنجاح! لا حاجة لأي برنامج خارجي.');
      setTimeout(() => { setWizardSuccess(''); setStep(2); }, 1500);
    } catch (err) {
      setWizardError(err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleDbSubmit = async (e) => {
    e.preventDefault();
    setWizardLoading(true);
    setWizardError('');
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/setup/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ ما');
      setDbConfigured(true);
      setWizardSuccess('تم تهيئة قاعدة البيانات PostgreSQL وإنشاء الجداول بنجاح!');
      setTimeout(() => { setWizardSuccess(''); setStep(2); }, 1500);
    } catch (err) {
      setWizardError(err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleWizardSubmit = async () => {
    setWizardLoading(true);
    setWizardError('');

    // Validations
    if (adminForm.password !== adminForm.confirmPassword) {
      setWizardError('كلمتا المرور غير متطابقتين.');
      setWizardLoading(false);
      return;
    }
    if (adminForm.nationalId.length !== 14 || isNaN(adminForm.nationalId)) {
      setWizardError('الرقم القومي يجب أن يتكون من 14 رقماً.');
      setWizardLoading(false);
      return;
    }

    // Build sections structure
    const sectionsPayload = [];
    if (sectionArab) {
      const stages = [];
      if (arabStages.primary) stages.push('ابتدائي');
      if (arabStages.prep) stages.push('إعدادي');
      if (arabStages.secondary) stages.push('ثانوي');
      sectionsPayload.push({
        name: 'القسم العربي',
        type: 'arabic',
        educationType: 'عربي',
        legalStatus: 'حكومي',
        stages
      });
    }

    if (sectionLang) {
      const stages = [];
      if (langStages.primary) stages.push('ابتدائي');
      if (langStages.prep) stages.push('إعدادي');
      if (langStages.secondary) stages.push('ثانوي');
      sectionsPayload.push({
        name: 'قسم اللغات',
        type: 'languages',
        educationType: 'رسمي لغات',
        legalStatus: 'حكومي',
        stages
      });
    }

    if (sectionKG) {
      sectionsPayload.push({
        name: 'مرحلة رياض الأطفال (تمهيدي)',
        type: 'kindergarten',
        educationType: 'تمهيدي',
        legalStatus: 'حكومي',
        stages: ['تمهيدي']
      });
    }

    const payload = {
      schoolCode: schoolForm.schoolCode,
      schoolName: schoolForm.schoolName,
      governorate: schoolForm.governorate,
      directorate: schoolForm.directorate,
      address: schoolForm.address,
      phone: schoolForm.phone,
      email: schoolForm.email,
      sections: sectionsPayload,
      adminUsername: adminForm.username,
      adminNationalId: adminForm.nationalId,
      adminFullName: adminForm.fullName,
      adminPassword: adminForm.password,
      secondLanguage
    };

    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/setup/wizard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إكمال معالج التأسيس');
      
      setStep(6); // Success screen
      setSchoolName(schoolForm.schoolName);
    } catch (err) {
      setWizardError(err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/setup/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      } else {
        const user = data.user;
        setCurrentUser(user);
        setIsLoggedIn(true);
        
        // Determine active section scope from roleScopes
        const scopes = user.roleScopes || [];
        const hasGlobal = scopes.some(s => !s.sectionId); // null sectionId = global access
        
        // Fetch all available sections from the API
        fetch(`http://${window.location.hostname}:3001/api/students/form-options`)
          .then(r => r.json())
          .then(d => {
            if (d.success && d.sections) {
              setSchoolSections(d.sections);
              
              if (hasGlobal) {
                // Global user: default to 'all', they can switch
                setActiveSectionId('all');
              } else if (scopes.length > 0) {
                // Restricted user: lock to first (and likely only) section
                setActiveSectionId(scopes[0].sectionId);
              }
            }
          })
          .catch(() => {});
      }
    } catch {
      setLoginError('تعذّر الاتصال بالخادم. تأكد من تشغيل التطبيق.');
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="glass-panel main-card text-center">
          <Activity className="logo-icon pulse-animation" size={60} />
          <h2 style={{ marginTop: 20 }}>جاري فحص حالة النظام والتهيئة...</h2>
        </div>
      </div>
    );
  }

  // ── Navigation helpers ─────────────────────────────────────────
  const goToStudentsList   = ()      => { setCurrentPage('students-list');        setSelectedStudentId(null); };
  const goToStudentsAdd    = ()      => { setCurrentPage('students-add');         setSelectedStudentId(null); };
  const goToStudentsProfile = (id)   => { setCurrentPage('students-profile');     setSelectedStudentId(id);   };
  const goToStudentsEdit   = (id)    => { setCurrentPage('students-edit');        setSelectedStudentId(id);   };
  const goToStudentsImport = ()      => { setCurrentPage('students-import');      setSelectedStudentId(null); };
  const goToDistribute     = ()      => { setCurrentPage('students-distribute');  setSelectedStudentId(null); };
  const goToEMISSync       = ()      => { setCurrentPage('emis-sync');             setSelectedStudentId(null); };
  const goToTransfers      = ()      => { setCurrentPage('students-transfers');    setSelectedStudentId(null); };
  const goToQuickEdit      = ()      => { setCurrentPage('students-quick-edit');   setSelectedStudentId(null); };
  const goToDashboard      = ()      => { setCurrentPage('dashboard');             setSelectedStudentId(null); };
  
  const goToStaffList      = ()      => { setCurrentPage('staff-list');       setSelectedStaffId(null); };
  const goToStaffAdd       = ()      => { setCurrentPage('staff-add');        setSelectedStaffId(null); };
  const goToStaffEdit      = (id)    => { setCurrentPage('staff-edit');       setSelectedStaffId(id);   };

  const handleStudentSaved = (studentId, studentCode) => {
    if (studentId) goToStudentsProfile(studentId);
    else           goToStudentsList();
  };

  // --- APP SHELL AFTER SUCCESSFUL WIZARD ---
  if (initialized && isLoggedIn) {
    const isStudentsModule = currentPage.startsWith('students');
    
    // Determine sections this user can switch between
    const scopes = currentUser?.roleScopes || [];
    const hasGlobal = scopes.some(s => !s.sectionId);
    const userSections = hasGlobal 
      ? schoolSections  // global user sees all sections
      : schoolSections.filter(sec => scopes.some(s => String(s.sectionId) === String(sec.id)));
    const canSwitchSections = hasGlobal && userSections.length > 1;
    
    // The section label to show for current active section
    const activeSectionName = activeSectionId === 'all' 
      ? 'كل الأقسام'
      : schoolSections.find(s => String(s.id) === String(activeSectionId))?.name || 'القسم';

    // Role detection for UI filtering
    const userRoles = currentUser?.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin') || currentUser?.username === 'admin';
    const isHR         = userRoles.includes('hr_officer');
    const isDataEntry  = userRoles.includes('data_entry');
    const isAccountant = userRoles.includes('accountant');
    const isControl    = userRoles.includes('head_control');
    const isViewer     = userRoles.includes('viewer');

    return (
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <Layers size={28} />
            )}
            <span>نبراس برو ERP</span>
          </div>
          <p className="school-tagline">{schoolName}</p>

          <nav className="sidebar-nav">
            {/* 1. Dashboard (All roles) */}
            <div className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                 onClick={goToDashboard}>
              <Layers size={17} /> <span>الرئيسية</span>
            </div>

            {/* 2. Students Affairs (Super Admin, Data Entry, Viewer) */}
            {(isSuperAdmin || isDataEntry || isViewer) && (
              <>
                <div className={`nav-item ${isStudentsModule ? 'active' : ''}`}
                     onClick={goToStudentsList}>
                  <GraduationCap size={17} /> <span>شئون الطلاب والقبول</span>
                </div>
                {isStudentsModule && (
                  <div className="nav-submenu">
                    <div className={`nav-subitem ${currentPage === 'students-list' ? 'active' : ''}`}
                         onClick={goToStudentsList}>
                      <span>•</span> <span>قائمة الطلاب</span>
                    </div>
                    <div className={`nav-subitem ${currentPage === 'students-reports' ? 'active' : ''}`}
                         onClick={() => setCurrentPage('students-reports')}>
                      <span>•</span> <span>التقارير والوثائق</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 3. HR / Staff Affairs (Super Admin, HR Officer, Viewer) */}
            {(isSuperAdmin || isHR || isViewer) && (
              <div className={`nav-item ${currentPage.startsWith('staff') ? 'active' : ''}`}
                   onClick={goToStaffList}>
                <Users size={17} /> <span>شئون العاملين (HR)</span>
              </div>
            )}

            {/* 4. Treasury / Finance (Super Admin, Accountant) */}
            {(isSuperAdmin || isAccountant) && (
              <div className="nav-item">
                <DollarSign size={17} /> <span>الرسوم والأقساط</span>
              </div>
            )}

            {/* 5. Exams & Grading / Control (Super Admin, Control Officer) */}
            {(isSuperAdmin || isControl) && (
              <>
                <div className={`nav-item ${currentPage === 'control' ? 'active' : ''}`}
                     onClick={() => { setCurrentPage('control'); setSelectedStudentId(null); }}>
                  <Shield size={17} /> <span>الكنترول والامتحانات</span>
                </div>
                {currentPage === 'control' && (
                  <div className="nav-submenu" style={{ paddingRight: '12px', margin: '6px 0 10px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* 1. Setup Stage */}
                    <div style={{ background: controlActiveTab === 'setup' ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '8px', padding: '2px' }}>
                      <div 
                        className={`nav-subitem ${controlActiveTab === 'setup' ? 'active' : ''}`}
                        onClick={() => setControlActiveTab('setup')}
                        style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '12.5px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <span>⚙️ 1. إعدادات الأعمال</span>
                        <span style={{ fontSize: '10px' }}>{controlActiveTab === 'setup' ? '▼' : '◀'}</span>
                      </div>
                      {controlActiveTab === 'setup' && (
                        <div style={{ paddingRight: '14px', display: 'flex', flexDirection: 'column', gap: '2px', margin: '4px 0 6px 0' }}>
                          <div className={`nav-subitem ${controlSubTabSetup === 'subjects' ? 'active' : ''}`} onClick={() => setControlSubTabSetup('subjects')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>📚 تجهيز مواد الكنترول</div>
                          <div className={`nav-subitem ${controlSubTabSetup === 'seats' ? 'active' : ''}`} onClick={() => setControlSubTabSetup('seats')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🔢 أرقام الجلوس</div>
                          <div className={`nav-subitem ${controlSubTabSetup === 'committees' ? 'active' : ''}`} onClick={() => setControlSubTabSetup('committees')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🏛️ توزيع اللجان والمقاعد</div>
                          <div className={`nav-subitem ${controlSubTabSetup === 'reports' ? 'active' : ''}`} onClick={() => setControlSubTabSetup('reports')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>📊 تقارير كشوف المناداة</div>
                        </div>
                      )}
                    </div>

                    {/* 2. Term 1 Stage */}
                    <div style={{ background: controlActiveTab === 'term1' ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '8px', padding: '2px' }}>
                      <div 
                        className={`nav-subitem ${controlActiveTab === 'term1' ? 'active' : ''}`}
                        onClick={() => setControlActiveTab('term1')}
                        style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '12.5px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <span>📘 2. الفصل الدراسي الأول</span>
                        <span style={{ fontSize: '10px' }}>{controlActiveTab === 'term1' ? '▼' : '◀'}</span>
                      </div>
                      {controlActiveTab === 'term1' && (
                        <div style={{ paddingRight: '14px', display: 'flex', flexDirection: 'column', gap: '2px', margin: '4px 0 6px 0' }}>
                          <div className={`nav-subitem ${controlSubTabTerm1 === 'work' ? 'active' : ''}`} onClick={() => setControlSubTabTerm1('work')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>📝 تسجيل أعمال السنة</div>
                          <div className={`nav-subitem ${controlSubTabTerm1 === 'secret' ? 'active' : ''}`} onClick={() => setControlSubTabTerm1('secret')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🔑 التوزيع السري</div>
                          <div className={`nav-subitem ${controlSubTabTerm1 === 'exam' ? 'active' : ''}`} onClick={() => setControlSubTabTerm1('exam')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>📊 تسجيل امتحان نصف العام</div>
                          <div className={`nav-subitem ${controlSubTabTerm1 === 'reports' ? 'active' : ''}`} onClick={() => setControlSubTabTerm1('reports')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🖨️ مطبوعات الكنترول</div>
                          <div className={`nav-subitem ${controlSubTabTerm1 === 'search' ? 'active' : ''}`} onClick={() => setControlSubTabTerm1('search')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🔍 بحث عن طالب بالسرّي</div>
                        </div>
                      )}
                    </div>

                    {/* 3. Term 2 Stage */}
                    <div style={{ background: controlActiveTab === 'term2' ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '8px', padding: '2px' }}>
                      <div 
                        className={`nav-subitem ${controlActiveTab === 'term2' ? 'active' : ''}`}
                        onClick={() => setControlActiveTab('term2')}
                        style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '12.5px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <span>📗 3. الفصل الدراسي الثاني</span>
                        <span style={{ fontSize: '10px' }}>{controlActiveTab === 'term2' ? '▼' : '◀'}</span>
                      </div>
                      {controlActiveTab === 'term2' && (
                        <div style={{ paddingRight: '14px', display: 'flex', flexDirection: 'column', gap: '2px', margin: '4px 0 6px 0' }}>
                          <div className={`nav-subitem ${controlSubTabTerm2 === 'work' ? 'active' : ''}`} onClick={() => setControlSubTabTerm2('work')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>📝 تسجيل أعمال السنة (ترم ثان)</div>
                          <div className={`nav-subitem ${controlSubTabTerm2 === 'secret' ? 'active' : ''}`} onClick={() => setControlSubTabTerm2('secret')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🔑 التوزيع السري (ترم ثان)</div>
                          <div className={`nav-subitem ${controlSubTabTerm2 === 'exam' ? 'active' : ''}`} onClick={() => setControlSubTabTerm2('exam')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>📊 تسجيل امتحان آخر العام</div>
                          <div className={`nav-subitem ${controlSubTabTerm2 === 'review_raffa' ? 'active' : ''}`} onClick={() => setControlSubTabTerm2('review_raffa')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>⚖️ لجنة مراجعة الرفع والحالات</div>
                          <div className={`nav-subitem ${controlSubTabTerm2 === 'reports' ? 'active' : ''}`} onClick={() => setControlSubTabTerm2('reports')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🖨️ مطبوعات الشهادات والنتائج</div>
                        </div>
                      )}
                    </div>

                    {/* 4. Second Round Stage */}
                    <div style={{ background: controlActiveTab === 'second_round' ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '8px', padding: '2px' }}>
                      <div 
                        className={`nav-subitem ${controlActiveTab === 'second_round' ? 'active' : ''}`}
                        onClick={() => setControlActiveTab('second_round')}
                        style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '12.5px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <span>📙 4. الدور الثاني</span>
                        <span style={{ fontSize: '10px' }}>{controlActiveTab === 'second_round' ? '▼' : '◀'}</span>
                      </div>
                      {controlActiveTab === 'second_round' && (
                        <div style={{ paddingRight: '14px', display: 'flex', flexDirection: 'column', gap: '2px', margin: '4px 0 6px 0' }}>
                          <div className={`nav-subitem ${controlSubTabSecondRound === 'seats' ? 'active' : ''}`} onClick={() => setControlSubTabSecondRound('seats')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🔢 أرقام جلوس الدور الثاني</div>
                          <div className={`nav-subitem ${controlSubTabSecondRound === 'secret' ? 'active' : ''}`} onClick={() => setControlSubTabSecondRound('secret')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🔑 سري الدور الثاني</div>
                          <div className={`nav-subitem ${controlSubTabSecondRound === 'exam' ? 'active' : ''}`} onClick={() => setControlSubTabSecondRound('exam')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>📊 رصد درجات الدور الثاني</div>
                          <div className={`nav-subitem ${controlSubTabSecondRound === 'reports' ? 'active' : ''}`} onClick={() => setControlSubTabSecondRound('reports')} style={{ cursor: 'pointer', padding: '5px 8px', fontSize: '11.5px', fontWeight: 700 }}>🖨️ مطبوعات الدور الثاني</div>
                        </div>
                      )}
                    </div>

                    {/* 5. Close Control Stage */}
                    <div style={{ background: controlActiveTab === 'close' ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '8px', padding: '2px' }}>
                      <div 
                        className={`nav-subitem ${controlActiveTab === 'close' ? 'active' : ''}`}
                        onClick={() => setControlActiveTab('close')}
                        style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '12.5px', fontWeight: 800, borderRadius: '6px' }}
                      >
                        🔒 5. غلق الكنترول
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}



            {/* 7. User management (Super Admin only) */}
            {isSuperAdmin && (
              <div className={`nav-item ${currentPage === 'users' ? 'active' : ''}`}
                   onClick={() => { setCurrentPage('users'); setSelectedStudentId(null); }}>
                <Lock size={17} /> <span>المستخدمون</span>
              </div>
            )}

            {/* 8. Settings (Super Admin only) */}
            {isSuperAdmin && (
              <div className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                   onClick={() => { setCurrentPage('settings'); setSelectedStudentId(null); }}>
                <Settings size={17} /> <span>الإعدادات</span>
              </div>
            )}

            {/* 9. Backups (Super Admin only) */}
            {isSuperAdmin && (
              <div className={`nav-item ${currentPage === 'backups' ? 'active' : ''}`}
                   onClick={() => { setCurrentPage('backups'); setSelectedStudentId(null); }}>
                <Database size={17} /> <span>النسخ الاحتياطي</span>
              </div>
            )}

            {/* 10. EMIS Sync (Super Admin + Data Entry) */}
            {(isSuperAdmin || isDataEntry) && (
              <div className={`nav-item ${currentPage === 'emis-sync' ? 'active' : ''}`}
                   onClick={goToEMISSync}
                   style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 8 }}>
                <span style={{ fontSize: 16 }}>🔗</span> <span>مزامنة EMIS</span>
              </div>
            )}
          </nav>


          {/* ── Section Switcher / Scope Badge ── */}
          <div className="section-scope-panel">
            <div className="scope-label">نطاق العمل الحالي</div>
            {canSwitchSections ? (
              <div className="section-tabs">
                <button
                  className={`section-tab ${activeSectionId === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveSectionId('all')}
                >🏫 كل الأقسام</button>
                {userSections.map(sec => (
                  <button
                    key={sec.id}
                    className={`section-tab ${String(activeSectionId) === String(sec.id) ? 'active' : ''}`}
                    onClick={() => setActiveSectionId(sec.id)}
                  >{sec.name}</button>
                ))}
              </div>
            ) : (
              <div className="section-badge-fixed">
                <span>📌</span>
                <span>{activeSectionName}</span>
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <div className="user-info-mini">
              <span className="user-avatar-mini">👤</span>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div className="user-name-mini">{currentUser?.full_name || currentUser?.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {isSuperAdmin ? '🛡️ مدير النظام' :
                   isHR ? '👔 شئون العاملين' :
                   isDataEntry ? '📚 شئون الطلاب' :
                   isAccountant ? '💰 الحسابات' :
                   isControl ? '📋 الكنترول' :
                   '👁 مشاهد'}
                </div>
              </div>
            </div>
            <button className="logout-btn" onClick={() => { setIsLoggedIn(false); setCurrentUser(null); setActiveSectionId('all'); setCurrentPage('dashboard'); }}>تسجيل الخروج</button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-content" style={{ overflowY: 'auto' }}>

          {/* ── Dashboard Home ───────────────────── */}
          {currentPage === 'dashboard' && (
            <>
              <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>لوحة التحكم الرئيسية</h2>
                  <p style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.75)' }}>نظام تشغيل وإدارة المدرسة الذكية</p>
                </div>
                <div className="user-badge" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 30, fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  👤 مرحباً، {currentUser?.full_name || currentUser?.username || 'مدير النظام'}
                </div>
              </header>

              <div className="dashboard-inner" style={{ padding: 0 }}>
                <section className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 30 }}>
                  <div className="stat-card" onClick={goToStudentsList} style={{ cursor: 'pointer', background: '#fff', border: '1px solid var(--border-color)', borderRight: '4px solid #1a3c6e', borderRadius: 12, padding: '20px 24px', transition: 'all 0.25s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>🎓 الطلاب المقيدين</h3>
                      <span style={{ fontSize: 11, background: '#1a3c6e15', color: '#1a3c6e', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>نشط</span>
                    </div>
                    <p className="stat-number" style={{ fontSize: 32, fontWeight: 900, color: '#1a3c6e', margin: '0 0 4px 0' }}>{dashboardStats.students}</p>
                    <span className="stat-sub" style={{ fontSize: 11, color: 'var(--text-muted)' }}>العام الدراسي الحالي</span>
                  </div>

                  <div className="stat-card" onClick={goToStaffList} style={{ cursor: 'pointer', background: '#fff', border: '1px solid var(--border-color)', borderRight: '4px solid #10b981', borderRadius: 12, padding: '20px 24px', transition: 'all 0.25s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>👔 إجمالي العاملين</h3>
                      <span style={{ fontSize: 11, background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>نشط</span>
                    </div>
                    <p className="stat-number" style={{ fontSize: 32, fontWeight: 900, color: '#10b981', margin: '0 0 4px 0' }}>{dashboardStats.staff}</p>
                    <span className="stat-sub" style={{ fontSize: 11, color: 'var(--text-muted)' }}>موظفين وكادر إداري</span>
                  </div>

                  <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRight: '4px solid #f59e0b', borderRadius: 12, padding: '20px 24px', transition: 'all 0.25s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>💰 المتحصلات المالية</h3>
                      <span style={{ fontSize: 11, background: '#f59e0b15', color: '#f59e0b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>الخزينة</span>
                    </div>
                    <p className="stat-number" style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b', margin: '0 0 4px 0' }}>{dashboardStats.revenue} <span style={{ fontSize: 16, fontWeight: 700 }}>ج.م</span></p>
                    <span className="stat-sub" style={{ fontSize: 11, color: 'var(--text-muted)' }}>سجلات الإيرادات الحالية</span>
                  </div>
                </section>

                <section className="dashboard-body-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  {(isSuperAdmin || isDataEntry || isViewer) && (
                    <div className="body-card glass-panel" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, transition: 'all 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a3c6e', margin: 0 }}>شئون الطلاب والقبول</h3>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#1a3c6e10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎓</div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 20px 0' }}>قيد الطلاب الجدد وتوزيع الفصول الدراسية واستخراج التقارير الرسمية وإحصائيات الطلاب.</p>
                      </div>
                      <button className="btn-primary" style={{ padding: '9px 18px', fontSize: 12.5, width: 'fit-content', borderRadius: 8 }} onClick={goToStudentsList}>تصفح الوحدة ←</button>
                    </div>
                  )}

                  {(isSuperAdmin || isHR || isViewer) && (
                    <div className="body-card glass-panel" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, transition: 'all 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#10b981', margin: 0 }}>شئون العاملين (HR)</h3>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#10b98110', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👔</div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 20px 0' }}>إدارة بيانات المعلمين والإداريين والمهام والرواتب والتقارير الخاصة بشئون العاملين بالمدرسة.</p>
                      </div>
                      <button className="btn-primary" style={{ padding: '9px 18px', fontSize: 12.5, width: 'fit-content', borderRadius: 8, background: '#10b981', borderColor: '#10b981' }} onClick={goToStaffList}>تصفح الوحدة ←</button>
                    </div>
                  )}

                  {(isSuperAdmin || isAccountant) && (
                    <div className="body-card glass-panel" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, opacity: 0.85, transition: 'all 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', margin: 0 }}>الرسوم والأقساط</h3>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f59e0b10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 20px 0' }}>تحصيل الرسوم الدراسية وإدارة الأقساط وسجلات الخزينة والإيرادات والمصروفات المدرسية.</p>
                      </div>
                      <button className="btn-secondary" style={{ padding: '9px 18px', fontSize: 12.5, width: 'fit-content', borderRadius: 8, color: '#f59e0b', borderColor: '#f59e0b' }} disabled>قريباً</button>
                    </div>
                  )}

                  {(isSuperAdmin || isControl) && (
                    <div className="body-card glass-panel" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, opacity: 0.85, transition: 'all 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#6366f1', margin: 0 }}>الكنترول والامتحانات</h3>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#6366f110', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 20px 0' }}>إدارة كشوف الدرجات والامتحانات وجداول الاختبارات والشهادات والنتائج المدرسية.</p>
                      </div>
                      <button className="btn-secondary" style={{ padding: '9px 18px', fontSize: 12.5, width: 'fit-content', borderRadius: 8, color: '#6366f1', borderColor: '#6366f1' }} disabled>قريباً</button>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <div className="body-card glass-panel" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, transition: 'all 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#4b5563', margin: 0 }}>الإعدادات والمستخدمون</h3>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#4b556310', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚙️</div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 20px 0' }}>إدارة حسابات المستخدمين وصلاحياتهم، الفصول الدراسية، الأقسام، والمراحل، وبيانات المدرسة.</p>
                      </div>
                      <button className="btn-secondary" style={{ padding: '9px 18px', fontSize: 12.5, width: 'fit-content', borderRadius: 8 }} onClick={() => setCurrentPage('users')}>تصفح الإعدادات ←</button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {/* ── Students List ────────────────────── */}
          {currentPage === 'students-list' && (
            <StudentsList
              onAdd={goToStudentsAdd}
              onView={goToStudentsProfile}
              onImport={goToStudentsImport}
              onDistribute={goToDistribute}
              onTransfers={goToTransfers}
              onQuickEdit={goToQuickEdit}
              onAbsence={() => setCurrentPage('student-absence')}
              onSeating={() => setCurrentPage('student-seating')}
              activeSectionId={activeSectionId}
              currentUser={currentUser}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          {/* ── Students Reports ─────────────────── */}
          {currentPage === 'students-reports' && (
            <div className="reports-module">
              <ReportsPage activeSectionId={activeSectionId} />
            </div>
          )}

          {/* ── Import Students ──────────────────── */}
          {currentPage === 'students-import' && (
            <StudentImport
              onBack={goToStudentsList}
              activeSectionId={activeSectionId}
            />
          )}

          {/* ── Classroom Distribution ───────────── */}
          {currentPage === 'students-distribute' && (
            <ClassroomDistribution
              onBack={goToStudentsList}
              activeSectionId={activeSectionId}
            />
          )}

          {/* ── EMIS Sync ────────────────────────── */}
          {currentPage === 'emis-sync' && (
            <EMISSyncPage />
          )}

          {/* ── Student Transfers ────────────────── */}
          {currentPage === 'students-transfers' && (
            <StudentTransfersPage
              onBack={goToStudentsList}
              activeSectionId={activeSectionId}
            />
          )}

          {/* ── Student Quick Edit ───────────────── */}
          {currentPage === 'students-quick-edit' && (
            <StudentQuickEditPage
              onBack={goToStudentsList}
              activeSectionId={activeSectionId}
            />
          )}

          {/* ── Add Student ──────────────────────── */}
          {currentPage === 'students-add' && (
            <StudentForm
              onSaved={handleStudentSaved}
              onCancel={goToStudentsList}
              activeSectionId={activeSectionId}
            />
          )}

          {/* ── Edit Student ─────────────────────── */}
          {currentPage === 'students-edit' && (
            <StudentForm
              studentId={selectedStudentId}
              onSaved={handleStudentSaved}
              onCancel={() => goToStudentsProfile(selectedStudentId)}
              activeSectionId={activeSectionId}
            />
          )}

          {/* ── Student Profile ──────────────────── */}
          {currentPage === 'students-profile' && (
            <StudentProfile
              studentId={selectedStudentId}
              onEdit={goToStudentsEdit}
              onBack={goToStudentsList}
            />
          )}

          {/* ── Staff List ───────────────────────── */}
          {currentPage === 'staff-list' && (
            <StaffList
              onAdd={goToStaffAdd}
              onView={goToStaffEdit}
            />
          )}

          {/* ── Add/Edit Staff ───────────────────── */}
          {(currentPage === 'staff-add' || currentPage === 'staff-edit') && (
            <StaffForm
              staffId={selectedStaffId}
              onSaved={goToStaffList}
              onCancel={goToStaffList}
            />
          )}

          {/* ── Student Absence Manager ──────────────────── */}
          {currentPage === 'student-absence' && (
            <StudentAbsenceManager onBack={goToStudentsList} />
          )}

          {/* ── Student Seating Lists (12 d) ─────────────── */}
          {currentPage === 'student-seating' && (
            <StudentSeatingLists onBack={goToStudentsList} />
          )}

          {/* ── Control Room & Exams Module ─────────────── */}
          {currentPage === 'control' && (
            <ControlMainPage
              externalActiveTab={controlActiveTab}
              setExternalActiveTab={setControlActiveTab}
              externalSubTabSetup={controlSubTabSetup}
              setExternalSubTabSetup={setControlSubTabSetup}
              externalSubTabTerm1={controlSubTabTerm1}
              setExternalSubTabTerm1={setControlSubTabTerm1}
              externalSubTabTerm2={controlSubTabTerm2}
              setExternalSubTabTerm2={setControlSubTabTerm2}
              externalSubTabSecondRound={controlSubTabSecondRound}
              setExternalSubTabSecondRound={setControlSubTabSecondRound}
            />
          )}



          {/* ── Users Page ───────────────────────── */}
          {currentPage === 'users' && (
            <SettingsPage initialTab="users" allowedTabs={['users', 'roles', 'perms']} />
          )}

          {/* ── Settings Page ────────────────────── */}
          {currentPage === 'settings' && (
            <SettingsPage initialTab="classrooms" allowedTabs={['classrooms', 'sections_stages', 'institution', 'academic_years']} />
          )}

          {/* ── Backups Page ─────────────────────── */}
          {currentPage === 'backups' && (
            <BackupPage />
          )}


        </main>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (initialized && !isLoggedIn) {
    return (
      <div className="app-container">
        <div className="glass-panel main-card max-w-sm text-center">
          <header className="app-header">
            <div className="logo-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              {schoolLogo ? (
                <img src={schoolLogo} alt="School Logo" style={{ maxHeight: 80, maxWidth: 150, objectFit: 'contain', borderRadius: 6, padding: 5, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }} />
              ) : (
                <Layers className="logo-icon" size={40} />
              )}
            </div>
            <h2>سجل الدخول للمنظومة</h2>
            <p className="subtitle">{schoolName}</p>
          </header>

          {loginError && <div className="alert alert-danger">{loginError}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div className="form-group text-right">
              <label>اسم المستخدم</label>
              <input 
                type="text" 
                placeholder="أدخل اسم المستخدم"
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </div>

            <div className="form-group text-right">
              <label>كلمة المرور</label>
              <input 
                type="password" 
                placeholder="أدخل كلمة المرور"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', marginTop: 10, opacity: loginLoading ? 0.7 : 1 }}
              disabled={loginLoading}
            >
              {loginLoading ? '⏳ جارٍ التحقق...' : 'دخول المنظومة'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- SETUP WIZARD SCREENS ---
  return (
    <div className="app-container">
      {/* Glow ornaments */}
      <div className="glow-effect top-left"></div>
      <div className="glow-effect bottom-right"></div>

      <div className="glass-panel main-card">
        {/* Progress header */}
        <div className="wizard-progress">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line"></div>
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className="step-line"></div>
          <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
          <div className="step-line"></div>
          <div className={`step-dot ${step >= 4 ? 'active' : ''}`}>4</div>
          <div className="step-line"></div>
          <div className={`step-dot ${step >= 5 ? 'active' : ''}`}>5</div>
        </div>

        {wizardError && <div className="alert alert-danger text-right">{wizardError}</div>}
        {wizardSuccess && <div className="alert alert-success text-right">{wizardSuccess}</div>}

        {/* STEP 1: DATABASE TYPE SELECTION */}
        {step === 1 && (
          <div>
            <div className="step-header text-right">
              <Database size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 1: اختر نمط قاعدة البيانات</h2>
              <p>اختر الطريقة المناسبة لتخزين بيانات منظومتك حسب حجم واحتياجات مؤسستك.</p>
            </div>

            {/* Two-option cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
              {/* SQLite Card */}
              <div 
                className="section-config-box"
                onClick={() => setDbTypeChoice('sqlite')}
                style={{ 
                  cursor: 'pointer', 
                  borderColor: dbTypeChoice === 'sqlite' ? 'var(--primary)' : 'var(--border-color)',
                  boxShadow: dbTypeChoice === 'sqlite' ? '0 0 0 2px var(--primary-glow)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>💾</div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 16 }}>مدمج (SQLite)</h3>
                <div style={{ display: 'inline-block', background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>⭐ موصى به للبداية</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.7 }}>
                  قاعدة بيانات مدمجة داخل التطبيق.<br/>لا يحتاج تثبيت أي برنامج خارجي.<br/>مثالي للجهاز الواحد والشبكة المحلية الصغيرة.
                </p>
              </div>

              {/* PostgreSQL Card */}
              <div 
                className="section-config-box"
                onClick={() => setDbTypeChoice('postgres')}
                style={{ 
                  cursor: 'pointer',
                  borderColor: dbTypeChoice === 'postgres' ? 'var(--primary)' : 'var(--border-color)',
                  boxShadow: dbTypeChoice === 'postgres' ? '0 0 0 2px var(--primary-glow)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>🐘</div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 16 }}>شبكة (PostgreSQL)</h3>
                <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>للشبكات الكبيرة</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.7 }}>
                  قاعدة بيانات مركزية على سيرفر.<br/>تتصل بها جميع أجهزة الشبكة.<br/>يحتاج تثبيت PostgreSQL مسبقاً.
                </p>
              </div>
            </div>

            {/* PostgreSQL form if chosen */}
            {dbTypeChoice === 'postgres' && (
              <form onSubmit={handleDbSubmit}>
                <div className="form-grid" style={{ marginTop: 0 }}>
                  <div className="form-group">
                    <label>المضيف (Host)</label>
                    <input type="text" value={dbForm.host} required onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>المنفذ (Port)</label>
                    <input type="text" value={dbForm.port} required onChange={(e) => setDbForm({ ...dbForm, port: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>اسم المستخدم</label>
                    <input type="text" value={dbForm.user} required onChange={(e) => setDbForm({ ...dbForm, user: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>كلمة المرور</label>
                    <input type="password" value={dbForm.password} onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>اسم قاعدة البيانات</label>
                    <input type="text" value={dbForm.database} required onChange={(e) => setDbForm({ ...dbForm, database: e.target.value })} />
                  </div>
                </div>
                <div className="wizard-actions">
                  <div />
                  <button type="submit" className="btn-primary" disabled={wizardLoading}>
                    {wizardLoading ? 'جاري الاتصال...' : 'اتصال وتهيئة PostgreSQL'}
                  </button>
                </div>
              </form>
            )}

            {/* SQLite action */}
            {dbTypeChoice === 'sqlite' && (
              <div className="wizard-actions">
                <div />
                <button className="btn-primary" disabled={wizardLoading} onClick={handleSQLiteInit} style={{ fontSize: 15, padding: '14px 28px' }}>
                  {wizardLoading ? 'جاري التهيئة...' : '⚡ تفعيل فوري بدون إعداد'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: GENERAL SCHOOL INFO */}
        {step === 2 && (
          <div>
            <div className="step-header text-right">
              <Settings size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 2: معلومات المؤسسة التعليمية</h2>
              <p>يرجى إدخال البيانات المعتمدة والرموز الوزارية لترويس الشهادات الرسمية.</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>الكود الوزاري للمدرسة</label>
                <input 
                  type="text" 
                  value={schoolForm.schoolCode} 
                  required
                  placeholder="مثال: 320984"
                  onChange={(e) => setSchoolForm({ ...schoolForm, schoolCode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>اسم المدرسة بالكامل</label>
                <input 
                  type="text" 
                  value={schoolForm.schoolName} 
                  required
                  placeholder="مدرسة الأورمان الثانوية بنين"
                  onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>المحافظة</label>
                <input 
                  type="text" 
                  value={schoolForm.governorate} 
                  required
                  onChange={(e) => setSchoolForm({ ...schoolForm, governorate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>الإدارة التعليمية</label>
                <input 
                  type="text" 
                  value={schoolForm.directorate} 
                  required
                  placeholder="إدارة الدقي التعليمية"
                  onChange={(e) => setSchoolForm({ ...schoolForm, directorate: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>العنوان بالكامل</label>
                <input 
                  type="text" 
                  value={schoolForm.address} 
                  placeholder="مثال: شارع التحرير، الدقي، الجيزة"
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>رقم الهاتف</label>
                <input 
                  type="text" 
                  value={schoolForm.phone} 
                  onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={schoolForm.email} 
                  onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>رجوع</span>
              </button>
              <button 
                className="btn-primary" 
                disabled={!schoolForm.schoolCode || !schoolForm.schoolName}
                onClick={() => setStep(3)}
              >
                <span>التالي</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SECTIONS AND STAGES */}
        {step === 3 && (
          <div>
            <div className="step-header text-right">
              <Layers size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 3: هيكلة المراحل والأقسام</h2>
              <p>اختر الأقسام والمراحل المتواجدة في هذه المؤسسة. سيتم توليد العدادات المسلسلة تلقائياً لكل مرحلة.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Arabic Section */}
              <div className="section-config-box">
                <label className="checkbox-label" style={{ fontWeight: 800, fontSize: 16 }}>
                  <input 
                    type="checkbox" 
                    checked={sectionArab}
                    onChange={(e) => setSectionArab(e.target.checked)}
                  />
                  <span>تفعيل القسم العربي</span>
                </label>
                
                {sectionArab && (
                  <div className="stage-options" style={{ marginRight: 25, marginTop: 10, display: 'flex', gap: 20 }}>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={arabStages.primary}
                        onChange={(e) => setArabStages({ ...arabStages, primary: e.target.checked })}
                      />
                      <span>الابتدائي (6 سنوات)</span>
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={arabStages.prep}
                        onChange={(e) => setArabStages({ ...arabStages, prep: e.target.checked })}
                      />
                      <span>الإعدادي (3 سنوات)</span>
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={arabStages.secondary}
                        onChange={(e) => setArabStages({ ...arabStages, secondary: e.target.checked })}
                      />
                      <span>الثانوي (3 سنوات)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Languages Section */}
              <div className="section-config-box">
                <label className="checkbox-label" style={{ fontWeight: 800, fontSize: 16 }}>
                  <input 
                    type="checkbox" 
                    checked={sectionLang}
                    onChange={(e) => setSectionLang(e.target.checked)}
                  />
                  <span>تفعيل قسم اللغات</span>
                </label>

                {sectionLang && (
                  <div className="stage-options" style={{ marginRight: 25, marginTop: 10, display: 'flex', gap: 20 }}>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={langStages.primary}
                        onChange={(e) => setLangStages({ ...langStages, primary: e.target.checked })}
                      />
                      <span>الابتدائي لغات</span>
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={langStages.prep}
                        onChange={(e) => setLangStages({ ...langStages, prep: e.target.checked })}
                      />
                      <span>الإعدادي لغات</span>
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={langStages.secondary}
                        onChange={(e) => setLangStages({ ...langStages, secondary: e.target.checked })}
                      />
                      <span>الثانوي لغات</span>
                    </label>
                  </div>
                )}
              </div>

              {/* KG Section */}
              <div className="section-config-box">
                <label className="checkbox-label" style={{ fontWeight: 800, fontSize: 16 }}>
                  <input 
                    type="checkbox" 
                    checked={sectionKG}
                    onChange={(e) => setSectionKG(e.target.checked)}
                  />
                  <span>تفعيل مرحلة رياض الأطفال (تمهيدي)</span>
                </label>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} />
                <span>رجوع</span>
              </button>
              <button 
                className="btn-primary" 
                disabled={!sectionArab && !sectionLang && !sectionKG}
                onClick={() => setStep(4)}
              >
                <span>التالي</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SECOND LANGUAGE */}
        {step === 4 && (
          <div>
            <div className="step-header text-right">
              <FileText size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 4: اللغة الأجنبية الثانية</h2>
              <p>اختر اللغة الثانية المعتمدة للمؤسسة. سيتم إدراج حقل مخصص ديناميكي للطلاب لتسجيل لغتهم تلقائياً.</p>
            </div>

            <div className="form-group text-right" style={{ maxWidth: 300, margin: '20px 0' }}>
              <label>اختر اللغة الثانية الرئيسية</label>
              <select 
                value={secondLanguage}
                onChange={(e) => setSecondLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'white',
                  fontFamily: 'var(--font-family)'
                }}
              >
                <option value="فرنسي">اللغة الفرنسية</option>
                <option value="ألماني">اللغة الألمانية</option>
                <option value="إيطالي">اللغة الإيطالية</option>
                <option value="لا يوجد">لا يوجد لغة ثانية</option>
              </select>
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={() => setStep(3)}>
                <ArrowLeft size={16} />
                <span>رجوع</span>
              </button>
              <button className="btn-primary" onClick={() => setStep(5)}>
                <span>التالي</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CREATING ADMINISTRATOR ACCOUNT */}
        {step === 5 && (
          <div>
            <div className="step-header text-right">
              <UserPlus size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 5: حساب المسؤول الأول (Super Admin)</h2>
              <p>تأسيس الحساب الرئيسي للمدير العام الذي يمتلك الصلاحية الكاملة لتوزيع المهام والأدوار.</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>اسم المستخدم (الدخول)</label>
                <input 
                  type="text" 
                  value={adminForm.username} 
                  required
                  placeholder="مثال: admin"
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>الاسم الكامل باللغة العربية</label>
                <input 
                  type="text" 
                  value={adminForm.fullName} 
                  required
                  placeholder="محمد أحمد علي"
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>الرقم القومي (14 خانة)</label>
                <input 
                  type="text" 
                  value={adminForm.nationalId} 
                  required
                  maxLength={14}
                  placeholder="29012010102934"
                  onChange={(e) => setAdminForm({ ...adminForm, nationalId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>كلمة المرور</label>
                <input 
                  type="password" 
                  value={adminForm.password} 
                  required
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>تأكيد كلمة المرور</label>
                <input 
                  type="password" 
                  value={adminForm.confirmPassword} 
                  required
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={() => setStep(4)}>
                <ArrowLeft size={16} />
                <span>رجوع</span>
              </button>
              <button 
                className="btn-primary" 
                disabled={wizardLoading || !adminForm.username || !adminForm.fullName || !adminForm.password}
                onClick={handleWizardSubmit}
              >
                {wizardLoading ? 'جاري التأسيس وحفظ البنية...' : 'إتمام وتفعيل النظام'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: SUCCESS AND LAUNCH */}
        {step === 6 && (
          <div className="text-center" style={{ padding: '20px 0' }}>
            <CheckCircle2 size={70} style={{ color: 'var(--success)', marginBottom: 20 }} className="pulse-animation" />
            <h2>تهانينا! تم تفعيل نظام نبراس برو بنجاح!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 10, marginBottom: 30 }}>
              تم إنشاء قاعدة البيانات والهياكل والمراحل والصفوف الدراسية وحساب المسؤول الرئيسي لـ: <br />
              <strong>{schoolName}</strong>
            </p>

            <button className="btn-primary" style={{ padding: '12px 30px' }} onClick={() => {
              setInitialized(true);
              setIsLoggedIn(true); // Auto logs in as admin for preview
            }}>
              الدخول للوحة التحكم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
