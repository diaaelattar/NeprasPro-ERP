import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace, DOMAIN_METADATA } from '../../context/WorkspaceContext';
import { 
  Sparkles, Layers, RefreshCw, ChevronLeft, ChevronDown, 
  Calendar, Settings, Users, Database, GraduationCap, DollarSign, FileSpreadsheet, Shield
} from 'lucide-react';
import API_BASE_URL from '../../config/api';
import './HeaderScopeBar.css';

const HeaderScopeBar = ({ onNavigate, isSuperAdmin = false, updateInfo = null, onOpenUpdateModal = () => {} }) => {
  const { activeWorkspace, setWorkspace, openSwitchboard } = useWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const dropdownRef = useRef(null);

  const meta = DOMAIN_METADATA[activeWorkspace?.domain] || DOMAIN_METADATA.dashboard;

  // Load current academic year
  useEffect(() => {
    fetch(`${API_BASE_URL}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.academicYears && d.academicYears.length > 0) {
          const curr = d.academicYears.find(y => y.is_current) || d.academicYears[0];
          if (curr && curr.year_label) setAcademicYear(curr.year_label);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSwitch = (targetDomain, targetPage = null) => {
    setDropdownOpen(false);
    
    // Update workspace domain
    setWorkspace(prev => ({
      ...prev,
      domain: targetDomain
    }));

    if (onNavigate) {
      if (targetPage) {
        onNavigate(targetPage);
      } else {
        if (targetDomain === 'students') onNavigate('students-list');
        else if (targetDomain === 'staff') onNavigate('staff-list');
        else if (targetDomain === 'control') onNavigate('control');
        else if (targetDomain === 'finance') onNavigate('dashboard');
        else onNavigate('dashboard');
      }
    }
  };

  return (
    <div className="header-scope-bar">
      
      {/* 1. Active Domain Badge */}
      <div 
        className="scope-pill domain"
        style={{
          '--pill-accent': meta.accent,
          '--pill-color': meta.color
        }}
      >
        <span className="scope-pill-icon">
          {meta.iconImg ? (
            <img src={meta.iconImg} alt={meta.title} style={{ width: 18, height: 18, objectFit: 'contain', verticalAlign: 'middle' }} />
          ) : (
            meta.icon
          )}
        </span>
        <span className="scope-pill-text">{meta.title}</span>
      </div>

      <ChevronLeft size={13} className="scope-sep" />

      {/* 2. Section & Stage Scope Pill */}
      <div className="scope-pill section-stage">
        <span className="scope-pill-icon">🏢</span>
        <span className="scope-pill-text">
          {activeWorkspace.sectionName || 'كافة الأقسام'}
          {activeWorkspace.stageName && activeWorkspace.stageName !== 'كافة المراحل' && (
            ` — ${activeWorkspace.stageName}`
          )}
        </span>
      </div>

      <ChevronLeft size={13} className="scope-sep" />

      {/* 3. Academic Year Badge */}
      <div className="scope-pill academic-year" title="العام الدراسي النشط">
        <Calendar size={13} className="scope-pill-icon" />
        <span className="scope-pill-text">العام الدراسي: <strong>{academicYear}</strong></span>
      </div>

      {/* 3.1 Online Update Available Badge */}
      {updateInfo && updateInfo.hasUpdate && (
        <>
          <ChevronLeft size={13} className="scope-sep" />
          <div 
            className="scope-update-badge" 
            onClick={onOpenUpdateModal}
            title={`انقر لتنزيل وتثبيت الإصدار الجديد v${updateInfo.latestVersion}`}
          >
            <span>🚀 يتوفر تحديث v{updateInfo.latestVersion}</span>
          </div>
        </>
      )}

      {/* 4. Admin Quick Switch Dropdown */}
      {isSuperAdmin && (
        <div className="scope-dropdown-wrapper" ref={dropdownRef}>
          <button 
            type="button"
            className={`scope-switch-dropdown-btn ${dropdownOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDropdownOpen(!dropdownOpen);
            }}
            title="قائمة الإجراءات والانتقال السريع بين القطاعات والإعدادات"
          >
            <Sparkles size={13} />
            <span>انتقال سريع</span>
            <ChevronDown size={13} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="scope-dropdown-menu">
              <div className="dropdown-menu-header">
                <span>⚡ الانتقال السريع لقطاعات العمل</span>
              </div>

              <div 
                className={`dropdown-menu-item ${activeWorkspace.domain === 'students' ? 'active' : ''}`}
                onClick={() => handleQuickSwitch('students', 'students-list')}
              >
                <span className="item-icon">🎓</span>
                <div className="item-info">
                  <strong>شؤون الطلاب والقبول</strong>
                  <small>سجلات القيد والفصول والإحصاء</small>
                </div>
              </div>

              <div 
                className={`dropdown-menu-item ${activeWorkspace.domain === 'staff' ? 'active' : ''}`}
                onClick={() => handleQuickSwitch('staff', 'staff-list')}
              >
                <span className="item-icon">👔</span>
                <div className="item-info">
                  <strong>شؤون العاملين (HR)</strong>
                  <small>بيانات الكوادر والنصاب والإشراف</small>
                </div>
              </div>

              <div 
                className={`dropdown-menu-item ${activeWorkspace.domain === 'control' ? 'active' : ''}`}
                onClick={() => handleQuickSwitch('control', 'control')}
              >
                <span className="item-icon">📋</span>
                <div className="item-info">
                  <strong>الكنترول والامتحانات</strong>
                  <small>رصد الدرجات والشيتات والشهادات</small>
                </div>
              </div>

              <div 
                className={`dropdown-menu-item ${activeWorkspace.domain === 'finance' ? 'active' : ''}`}
                onClick={() => handleQuickSwitch('finance', 'dashboard')}
              >
                <span className="item-icon">💰</span>
                <div className="item-info">
                  <strong>الحسابات والخزينة</strong>
                  <small>المصروفات المدرسية والأقساط</small>
                </div>
              </div>

              <div className="dropdown-menu-divider" />

              <div 
                className="dropdown-menu-item admin-item"
                onClick={() => handleQuickSwitch('admin', 'settings')}
              >
                <Settings size={15} className="item-icon" />
                <div className="item-info">
                  <strong>إعدادات المؤسسة والهياكل</strong>
                </div>
              </div>

              <div 
                className="dropdown-menu-item admin-item"
                onClick={() => handleQuickSwitch('admin', 'users')}
              >
                <Users size={15} className="item-icon" />
                <div className="item-info">
                  <strong>المستخدمون والصلاحيات</strong>
                </div>
              </div>

              <div 
                className="dropdown-menu-item admin-item"
                onClick={() => handleQuickSwitch('admin', 'backups')}
              >
                <Database size={15} className="item-icon" />
                <div className="item-info">
                  <strong>النسخ الاحتياطي</strong>
                </div>
              </div>

              <div className="dropdown-menu-divider" />

              <div 
                className="dropdown-menu-item action-item"
                onClick={() => { setDropdownOpen(false); openSwitchboard(); }}
              >
                <RefreshCw size={14} className="item-icon" />
                <div className="item-info">
                  <strong>🎛️ تخصيص قسم ومرحلة جديدة...</strong>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default HeaderScopeBar;
