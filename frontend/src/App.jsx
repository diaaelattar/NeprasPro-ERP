import React, { useState, useEffect } from 'react';
import { 
  Database, Shield, Layers, ArrowLeft, ArrowRight, CheckCircle2, 
  Activity, Settings, Lock, FileText, UserPlus, HelpCircle,
  GraduationCap, Users, UserCheck, Calendar, DollarSign, BookOpen, FileSpreadsheet,
  ShieldAlert, ShieldCheck, Sliders, RefreshCw, Award, Menu, PanelLeftClose, PanelLeftOpen, LogOut
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
import FinancePage           from './pages/finance/FinancePage';
import LicenseActivationModal from './components/ui/LicenseActivationModal';
import LockedModuleView       from './components/ui/LockedModuleView';
import WorkspaceSwitchboard from './components/workspace/WorkspaceSwitchboard';
import HeaderScopeBar from './components/layout/HeaderScopeBar';
import LoginGateway from './components/auth/LoginGateway';
import UpdateModal from './components/ui/UpdateModal';
import { useWorkspace } from './context/WorkspaceContext';
import API_BASE_URL, { SERVER_ORIGIN } from './config/api';

import './pages/students/students.css';

function App() {
  const { activeWorkspace, openSwitchboard, setWorkspace } = useWorkspace();

  // Status check states
  const [loading, setLoading] = useState(true);
  const [dbConfigured, setDbConfigured] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState(null);

  // Sidebar Hamburger / Collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('nepras_sidebar_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('nepras_sidebar_collapsed', String(next)); } catch (_) {}
      return next;
    });
  };

  // Online Auto-Updater state
  const [updateInfo,      setUpdateInfo]      = useState(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  // Auto-check for updates 5 seconds after app loads (non-blocking, silent on error)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        let data;
        if (window.electronAPI?.checkForUpdates) {
          data = await window.electronAPI.checkForUpdates();
        } else {
          const res = await fetch(`${API_BASE_URL}/system/check-updates`);
          if (!res.ok) return;
          data = await res.json();
        }
        if (data?.success && data?.hasUpdate) {
          setUpdateInfo(data);
          setUpdateModalOpen(true);
        }
      } catch (_) {
        // Silently ignore — no internet or backend not ready
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  
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

  // Wizard Step 2 Lookups
  const [governoratesList, setGovernoratesList] = useState([]);
  const [administrationsList, setAdministrationsList] = useState([]);
  const [selectedGovId, setSelectedGovId] = useState(null);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [newAdminInput, setNewAdminInput] = useState('');
  const [startYearInput, setStartYearInput] = useState(2026);

  // Onboarding status banner
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [dismissBanner, setDismissBanner] = useState(false);

  // Master Architecture Lookups State
  const [masterLookups, setMasterLookups] = useState({
    sections: [],
    educationTypes: [],
    classifications: [],
    stages: [],
    grades: []
  });
  const [selectedClassificationId, setSelectedClassificationId] = useState(1);
  const [configuredSections, setConfiguredSections] = useState([
    {
      sectionMasterId: 1,
      educationTypeId: 1,
      stages: [
        { stageMasterId: 3, grades: [1, 2, 3, 4, 5, 6] }
      ]
    }
  ]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/setup/master-structure-lookups`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.masterLookups) {
          setMasterLookups(d.masterLookups);
          if (d.masterLookups.classifications?.length > 0) {
            setSelectedClassificationId(d.masterLookups.classifications[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/setup/governorates`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.governorates && d.governorates.length > 0) {
          setGovernoratesList(d.governorates);
          const currentGovName = schoolForm.governorate || 'القاهرة';
          const match = d.governorates.find(g => g.name_ar === currentGovName) || d.governorates[0];
          if (match) setSelectedGovId(match.id);
        }
      })
      .catch(() => {});
  }, [step]);

  useEffect(() => {
    if (!schoolForm.governorate) return;
    const url = selectedGovId 
      ? `${API_BASE_URL}/setup/administrations?governorateId=${selectedGovId}`
      : `${API_BASE_URL}/setup/administrations?governorateName=${encodeURIComponent(schoolForm.governorate)}`;
    
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.administrations) {
          setAdministrationsList(d.administrations);
          if (d.administrations.length > 0 && !schoolForm.directorate) {
            setSchoolForm(prev => ({ ...prev, directorate: d.administrations[0].name_ar }));
          }
        }
      })
      .catch(() => {});
  }, [selectedGovId, schoolForm.governorate]);

  const handleAddCustomAdmin = async () => {
    if (!newAdminInput.trim() || !selectedGovId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/setup/administrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ governorateId: selectedGovId, name_ar: newAdminInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setAdministrationsList(prev => [...prev, { id: data.id, governorate_id: selectedGovId, name_ar: data.name_ar, is_custom: 1 }]);
        setSchoolForm(prev => ({ ...prev, directorate: data.name_ar }));
        setIsAddingAdmin(false);
        setNewAdminInput('');
      }
    } catch (_) {}
  };

  const [sectionArab, setSectionArab] = useState(true);
  const [arabStages, setArabStages] = useState({ nursery: false, kg: true, primary: true, prep: true, secondary: true });
  
  const [sectionLang, setSectionLang] = useState(false);
  const [langStages, setLangStages] = useState({ nursery: false, kg: true, primary: true, prep: true, secondary: true });

  const [secondLanguage, setSecondLanguage] = useState('فرنسي');

  const [adminForm, setAdminForm] = useState({
    username: 'admin',
    nationalId: 'admin',
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
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(null);

  // Recovery modal state
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverForm, setRecoverForm] = useState({ schoolCode: '', nationalId: '', newPassword: '', confirmPassword: '', recoveryKey: '' });
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState('');

  const fetchAppLicense = () => {
    fetch(`${API_BASE_URL}/license/status`)
      .then(r => r.json())
      .then(d => { if (d.success) setLicenseInfo(d.license); })
      .catch(() => {});
  };

  const refreshSchoolSections = () => {
    fetch(`${API_BASE_URL}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.sections) {
          setSchoolSections(d.sections);
        }
      })
      .catch(() => {});
  };

  useEffect(() => { fetchAppLicense(); }, []);

  useEffect(() => {
    window.addEventListener('sections-updated', refreshSchoolSections);
    return () => window.removeEventListener('sections-updated', refreshSchoolSections);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${API_BASE_URL}/setup/onboarding-status`)
        .then(r => r.json())
        .then(d => { if (d.success) setOnboardingStatus(d); })
        .catch(() => {});
      refreshSchoolSections();
    }
  }, [isLoggedIn]);

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

  const checkStatus = async (retryCount = 0) => {
    try {
      const res = await fetch(`${API_BASE_URL}/setup/status`);
      const data = await res.json();
      if (data && data.success) {
        if (data.databaseConfigured && data.initialized) {
          setDbConfigured(true);
          setInitialized(true);
          if (data.schoolName) setSchoolName(data.schoolName);
          if (data.logoUrl) setSchoolLogo(data.logoUrl);
          setLoading(false);
          return;
        }

        // If backend is still initializing database on cold boot, retry up to 4 times
        if (retryCount < 4) {
          setTimeout(() => checkStatus(retryCount + 1), 800);
          return;
        }

        setDbConfigured(data.databaseConfigured);
        setInitialized(data.initialized);
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.logoUrl) setSchoolLogo(data.logoUrl);
        
        if (!data.initialized) {
          setStep(1);
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      }
    } catch (err) {
      if (retryCount < 5) {
        setTimeout(() => checkStatus(retryCount + 1), 800);
        return;
      }
      console.error('Failed to check status:', err);
    } finally {
      if (retryCount >= 4) {
        setLoading(false);
      }
    }
  };

  const loadDashboardStats = () => {
    fetch(`${API_BASE_URL}/setup/dashboard-stats`)
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
      const res = await fetch(`${API_BASE_URL}/setup/sqlite`, {
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
      const res = await fetch(`${API_BASE_URL}/setup/database`, {
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

    if (!schoolForm.schoolName || !schoolForm.schoolName.trim() || !schoolForm.schoolCode) {
      setWizardError('يرجى إدخال اسم المدرسة والكود الوزاري.');
      setWizardLoading(false);
      return;
    }

    // Validations
    if (adminForm.password !== adminForm.confirmPassword) {
      setWizardError('كلمتا المرور غير متطابقتين.');
      setWizardLoading(false);
      return;
    }
    if (adminForm.nationalId && adminForm.nationalId !== 'admin' && (adminForm.nationalId.length !== 14 || isNaN(adminForm.nationalId))) {
      setWizardError('الرقم القومي يجب أن يتكون من 14 رقماً.');
      setWizardLoading(false);
      return;
    }

    // Build sections structure
    const sectionsPayload = [];
    const payload = {
      schoolCode: schoolForm.schoolCode,
      schoolName: schoolForm.schoolName,
      governorate: schoolForm.governorate,
      directorate: schoolForm.directorate,
      governorateId: selectedGovId,
      administrationId: administrationsList.find(a => a.name_ar === schoolForm.directorate)?.id || null,
      classificationId: selectedClassificationId,
      address: schoolForm.address,
      phone: schoolForm.phone,
      email: schoolForm.email,
      startYear: startYearInput,
      sections: [],
      adminUsername: adminForm.username,
      adminNationalId: adminForm.nationalId,
      adminFullName: adminForm.fullName,
      adminPassword: adminForm.password,
      secondLanguage
    };

    try {
      const res = await fetch(`${API_BASE_URL}/setup/wizard`, {
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
    if (e && e.preventDefault) e.preventDefault();
    handleGatewayLogin({ username: loginForm.username, password: loginForm.password, domain: 'admin' });
  };

  const handleGatewayLogin = async (payload) => {
    const { 
      username, 
      password, 
      domain = 'students', 
      sectionId = 'all', 
      stageId = 'all', 
      gradeId = 'all', 
      sectionName = 'كافة الأقسام', 
      stageName = 'كافة المراحل', 
      gradeName = 'كافة الصفوف',
      targetAdminTab = null
    } = typeof payload === 'string' 
      ? { username: payload, password: arguments[1], domain: 'admin' }
      : payload;

    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/setup/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      } else {
        const user = data.user;
        setCurrentUser(user);
        setIsLoggedIn(true);

        const userRoles = user.roles || [];
        const isSuperAdminUser = userRoles.includes('super_admin') || user.username === 'admin';
        const isHRUser         = !isSuperAdminUser && userRoles.includes('hr_officer');
        const isDataEntryUser  = !isSuperAdminUser && userRoles.includes('data_entry');
        const isControlUser    = !isSuperAdminUser && userRoles.includes('head_control');
        const isAccountantUser = !isSuperAdminUser && userRoles.includes('accountant');

        // Resolve authorized domain strictly based on user roles
        let finalDomain = domain;
        if (!isSuperAdminUser) {
          if (isAccountantUser) {
            finalDomain = 'finance';
          } else if (isHRUser) {
            finalDomain = 'staff';
          } else if (isControlUser) {
            finalDomain = 'control';
          } else if (isDataEntryUser) {
            finalDomain = 'students';
          } else {
            // Check permissions
            const userPerms = user.permissions || [];
            if (userPerms.some(p => p.startsWith('finance.'))) finalDomain = 'finance';
            else if (userPerms.some(p => p.startsWith('staff.'))) finalDomain = 'staff';
            else if (userPerms.some(p => p.startsWith('control.'))) finalDomain = 'control';
            else if (userPerms.some(p => p.startsWith('students.'))) finalDomain = 'students';
            else finalDomain = 'students';
          }
        }

        // Update active workspace in WorkspaceContext
        let scopeLevel = 'institution';
        if (gradeId && gradeId !== 'all') scopeLevel = 'grade';
        else if (stageId && stageId !== 'all') scopeLevel = 'stage';
        else if (sectionId && sectionId !== 'all') scopeLevel = 'section';

        setWorkspace({
          domain: finalDomain || 'students',
          sectionId: sectionId || 'all',
          stageId: stageId || 'all',
          gradeId: gradeId || 'all',
          sectionName: sectionName || 'كافة الأقسام',
          stageName: stageName || 'كافة المراحل',
          gradeName: gradeName || 'كافة الصفوف',
          scopeLevel
        });

        if (sectionId) setActiveSectionId(sectionId);

        if (isSuperAdminUser) {
          if (targetAdminTab === 'settings') setCurrentPage('settings');
          else if (targetAdminTab === 'users') setCurrentPage('users');
          else if (targetAdminTab === 'backups') setCurrentPage('backups');
          else if (finalDomain === 'students') setCurrentPage('students-list');
          else if (finalDomain === 'staff') setCurrentPage('staff-list');
          else if (finalDomain === 'control') setCurrentPage('control');
          else if (finalDomain === 'finance') setCurrentPage('finance-fees');
          else setCurrentPage('dashboard');
        } else if (isHRUser) {
          setCurrentPage('staff-list');
        } else if (isDataEntryUser) {
          setCurrentPage('students-list');
        } else if (isControlUser) {
          setCurrentPage('control');
        } else if (isAccountantUser) {
          setCurrentPage('finance-fees');
        } else {
          setCurrentPage(finalDomain === 'staff' ? 'staff-list' : finalDomain === 'control' ? 'control' : finalDomain === 'finance' ? 'finance-fees' : 'students-list');
        }
        
        // Fetch all available sections from the API
        fetch(`${API_BASE_URL}/students/form-options`)
          .then(r => r.json())
          .then(d => {
            if (d.success && d.sections) {
              setSchoolSections(d.sections);
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

  const handleRecoverPassword = async (e) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverSuccess('');

    if (recoverForm.newPassword !== recoverForm.confirmPassword) {
      setRecoverError('كلمة السر الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setRecoverLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/setup/recover-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: recoverForm.schoolCode,
          nationalId: recoverForm.nationalId,
          newPassword: recoverForm.newPassword,
          recoveryKey: recoverForm.recoveryKey
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRecoverError(data.error || 'فشلت استعادة الحساب. تحقق من البيانات.');
      } else {
        setRecoverSuccess(data.message || 'تم تحديث كلمة السر بنجاح!');
        setTimeout(() => {
          setIsRecoverModalOpen(false);
          setLoginForm({ username: 'admin', password: recoverForm.newPassword });
          setRecoverSuccess('');
        }, 1500);
      }
    } catch {
      setRecoverError('تعذّر الاتصال بالخادم.');
    } finally {
      setRecoverLoading(false);
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
    const isHR         = !isSuperAdmin && userRoles.includes('hr_officer');
    const isDataEntry  = !isSuperAdmin && userRoles.includes('data_entry');
    const isAccountant = !isSuperAdmin && userRoles.includes('accountant');
    const isControl    = !isSuperAdmin && userRoles.includes('head_control');
    const isViewer     = !isSuperAdmin && userRoles.includes('viewer');

    const getAuthorizedDefaultPage = () => {
      if (isSuperAdmin) return 'students-list';
      if (isAccountant) return 'finance-fees';
      if (isHR) return 'staff-list';
      if (isControl) return 'control';
      if (isDataEntry) return 'students-list';
      const perms = currentUser?.permissions || [];
      if (perms.some(p => p.startsWith('finance.'))) return 'finance-fees';
      if (perms.some(p => p.startsWith('staff.'))) return 'staff-list';
      if (perms.some(p => p.startsWith('control.'))) return 'control';
      return 'students-list';
    };

    const isCurrentPageAuthorized = () => {
      if (isSuperAdmin) return true;
      const domain = activeWorkspace?.domain;
      if (domain === 'finance') {
        return currentPage.startsWith('finance');
      }
      if (domain === 'staff') {
        return currentPage.startsWith('staff');
      }
      if (domain === 'control') {
        return currentPage === 'control';
      }
      if (domain === 'students') {
        return currentPage.startsWith('students') || currentPage === 'student-absence' || currentPage === 'emis-sync';
      }
      return true;
    };

    return (
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: sidebarCollapsed ? 'pointer' : 'default', overflow: 'hidden' }} onClick={sidebarCollapsed ? toggleSidebar : undefined}>
              {schoolLogo ? (
                <img 
                  src={schoolLogo} 
                  alt="Logo" 
                  style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span style={{ fontSize: 20, flexShrink: 0 }}>🏛️</span>
              )}
              {!sidebarCollapsed && <span style={{ whiteSpace: 'nowrap' }}>نبراس برو ERP</span>}
            </div>
            <button
              className="sidebar-toggle-btn"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          {!sidebarCollapsed && <p className="school-tagline">{schoolName}</p>}

          <nav className="sidebar-nav">
            {/* 1. STUDENTS DOMAIN WORKSPACE */}
            {activeWorkspace?.domain === 'students' && (
              <>
                <div
                  className={`nav-item ${isStudentsModule ? 'active' : ''}`}
                  onClick={goToStudentsList}
                  title={sidebarCollapsed ? 'شئون الطلاب والقبول' : ''}
                >
                  <GraduationCap size={18} /> {!sidebarCollapsed && <span>شئون الطلاب والقبول</span>}
                </div>
                {!sidebarCollapsed && (
                  <div className="nav-submenu">
                    <div className={`nav-subitem ${currentPage === 'students-list' ? 'active' : ''}`}
                         onClick={goToStudentsList}>
                      <span>•</span> <span>قائمة الطلاب والقيد</span>
                    </div>
                    <div className={`nav-subitem ${currentPage === 'students-quick-edit' ? 'active' : ''}`}
                         onClick={goToQuickEdit}>
                      <span>•</span> <span>تعديل سريع</span>
                    </div>
                    <div className={`nav-subitem ${currentPage === 'students-distribute' ? 'active' : ''}`}
                         onClick={goToDistribute}>
                      <span>•</span> <span>توزيع الفصول</span>
                    </div>
                    <div className={`nav-subitem ${currentPage === 'students-transfers' ? 'active' : ''}`}
                         onClick={goToTransfers}>
                      <span>•</span> <span>التحويلات المدرسية</span>
                    </div>
                    <div className={`nav-subitem ${currentPage === 'student-absence' ? 'active' : ''}`}
                         onClick={() => setCurrentPage('student-absence')}>
                      <span>•</span> <span>إنذارات الغياب والقيد</span>
                    </div>
                    <div className={`nav-subitem ${currentPage === 'students-reports' ? 'active' : ''}`}
                         onClick={() => setCurrentPage('students-reports')}>
                      <span>•</span> <span>التقارير وسجلات القيد</span>
                    </div>
                    <div className={`nav-subitem ${currentPage === 'emis-sync' ? 'active' : ''}`}
                         onClick={goToEMISSync}>
                      <span>•</span> <span>🔗 مزامنة EMIS</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. STAFF / HR DOMAIN WORKSPACE */}
            {activeWorkspace?.domain === 'staff' && (
              <div className={`nav-item active`} style={{ opacity: 0.85 }} title={sidebarCollapsed ? 'شئون العاملين' : ''}>
                <Users size={18} /> {!sidebarCollapsed && <span>شئون العاملين 🔒</span>}
              </div>
            )}

            {/* 3. FINANCE DOMAIN WORKSPACE */}
            {activeWorkspace?.domain === 'finance' && (
              <div className={`nav-item active`} style={{ opacity: 0.85 }} title={sidebarCollapsed ? 'الحسابات والخزينة' : ''}>
                <DollarSign size={18} /> {!sidebarCollapsed && <span>الحسابات والخزينة 🔒</span>}
              </div>
            )}

            {/* 4. CONTROL DOMAIN WORKSPACE */}
            {activeWorkspace?.domain === 'control' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                {/* Header Badge */}
                <div
                  title={sidebarCollapsed ? 'كنترول المرحلة الابتدائية' : ''}
                  style={{
                    padding: sidebarCollapsed ? '8px 0' : '8px 12px',
                    background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', color: '#818cf8', fontWeight: 900,
                    fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    gap: '8px', marginBottom: '4px'
                  }}
                >
                  <ShieldCheck size={18} color="#818cf8" />
                  {!sidebarCollapsed && <span>كنترول المرحلة الابتدائية</span>}
                </div>

                {/* 1. Setup Tab */}
                <div
                  className={`nav-item ${controlActiveTab === 'setup' ? 'active' : ''}`}
                  onClick={() => { setCurrentPage('control'); setControlActiveTab('setup'); setControlSubTabSetup('subjects'); }}
                  title={sidebarCollapsed ? '1️⃣ تجهيز الكنترول والضوابط' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <Sliders size={16} /> {!sidebarCollapsed && <span>1️⃣ تجهيز الكنترول والضوابط</span>}
                </div>
                {!sidebarCollapsed && controlActiveTab === 'setup' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '22px', marginBottom: '6px' }}>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabSetup('subjects'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabSetup === 'subjects' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabSetup === 'subjects' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      📚 المواد وضوابط القرار 151
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabSetup('seats'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabSetup === 'seats' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabSetup === 'seats' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🎫 أرقام الجلوس
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabSetup('committees'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabSetup === 'committees' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabSetup === 'committees' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🏛️ توزيع اللجان والمقار
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabSetup('prints'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabSetup === 'prints' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabSetup === 'prints' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🖨️ مطبوعات التجهيز واللجان
                    </div>
                  </div>
                )}

                {/* 2. Term 1 Tab */}
                <div
                  className={`nav-item ${controlActiveTab === 'term1' ? 'active' : ''}`}
                  onClick={() => { setCurrentPage('control'); setControlActiveTab('term1'); setControlSubTabTerm1('work'); }}
                  title={sidebarCollapsed ? '2️⃣ الفصل الدراسي الأول' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <BookOpen size={16} /> {!sidebarCollapsed && <span>2️⃣ الفصل الدراسي الأول</span>}
                </div>
                {!sidebarCollapsed && controlActiveTab === 'term1' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '22px', marginBottom: '6px' }}>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm1('work'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm1 === 'work' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm1 === 'work' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      📊 رصد أعمال السنة (40)
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm1('exam'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm1 === 'exam' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm1 === 'exam' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      ✍️ رصد الامتحان التحريري (60)
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm1('secret'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm1 === 'secret' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm1 === 'secret' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🔒 الأرقام السرية المشفرة
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm1('search'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm1 === 'search' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm1 === 'search' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🔍 كشف وبحث الطلاب
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm1('prints'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm1 === 'prints' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm1 === 'prints' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🖨️ مطبوعات الفصل الأول
                    </div>
                  </div>
                )}

                {/* 3. Term 2 Tab */}
                <div
                  className={`nav-item ${controlActiveTab === 'term2' ? 'active' : ''}`}
                  onClick={() => { setCurrentPage('control'); setControlActiveTab('term2'); setControlSubTabTerm2('work'); }}
                  title={sidebarCollapsed ? '3️⃣ الفصل الدراسي الثاني' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <BookOpen size={16} /> {!sidebarCollapsed && <span>3️⃣ الفصل الدراسي الثاني</span>}
                </div>
                {!sidebarCollapsed && controlActiveTab === 'term2' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '22px', marginBottom: '6px' }}>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm2('work'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm2 === 'work' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm2 === 'work' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      📊 رصد أعمال السنة (40)
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm2('exam'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm2 === 'exam' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm2 === 'exam' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      ✍️ رصد الامتحان التحريري (60)
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm2('secret'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm2 === 'secret' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm2 === 'secret' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🔒 الأرقام السرية المشفرة
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm2('search'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm2 === 'search' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm2 === 'search' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🔍 كشف وبحث الطلاب
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabTerm2('prints'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabTerm2 === 'prints' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabTerm2 === 'prints' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🖨️ مطبوعات الفصل الثاني والشهادات
                    </div>
                  </div>
                )}

                {/* 4. Second Round Tab */}
                <div
                  className={`nav-item ${controlActiveTab === 'secondRound' ? 'active' : ''}`}
                  onClick={() => { setCurrentPage('control'); setControlActiveTab('secondRound'); setControlSubTabSecondRound('seats'); }}
                  title={sidebarCollapsed ? '4️⃣ الدور الثاني والتخلفات' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <RefreshCw size={16} /> {!sidebarCollapsed && <span>4️⃣ الدور الثاني والتخلفات</span>}
                </div>
                {!sidebarCollapsed && controlActiveTab === 'secondRound' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '22px', marginBottom: '6px' }}>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabSecondRound('seats'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabSecondRound === 'seats' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabSecondRound === 'seats' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🎫 أرقام جلوس ولجان الدور الثاني
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabSecondRound('exam'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabSecondRound === 'exam' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabSecondRound === 'exam' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      ✍️ رصد درجات الدور الثاني
                    </div>
                    <div
                      onClick={() => { setCurrentPage('control'); setControlSubTabSecondRound('prints'); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        background: controlSubTabSecondRound === 'prints' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: controlSubTabSecondRound === 'prints' ? '#67e8f9' : '#cbd5e1'
                      }}
                    >
                      🖨️ مطبوعات الدور الثاني
                    </div>
                  </div>
                )}

                {/* 5. Close & Annual Results Tab */}
                <div
                  className={`nav-item ${controlActiveTab === 'close' ? 'active' : ''}`}
                  onClick={() => { setCurrentPage('control'); setControlActiveTab('close'); }}
                  title={sidebarCollapsed ? '5️⃣ النتيجة السنوية والاعتماد' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <Award size={16} /> {!sidebarCollapsed && <span>5️⃣ النتيجة السنوية والاعتماد</span>}
                </div>
              </div>
            )}

            {/* 5. ADMIN GENERAL DOMAIN WORKSPACE */}
            {activeWorkspace?.domain === 'admin' && (
              <>
                <div className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                     onClick={goToDashboard}
                     title={sidebarCollapsed ? 'لوحة القيادة والمتابعة' : ''}>
                  <Layers size={18} /> {!sidebarCollapsed && <span>لوحة القيادة والمتابعة</span>}
                </div>
                <div className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                     onClick={() => { setCurrentPage('settings'); setSelectedStudentId(null); }}
                     title={sidebarCollapsed ? 'إعدادات المؤسسة والهياكل' : ''}>
                  <Settings size={18} /> {!sidebarCollapsed && <span>إعدادات المؤسسة والهياكل</span>}
                </div>
                <div className={`nav-item ${currentPage === 'users' ? 'active' : ''}`}
                     onClick={() => { setCurrentPage('users'); setSelectedStudentId(null); }}
                     title={sidebarCollapsed ? 'المستخدمون والصلاحيات' : ''}>
                  <Lock size={18} /> {!sidebarCollapsed && <span>المستخدمون والصلاحيات</span>}
                </div>
                <div className={`nav-item ${currentPage === 'backups' ? 'active' : ''}`}
                     onClick={() => { setCurrentPage('backups'); setSelectedStudentId(null); }}
                     title={sidebarCollapsed ? 'النسخ الاحتياطي' : ''}>
                  <Database size={18} /> {!sidebarCollapsed && <span>النسخ الاحتياطي</span>}
                </div>
              </>
            )}
          </nav>


          {/* ── Section Switcher / Scope Badge (Super Admin Only) ── */}
          {isSuperAdmin && (
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
          )}

          <div className="sidebar-footer">
            <div className="user-info-mini" title={sidebarCollapsed ? (currentUser?.full_name || currentUser?.username) : ''}>
              <span className="user-avatar-mini">👤</span>
              {!sidebarCollapsed && (
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
              )}
            </div>
            <button
              className="logout-btn"
              onClick={() => { setIsLoggedIn(false); setCurrentUser(null); setActiveSectionId('all'); setCurrentPage('dashboard'); }}
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
              {!sidebarCollapsed && <span className="logout-btn-text" style={{ marginRight: 6 }}>تسجيل الخروج</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-content" style={{ overflowY: 'auto' }}>

          {/* Top Scope & Utility Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            gap: 16,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <button
                onClick={toggleSidebar}
                className="sidebar-toggle-btn"
                title={sidebarCollapsed ? 'توسيع القائمة الجانبية (Ctrl+B)' : 'طي القائمة الجانبية (Ctrl+B)'}
                style={{
                  background: 'var(--bg-card, #fff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary, #1e293b)',
                  boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                  flexShrink: 0
                }}
              >
                <Menu size={20} color="#0284c7" />
              </button>

              <HeaderScopeBar 
                onNavigate={(page) => { 
                  setCurrentPage(page); 
                  setSelectedStudentId(null); 
                }} 
                isSuperAdmin={isSuperAdmin}
                updateInfo={updateInfo}
                onOpenUpdateModal={() => setUpdateModalOpen(true)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setIsLicenseModalOpen(true)}
                style={{
                  background: licenseInfo?.isActivated ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                  border: `1px solid ${licenseInfo?.isActivated ? '#10b981' : '#f59e0b'}`,
                  color: licenseInfo?.isActivated ? '#059669' : '#d97706',
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <span>{licenseInfo?.isActivated ? '🛡️ مفعّل رسمياً' : `🔑 النسخة تجريبية (متبقي ${licenseInfo?.trialDaysRemaining ?? 14} يوم)`}</span>
              </button>

              <div className="user-badge" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 30, fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                👤 {currentUser?.full_name || currentUser?.username || 'مدير النظام'}
              </div>
            </div>
          </div>

          {/* Onboarding Status Banner — Visible strictly to Super Admin only */}
          {isSuperAdmin && onboardingStatus && !onboardingStatus.complete && !dismissBanner && (
            <div style={{
              background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)',
              color: '#fff',
              padding: '14px 20px',
              borderRadius: 12,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 26 }}>🏫</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
                    تنبيه الإعدادات الأولية: اكتمل ({onboardingStatus.done} من {onboardingStatus.total}) خطوات تأسيس المؤسسة
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>جاهزية المنظومة: {onboardingStatus.score}%</span>
                    <div style={{ width: 140, height: 6, background: 'rgba(255, 255, 255, 0.3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${onboardingStatus.score}%`, height: '100%', background: '#10b981', borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setCurrentPage('settings')}
                  style={{
                    background: '#fff',
                    color: '#1e3a8a',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  ⚙️ إكمال الهيكل التعليمي في الإعدادات
                </button>
                <button
                  onClick={() => setDismissBanner(true)}
                  style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.8, cursor: 'pointer', fontSize: 18, padding: '0 6px' }}
                  title="إخلاء التنبيه مؤقتاً"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ── Dashboard Home ───────────────────── */}
          {currentPage === 'dashboard' && (

            <>
              <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>لوحة التحكم الرئيسية</h2>
                  <p style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.75)' }}>نظام تشغيل وإدارة المدرسة الذكية</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setIsLicenseModalOpen(true)}
                    style={{
                      background: licenseInfo?.isActivated ? 'rgba(5, 150, 105, 0.25)' : 'rgba(217, 119, 6, 0.25)',
                      border: `1px solid ${licenseInfo?.isActivated ? '#10b981' : '#f59e0b'}`,
                      color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <span>{licenseInfo?.isActivated ? '🛡️ مفعّل رسمياً' : `🔑 النسخة تجريبية (متبقي ${licenseInfo?.trialDaysRemaining ?? 14} يوم)`}</span>
                  </button>

                  <div className="user-badge" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 30, fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    👤 مرحباً، {currentUser?.full_name || currentUser?.username || 'مدير النظام'}
                  </div>
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
              onSeating={() => {
                setControlActiveTab('setup');
                setControlSubTabSetup('seats');
                setCurrentPage('control');
              }}
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

          {/* ── Staff Module (Locked in Trial) ─────────────── */}
          {(currentPage.startsWith('staff') || activeWorkspace?.domain === 'staff') && (
            <LockedModuleView 
              moduleTitle="شؤون العاملين والكوادر التعليمية (HR)" 
              icon="👔"
              onGoToStudents={goToStudentsList}
            />
          )}

          {/* ── Student Absence Manager ──────────────────── */}
          {currentPage === 'student-absence' && (
            <StudentAbsenceManager onBack={goToStudentsList} />
          )}

          {/* ── Control Room & Exams Module (Primary Stage Control) ─────────────── */}
          {(currentPage === 'control' || activeWorkspace?.domain === 'control') && (
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

          {/* ── Finance & Treasury Module (Locked in Trial) ────────────────── */}
          {(currentPage.startsWith('finance') || (activeWorkspace?.domain === 'finance' && !['settings', 'users', 'backups'].includes(currentPage))) && (
            <LockedModuleView 
              moduleTitle="الحسابات والخزينة المدرسية" 
              icon="💰"
              onGoToStudents={goToStudentsList}
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

          {/* ── Executive Access Denied Guard (Prevents White Blank Screen) ── */}
          {!isCurrentPageAuthorized() && (
            <div style={{
              minHeight: '65vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '24px',
                padding: '48px 36px',
                maxWidth: '560px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 8px 16px rgba(239, 68, 68, 0.2)'
                }}>
                  <ShieldAlert size={42} style={{ color: '#dc2626' }} />
                </div>

                <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary, #0f172a)', margin: '0 0 12px' }}>
                  غير مصرح بالدخول إلى هذا القسم
                </h2>

                <p style={{ fontSize: '14.5px', color: 'var(--text-secondary, #475569)', lineHeight: 1.7, margin: '0 0 24px' }}>
                  عذراً <strong>{currentUser?.full_name || currentUser?.username}</strong>، صلاحيات حسابك مخصصة لمساحة عمل محددة، ولا تملك ترخيصاً للوصول إلى هذا القسم.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setCurrentPage(getAuthorizedDefaultPage())}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 28px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>العودة إلى مساحة عملك المصرح بها</span>
                    <span>⬅</span>
                  </button>
                </div>
              </div>
            </div>
          )}


        </main>
      </div>
    );
  }

  // --- LOGIN GATEWAY SCREEN ---
  if (initialized && !isLoggedIn) {
    return (
      <>
        <LoginGateway
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          onLogin={handleGatewayLogin}
          loginLoading={loginLoading}
          loginError={loginError}
          onOpenRecover={() => { setIsRecoverModalOpen(true); setRecoverError(''); setRecoverSuccess(''); }}
        />

        {/* RECOVERY MODAL */}
        {isRecoverModalOpen && (
          <div className="modal-overlay" onClick={() => setIsRecoverModalOpen(false)}>
            <div className="modal-card glass-panel text-right" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>🔑 استعادة حساب المشرف الرئيسي</h3>
                <button className="btn-icon" onClick={() => setIsRecoverModalOpen(false)}>✕</button>
              </div>

              {recoverError && <div className="alert alert-danger">{recoverError}</div>}
              {recoverSuccess && <div className="alert alert-success">{recoverSuccess}</div>}

              <form onSubmit={handleRecoverPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 700 }}>كود المدرسة</label>
                  <input 
                    type="text" 
                    placeholder="كود المدرسة المسجل" 
                    required 
                    value={recoverForm.schoolCode} 
                    onChange={(e) => setRecoverForm({ ...recoverForm, schoolCode: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 700 }}>الرقم القومي لمسؤول النظام</label>
                  <input 
                    type="text" 
                    placeholder="الرقم القومي المسجل أثناء التأسيس" 
                    required 
                    value={recoverForm.nationalId} 
                    onChange={(e) => setRecoverForm({ ...recoverForm, nationalId: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 700 }}>مفتاح الترخيص (License Key) الخاص بالمنظومة</label>
                  <input 
                    type="text" 
                    placeholder="مفتاح الترخيص الخاص بمدرستك" 
                    required 
                    value={recoverForm.recoveryKey} 
                    onChange={(e) => setRecoverForm({ ...recoverForm, recoveryKey: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 700 }}>كلمة السر الجديدة</label>
                  <input 
                    type="password" 
                    placeholder="أدخل كلمة السر الجديدة" 
                    required 
                    value={recoverForm.newPassword} 
                    onChange={(e) => setRecoverForm({ ...recoverForm, newPassword: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 700 }}>تأكيد كلمة السر الجديدة</label>
                  <input 
                    type="password" 
                    placeholder="أعد كتابة كلمة السر جديدة" 
                    required 
                    value={recoverForm.confirmPassword} 
                    onChange={(e) => setRecoverForm({ ...recoverForm, confirmPassword: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={recoverLoading}>
                    {recoverLoading ? 'جاري الاستعادة...' : 'إعادة تعيين وحفظ'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setIsRecoverModalOpen(false)}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- SETUP WIZARD SCREENS (3-STEP STREAMLINED) ---
  return (
    <div className="app-container">
      {/* Glow ornaments */}
      <div className="glow-effect top-left"></div>
      <div className="glow-effect bottom-right"></div>

      <div className="glass-panel main-card">
        {/* Official Brand Logo */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img 
            src="/app-logo.png" 
            alt="نبراس برو ERP" 
            style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1e3a8a', margin: '0 0 4px' }}>
            منظومة نبراس برو لإدارة المدارس والكنترول
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>معالج التأسيس الأولي للمؤسسة التعليمية</p>
        </div>

        {/* 3-Step Progress Header */}
        {step <= 3 && (
          <div className="wizard-progress" style={{ maxWidth: 460, margin: '0 auto 24px' }}>
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`} title="بيانات المؤسسة">1</div>
            <div className="step-line"></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`} title="حساب المشرف العام">2</div>
            <div className="step-line"></div>
            <div className={`step-dot ${step >= 3 ? 'active' : ''}`} title="الترخيص والتفعيل">3</div>
          </div>
        )}

        {wizardError && <div className="alert alert-danger text-right">{wizardError}</div>}
        {wizardSuccess && <div className="alert alert-success text-right">{wizardSuccess}</div>}

        {/* STEP 1: GENERAL SCHOOL INFO */}
        {step === 1 && (
          <div>
            <div className="step-header text-right">
              <Settings size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 1: معلومات المؤسسة التعليمية</h2>
              <p>يرجى إدخال البيانات المعتمدة والرموز الوزارية لترويس الشهادات الرسمية والتقارير.</p>
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
                <select
                  value={schoolForm.governorate}
                  required
                  onChange={(e) => {
                    const selectedGov = e.target.value;
                    const matchedGov = governoratesList.find(g => g.name_ar === selectedGov);
                    setSelectedGovId(matchedGov ? matchedGov.id : null);
                    setSchoolForm(prev => ({ ...prev, governorate: selectedGov, directorate: '' }));
                  }}
                >
                  <option value="">اختر المحافظة...</option>
                  {(governoratesList && governoratesList.length > 0
                    ? governoratesList.map(g => g.name_ar)
                    : ['القاهرة','الجيزة','الإسكندرية','الدقهلية','البحيرة','الفيوم','الغربية','الإسماعيلية',
                       'المنوفية','المنيا','القليوبية','السويس','الشرقية','أسوان','أسيوط','بني سويف','بورسعيد',
                       'دمياط','الوادي الجديد','شمال سيناء','جنوب سيناء','كفر الشيخ','مطروح','الأقصر','قنا','سوهاج','البحر الأحمر'
                      ]
                  ).filter((v, i, a) => a.indexOf(v) === i).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>الإدارة التعليمية</span>
                  {!isAddingAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsAddingAdmin(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}
                    >
                      + إضافة إدارة غير موجودة
                    </button>
                  )}
                </label>
                {isAddingAdmin ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="اسم الإدارة الجديدة..."
                      value={newAdminInput}
                      onChange={(e) => setNewAdminInput(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn-primary" onClick={handleAddCustomAdmin} style={{ padding: '6px 12px', fontSize: 12 }}>حفظ</button>
                    <button type="button" className="btn-secondary" onClick={() => setIsAddingAdmin(false)} style={{ padding: '6px 10px', fontSize: 12 }}>إلغاء</button>
                  </div>
                ) : (
                  <select
                    value={schoolForm.directorate}
                    required
                    onChange={(e) => setSchoolForm({ ...schoolForm, directorate: e.target.value })}
                  >
                    <option value="">اختر الإدارة التعليمية...</option>
                    {administrationsList.map(a => (
                      <option key={a.id} value={a.name_ar}>{a.name_ar}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>عام بداية الدراسة</label>
                <input 
                  type="number" 
                  value={startYearInput} 
                  min="2020"
                  max="2099"
                  required
                  onChange={(e) => setStartYearInput(parseInt(e.target.value) || 2026)}
                />
                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  📅 العام الدراسي: {startYearInput} / {startYearInput + 1} (من 01-09-{startYearInput} إلى 31-08-{startYearInput + 1})
                </span>
              </div>

              <div className="form-group">
                <label>تصنيف التعليم (صفة المؤسسة)</label>
                <select
                  value={selectedClassificationId}
                  onChange={(e) => setSelectedClassificationId(parseInt(e.target.value))}
                  style={{ fontWeight: 800, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {masterLookups.classifications.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>رقم هاتف المدرسة (اختياري)</label>
                <input 
                  type="text" 
                  value={schoolForm.phone} 
                  placeholder="022..." 
                  onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label>عنوان المدرسة (اختياري)</label>
                <input 
                  type="text" 
                  value={schoolForm.address} 
                  placeholder="الشارع، الحي، المحافظة" 
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })} 
                />
              </div>
            </div>

            <div className="wizard-actions">
              <div />
              <button 
                className="btn-primary" 
                disabled={!schoolForm.schoolCode || !schoolForm.schoolName}
                onClick={() => setStep(2)}
              >
                <span>الانتقال لحساب المشرف العام</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CREATING ADMINISTRATOR ACCOUNT */}
        {step === 2 && (
          <div>
            <div className="step-header text-right">
              <UserPlus size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 2: حساب المشرف العام (Super Admin)</h2>
              <p>تأسيس الحساب الرئيسي للمدير العام الذي يمتلك الصلاحية الكاملة لتوزيع المهام وإدارة المنظومة.</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>اسم المستخدم للدخول</label>
                <input 
                  type="text" 
                  value={adminForm.username} 
                  required
                  placeholder="مثال: admin"
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>الاسم الكامل للمشرف باللغة العربية</label>
                <input 
                  type="text" 
                  value={adminForm.fullName} 
                  required
                  placeholder="محمد أحمد علي"
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>الرقم القومي للمشرف (الافتراضي: admin أو 14 رقماً)</label>
                <input 
                  type="text" 
                  value={adminForm.nationalId} 
                  required
                  placeholder="admin"
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
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>رجوع</span>
              </button>
              <button 
                className="btn-primary" 
                disabled={!adminForm.username || !adminForm.fullName || !adminForm.password}
                onClick={() => setStep(3)}
              >
                <span>الانتقال للترخيص والاعتماد</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LICENSE & ACTIVATION */}
        {step === 3 && (
          <div>
            <div className="step-header text-right">
              <ShieldCheck size={32} style={{ color: 'var(--primary)', marginBottom: 10 }} />
              <h2>الخطوة 3: مراجعة البيانات والاعتماد وتفعيل المنظومة</h2>
              <p>مراجعة الملخص النهائي واعتماد تفعيل المنظومة للبدء الفوري.</p>
            </div>

            {/* Summary Box */}
            <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#1e3a8a', margin: '0 0 12px' }}>📋 ملخص بيانات التأسيس المعتمدة:</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px', fontSize: 13.5 }}>
                <div><strong>المدرسة:</strong> {schoolForm.schoolName}</div>
                <div><strong>الكود الوزاري:</strong> {schoolForm.schoolCode}</div>
                <div><strong>المحافظة والإدارة:</strong> {schoolForm.governorate} - {schoolForm.directorate || 'غير محدد'}</div>
                <div><strong>العام الدراسي:</strong> {startYearInput} / {startYearInput + 1}</div>
                <div><strong>المشرف العام:</strong> {adminForm.fullName} ({adminForm.username})</div>
                <div><strong>قاعدة البيانات:</strong> SQLite مدمجة مشفرة وآمنة</div>
              </div>
            </div>

            <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', padding: '14px 18px', borderRadius: 8, marginBottom: 24, fontSize: 13, color: '#1e40af', lineHeight: 1.7 }}>
              💡 <strong>ملاحظة هامة:</strong> المراحل والصفوف الدراسية واللغات والفصول يتم إدارتها وتخصيصها وتعديلها بالكامل من <strong>داخل لوحة الإعدادات</strong> بعد تسجيل الدخول.
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} />
                <span>رجوع</span>
              </button>
              <button 
                className="btn-primary" 
                disabled={wizardLoading}
                onClick={handleWizardSubmit}
                style={{ fontSize: 15, padding: '12px 28px', background: '#16a34a' }}
              >
                {wizardLoading ? 'جاري التأسيس والاعتماد...' : '⚡ اعتماد وتفعيل المنظومة وبدء التشغيل'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6 / SUCCESS AND LAUNCH */}
        {step === 6 && (
          <div className="text-center" style={{ padding: '20px 0' }}>
            <CheckCircle2 size={70} style={{ color: 'var(--success)', marginBottom: 20 }} className="pulse-animation" />
            <h2>تهانينا! تم تفعيل نظام نبراس برو بنجاح!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 10, marginBottom: 30 }}>
              تم تأسيس قاعدة البيانات وحفظ الهوية المعتمدة وإنشاء حساب المشرف العام لـ: <br />
              <strong style={{ fontSize: 16, color: '#1e3a8a' }}>{schoolName}</strong>
            </p>

            <button className="btn-primary" style={{ padding: '12px 30px', fontSize: 15 }} onClick={() => {
              setDbConfigured(true);
              setInitialized(true);
              setIsLoggedIn(false);
              setLoading(false);
              setStep(1);
            }}>
              الانتقال لبوابة الدخول الموحدة
            </button>
          </div>
        )}
        <LicenseActivationModal
          isOpen={isLicenseModalOpen}
          onClose={() => setIsLicenseModalOpen(false)}
          onLicenseUpdated={fetchAppLicense}
        />
        <UpdateModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          updateInfo={updateInfo}
        />
      </div>
    </div>
  );
}

export default App;
