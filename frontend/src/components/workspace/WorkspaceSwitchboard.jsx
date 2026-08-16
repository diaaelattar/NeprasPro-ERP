import React, { useState, useEffect } from 'react';
import { useWorkspace, DOMAIN_METADATA } from '../../context/WorkspaceContext';
import API_BASE_URL from '../../config/api';
import { 
  GraduationCap, Users, FileSpreadsheet, DollarSign, 
  Layers, ArrowRight, CheckCircle2, Sparkles, X, Shield, RefreshCw
} from 'lucide-react';
import './WorkspaceSwitchboard.css';

const WorkspaceSwitchboard = ({ onNavigate, availableSections = [] }) => {
  const { 
    activeWorkspace, 
    setWorkspace, 
    isSwitchboardOpen, 
    closeSwitchboard 
  } = useWorkspace();

  const [selectedDomain, setSelectedDomain] = useState(activeWorkspace.domain || 'students');
  const [selectedSectionId, setSelectedSectionId] = useState(activeWorkspace.sectionId || 'all');
  const [selectedStageId, setSelectedStageId] = useState(activeWorkspace.stageId || 'all');
  const [selectedGradeId, setSelectedGradeId] = useState(activeWorkspace.gradeId || 'all');

  const [sections, setSections] = useState([]);
  const [stages, setStages] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Load structure options
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
      .finally(() => setLoadingLookups(false));
  }, []);

  // Sync state when switchboard opens
  useEffect(() => {
    if (isSwitchboardOpen) {
      setSelectedDomain(activeWorkspace.domain || 'students');
      setSelectedSectionId(activeWorkspace.sectionId || 'all');
      setSelectedStageId(activeWorkspace.stageId || 'all');
      setSelectedGradeId(activeWorkspace.gradeId || 'all');
    }
  }, [isSwitchboardOpen, activeWorkspace]);

  // Filter stages based on selected section
  const availableStages = stages.filter(s => 
    selectedSectionId === 'all' || String(s.section_id) === String(selectedSectionId)
  );

  // Filter grades based on selected stage
  const availableGrades = grades.filter(g => 
    selectedStageId === 'all' || String(g.stage_id) === String(selectedStageId)
  );

  // Handle domain change and enforce domain-specific defaults
  const handleDomainSelect = (domainKey) => {
    const meta = DOMAIN_METADATA[domainKey];
    if (meta?.isLocked) {
      alert(`⚠️ وحدة (${meta.title}) مغلقة في هذه النسخة التجريبية لحين اكتمال تطويرها في الإصدار القادم.\n\nالنسخة الحالية مخصصة بالكامل لشؤون الطلاب وقيد الدارسين.`);
      return;
    }
    setSelectedDomain(domainKey);
    if (domainKey === 'staff') {
      // Staff affairs spans all sections and stages by default
      setSelectedSectionId('all');
      setSelectedStageId('all');
      setSelectedGradeId('all');
    } else if (domainKey === 'control' || domainKey === 'students') {
      // If currently 'all', pick the first available section and stage if present
      if (selectedSectionId === 'all' && sections.length > 0) {
        setSelectedSectionId(sections[0].id);
      }
    }
  };

  const handleLaunchWorkspace = () => {
    const secObj = sections.find(s => String(s.id) === String(selectedSectionId));
    const stgObj = stages.find(s => String(s.id) === String(selectedStageId));
    const grdObj = grades.find(g => String(g.id) === String(selectedGradeId));

    let scopeLevel = 'institution';
    if (selectedGradeId !== 'all') scopeLevel = 'grade';
    else if (selectedStageId !== 'all') scopeLevel = 'stage';
    else if (selectedSectionId !== 'all') scopeLevel = 'section';

    const workspaceData = {
      domain: selectedDomain,
      sectionId: selectedSectionId,
      stageId: selectedStageId,
      gradeId: selectedGradeId,
      sectionName: secObj ? secObj.name : 'كافة الأقسام',
      stageName: stgObj ? stgObj.stage_name : 'كافة المراحل',
      gradeName: grdObj ? grdObj.grade_name_ar : 'كافة الصفوف',
      scopeLevel
    };

    setWorkspace(workspaceData);
    closeSwitchboard();

    // Map domain to application page
    if (onNavigate) {
      if (selectedDomain === 'students') onNavigate('students-list');
      else if (selectedDomain === 'staff') onNavigate('staff-list');
      else if (selectedDomain === 'control') onNavigate('control');
      else if (selectedDomain === 'finance') onNavigate('dashboard');
      else if (selectedDomain === 'dashboard') onNavigate('dashboard');
    }
  };

  if (!isSwitchboardOpen) return null;

  return (
    <div className="switchboard-overlay" onClick={closeSwitchboard}>
      <div className="switchboard-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="switchboard-header">
          <div className="switchboard-title-group">
            <div className="switchboard-icon-badge">🎛️</div>
            <div>
              <h2>التبديل بين أقسام وقطاعات العمل</h2>
              <p>اختر القسم وحدد المرحلة أو الصف للعمل عليه مباشرة</p>
            </div>
          </div>
          <button className="switchboard-close-btn" onClick={closeSwitchboard}>
            <X size={20} />
          </button>
        </div>

        {/* Domain Cards Grid */}
        <div className="switchboard-section-title">
          <span>1. حدد قسم أو سجل العمل المطلوب:</span>
        </div>

        <div className="domain-cards-grid">
          {Object.entries(DOMAIN_METADATA).map(([key, meta]) => {
            const isSelected = selectedDomain === key;
            const isLocked = meta.isLocked;
            return (
              <div 
                key={key} 
                className={`domain-card ${isSelected ? 'active' : ''}`}
                onClick={() => handleDomainSelect(key)}
                style={{
                  '--domain-color': meta.color,
                  '--domain-accent': meta.accent,
                  opacity: isLocked ? 0.78 : 1,
                  cursor: isLocked ? 'not-allowed' : 'pointer'
                }}
              >
                <div className="domain-card-header">
                  <span className="domain-card-icon">
                    {meta.iconImg ? (
                      <img src={meta.iconImg} alt={meta.title} style={{ width: 44, height: 44, objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }} />
                    ) : (
                      meta.icon
                    )}
                  </span>
                  {isSelected && (
                    <span className="domain-active-badge">
                      <CheckCircle2 size={14} /> نشط
                    </span>
                  )}
                  {isLocked && (
                    <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                      🔒 قيد التطوير
                    </span>
                  )}
                </div>
                <h3 className="domain-card-title">{meta.title}</h3>
                <p className="domain-card-desc">{meta.desc}</p>
                <div className="domain-card-footer">
                  <span className="domain-scope-hint">
                    {key === 'staff' ? '🌐 يغطي كامل المؤسسة افتراضياً' :
                     key === 'control' ? '🎯 تركيز دقيق على المرحلة' :
                     key === 'finance' ? '🏢 على مستوى القسم أو المرحلة' :
                     '🎓 نطاق مرحلي / قسم'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scope Selector Row */}
        <div className="switchboard-section-title" style={{ marginTop: 24 }}>
          <span>2. تحديد النطاق والمستوى التشغيلي (Operational Scope)</span>
        </div>

        <div className="scope-selectors-box">
          {selectedDomain === 'staff' ? (
            <div className="staff-scope-notice">
              <span style={{ fontSize: 20 }}>💡</span>
              <div>
                <strong>نطاق شؤون العاملين مفتوح لكافة الأقسام والمراحل افتراضياً</strong>
                <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.85 }}>
                  نظراً لتوزيع جداول وإشراف المعلمين على أكثر من مرحلة، يمكنك أيضاً التصفية لاحقاً من داخل الشاشة عند الحاجة.
                </p>
              </div>
            </div>
          ) : (
            <div className="scope-filters-grid">
              
              {/* Section Selector */}
              <div className="scope-field-group">
                <label className="scope-field-label">🏢 القسم / المسار التعليمي</label>
                <select 
                  className="scope-select"
                  value={selectedSectionId}
                  onChange={e => {
                    setSelectedSectionId(e.target.value);
                    setSelectedStageId('all');
                    setSelectedGradeId('all');
                  }}
                >
                  <option value="all">🏫 كافة الأقسام (إشراف عام)</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
              </div>

              {/* Stage Selector */}
              <div className="scope-field-group">
                <label className="scope-field-label">🎓 المرحلة التعليمية</label>
                <select 
                  className="scope-select"
                  value={selectedStageId}
                  onChange={e => {
                    setSelectedStageId(e.target.value);
                    setSelectedGradeId('all');
                  }}
                >
                  <option value="all">
                    {selectedDomain === 'control' ? '⚠️ اختر مرحلة محددة للكنترول' : 'كل المراحل التابعة للقسم'}
                  </option>
                  {availableStages.map(stg => (
                    <option key={stg.id} value={stg.id}>{stg.stage_name}</option>
                  ))}
                </select>
              </div>

              {/* Grade Selector (Optional for finer focus) */}
              <div className="scope-field-group">
                <label className="scope-field-label">📚 الصف الدراسي (اختياري)</label>
                <select 
                  className="scope-select"
                  value={selectedGradeId}
                  onChange={e => setSelectedGradeId(e.target.value)}
                >
                  <option value="all">كافة صفوف المرحلة</option>
                  {availableGrades.map(grd => (
                    <option key={grd.id} value={grd.id}>{grd.grade_name_ar}</option>
                  ))}
                </select>
              </div>

            </div>
          )}
        </div>

        {/* Active Summary & Launch Button */}
        <div className="switchboard-footer">
          <div className="active-scope-preview">
            <span className="preview-label">ملخص بيئة العمل المستهدفة:</span>
            <div className="preview-tags">
              <span className="preview-tag domain">
                {DOMAIN_METADATA[selectedDomain]?.icon} {DOMAIN_METADATA[selectedDomain]?.title}
              </span>
              <span className="preview-tag section">
                🏢 {sections.find(s => String(s.id) === String(selectedSectionId))?.name || 'كافة الأقسام'}
              </span>
              {selectedStageId !== 'all' && (
                <span className="preview-tag stage">
                  🎓 {stages.find(s => String(s.id) === String(selectedStageId))?.stage_name}
                </span>
              )}
            </div>
          </div>

          <div className="switchboard-actions">
            <button className="btn-switchboard-cancel" onClick={closeSwitchboard}>
              إلغاء
            </button>
            <button className="btn-switchboard-launch" onClick={handleLaunchWorkspace}>
              <span>🚀 بدء العمل في هذا القطاع</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkspaceSwitchboard;
