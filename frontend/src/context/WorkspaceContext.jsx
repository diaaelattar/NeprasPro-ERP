import React, { createContext, useContext, useState, useEffect } from 'react';

const WorkspaceContext = createContext(null);

const STORAGE_KEY = 'nepraspro_active_workspace_v1';

export const DOMAIN_METADATA = {
  students: {
    key: 'students',
    title: 'شؤون الطلاب وقيد الدارسين',
    icon: '🎓',
    iconImg: '/assets/icons/domains/students.png',
    color: '#1a3c6e',
    accent: '#3b82f6',
    desc: 'سجلات وقوائم الطلاب، تسكين الفصول، شهادات القيد، والتحويلات',
    defaultScope: 'stage',
    supportedScopes: ['stage', 'section', 'institution']
  },
  staff: {
    key: 'staff',
    title: 'شؤون العاملين والكوادر التعليمية',
    icon: '👔',
    iconImg: '/assets/icons/domains/staff.png',
    color: '#065f46',
    accent: '#10b981',
    desc: 'سجلات المعلمين والإداريين، النصاب الأسبوعي، جدول الإشراف، والإفادات الإدارية',
    defaultScope: 'institution',
    supportedScopes: ['institution', 'section', 'stage'],
    isLocked: true
  },
  control: {
    key: 'control',
    title: 'الكنترول العام والامتحانات',
    icon: '📋',
    iconImg: '/assets/icons/domains/control.png',
    color: '#831843',
    accent: '#ec4899',
    desc: 'أرقام الجلوس، توزيع اللجان، الأرقام السرية، رصد الدرجات، والشيتات والشهادات',
    defaultScope: 'stage',
    supportedScopes: ['stage', 'section']
  },
  finance: {
    key: 'finance',
    title: 'الحسابات والخزينة المدرسية',
    icon: '💰',
    iconImg: '/assets/icons/domains/finance.png',
    color: '#78350f',
    accent: '#f59e0b',
    desc: 'تحصيل المصروفات، أقساط الباص والأنشطة، أذونات الصرف، وسندات القبض',
    defaultScope: 'section',
    supportedScopes: ['institution', 'section', 'stage'],
    isLocked: true
  },
  dashboard: {
    key: 'dashboard',
    title: 'لوحة القيادة العامة للمؤسسة',
    icon: '📊',
    iconImg: '/assets/icons/domains/dashboard.png',
    color: '#1e293b',
    accent: '#64748b',
    desc: 'نظرة شمولية تنفيذية لكافة مؤشرات الأداء والأقسام والمراحل والقطاعات',
    defaultScope: 'institution',
    supportedScopes: ['institution']
  },
  admin: {
    key: 'admin',
    title: 'الإدارة العامة والتحكم',
    icon: '👑',
    iconImg: '/assets/icons/domains/admin.png',
    color: '#0f172a',
    accent: '#6366f1',
    desc: 'الرؤية الشاملة للمؤسسة، إعدادات المراحل والفصول، إدارة الصلاحيات، والنسخ الاحتياطي',
    defaultScope: 'institution',
    supportedScopes: ['institution']
  }
};

const DEFAULT_WORKSPACE = {
  domain: 'dashboard',
  sectionId: 'all',
  stageId: 'all',
  gradeId: 'all',
  sectionName: 'كافة الأقسام',
  stageName: 'كافة المراحل',
  gradeName: 'كافة الصفوف',
  scopeLevel: 'institution',
  lastUpdated: new Date().toISOString()
};

export const WorkspaceProvider = ({ children }) => {
  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_WORKSPACE, ...parsed };
      }
    } catch (_) {}
    return DEFAULT_WORKSPACE;
  });

  const [isSwitchboardOpen, setIsSwitchboardOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeWorkspace));
    } catch (_) {}
  }, [activeWorkspace]);

  const setWorkspace = (newWorkspace) => {
    setActiveWorkspace(prev => {
      const merged = {
        ...prev,
        ...newWorkspace,
        lastUpdated: new Date().toISOString()
      };
      return merged;
    });
  };

  const openSwitchboard = () => setIsSwitchboardOpen(true);
  const closeSwitchboard = () => setIsSwitchboardOpen(false);

  const clearWorkspace = () => {
    setActiveWorkspace(DEFAULT_WORKSPACE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  };

  return (
    <WorkspaceContext.Provider value={{
      activeWorkspace,
      setWorkspace,
      openSwitchboard,
      closeSwitchboard,
      isSwitchboardOpen,
      clearWorkspace,
      domainMeta: DOMAIN_METADATA[activeWorkspace.domain] || DOMAIN_METADATA.dashboard,
      allDomainsMeta: DOMAIN_METADATA
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;
