import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, Shield, Lock, UserPlus, Key, Save, Trash2, 
  Edit3, CheckCircle2, AlertCircle, X, ShieldAlert, BookOpen, Plus,
  Calendar, Building, Printer, RotateCcw
} from 'lucide-react';
import API_BASE_URL from '../../config/api';

const API = `${API_BASE_URL}/settings`;

export default function SettingsPage({ 
  initialTab = 'institution', 
  allowedTabs = ['institution', 'sections_stages', 'classrooms', 'academic_years', 'users', 'roles', 'perms'] 
}) {
  const [activeTab,    setActiveTab]    = useState(initialTab);
  const [users,        setUsers]        = useState([]);
  const [roles,        setRoles]        = useState([]);
  const [perms,        setPerms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  // Form options for stages/grades
  const [formOpts, setFormOpts] = useState({ sections: [], stages: [], grades: [], academicYears: [] });

  const [institutionForm, setInstitutionForm] = useState({
    schoolCode: '',
    schoolName: '',
    schoolNameEn: '',
    governorate: '',
    directorate: '',
    educationType: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    stampUrl: '',
    directorName: '',
    directorQualification: '',
    directorNationalId: '',
    directorPhone: '',
    sectionsCount: '',
    stagesCount: '',
    hasMultipleSections: false,
  });

  // Academic years state
  const [academicYears, setAcademicYears] = useState([]);
  const [showYearForm, setShowYearForm] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearForm, setYearForm] = useState({
    yearLabel: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  // Classrooms tab states
  const [classrooms, setClassrooms] = useState([]);
  const [classroomFilters, setClassroomFilters] = useState({
    academicYearId: '',
    sectionId: '',
    stageId: '',
    gradeId: '',
  });

  // Bulk creation form
  const [bulkForm, setBulkForm] = useState({
    count: 1,
    capacity: 40,
    namingStyle: 'numeric',   // Default to numeric 1/1, 1/2, 1/3...
    prefix: '',              // used when namingStyle === 'custom'
  });
  const [bulkCreating, setBulkCreating] = useState(false);

  // Edit single classroom
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [editForm, setEditForm] = useState({ className: '', capacity: 40 });

  // Form state for creating/updating user
  const [showForm,     setShowForm]     = useState(false);
  const [editingUser,  setEditingUser]  = useState(null);
  const [userForm, setUserForm] = useState({
    username: '', nationalId: '', fullName: '', password: '', roleIds: []
  });

  // Sections & Stages State
  const [sections, setSections] = useState([]);
  const [singleSection, setSingleSection] = useState({
    name: 'القسم الرئيسي',
    type: 'arabic',
    educationType: '',
    legalStatus: 'حكومي',
    sectionDirectorName: '',
    sectionDirectorQualification: '',
    sectionDirectorNationalId: '',
    sectionDirectorPhone: '',
    sectionDeputyName: '',
    sectionDeputyPhone: '',
    studentsViceName: '',
    studentsVicePhone: '',
    staffViceName: '',
    staffVicePhone: '',
  });
  const [stages, setStages] = useState([]);
  const [isPrintingProfile, setIsPrintingProfile] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({ name: '', type: 'arabic', educationType: 'عام', legalStatus: 'حكومي' });
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [stageForm, setStageForm] = useState({ sectionId: '', stageName: '', stageCode: '', yearsCount: 3, displayOrder: 0 });
  const [showStageForm, setShowStageForm] = useState(false);

  const [masterLookups, setMasterLookups] = useState({
    sections: [],
    educationTypes: [],
    classifications: [],
    stages: [],
    grades: []
  });
  const [selectedClassificationId, setSelectedClassificationId] = useState('');
  const [configuredSections, setConfiguredSections] = useState([
    { sectionMasterId: 1, educationTypeId: 1, stages: [] }
  ]);

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      fetch(`${API}/users`).then(r => r.json()),
      fetch(`${API}/roles`).then(r => r.json()),
      fetch(`${API}/permissions`).then(r => r.json()),
      fetch(`${API_BASE_URL}/students/form-options`).then(r => r.json()),
      fetch(`${API}/academic-years`).then(r => r.json()),
      fetch(`${API}/institution`).then(r => r.json()),
      fetch(`${API}/sections`).then(r => r.json()),
      fetch(`${API}/stages`).then(r => r.json()),
      fetch(`${API_BASE_URL}/setup/master-structure-lookups`).then(r => r.json())
    ])
      .then(([userData, roleData, permData, optData, yearsData, instData, secData, stageData, masterData]) => {
        if (masterData.success && masterData.masterLookups) {
          setMasterLookups(masterData.masterLookups);
        }
        if (userData.success) setUsers(userData.users);
        if (roleData.success)  setRoles(roleData.roles);
        if (permData.success)  setPerms(permData.permissions);
        if (optData.success) {
          setFormOpts(optData);
          // Set default filters if not set
          const cur = optData.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
          setClassroomFilters(f => ({
            ...f,
            academicYearId: f.academicYearId || (cur ? String(cur.id) : ''),
          }));
        }
        if (yearsData.success) setAcademicYears(yearsData.academicYears);
        if (secData.success) {
          setSections(secData.sections);
          if (secData.sections.length > 0) {
            const first = secData.sections[0];
            setSingleSection({
              name: first.name || '',
              type: first.type || 'arabic',
              educationType: first.education_type || '',
              legalStatus: first.legal_status || 'حكومي',
              sectionDirectorName: first.section_director_name || '',
              sectionDirectorQualification: first.section_director_qualification || '',
              sectionDirectorNationalId: first.section_director_national_id || '',
              sectionDirectorPhone: first.section_director_phone || '',
              sectionDeputyName: first.section_deputy_name || '',
              sectionDeputyPhone: first.section_deputy_phone || '',
              studentsViceName: first.students_vice_name || '',
              studentsVicePhone: first.students_vice_phone || '',
              staffViceName: first.staff_vice_name || '',
              staffVicePhone: first.staff_vice_phone || '',
            });
          }
        }
        if (stageData.success) setStages(stageData.stages);
        if (instData.success && instData.institution) {
          const inst = instData.institution;
          setInstitutionForm({
            schoolCode: inst.school_code || '',
            schoolName: inst.school_name || '',
            schoolNameEn: inst.school_name_en || '',
            governorate: inst.governorate || '',
            directorate: inst.directorate || '',
            educationType: inst.education_type || '',
            address: inst.address || '',
            phone: inst.phone || '',
            email: inst.email || '',
            website: inst.website || '',
            logoUrl: inst.logo_url || '',
            stampUrl: inst.stamp_url || '',
            directorName: inst.director_name || '',
            directorQualification: inst.director_qualification || '',
            directorNationalId: inst.director_national_id || '',
            directorPhone: inst.director_phone || '',
            sectionsCount: inst.sections_count || '',
            stagesCount: inst.stages_count || '',
            hasMultipleSections: inst.has_multiple_sections === 1 || inst.has_multiple_sections === true,
          });
        }
      })
      .catch(() => setError('فشل الاتصال بالخادم لتحميل الإعدادات.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isPrintingProfile) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrintingProfile(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPrintingProfile]);

  // Helper to detect naming style from existing classrooms in a grade
  const detectNamingStyle = (classList) => {
    if (!classList || classList.length === 0) return { style: null, prefix: '' };
    const first = classList[0].class_name?.trim() || '';

    // 1. arabic_suffix: e.g. "1 / 1 ع" or "2 / 5 ب"
    if (/^\d+\s*\/\s*\d+\s+[\u0600-\u06FF]+$/.test(first)) {
      return { style: 'arabic_suffix', prefix: '' };
    }
    // 2. arabic: e.g. "1 / أ" or "2 / ب"
    if (/^\d+\s*\/\s*[\u0600-\u06FF]+$/.test(first)) {
      return { style: 'arabic', prefix: '' };
    }
    // 3. numeric: e.g. "1 / 1" or "2 / 3"
    if (/^\d+\s*\/\s*\d+$/.test(first)) {
      return { style: 'numeric', prefix: '' };
    }
    // 4. english_letter_grade: e.g. "A1" or "B2"
    if (/^[A-Za-z]+[\s\d]*$/.test(first)) {
      return { style: 'english_letter_grade', prefix: '' };
    }

    // Custom prefix: e.g. "أ / 1"
    const matchCustom = first.match(/^(.+?)\s*\/\s*\d+$/);
    if (matchCustom) {
      return { style: 'custom', prefix: matchCustom[1].trim() };
    }

    return { style: 'custom', prefix: '' };
  };

  const loadClassrooms = () => {
    if (!classroomFilters.gradeId || !classroomFilters.academicYearId) {
      setClassrooms([]);
      return;
    }
    fetch(`${API}/classrooms?gradeId=${classroomFilters.gradeId}&academicYearId=${classroomFilters.academicYearId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const list = data.classrooms || [];
          setClassrooms(list);
          if (list.length > 0) {
            const { style, prefix } = detectNamingStyle(list);
            if (style) {
              setBulkForm(f => ({
                ...f,
                namingStyle: style,
                prefix: prefix || f.prefix,
                count: Math.max(f.count, list.length + 1)
              }));
            }
          }
        } else {
          setError(data.error || 'فشل تحميل الفصول.');
        }
      })
      .catch(() => setError('تعذر الاتصال بالخادم لتحميل الفصول.'));
  };

  useEffect(() => {
    if (activeTab === 'classrooms') {
      loadClassrooms();
    }
  }, [activeTab, classroomFilters.gradeId, classroomFilters.academicYearId]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUserForm({ username: '', nationalId: '', fullName: '', password: '', roleIds: [], roleScopes: {} });
    setShowForm(true);
  };

  const handleOpenEdit = (user) => {
    const scopes = {};
    user.roles?.forEach(r => {
      scopes[r.id] = r.section_id || '';
    });

    setEditingUser(user.id);
    setUserForm({
      username: user.username,
      nationalId: user.national_id,
      fullName: user.full_name,
      password: '',
      roleIds: user.roles?.map(r => r.id) || [],
      roleScopes: scopes
    });
    setShowForm(true);
  };

  const toggleRoleInForm = (roleId) => {
    setUserForm(f => {
      const exists = f.roleIds.includes(roleId);
      const nextRoleIds = exists ? f.roleIds.filter(id => id !== roleId) : [...f.roleIds, roleId];
      const nextScopes = { ...f.roleScopes };
      if (exists) {
        delete nextScopes[roleId];
      } else {
        nextScopes[roleId] = ''; // default to all sections
      }
      return {
        ...f,
        roleIds: nextRoleIds,
        roleScopes: nextScopes
      };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (userForm.nationalId.length !== 14 || isNaN(userForm.nationalId)) {
      return setError('الرقم القومي يجب أن يكون 14 رقماً.');
    }

    const structuredRoles = userForm.roleIds.map(roleId => ({
      roleId,
      sectionId: userForm.roleScopes[roleId] ? parseInt(userForm.roleScopes[roleId]) : null
    }));

    try {
      const url = editingUser ? `${API}/users/${editingUser}` : `${API}/users`;
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userForm.username,
          fullName: userForm.fullName,
          nationalId: userForm.nationalId,
          password: userForm.password,
          isActive: 1,
          roles: structuredRoles
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ بيانات المستخدم.');

      setSuccess(data.message || 'تم حفظ المستخدم بنجاح.');
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.username === 'admin') return alert('لا يمكن حذف الحساب الرئيسي.');
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${user.full_name}"؟`)) return;

    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المستخدم.');
      setSuccess(data.message || 'تم حذف المستخدم بنجاح.');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Classroom Handlers ────────────────────────────────
  // Compute generated names preview based on naming style + count
  // ── Classroom Handlers ────────────────────────────────
  // Compute generated names & class codes preview based on naming style + count, skipping existing names
  const getGeneratedClassItems = (gradeId) => {
    const grade = formOpts.grades?.find(g => String(g.id) === String(gradeId));
    const gradeNum = grade?.grade_number || 1;
    const ARABIC_LETTERS = ['أ','ب','ج','د','ه','و','ز','ح','ط','ي','ك','ل','م','ن','س','ع','ف','ص','ق','ر','ش','ت','ث','خ','ذ','ض','ظ','غ'];
    const ENGLISH_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    
    // Find Stage Code (1 digit)
    const stage = formOpts.stages?.find(s => String(s.id) === String(grade?.stage_id));
    let stageCode = 3;
    let suffix = 'ع';
    if (stage) {
      const sn = stage.stage_name || '';
      if (sn.includes('تمهيدي'))        { stageCode = 1; suffix = 'ت'; }
      else if (sn.includes('رياض'))     { stageCode = 2; suffix = 'ح'; }
      else if (sn.includes('ابتدائي')) { stageCode = 3; suffix = 'ب'; }
      else if (sn.includes('إعدادي') || sn.includes('اعدادي')) { stageCode = 4; suffix = 'ع'; }
      else if (sn.includes('ثانوي'))   { stageCode = 5; suffix = 'ث'; }
    }

    // Find Section Code (1 digit)
    const section = formOpts.sections?.find(s => String(s.id) === String(classroomFilters.sectionId || grade?.section_id));
    let secCode = 1;
    if (section) {
      const secName = section.name || section.section_name || '';
      if (secName.includes('لغات') || section.code === 'languages') secCode = 2;
      else if (secName.includes('دولي') || section.code === 'international') secCode = 3;
    }

    const existingNames = new Set(classrooms.map(c => c.class_name.trim()));
    const items = [];
    let i = 1;
    const targetTotal = Math.max(1, parseInt(bulkForm.count) || 1);
    const existingCount = classrooms.length;
    
    // Calculate how many NEW classes are needed to reach targetTotal
    const neededCount = Math.max(0, targetTotal - existingCount);

    if (neededCount === 0) return [];

    while (items.length < neededCount && i <= 150) {
      let candidateName = '';
      if (bulkForm.namingStyle === 'arabic') {
        candidateName = `${gradeNum} / ${ARABIC_LETTERS[i - 1] || i}`;
      } else if (bulkForm.namingStyle === 'numeric') {
        candidateName = `${gradeNum} / ${i}`;
      } else if (bulkForm.namingStyle === 'arabic_suffix') {
        candidateName = `${gradeNum} / ${i} ${suffix}`;
      } else if (bulkForm.namingStyle === 'english_letter_grade') {
        candidateName = `${ENGLISH_LETTERS[i - 1] || 'Class'}${gradeNum}`;
      } else {
        candidateName = `${bulkForm.prefix || gradeNum} / ${i}`;
      }

      if (!existingNames.has(candidateName.trim())) {
        const classNumStr = String(i).padStart(2, '0');
        const classCode = `${secCode}${stageCode}${gradeNum}${classNumStr}`;
        items.push({ name: candidateName, classCode, classNum: i });
      }

      i++;
    }

    return items;
  };

  const getGeneratedNames = (gradeId) => {
    const existingCount = classrooms.length;
    const targetTotal = Math.max(1, parseInt(bulkForm.count) || 1);
    if (targetTotal <= existingCount) {
      return [`(الصف يحتوي بالفعل على ${existingCount} فصل - مستوفى بالكامل)`];
    }
    const items = getGeneratedClassItems(gradeId);
    return items.map(item => `${item.name} (${item.classCode})`);
  };

  const handleBulkCreate = async () => {
    if (!classroomFilters.gradeId || !classroomFilters.academicYearId) {
      return setError('يرجى اختيار الصف الدراسي والعام الدراسي أولاً.');
    }
    const targetTotal = Math.max(1, parseInt(bulkForm.count) || 1);
    const existingCount = classrooms.length;

    if (targetTotal <= existingCount) {
      return setError(`الصف يحتوي بالفعل على ${existingCount} فصل. لا داعي للإضافة لأن العدد المستهدف المطلوب (${targetTotal}) مستوفى بالفعل.`);
    }

    const items = getGeneratedClassItems(classroomFilters.gradeId);
    if (items.length === 0) {
      return setError('لم يتم التمكن من توليد فصول جديدة فريدة.');
    }

    setBulkCreating(true);
    setError(''); setSuccess('');
    let created = 0; const skipped = [];
    const safeCap = Math.min(49, Math.max(1, parseInt(bulkForm.capacity) || 40));

    for (const item of items) {
      try {
        const res = await fetch(`${API}/classrooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gradeId: classroomFilters.gradeId,
            academicYearId: classroomFilters.academicYearId,
            className: item.name,
            classCode: item.classCode,
            capacity: safeCap,
          }),
        });
        const data = await res.json();
        if (data.success) created++;
        else skipped.push(item.name);
      } catch { skipped.push(item.name); }
    }
    setBulkCreating(false);
    if (created > 0) {
      setSuccess(`تم إضافة ${created} فصل جديد لتكملة الفصول المسجلة سابقاً (${existingCount}) ليكون إجمالي الفصول (${existingCount + created}) فصلاً بنجاح${skipped.length ? ` (تم تخطي المكرر: ${skipped.join(', ')})` : ''}.`);
    } else {
      setError('لم يتم إضافة أي فصل. ربما تكون جميع الأسماء المقترحة مسجلة بالفعل.');
    }
    loadClassrooms();
  };

  const handleSaveEditClassroom = async () => {
    if (!editForm.className.trim()) return setError('اسم الفصل مطلوب.');
    setError(''); setSuccess('');
    const safeCap = editForm.capacity ? Math.min(49, Math.max(1, parseInt(editForm.capacity) || 40)) : 40;
    try {
      const res = await fetch(`${API}/classrooms/${editingClassroom}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: editForm.className, capacity: safeCap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث الفصل.');
      setSuccess('تم تحديث بيانات الفصل بنجاح.');
      setEditingClassroom(null);
      loadClassrooms();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteClassroom = async (cls) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفصل "${cls.class_name}"؟`)) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/classrooms/${cls.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الفصل.');
      setSuccess(data.message || 'تم حذف الفصل بنجاح.');
      loadClassrooms();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteAllGradeClassrooms = async (confirmUnenroll = false) => {
    if (!classroomFilters.gradeId || !classroomFilters.academicYearId) return;
    const grade = formOpts.grades?.find(g => String(g.id) === String(classroomFilters.gradeId));
    const gradeName = grade?.grade_name_ar || 'الصف';

    if (!confirmUnenroll) {
      if (!window.confirm(`هل أنت متأكد من حذف كافة فصول (${gradeName})؟`)) return;
    }

    setError(''); setSuccess('');
    try {
      const url = `${API}/classrooms/grade/${classroomFilters.gradeId}?academicYearId=${classroomFilters.academicYearId}${confirmUnenroll ? '&confirmUnenroll=true' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (_) {
        throw new Error('فشل التواصل مع السيرفر عند حذف الفصول. يرجى التأكد من إعادة تشغيل سيرفر الباك إند.');
      }

      if (!res.ok) {
        if (data.requiresConfirmation) {
          const proceed = window.confirm(`تنبيه هام:\n${data.error}\n\nهل تريد فك توزيع الطلاب وحذف كافة فصول هذا الصف الآن؟`);
          if (proceed) {
            return handleDeleteAllGradeClassrooms(true);
          }
          return;
        }
        throw new Error(data.error || 'فشل حذف فصول الصف.');
      }

      setSuccess(data.message || 'تم حذف كافة فصول الصف بنجاح.');
      loadClassrooms();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Sections & Stages Handlers ────────────────────────
  const handleOpenSectionAdd = () => {
    setEditingSection(null);
    setSectionForm({ name: '', type: 'arabic', educationType: 'عام', legalStatus: 'حكومي' });
    setShowSectionForm(true);
  };

  const handleOpenSectionEdit = (sec) => {
    setEditingSection(sec.id);
    setSectionForm({
      name: sec.name,
      type: sec.type,
      educationType: sec.education_type || 'عام',
      legalStatus: sec.legal_status || 'حكومي'
    });
    setShowSectionForm(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const url = editingSection ? `${API}/sections/${editingSection}` : `${API}/sections`;
      const method = editingSection ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ القسم.');
      setSuccess(data.message || 'تم حفظ القسم بنجاح.');
      setShowSectionForm(false);
      window.dispatchEvent(new Event('sections-updated'));
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteSection = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف القسم "${name}"؟`)) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/sections/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف القسم.');
      setSuccess(data.message || 'تم حذف القسم بنجاح.');
      window.dispatchEvent(new Event('sections-updated'));
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleToggleSectionActive = async (sec) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/sections/${sec.id}/toggle-active`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة القسم.');
      setSuccess(data.message);
      window.dispatchEvent(new Event('sections-updated'));
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleOpenStageAdd = () => {
    setEditingStage(null);
    setStageForm({ sectionId: sections[0]?.id || '', stageName: '', stageCode: '', yearsCount: 3, displayOrder: 0 });
    setShowStageForm(true);
  };

  const handleOpenStageEdit = (stg) => {
    setEditingStage(stg.id);
    setStageForm({
      sectionId: stg.section_id,
      stageName: stg.stage_name,
      stageCode: stg.stage_code || '',
      yearsCount: stg.years_count,
      displayOrder: stg.display_order || 0
    });
    setShowStageForm(true);
  };

  const handleSaveStage = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const url = editingStage ? `${API}/stages/${editingStage}` : `${API}/stages`;
      const method = editingStage ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stageForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ المرحلة.');
      setSuccess(data.message || 'تم حفظ المرحلة بنجاح.');
      setShowStageForm(false);
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteStage = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف المرحلة "${name}" وكل الصفوف التابعة لها؟`)) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/stages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المرحلة.');
      setSuccess(data.message || 'تم حذف المرحلة بنجاح.');
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleToggleStageActive = async (stg) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/stages/${stg.id}/toggle-active`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة المرحلة.');
      setSuccess(data.message);
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleAddSectionInline = () => {
    setSections(prev => [
      ...prev,
      {
        id: 'temp_' + Date.now(),
        name: `قسم جديد ${prev.length + 1}`,
        type: 'arabic',
        education_type: '',
        legal_status: 'حكومي'
      }
    ]);
  };

  const handleDeleteSectionInline = (id) => {
    setSections(prev => prev.filter(sec => sec.id !== id));
  };

  const handleUpdateSectionField = (id, field, value) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === id) {
        return { ...sec, [field]: value };
      }
      return sec;
    }));
  };

  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.school_name || !form.school_name.trim() || !configuredSections || !configuredSections.length) {
      setError('اسم المدرسة والأقسام المقررة حقول إيجابية ملزمة.');
      return;
    }
    try {
      const structRes = await fetch(`${API_BASE_URL}/setup/save-institution-structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classificationId: selectedClassificationId,
          configuredSections: configuredSections
        })
      });
      const structData = await structRes.json();
      if (!structRes.ok) throw new Error(structData.error || 'فشل حفظ الهيكل المخصص للمؤسسة.');

      const res = await fetch(`${API}/institution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(institutionForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ بيانات المؤسسة.');

      setSuccess('✅ تم حفظ بيانات وتأثيل المؤسسة بنجاح بتطابق تامي مع المعاجم الخمسة والهيكل المعماري!');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Academic Year Handlers ────────────────────────────
  const handleOpenYearAdd = () => {
    const curYear = new Date().getFullYear();
    setEditingYear(null);
    setYearForm({
      yearLabel: `${curYear}/${curYear + 1}`,
      startDate: `${curYear}-09-01`,
      endDate: `${curYear + 1}-08-31`,
      isCurrent: true,
    });
    setShowYearForm(true);
  };

  const handleOpenYearEdit = (y) => {
    setEditingYear(y.id);
    const match = (y.year_label || '').match(/(\d{4})/);
    const startYear = match ? parseInt(match[1]) : new Date().getFullYear();
    const endYear = startYear + 1;
    setYearForm({
      yearLabel: y.year_label || `${startYear}/${endYear}`,
      startDate: y.start_date || `${startYear}-09-01`,
      endDate: y.end_date || `${endYear}-08-31`,
      isCurrent: y.is_current === 1 || y.is_current === true,
    });
    setShowYearForm(true);
  };

  const handleSaveYear = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const url = editingYear ? `${API}/academic-years/${editingYear}` : `${API}/academic-years`;
      const method = editingYear ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yearForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ العام الدراسي.');

      setSuccess(data.message || 'تم حفظ العام الدراسي بنجاح.');
      setShowYearForm(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteYear = async (id, label) => {
    if (!window.confirm(`هل أنت متأكد من حذف العام الدراسي "${label}"؟`)) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/academic-years/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف العام الدراسي.');
      setSuccess(data.message || 'تم حذف العام الدراسي بنجاح.');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetCurrentYear = async (id) => {
    const targetYear = academicYears.find(y => y.id === id);
    const label = targetYear?.year_label || '';
    if (!window.confirm(`⚠️ تنبيه هام:\nتغيير السنة الدراسية الحالية إلى "${label}" سينعكس على كافة شاشات وبيانات البرنامج وسيصبح هو العام النشط للنظام.\n\nهل تريد الاستمرار؟`)) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/academic-years/${id}/set-current`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تعيين العام الدراسي النشط.');
      setSuccess(data.message || 'تم تعيين العام الدراسي النشط بنجاح.');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredStages = formOpts.stages?.filter(s => !classroomFilters.sectionId || String(s.section_id) === classroomFilters.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(g => !classroomFilters.stageId || String(g.stage_id) === classroomFilters.stageId) || [];

  useEffect(() => {
    if (formOpts.academicYears?.length && !classroomFilters.academicYearId) {
      const cur = formOpts.academicYears.find(y => y.is_current === 1 || y.is_current === true);
      if (cur) setClassroomFilters(f => ({ ...f, academicYearId: String(cur.id) }));
    }
    if (formOpts.sections?.length === 1 && !classroomFilters.sectionId) {
      setClassroomFilters(f => ({ ...f, sectionId: String(formOpts.sections[0].id) }));
    }
  }, [formOpts.academicYears, formOpts.sections]);

  useEffect(() => {
    if (filteredStages.length === 1 && !classroomFilters.stageId) {
      setClassroomFilters(f => ({ ...f, stageId: String(filteredStages[0].id) }));
    }
  }, [filteredStages]);

  if (loading) {
    return (
      <div className="form-loading">
        <div className="loading-spinner" />
        <span>جاري تحميل الصلاحيات والمستخدمين...</span>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* ── Page Header ─────────────────────────────────── */}
      {(() => {
        const getHeaderInfo = () => {
          switch(activeTab) {
            case 'classrooms':
              return {
                title: 'إعداد الفصول الدراسية',
                sub: 'إدارة وتوزيع الفصول الدراسية وتحديد سعتها الاستيعابية لكل صف وعام دراسي'
              };
            case 'institution':
              return {
                title: 'بيانات المؤسسة التعليمية',
                sub: 'تعديل المعلومات العامة للمدرسة والشعار والأختام الرسمية للتقارير والشهادات'
              };
            case 'academic_years':
              return {
                title: 'إدارة الأعوام الدراسية',
                sub: 'إضافة وتفعيل الأعوام الدراسية وتعديل فترات البداية والنهاية وتحديد العام النشط حالياً'
              };
            default:
              return {
                title: 'إدارة الصلاحيات والمستخدمين',
                sub: 'إضافة وتعديل حسابات المسؤولين وتعيين أدوارهم وصلاحياتهم وإعداد الفصول'
              };
          }
        };
        const headerInfo = getHeaderInfo();
        return (
          <div className="page-header">
            <div className="page-title-area">
              <div className="page-icon">
                {activeTab === 'academic_years' ? <Calendar size={22} /> : activeTab === 'institution' ? <Building size={22} /> : <Settings size={22} />}
              </div>
              <div>
                <h1 className="page-title">{headerInfo.title}</h1>
                <p className="page-sub">{headerInfo.sub}</p>
              </div>
            </div>
            {activeTab === 'users' && !showForm && (
              <button className="btn-add-student" onClick={handleOpenAdd}>
                <UserPlus size={18} />
                <span>إضافة مسؤول جديد</span>
              </button>
            )}
            {activeTab === 'academic_years' && !showYearForm && (
              <button className="btn-add-student" onClick={handleOpenYearAdd}>
                <Plus size={18} />
                <span>إضافة عام دراسي جديد</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="form-tabs">
        {allowedTabs.includes('institution') && (
          <button className={`form-tab ${activeTab === 'institution' ? 'active' : ''}`} onClick={() => { setActiveTab('institution'); setShowForm(false); }}>
            🏫 بيانات المؤسسة
          </button>
        )}
        {allowedTabs.includes('sections_stages') && (
          <button className={`form-tab ${activeTab === 'sections_stages' ? 'active' : ''}`} onClick={() => { setActiveTab('sections_stages'); setShowForm(false); }}>
            🏢 الأقسام والمراحل والصفوف
          </button>
        )}
        {allowedTabs.includes('classrooms') && (
          <button className={`form-tab ${activeTab === 'classrooms' ? 'active' : ''}`} onClick={() => { setActiveTab('classrooms'); setShowForm(false); }}>
            📚 إعداد الفصول الدراسية
          </button>
        )}
        {allowedTabs.includes('academic_years') && (
          <button className={`form-tab ${activeTab === 'academic_years' ? 'active' : ''}`} onClick={() => { setActiveTab('academic_years'); setShowForm(false); setShowYearForm(false); }}>
            📅 الأعوام الدراسية ({academicYears.length})
          </button>
        )}
        {allowedTabs.includes('users') && (
          <button className={`form-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setShowForm(false); }}>
            👤 المستخدمين والمسؤولين
          </button>
        )}
        {allowedTabs.includes('roles') && (
          <button className={`form-tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => { setActiveTab('roles'); setShowForm(false); }}>
            🛡️ الأدوار الوظيفية ({roles.length})
          </button>
        )}
        {allowedTabs.includes('perms') && (
          <button className={`form-tab ${activeTab === 'perms' ? 'active' : ''}`} onClick={() => { setActiveTab('perms'); setShowForm(false); }}>
            🔑 صلاحيات النظام ({perms.length})
          </button>
        )}
      </div>

      {error && <div className="form-alert error" style={{ marginBottom: 16 }}><AlertCircle size={16} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 16 }}><CheckCircle2 size={16} /> {success}</div>}

      {/* ── Tab Content ─────────────────────────────────── */}
      <div className="settings-content-wrapper">
        
        {/* ── USER FORM (Add / Edit) ────────────────────── */}
        {showForm && activeTab === 'users' && (
          <form onSubmit={handleSaveUser} className="glass-panel form-body" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h3 className="section-title">
              {editingUser ? '✏️ تعديل بيانات المسؤول' : '👤 إضافة مسؤول جديد للنظام'}
            </h3>
            
            <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="field-group">
                <label className="field-label">الاسم بالكامل</label>
                <input type="text" className="field-input" required value={userForm.fullName}
                  onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="مثال: محمد أحمد علي" />
              </div>
              <div className="field-group">
                <label className="field-label">اسم المستخدم (بالأجنبية)</label>
                <input type="text" className="field-input" required disabled={editingUser && userForm.username === 'admin'}
                  value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="username" dir="ltr" />
              </div>
              <div className="field-group">
                <label className="field-label">الرقم القومي (14 رقماً)</label>
                <input type="text" className="field-input" required value={userForm.nationalId}
                  onChange={e => setUserForm({ ...userForm, nationalId: e.target.value })} placeholder="3010..." dir="ltr" />
              </div>
              <div className="field-group">
                <label className="field-label">كلمة المرور {editingUser && '(اتركها فارغة لعدم التغيير)'}</label>
                <input type="password" className="field-input" required={!editingUser}
                  value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="••••••••" dir="ltr" />
              </div>
            </div>

            <h4 className="tracks-title" style={{ marginTop: 24, fontSize: 13, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              🛡️ الأدوار الوظيفية الممنوحة للمسؤول ونطاق عملهم:
            </h4>
            <div className="cases-grid" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, 1fr)', gap: 10 }}>
              {roles.map(r => {
                const isSelected = userForm.roleIds.includes(r.id);
                return (
                  <div key={r.id} className={`case-item ${isSelected ? 'selected' : ''}`} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleRoleInForm(r.id)} style={{ display: 'none' }} />
                      <span className="case-check" style={{ fontSize: 16 }}>{isSelected ? '🛡️' : '⬜'}</span>
                      <div style={{ marginRight: 8 }}>
                        <div className="case-name" style={{ fontWeight: 600 }}>{r.role_name_ar}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{r.role_name}</div>
                      </div>
                    </label>
                    
                    {isSelected && r.role_name !== 'super_admin' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>نطاق العمل:</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '4px 8px', fontSize: 12, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 6 }}
                          value={userForm.roleScopes[r.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUserForm(f => ({
                              ...f,
                              roleScopes: { ...f.roleScopes, [r.id]: val ? Number(val) : '' }
                            }));
                          }}
                        >
                          <option value="">كل الأقسام (عام)</option>
                          {formOpts.sections?.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="form-footer" style={{ background: 'transparent', padding: '20px 0 0', marginTop: 24 }}>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}><X size={16} /> إلغاء</button>
              <button type="submit" className="btn-save"><Save size={16} /> حفظ بيانات المسؤول</button>
            </div>
          </form>
        )}

        {/* ── USERS LIST ────────────────────────────────── */}
        {activeTab === 'users' && !showForm && (
          <div className="table-container glass-panel">
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>الاسم الكامل</th>
                    <th>اسم المستخدم</th>
                    <th>الرقم القومي</th>
                    <th>الأدوار ونطاقات الأقسام</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="table-row">
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td><code className="student-code" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}>{u.username}</code></td>
                      <td dir="ltr" style={{ fontSize: 12 }}>{u.national_id}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {u.roles?.map(r => (
                            <span key={r.id} className="tag-track" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              🛡️ {r.role_name_ar}
                              {r.section_id ? (
                                <span style={{ background: 'rgba(139,92,246,0.15)', color: '#c084fc', fontSize: 9, padding: '1px 4px', borderRadius: 4 }}>
                                  ({r.section_name})
                                </span>
                              ) : (
                                <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: 9, padding: '1px 4px', borderRadius: 4 }}>
                                  (عام)
                                </span>
                              )}
                            </span>
                          )) || '—'}
                        </div>
                      </td>
                      <td>
                        <span className="status-badge" style={{
                          background: u.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: u.is_active ? '#10b981' : '#ef4444',
                          border: `1px solid ${u.is_active ? '#10b98122' : '#ef444422'}`
                        }}>
                          {u.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="action-btn view" onClick={() => handleOpenEdit(u)} title="تعديل المسؤول">
                            <Edit3 size={14} />
                          </button>
                          {u.username !== 'admin' && (
                            <button className="action-btn view" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                              onClick={() => handleDeleteUser(u)} title="حذف المسؤول">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ROLES LIST ────────────────────────────────── */}
        {activeTab === 'roles' && (
          <div className="roles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {roles.map(r => (
              <div key={r.id} className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🛡️ {r.role_name_ar}</h3>
                    <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.role_name}</code>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.description || 'لا يوجد وصف.'}</p>
                
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>🔑 الصلاحيات الممنوحة:</h4>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {r.permissions?.length > 0 ? (
                      r.permissions.map(p => (
                        <span key={p.id} className="tag-lang" style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', color: '#93c5fd', borderColor: '#3b82f633' }}>
                          ✓ {p.perm_name_ar}
                        </span>
                      ))
                    ) : (
                      r.role_name === 'super_admin' ? (
                        <span className="tag-track" style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>✓ صلاحية كاملة على كل النظام</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>لا توجد صلاحيات معينة.</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PERMISSIONS LIST ──────────────────────────── */}
        {activeTab === 'perms' && (
          <div className="table-container glass-panel">
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>كود الصلاحية</th>
                    <th>اسم الصلاحية بالعربية</th>
                    <th>الوصف الوظيفي</th>
                  </tr>
                </thead>
                <tbody>
                  {perms.map(p => (
                    <tr key={p.id} className="table-row">
                      <td><code className="student-code" style={{ fontFamily: 'monospace' }}>{p.perm_key}</code></td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.perm_name_ar}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        تمنح حق الوصول لتنفيذ إجراءات {p.perm_name_ar} داخل النظام.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CLASSROOMS TAB ──────────────────────────────────── */}
        {activeTab === 'classrooms' && (
          <div className="classrooms-manager-area" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Prerequisite warnings */}
            {stages.length === 0 && (
              <div style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#c0392b', display: 'flex', alignItems: 'center', gap: 10 }}>
                ⚠️ <strong>يرجى إعداد الأقسام والمراحل أولاً</strong> من تبويب «الأقسام والمراحل» قبل إنشاء الفصول الدراسية
              </div>
            )}
            {academicYears.length === 0 && (
              <div style={{ background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.3)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#b7791f', display: 'flex', alignItems: 'center', gap: 10 }}>
                📅 <strong>يرجى إنشاء عام دراسي أولاً</strong> من تبويب «الأعوام الدراسية» قبل إنشاء الفصول
              </div>
            )}
            {/* ── Selector Row ─────────────────────────── */}
            <div className="filter-panel glass-panel" style={{ padding: '16px 20px' }}>
              <div className="filter-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="field-group" style={{ minWidth: 140 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>العام الدراسي</label>
                  <select className="filter-select" style={{ width: '100%', padding: '8px 12px' }}
                    value={classroomFilters.academicYearId}
                    onChange={e => setClassroomFilters(f => ({ ...f, academicYearId: e.target.value }))}>
                    <option value="">اختر العام...</option>
                    {formOpts.academicYears?.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
                  </select>
                </div>

                <div className="field-group" style={{ minWidth: 130 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>القسم</label>
                  <select className="filter-select" style={{ width: '100%', padding: '8px 12px' }}
                    value={classroomFilters.sectionId}
                    onChange={e => setClassroomFilters(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '' }))}>
                    <option value="">كل الأقسام</option>
                    {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="field-group" style={{ minWidth: 130 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>المرحلة</label>
                  <select className="filter-select" style={{ width: '100%', padding: '8px 12px' }}
                    value={classroomFilters.stageId}
                    onChange={e => setClassroomFilters(f => ({ ...f, stageId: e.target.value, gradeId: '' }))}>
                    <option value="">اختر المرحلة...</option>
                    {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
                  </select>
                </div>

                <div className="field-group" style={{ minWidth: 150 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>الصف الدراسي ★</label>
                  <select className="filter-select" style={{ width: '100%', padding: '8px 12px', borderColor: !classroomFilters.gradeId ? '#f59e0b44' : '' }}
                    value={classroomFilters.gradeId}
                    onChange={e => setClassroomFilters(f => ({ ...f, gradeId: e.target.value }))}>
                    <option value="">اختر الصف...</option>
                    {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Bulk Creation Panel (shown only when grade+year selected) ── */}
            {classroomFilters.gradeId && classroomFilters.academicYearId && (
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="section-title" style={{ marginBottom: 20 }}>➕ إنشاء فصول جديدة بالجملة</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>

                  {/* Count */}
                  <div className="field-group">
                    <label className="field-label">
                      {classrooms.length > 0
                        ? `إجمالي الفصول المطلوب (يوجد ${classrooms.length} فصل حالياً)`
                        : 'عدد الفصول'}
                    </label>
                    <input type="number" className="field-input"
                      min={classrooms.length > 0 ? classrooms.length + 1 : 1} max={50} value={bulkForm.count}
                      onChange={e => setBulkForm(f => ({ ...f, count: Math.min(50, Math.max(classrooms.length > 0 ? classrooms.length + 1 : 1, parseInt(e.target.value) || 1)) }))} />
                  </div>

                  {/* Capacity */}
                  <div className="field-group">
                    <label className="field-label">السعة الموحدة (أقصى حد 49 طالب)</label>
                    <input type="number" className="field-input" min={1} max={49} value={bulkForm.capacity}
                      onChange={e => setBulkForm(f => ({ ...f, capacity: Math.min(49, Math.max(1, parseInt(e.target.value) || 1)) }))} />
                  </div>

                  {/* Naming style */}
                  <div className="field-group">
                    <label className="field-label">
                      طريقة تسمية الفصول
                      {classrooms.length > 0 && (
                        <span style={{ fontSize: 11, color: '#6366f1', marginRight: 6, fontWeight: 700 }}>
                          🔒 (مثبتة تلقائياً لتطابق الفصول الحالية)
                        </span>
                      )}
                    </label>
                    <select className="field-input" value={bulkForm.namingStyle} disabled={classrooms.length > 0}
                      onChange={e => setBulkForm(f => ({ ...f, namingStyle: e.target.value, prefix: '' }))}>
                      <option value="numeric">أرقام قياسية (1/1 ، 1/2 ، 1/3 ...)</option>
                      <option value="arabic">حروف عربية (1/أ ، 1/ب ، 1/ج ...)</option>
                      <option value="arabic_suffix">أرقام مع لاحقة المرحلة (1/1 ع ، 1/2 ع ...)</option>
                      <option value="english_letter_grade">أجنبي (A1 , B1 , C1 ...)</option>
                      <option value="custom">بادئة مخصصة</option>
                    </select>
                  </div>

                  {/* Custom prefix */}
                  {bulkForm.namingStyle === 'custom' && (
                    <div className="field-group">
                      <label className="field-label">البادئة (مثال: أ )</label>
                      <input type="text" className="field-input" maxLength={5}
                        disabled={classrooms.length > 0}
                        value={bulkForm.prefix} placeholder="أ أو A أو ..." dir="rtl"
                        onChange={e => setBulkForm(f => ({ ...f, prefix: e.target.value }))} />
                    </div>
                  )}
                </div>

                {/* Preview badges */}
                {classroomFilters.gradeId && (
                  <div style={{ marginTop: 18 }}>
                    <p className="field-label" style={{ marginBottom: 8 }}>
                      {classrooms.length > 0
                        ? `معاينة الفصول الجديدة المراد إضافتها لتكملة الفصول من (${classrooms.length}) إلى (${bulkForm.count}):`
                        : 'معاينة أسماء وأكواد الفصول الجديدة التي سيتم إنشاؤها:'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {getGeneratedNames(classroomFilters.gradeId).map((n, i) => (
                        <span key={i} style={{
                          background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.3)',
                          borderRadius: 8, padding: '4px 14px', fontSize: 13, fontWeight: 700,
                          fontFamily: 'monospace'
                        }}>{n}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-save" onClick={handleBulkCreate} disabled={bulkCreating}
                    style={{ gap: 8, minWidth: 180 }}>
                    {bulkCreating
                      ? <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جاري الإنشاء...</>
                      : <><Plus size={17} /> {classrooms.length > 0
                          ? `إضافة ${Math.max(0, (parseInt(bulkForm.count) || 1) - classrooms.length)} فصل جديد لتكملة العدد إلى ${bulkForm.count}`
                          : `إنشاء ${bulkForm.count} فصل`}</>}
                  </button>
                </div>
              </div>
            )}

            {/* ── Existing Classrooms Grid ── */}
            {classroomFilters.gradeId ? (
              classrooms.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 className="section-title" style={{ margin: 0 }}>
                      🏫 الفصول الحالية ({classrooms.length} فصل)
                    </h3>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteAllGradeClassrooms(false)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                      <Trash2 size={14} /> حذف كافة فصول هذا الصف
                    </button>
                  </div>
                  <div className="classrooms-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
                    {classrooms.map(c => {
                      const percent = Math.min(100, Math.round((c.enrolledCount / (c.capacity || 1)) * 100));
                      const progressColor = percent > 90 ? '#ef4444' : percent > 75 ? '#f59e0b' : '#10b981';
                      const isEditing = editingClassroom === c.id;

                      return (
                        <div key={c.id} className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {isEditing ? (
                            // ── Inline Edit Mode ──
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div className="field-group">
                                <label className="field-label">اسم الفصل</label>
                                <input type="text" className="field-input" value={editForm.className}
                                  onChange={e => setEditForm(f => ({ ...f, className: e.target.value }))} />
                              </div>
                              <div className="field-group">
                                <label className="field-label">السعة (أقصى حد 49)</label>
                                <input type="number" className="field-input" min={1} max={49} value={editForm.capacity}
                                  onChange={e => setEditForm(f => ({ ...f, capacity: Math.min(49, Math.max(1, parseInt(e.target.value) || 1)) }))} />
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-save" style={{ flex: 1, justifyContent: 'center', padding: '7px 0' }}
                                  onClick={handleSaveEditClassroom}><Save size={14} /> حفظ</button>
                                <button className="btn-cancel" style={{ flex: 1, justifyContent: 'center', padding: '7px 0' }}
                                  onClick={() => setEditingClassroom(null)}><X size={14} /> إلغاء</button>
                              </div>
                            </div>
                          ) : (
                            // ── View Mode ──
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 1, margin: 0 }}>
                                    🏫 {c.class_name}
                                  </h4>
                                  {c.class_code && (
                                    <span style={{ fontSize: 11, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontFamily: 'monospace', marginTop: 4, display: 'inline-block' }}>
                                      🏷️ كود: {c.class_code}
                                    </span>
                                  )}
                                </div>
                                <div className="row-actions">
                                  <button className="action-btn view" title="تعديل"
                                    onClick={() => { setEditingClassroom(c.id); setEditForm({ className: c.class_name, capacity: c.capacity }); }}>
                                    <Edit3 size={13} />
                                  </button>
                                  <button className="action-btn view" title="حذف" style={{ borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                                    onClick={() => handleDeleteClassroom(c)}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>👥 السعة:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.capacity} طالب</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>📊 المسجلون:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.enrolledCount}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${percent}%`, height: '100%', background: progressColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                                  <span>نسبة الإشغال:</span>
                                  <span style={{ color: progressColor, fontWeight: 600 }}>{percent}%</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="table-empty glass-panel" style={{ padding: '60px 20px' }}>
                  <BookOpen size={48} opacity={0.25} style={{ marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>لا توجد فصول مضافة لهذا الصف حالياً — استخدم الأداة أعلاه لإنشائها</p>
                </div>
              )
            ) : (
              <div className="table-empty glass-panel" style={{ padding: '60px 20px' }}>
                <Settings size={48} opacity={0.25} style={{ marginBottom: 12 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>يرجى اختيار العام الدراسي والصف لعرض فصوله وإعدادها</p>
              </div>
            )}
          </div>
        )}

        {/* ── INSTITUTION CONFIG TAB ─────────────────────────── */}
        {activeTab === 'institution' && (
          <form onSubmit={handleSaveInstitution} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Section 1: Basic School Data ── */}
            <div className="glass-panel form-body">
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                🏫 البيانات الأساسية ومعلومات التواصل بالمدرسة
              </h3>
              <p style={{ marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                المعلومات التعريفية والعنوان ووسائل التواصل المعتمدة رسمياً للمدرسة
              </p>
              <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
                <div className="field-group">
                  <label className="field-label">اسم المدرسة باللغة العربية ★</label>
                  <input type="text" className="field-input" required value={institutionForm.schoolName}
                    onChange={e => setInstitutionForm({ ...institutionForm, schoolName: e.target.value })} placeholder="مثال: مدرسة منارة العلم" />
                </div>
                <div className="field-group">
                  <label className="field-label">اسم المدرسة باللغة الإنجليزية (للمستندات الرسمية)</label>
                  <input type="text" className="field-input" value={institutionForm.schoolNameEn}
                    onChange={e => setInstitutionForm({ ...institutionForm, schoolNameEn: e.target.value })} placeholder="Example: Menar El-Elm School" dir="ltr" />
                </div>
                <div className="field-group">
                  <label className="field-label">كود المدرسة ★</label>
                  <input type="text" className="field-input" required value={institutionForm.schoolCode}
                    onChange={e => setInstitutionForm({ ...institutionForm, schoolCode: e.target.value })} placeholder="مثال: 12345" dir="ltr" />
                </div>
                <div className="field-group">
                  <label className="field-label">المحافظة ★</label>
                  <select className="field-input" required value={institutionForm.governorate}
                    onChange={e => setInstitutionForm({ ...institutionForm, governorate: e.target.value })}>
                    <option value="">اختر المحافظة...</option>
                    {['القاهرة','الجيزة','الإسكندرية','الدقهلية','البحيرة','الفيوم','الغربية','الإسماعيلية',
                      'المنوفية','المنيا','القليوبية','السويس','الشرقية','أسوان','أسيوط','بني سويف','بورسعيد',
                      'دمياط','الوادي الجديد','شمال سيناء','جنوب سيناء','كفر الشيخ','مطروح','الأقصر','قنا','سوهاج'
                    ].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">الإدارة التعليمية ★</label>
                  <input type="text" className="field-input" required value={institutionForm.directorate}
                    onChange={e => setInstitutionForm({ ...institutionForm, directorate: e.target.value })} placeholder="مثال: إدارة الدقي التعليمية" />
                </div>
                <div className="field-group">
                  <label className="field-label" style={{ fontWeight: 'bold' }}>تصنيف التعليم (صفة المؤسسة) ★</label>
                  <select
                    className="field-input"
                    value={selectedClassificationId}
                    onChange={e => setSelectedClassificationId(e.target.value)}
                  >
                    <option value="">اختر تصنيف التعليم...</option>
                    {masterLookups.classifications.map(c => (
                      <option key={c.id} value={c.id}>{c.name_ar}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">العنوان التفصيلي للمدرسة</label>
                  <input type="text" className="field-input" value={institutionForm.address}
                    onChange={e => setInstitutionForm({ ...institutionForm, address: e.target.value })} placeholder="مثال: 12 شارع التحرير، الدقي" />
                </div>
                <div className="field-group">
                  <label className="field-label">رقم الهاتف</label>
                  <input type="text" className="field-input" value={institutionForm.phone}
                    onChange={e => setInstitutionForm({ ...institutionForm, phone: e.target.value })} placeholder="مثال: 0233445566" dir="ltr" />
                </div>
                <div className="field-group">
                  <label className="field-label">البريد الإلكتروني الرسمي</label>
                  <input type="email" className="field-input" value={institutionForm.email}
                    onChange={e => setInstitutionForm({ ...institutionForm, email: e.target.value })} placeholder="school@example.com" dir="ltr" />
                </div>
                <div className="field-group">
                  <label className="field-label">الموقع الإلكتروني الرسمي</label>
                  <input type="text" className="field-input" value={institutionForm.website}
                    onChange={e => setInstitutionForm({ ...institutionForm, website: e.target.value })} placeholder="www.school.com" dir="ltr" />
                </div>

                {/* ── Multi-Section Cards Builder ── */}
                {/* ── Multi-Section & Leadership Cards Builder ── */}
                <div style={{ gridColumn: 'span 2', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                    🏢 أقسام المؤسسة وقيادات الأقسام المعتمدة
                  </h4>
                  {configuredSections.map((sec, secIdx) => {
                    const secMaster = masterLookups.sections?.find(s => s.id === sec.sectionMasterId);
                    const secNameLower = (secMaster?.name_ar || secMaster?.code || '').toLowerCase();
                    
                    let filteredEduTypes = masterLookups.educationTypes || [];
                    if (secNameLower.includes('لغات') || secNameLower.includes('languages')) {
                      filteredEduTypes = filteredEduTypes.filter(et => et.name_ar.includes('لغات') || et.code.includes('languages') || et.code.includes('distinguished'));
                    } else if (secNameLower.includes('دولي') || secNameLower.includes('international')) {
                      filteredEduTypes = filteredEduTypes.filter(et => et.name_ar.includes('دولي') || et.code.includes('international'));
                    } else {
                      filteredEduTypes = filteredEduTypes.filter(et => !et.name_ar.includes('لغات') && !et.name_ar.includes('دولي'));
                    }

                    return (
                      <div key={secIdx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                            قسم ({secMaster?.name_ar || `قسم ${secIdx + 1}`})
                          </div>
                          {configuredSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setConfiguredSections(prev => prev.filter((_, i) => i !== secIdx))}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                            >
                              🗑️ حذف هذا القسم
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div className="field-group">
                            <label className="field-label">اختر القسم ★</label>
                            <select
                              className="field-input"
                              value={sec.sectionMasterId}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, sectionMasterId: val } : s));
                              }}
                            >
                              {masterLookups.sections.map(s => (
                                <option key={s.id} value={s.id}>{s.name_ar}</option>
                              ))}
                            </select>
                          </div>
                          <div className="field-group">
                            <label className="field-label">نوعية التعليم المحددة للقسم ★</label>
                            <select
                              className="field-input"
                              value={sec.educationTypeId}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, educationTypeId: val } : s));
                              }}
                            >
                              {filteredEduTypes.map(et => (
                                <option key={et.id} value={et.id}>{et.name_ar}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Section Leadership */}
                        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}>
                          <h5 style={{ margin: '0 0 12px 0', fontSize: 13.5, fontWeight: 800, color: '#1e293b' }}>
                            👤 مدير ووكلاء {secMaster?.name_ar || `القسم ${secIdx + 1}`}
                          </h5>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
                            <div className="field-group">
                              <label className="field-label" style={{ fontSize: 12 }}>اسم مدير القسم</label>
                              <input
                                type="text"
                                className="field-input"
                                style={{ fontSize: 13 }}
                                value={sec.sectionDirectorName || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, sectionDirectorName: val } : s));
                                }}
                                placeholder="الاسم رباعياً"
                              />
                            </div>
                            <div className="field-group">
                              <label className="field-label" style={{ fontSize: 12 }}>المؤهل العلمي</label>
                              <input
                                type="text"
                                className="field-input"
                                style={{ fontSize: 13 }}
                                value={sec.sectionDirectorQualification || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, sectionDirectorQualification: val } : s));
                                }}
                                placeholder="مثال: بكالوريوس تربية"
                              />
                            </div>
                            <div className="field-group">
                              <label className="field-label" style={{ fontSize: 12 }}>الرقم القومي (14 رقم)</label>
                              <input
                                type="text"
                                className="field-input"
                                style={{ fontSize: 13 }}
                                dir="ltr"
                                maxLength={14}
                                value={sec.sectionDirectorNationalId || ''}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, sectionDirectorNationalId: val } : s));
                                }}
                                placeholder="14 رقماً"
                              />
                            </div>
                            <div className="field-group">
                              <label className="field-label" style={{ fontSize: 12 }}>رقم هاتف مدير القسم</label>
                              <input
                                type="text"
                                className="field-input"
                                style={{ fontSize: 13 }}
                                dir="ltr"
                                value={sec.sectionDirectorPhone || ''}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^\d+]/g, '');
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, sectionDirectorPhone: val } : s));
                                }}
                                placeholder="01xxxxxxxxx"
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            <div className="field-group" style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                              <label className="field-label" style={{ fontWeight: 700, fontSize: 12 }}>وكيل القسم</label>
                              <input
                                className="field-input"
                                style={{ marginBottom: 6, fontSize: 12 }}
                                value={sec.sectionDeputyName || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, sectionDeputyName: val } : s));
                                }}
                                placeholder="اسم وكيل القسم"
                              />
                              <input
                                className="field-input"
                                dir="ltr"
                                style={{ fontSize: 12 }}
                                value={sec.sectionDeputyPhone || ''}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^\d+]/g, '');
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, sectionDeputyPhone: val } : s));
                                }}
                                placeholder="تليفون الوكيل"
                              />
                            </div>

                            <div className="field-group" style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                              <label className="field-label" style={{ fontWeight: 700, fontSize: 12 }}>وكيل شئون الطلاب</label>
                              <input
                                className="field-input"
                                style={{ marginBottom: 6, fontSize: 12 }}
                                value={sec.studentsViceName || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, studentsViceName: val } : s));
                                }}
                                placeholder="اسم وكيل شئون الطلاب"
                              />
                              <input
                                className="field-input"
                                dir="ltr"
                                style={{ fontSize: 12 }}
                                value={sec.studentsVicePhone || ''}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^\d+]/g, '');
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, studentsVicePhone: val } : s));
                                }}
                                placeholder="تليفون وكيل الطلاب"
                              />
                            </div>

                            <div className="field-group" style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                              <label className="field-label" style={{ fontWeight: 700, fontSize: 12 }}>وكيل شئون العاملين</label>
                              <input
                                className="field-input"
                                style={{ marginBottom: 6, fontSize: 12 }}
                                value={sec.staffViceName || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, staffViceName: val } : s));
                                }}
                                placeholder="اسم وكيل شئون العاملين"
                              />
                              <input
                                className="field-input"
                                dir="ltr"
                                style={{ fontSize: 12 }}
                                value={sec.staffVicePhone || ''}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^\d+]/g, '');
                                  setConfiguredSections(prev => prev.map((s, i) => i === secIdx ? { ...s, staffVicePhone: val } : s));
                                }}
                                placeholder="تليفون وكيل العاملين"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setConfiguredSections(prev => [...prev, { sectionMasterId: masterLookups.sections[0]?.id || 1, educationTypeId: masterLookups.educationTypes[0]?.id || 1, stages: [] }])}
                    style={{ background: '#f0fdf4', color: '#166534', border: '1.5px dashed #86efac', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}
                  >
                    ➕ إضافة قسم آخر للمؤسسة
                  </button>
                </div>
              </div>
            </div>

            {/* ── Section 4: School Logo ── */}
            <div className="glass-panel form-body">
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                🖼️ شعار المدرسة الرسمي
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
                <div className="field-group">
                  <label className="field-label">شعار المدرسة</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="file" accept="image/*" id="logo-file-input" style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setInstitutionForm(prev => ({ ...prev, logoUrl: reader.result }));
                          reader.readAsDataURL(file);
                        }
                      }} />
                    <label htmlFor="logo-file-input" className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: 13 }}>
                      📁 اختيار الشعار
                    </label>
                    {institutionForm.logoUrl && (
                      <button type="button" className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => setInstitutionForm(prev => ({ ...prev, logoUrl: '' }))}>
                        حذف
                      </button>
                    )}
                  </div>
                  {institutionForm.logoUrl && (
                    <img src={institutionForm.logoUrl} alt="شعار" style={{ marginTop: 10, maxHeight: 100, maxWidth: 150, objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: 6, padding: 4 }} onError={e => e.target.style.display='none'} />
                  )}
                </div>
              </div>
            </div>

            {/* ── Multiple Sections List (Only shown if hasMultipleSections is true) ── */}
            {institutionForm.hasMultipleSections && (
              <div className="glass-panel form-body" style={{ borderTop: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      🏢 الأقسام والمسارات المحددة للمدرسة
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      حدد الأقسام المعتمدة وصِف نوعية الدراسة لكل قسم (سيتم الاحتفاظ بالأقسام المحددة وحذف أي شيء آخر بعد الحفظ)
                    </p>
                  </div>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleAddSectionInline}>
                    <Plus size={14} /> إضافة قسم جديد
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>اسم القسم</th>
                        <th>وصف القسم / نوعية الدراسة</th>
                        <th>نوع المنهج</th>
                        <th>الترخيص / الوضعية</th>
                        <th style={{ width: 80, textAlign: 'center' }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5, padding: 16 }}>لا توجد أقسام مسجلة بالمدرسة حالياً.</td>
                        </tr>
                      ) : (
                        sections.map(sec => (
                          <tr key={sec.id} className="table-row">
                            <td>
                              <input type="text" className="field-input" style={{ padding: '4px 8px', fontSize: 13 }} required value={sec.name} onChange={e => handleUpdateSectionField(sec.id, 'name', e.target.value)} />
                            </td>
                            <td>
                              <input type="text" className="field-input" style={{ padding: '4px 8px', fontSize: 13 }} value={sec.education_type || sec.educationType || ''} onChange={e => handleUpdateSectionField(sec.id, 'education_type', e.target.value)} placeholder="مثال: لغات رسمي..." />
                            </td>
                            <td>
                              <select className="field-input" style={{ padding: '4px 8px', fontSize: 13 }} value={sec.type} onChange={e => handleUpdateSectionField(sec.id, 'type', e.target.value)}>
                                <option value="arabic">عربي (تعليم باللغة العربية)</option>
                                <option value="languages">لغات (تعليم باللغات الأجنبية)</option>
                                <option value="kindergarten">رياض أطفال (تمهيدي)</option>
                              </select>
                            </td>
                            <td>
                              <select className="field-input" style={{ padding: '4px 8px', fontSize: 13 }} value={sec.legal_status || sec.legalStatus || 'حكومي'} onChange={e => handleUpdateSectionField(sec.id, 'legal_status', e.target.value)}>
                                <option value="حكومي">حكومي</option>
                                <option value="خاص">خاص</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button type="button" className="action-btn view" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }} onClick={() => handleDeleteSectionInline(sec.id)} title="حذف">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 16 }}>
              <button type="button" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 165 }} onClick={() => setIsPrintingProfile(true)}>
                <Printer size={16} /> طباعة ملف المؤسسة
              </button>
              <button type="submit" className="btn-save" style={{ minWidth: 180 }}><Save size={16} /> حفظ جميع بيانات المؤسسة</button>
            </div>
          </form>
        )}

        {/* ── SECTIONS & STAGES TAB ────────────────────────── */}
        {activeTab === 'sections_stages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

            {/* Prerequisite warning */}
            {!institutionForm.schoolName && (
              <div style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#c0392b', display: 'flex', alignItems: 'center', gap: 10 }}>
                ⚠️ <strong>يرجى إعداد بيانات المؤسسة أولاً</strong> من تبويب «بيانات المؤسسة» قبل إضافة الأقسام والمراحل
              </div>
            )}

            {/* Step guidance */}
            {institutionForm.schoolName && (
              <div style={{ background: 'rgba(52,152,219,0.07)', border: '1px solid rgba(52,152,219,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 12.5, color: '#2471a3', display: 'flex', alignItems: 'center', gap: 8 }}>
                📋 <span>قم بإعداد الأقسام وإضافة المراحل الدراسية لكل قسم، ثم انتقل إلى <strong>الأعوام الدراسية</strong> ثم <strong>إعداد الفصول</strong></span>
              </div>
            )}
            {/* 1. SECTIONS PANEL */}
            <div className="glass-panel" style={{ padding: '24px 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>🏢 الأقسام والمسارات التعليمية المسجلة</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    الأقسام والمسارات التعليمية المعتمدة للمؤسسة المحددة من بيانات المؤسسة
                  </p>
                </div>
              </div>

              {showSectionForm && (
                <form onSubmit={handleSaveSection} style={{ marginBottom: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{editingSection ? '✏️ تعديل القسم' : '➕ إضافة قسم جديد'}</h4>
                  <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div className="field-group">
                      <label className="field-label">اسم القسم</label>
                      <input type="text" className="field-input" required value={sectionForm.name}
                        onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="مثال: القسم العربي" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">نوع القسم</label>
                      <select className="filter-select" value={sectionForm.type}
                        onChange={e => setSectionForm({ ...sectionForm, type: e.target.value })}>
                        <option value="arabic">عربي (تعليم أساسي ومتقدم باللغة العربية)</option>
                        <option value="languages">لغات / تجريبي (تعليم باللغات الأجنبية)</option>
                        <option value="kindergarten">رياض أطفال (تمهيدي وتأسيسي)</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">وصف القسم / نوعية الدراسة بالقسم</label>
                      <input type="text" className="field-input" value={sectionForm.educationType}
                        onChange={e => setSectionForm({ ...sectionForm, educationType: e.target.value })} placeholder="مثال: لغات، عربي، دولي، فني، دمج" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">الوضعية القانونية</label>
                      <select className="filter-select" value={sectionForm.legalStatus}
                        onChange={e => setSectionForm({ ...sectionForm, legalStatus: e.target.value })}>
                        <option value="حكومي">حكومي</option>
                        <option value="خاص">خاص / استثماري</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-save" style={{ padding: '6px 16px', fontSize: 13 }}><Save size={14} /> حفظ</button>
                    <button type="button" className="btn-cancel" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => setShowSectionForm(false)}><X size={14} /> إلغاء</button>
                  </div>
                </form>
              )}

              <div className="table-scroll">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>اسم القسم</th>
                      <th>حالة القسم في المؤسسة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.filter(sec => sec.is_active === 1 || sec.is_active === true || sec.is_active === '1').length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center', opacity: 0.5, padding: 16 }}>
                          لا توجد أقسام مسجلة ومفعلة حالياً بالمؤسسة.
                        </td>
                      </tr>
                    ) : (
                      sections.filter(sec => sec.is_active === 1 || sec.is_active === true || sec.is_active === '1').map(sec => (
                        <tr key={sec.id} className="table-row">
                          <td style={{ fontWeight: 800, fontSize: 14 }}>{sec.name}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 700,
                              background: 'rgba(16,185,129,0.12)',
                              color: '#10b981',
                              border: '1px solid #10b98130'
                            }}>
                              ✅ قسم معتمد ومسجل بالمؤسسة
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Section Leadership Cards hidden to reduce distraction */}
            </div>

            {/* 2. STAGES PANEL */}
            <div className="glass-panel" style={{ padding: '24px 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>🎓 المراحل الدراسية والصفوف</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>المراحل التعليمية التابعة لكل قسم (مثال الابتدائي، الإعدادي...)</p>
                </div>
                {!showStageForm && (
                  <button className="btn-add-student" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleOpenStageAdd}>
                    <Plus size={14} /> إضافة مرحلة جديدة
                  </button>
                )}
              </div>

              {showStageForm && (
                <form onSubmit={handleSaveStage} style={{ marginBottom: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{editingStage ? '✏️ تعديل المرحلة' : '➕ إضافة مرحلة وصفوف جديدة'}</h4>
                  <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div className="field-group">
                      <label className="field-label">تابع لقسم</label>
                      <select className="filter-select" required value={stageForm.sectionId}
                        onChange={e => setStageForm({ ...stageForm, sectionId: e.target.value })} disabled={editingStage}>
                        <option value="">اختر القسم...</option>
                        {sections.filter(sec => sec.is_active === 1 || sec.is_active === true || sec.is_active === '1').map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">اختر المرحلة التعليمية المكودة ★</label>
                      <select
                        className="field-input"
                        required
                        value={stageForm.stageCode || ''}
                        onChange={e => {
                          const selectedCode = e.target.value;
                          const matchedStage = masterLookups.stages.find(st => st.code === selectedCode || String(st.id) === selectedCode);
                          const name = matchedStage ? matchedStage.name_ar : e.target.value;
                          const code = matchedStage ? matchedStage.code : selectedCode;
                          
                          let defaultYears = 3;
                          if (code === 'primary') defaultYears = 6;
                          else if (code === 'kg') defaultYears = 2;
                          else if (code === 'prep' || code === 'sec') defaultYears = 3;

                          setStageForm({
                            ...stageForm,
                            stageName: name,
                            stageCode: code,
                            yearsCount: defaultYears
                          });
                        }}
                      >
                        <option value="">اختر المرحلة من التكواد المعتمدة...</option>
                        {masterLookups.stages.map(stg => (
                          <option key={stg.id} value={stg.code}>
                            {stg.name_ar} ({stg.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">كود المرحلة الموحد بالنظام</label>
                      <input type="text" className="field-input" readOnly value={stageForm.stageCode} dir="ltr" style={{ background: '#f8fafc', opacity: 0.85 }} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">عدد الصفوف الدراسية بها</label>
                      <input type="number" className="field-input" min={1} max={10} required value={stageForm.yearsCount}
                        onChange={e => setStageForm({ ...stageForm, yearsCount: parseInt(e.target.value) || 3 })} disabled={editingStage} placeholder="عدد الصفوف" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">ترتيب العرض</label>
                      <input type="number" className="field-input" value={stageForm.displayOrder}
                        onChange={e => setStageForm({ ...stageForm, displayOrder: parseInt(e.target.value) || 0 })} placeholder="الترتيب في القوائم" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-save" style={{ padding: '6px 16px', fontSize: 13 }}><Save size={14} /> حفظ</button>
                    <button type="button" className="btn-cancel" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => setShowStageForm(false)}><X size={14} /> إلغاء</button>
                  </div>
                </form>
              )}

              <div className="table-scroll">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>اسم المرحلة</th>
                      <th>كود المرحلة / المدرسة</th>
                      <th>القسم التابع له</th>
                      <th>عدد سنوات الدراسة (الصفوف)</th>
                      <th>ترتيب العرض</th>
                      <th>الحالة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map(stg => (
                      <tr key={stg.id} className="table-row" style={{ opacity: stg.is_active ? 1 : 0.55 }}>
                        <td style={{ fontWeight: 700 }}>{stg.stage_name}</td>
                        <td><code className="student-code">{stg.stage_code || '—'}</code></td>
                        <td>{stg.section_name}</td>
                        <td>{stg.years_count} صفوف دراسية</td>
                        <td>{stg.display_order}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: stg.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                            color: stg.is_active ? '#10b981' : '#ef4444',
                            border: `1px solid ${stg.is_active ? '#10b98130' : '#ef444430'}`
                          }}>
                            {stg.is_active ? '✅ نشط' : '⛔ غير مفعل'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="action-btn view" onClick={() => handleOpenStageEdit(stg)} title="تعديل">
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="action-btn view"
                              style={{
                                borderColor: stg.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
                                color: stg.is_active ? '#ef4444' : '#10b981'
                              }}
                              onClick={() => handleToggleStageActive(stg)}
                              title={stg.is_active ? 'تعطيل (إخفاء من النظام)' : 'تفعيل (إظهار في النظام)'}
                            >
                              {stg.is_active ? '⛔' : '✅'}
                            </button>
                            <button className="action-btn view" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                              onClick={() => handleDeleteStage(stg.id, stg.stage_name)} title="حذف">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stage Leadership Cards hidden to reduce distraction */}
            </div>

          </div>
        )}

        {/* ── ACADEMIC YEARS TAB ──────────────────────────────── */}
        {activeTab === 'academic_years' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {showYearForm ? (
              /* Add/Edit Year Form */
              <form onSubmit={handleSaveYear} className="glass-panel form-body" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3 className="section-title">
                  {editingYear ? '📅 تعديل العام الدراسي' : '📅 إضافة عام دراسي جديد'}
                </h3>
                
                <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div className="field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">تسمية العام الدراسي (أدخل سنة البداية 2026 للاستكمال التلقائي)</label>
                    <input type="text" className="field-input" required value={yearForm.yearLabel}
                      dir="rtl"
                      style={{ textAlign: 'right', direction: 'rtl' }}
                      onChange={e => {
                        const val = e.target.value;
                        const match = val.match(/(\d{4})/);
                        if (match) {
                          const num = parseInt(match[1]);
                          setYearForm(prev => ({
                            ...prev,
                            yearLabel: `${num}/${num + 1}`,
                            startDate: `${num}-09-01`,
                            endDate: `${num + 1}-08-31`
                          }));
                        } else {
                          setYearForm(prev => ({ ...prev, yearLabel: val }));
                        }
                      }} placeholder="مثال: 2026 أو 2026/2027" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">تاريخ البدء (بداية سبتمبر)</label>
                    <input type="date" className="field-input" required value={yearForm.startDate}
                      onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">تاريخ الانتهاء (نهاية أغسطس)</label>
                    <input type="date" className="field-input" required value={yearForm.endDate}
                      onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })} />
                  </div>
                  <div className="field-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <input type="checkbox" id="isCurrentYear" checked={yearForm.isCurrent}
                      onChange={e => setYearForm({ ...yearForm, isCurrent: e.target.checked })} />
                    <label htmlFor="isCurrentYear" className="field-label" style={{ margin: 0, cursor: 'pointer' }}>تعيين كعام دراسي نشط حالياً</label>
                  </div>
                </div>

                <div className="form-footer" style={{ background: 'transparent', padding: '20px 0 0', marginTop: 24 }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowYearForm(false)}><X size={16} /> إلغاء</button>
                  <button type="submit" className="btn-save"><Save size={16} /> حفظ العام الدراسي</button>
                </div>
              </form>
            ) : (
              /* Years List Table */
              <div className="table-container glass-panel">
                <div className="table-scroll">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>العام الدراسي</th>
                        <th>تاريخ البدء</th>
                        <th>تاريخ الانتهاء</th>
                        <th>الحالة</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academicYears.map(y => (
                        <tr key={y.id} className="table-row">
                          <td dir="rtl" style={{ fontWeight: 800, fontSize: 15, textAlign: 'right' }}>{y.year_label}</td>
                          <td dir="rtl" style={{ textAlign: 'right' }}>{y.start_date}</td>
                          <td dir="rtl" style={{ textAlign: 'right' }}>{y.end_date}</td>
                          <td>
                            {y.is_current === 1 || y.is_current === true ? (
                              <span className="status-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid #10b98122' }}>
                                ✓ نشط حالياً
                              </span>
                            ) : (
                              <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                غير نشط
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              {!(y.is_current === 1 || y.is_current === true) && (
                                <button className="action-btn view" style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}
                                  onClick={() => handleSetCurrentYear(y.id)} title="تعيين كعام نشط">
                                  تفعيل
                                </button>
                              )}
                              <button className="action-btn view" onClick={() => handleOpenYearEdit(y)} title="تعديل">
                                <Edit3 size={14} />
                              </button>
                              {!(y.is_current === 1 || y.is_current === true) && (
                                <button className="action-btn view" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                                  onClick={() => handleDeleteYear(y.id, y.year_label)} title="حذف">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isPrintingProfile && (
        <div className="profile-print-overlay" style={{ direction: 'rtl' }}>
          <div className="profile-print-page">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .profile-print-overlay, .profile-print-overlay * {
                  visibility: visible;
                }
                .profile-print-overlay {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: white !important;
                  padding: 0 !important;
                }
                .profile-print-page {
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  width: 100% !important;
                  min-height: auto !important;
                  padding: 10px !important;
                  border: none !important;
                }
              }

              .profile-print-overlay {
                background: rgba(0,0,0,0.85);
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                overflow-y: auto;
                display: flex;
                justify-content: center;
                padding: 40px 20px;
              }

              .profile-print-page {
                background: #ffffff;
                color: #1a1a1a;
                width: 210mm;
                min-height: 297mm;
                padding: 20mm 15mm;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                border-radius: 8px;
                font-family: 'Cairo', 'Arial', sans-serif;
                box-sizing: border-box;
                border: 1px solid #ccc;
              }

              .print-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
              }

              .print-header-right {
                font-size: 11px;
                line-height: 1.6;
                color: #333;
                width: 35%;
              }

              .print-header-center {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 30%;
              }

              .print-logo {
                max-height: 70px;
                max-width: 110px;
                object-fit: contain;
              }

              .print-logo-placeholder {
                font-size: 40px;
              }

              .print-header-left {
                text-align: left;
                font-size: 11px;
                line-height: 1.5;
                width: 35%;
              }

              .print-divider {
                height: 3px;
                background: linear-gradient(to left, #2c3e50, #18bc9c);
                margin-bottom: 20px;
              }

              .print-title-area {
                text-align: center;
                margin-bottom: 25px;
              }

              .print-main-title {
                font-size: 19px;
                font-weight: 800;
                color: #2c3e50;
                margin-bottom: 6px;
              }

              .print-date {
                font-size: 11px;
                color: #666;
              }

              .print-section {
                margin-bottom: 25px;
              }

              .print-section-title {
                font-size: 14px;
                font-weight: 700;
                color: #2c3e50;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 6px;
                margin-bottom: 12px;
                text-align: right;
              }

              .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
                direction: rtl;
              }

              .print-table td {
                padding: 8px 10px;
                border: 1px solid #e0e0e0;
                font-size: 12.5px;
                line-height: 1.5;
                text-align: right;
              }

              .print-label {
                background-color: #f8f9fa;
                font-weight: 700;
                color: #333;
                width: 22%;
              }

              .print-value {
                color: #111;
                width: 28%;
              }

              .print-signatures-area {
                display: flex;
                justify-content: space-between;
                margin-top: 50px;
                padding: 0 15px;
              }

              .signature-box {
                text-align: center;
                width: 45%;
                font-size: 12.5px;
                font-weight: 700;
                color: #333;
              }

              .sig-line {
                margin-top: 55px;
                border-top: 1px dashed #7f8c8d;
                width: 80%;
                margin-left: auto;
                margin-right: auto;
              }
            `}</style>

            {/* Header */}
            <div className="print-header">
              <div className="print-header-right">
                <div>مديرية التربية والتعليم بمحافظة {institutionForm.governorate || '—'}</div>
                <div>إدارة {institutionForm.directorate || '—'} التعليمية</div>
              </div>
              <div className="print-header-center">
                {institutionForm.logoUrl ? (
                  <img src={institutionForm.logoUrl} alt="Logo" className="print-logo" />
                ) : (
                  <div className="print-logo-placeholder">🏫</div>
                )}
              </div>
              <div className="print-header-left" style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 'bold', fontSize: 14 }}>{institutionForm.schoolName || '—'}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{institutionForm.schoolNameEn || '—'}</div>
                <div style={{ marginTop: 8 }}>كود المدرسة: <code style={{ fontSize: 12, fontWeight: 'bold' }}>{institutionForm.schoolCode || '—'}</code></div>
              </div>
            </div>

            <div className="print-divider" />

            {/* Title */}
            <div className="print-title-area">
              <h2 className="print-main-title">بطاقة التعريف الرسمية للمؤسسة التعليمية</h2>
              <span className="print-date">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
            </div>

            {/* Grid of basic data */}
            <div className="print-section">
              <h3 className="print-section-title">🏫 البيانات الأساسية والاتصال</h3>
              <table className="print-table">
                <tbody>
                  <tr>
                    <td className="print-label">اسم المدرسة (عربي):</td>
                    <td className="print-value">{institutionForm.schoolName || '—'}</td>
                    <td className="print-label">اسم المدرسة (إنجليزي):</td>
                    <td className="print-value">{institutionForm.schoolNameEn || '—'}</td>
                  </tr>
                  <tr>
                    <td className="print-label">المحافظة:</td>
                    <td className="print-value">{institutionForm.governorate || '—'}</td>
                    <td className="print-label">الإدارة التعليمية:</td>
                    <td className="print-value">{institutionForm.directorate || '—'}</td>
                  </tr>
                  <tr>
                    <td className="print-label">نوعية التعليم:</td>
                    <td className="print-value">{institutionForm.educationType || '—'}</td>
                    <td className="print-label">العنوان بالتفصيل:</td>
                    <td className="print-value">{institutionForm.address || '—'}</td>
                  </tr>
                  <tr>
                    <td className="print-label">رقم الهاتف:</td>
                    <td className="print-value" dir="ltr">{institutionForm.phone || '—'}</td>
                    <td className="print-label">البريد الإلكتروني:</td>
                    <td className="print-value" dir="ltr">{institutionForm.email || '—'}</td>
                  </tr>
                  <tr>
                    <td className="print-label">الموقع الإلكتروني:</td>
                    <td className="print-value" colSpan={3} dir="ltr">{institutionForm.website || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Leadership / Director */}
            <div className="print-section">
              <h3 className="print-section-title">👤 مدير عام المدرسة</h3>
              <table className="print-table">
                <tbody>
                  <tr>
                    <td className="print-label">اسم مدير المدرسة:</td>
                    <td className="print-value">{institutionForm.directorName || '—'}</td>
                    <td className="print-label">المؤهل العلمي:</td>
                    <td className="print-value">{institutionForm.directorQualification || '—'}</td>
                  </tr>
                  <tr>
                    <td className="print-label">الرقم القومي:</td>
                    <td className="print-value" dir="ltr">{institutionForm.directorNationalId || '—'}</td>
                    <td className="print-label">تليفون المدير:</td>
                    <td className="print-value" dir="ltr">{institutionForm.directorPhone || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Structure / Sections */}
            <div className="print-section">
              <h3 className="print-section-title">🏢 الهيكل التنظيمي والأقسام المعتمدة</h3>
              {sections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 10, color: '#777', fontSize: 13 }}>لا توجد أقسام مسجلة بالمدرسة حالياً.</div>
              ) : (
                sections.map((sec, idx) => (
                  <div key={sec.id} style={{ marginBottom: 12, border: '1px solid #e0e0e0', borderRadius: 6, padding: 10, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 4, marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', color: '#111', fontSize: 13 }}>{idx + 1}. قسم: {sec.name} ({sec.type === 'arabic' ? 'عربي' : sec.type === 'languages' ? 'لغات' : 'رياض أطفال'})</span>
                      <span style={{ fontSize: 11, color: '#555' }}>نوع التعليم: {sec.education_type || '—'} | الوضعية: {sec.legal_status || '—'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 8px', fontSize: 11.5 }}>
                      <div><strong>مدير القسم:</strong> {sec.section_director_name || '—'} {sec.section_director_phone ? `(${sec.section_director_phone})` : ''}</div>
                      <div><strong>وكيل القسم:</strong> {sec.section_deputy_name || '—'} {sec.section_deputy_phone ? `(${sec.section_deputy_phone})` : ''}</div>
                      <div><strong>وكيل شئون الطلاب بالقسم:</strong> {sec.students_vice_name || '—'} {sec.students_vice_phone ? `(${sec.students_vice_phone})` : ''}</div>
                      <div><strong>وكيل شئون العاملين بالقسم:</strong> {sec.staff_vice_name || '—'} {sec.staff_vice_phone ? `(${sec.staff_vice_phone})` : ''}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Signatures */}
            <div className="print-signatures-area">
              <div className="signature-box">
                <div>مسئول الإحصاء وقاعدة البيانات</div>
                <div className="sig-line" />
              </div>
              <div className="signature-box">
                <div>مدير عام المدرسة</div>
                <div style={{ marginTop: 5, fontSize: 12, fontWeight: 'bold' }}>{institutionForm.directorName || '...............'}</div>
                <div className="sig-line" />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── SectionDirectorCard Component ─────────────────────────────
function SectionDirectorCard({ section, onSaved, API }) {
  const [form, setForm] = React.useState({
    sectionDirectorName: section?.section_director_name || '',
    sectionDirectorQualification: section?.section_director_qualification || '',
    sectionDirectorNationalId: section?.section_director_national_id || '',
    sectionDirectorPhone: section?.section_director_phone || '',
    sectionDeputyName: section?.section_deputy_name || '',
    sectionDeputyPhone: section?.section_deputy_phone || '',
    studentsViceName: section?.students_vice_name || '',
    studentsVicePhone: section?.students_vice_phone || '',
    staffViceName: section?.staff_vice_name || '',
    staffVicePhone: section?.staff_vice_phone || '',
  });

  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setForm({
      sectionDirectorName: section?.section_director_name || '',
      sectionDirectorQualification: section?.section_director_qualification || '',
      sectionDirectorNationalId: section?.section_director_national_id || '',
      sectionDirectorPhone: section?.section_director_phone || '',
      sectionDeputyName: section?.section_deputy_name || '',
      sectionDeputyPhone: section?.section_deputy_phone || '',
      studentsViceName: section?.students_vice_name || '',
      studentsVicePhone: section?.students_vice_phone || '',
      staffViceName: section?.staff_vice_name || '',
      staffVicePhone: section?.staff_vice_phone || '',
    });
  }, [section]);

  React.useEffect(() => {
    let timer;
    if (saved) timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleInputChange = (field, value) => {
    if (error) setError('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError('');
    if (form.sectionDirectorNationalId && form.sectionDirectorNationalId.trim().length !== 14) {
      setError('الرقم القومي لمدير القسم يجب أن يتكون من 14 رقماً.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: section.name,
          type: section.type,
          educationType: section.education_type || '',
          legalStatus: section.legal_status || 'حكومي',
          ...form,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل حفظ بيانات قيادات القسم.');

      setSaved(true);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!section) return null;

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: '18px 22px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent-primary)', marginBottom: 14 }}>
        🏢 {section.name} <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({section.type === 'arabic' ? 'عربي' : section.type === 'languages' ? 'لغات' : 'رياض أطفال'})</span>
      </div>

      {/* Director Block */}
      <h5 style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '1px dashed var(--border-color)', paddingBottom: 4 }}>
        👤 مدير القسم
      </h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 14px', marginBottom: 16 }}>
        <div className="field-group">
          <label className="field-label">اسم مدير القسم</label>
          <input className="field-input" value={form.sectionDirectorName} onChange={e => handleInputChange('sectionDirectorName', e.target.value)} placeholder="الاسم رباعياً" />
        </div>
        <div className="field-group">
          <label className="field-label">المؤهل</label>
          <input className="field-input" value={form.sectionDirectorQualification} onChange={e => handleInputChange('sectionDirectorQualification', e.target.value)} placeholder="بكالوريوس..." />
        </div>
        <div className="field-group">
          <label className="field-label">الرقم القومي</label>
          <input className="field-input" value={form.sectionDirectorNationalId} dir="ltr" maxLength={14} onChange={e => handleInputChange('sectionDirectorNationalId', e.target.value.replace(/\D/g, ''))} placeholder="14 رقماً" />
        </div>
        <div className="field-group">
          <label className="field-label">الهاتف</label>
          <input className="field-input" value={form.sectionDirectorPhone} dir="ltr" onChange={e => handleInputChange('sectionDirectorPhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="01xxxxxxxxx" />
        </div>
      </div>

      {/* Deputies / Vices Block */}
      <h5 style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '1px dashed var(--border-color)', paddingBottom: 4 }}>
        👔 وكلاء القسم الإداريين
      </h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 14px' }}>
        {/* Section Deputy */}
        <div className="field-group" style={{ background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <label className="field-label" style={{ fontWeight: 700 }}>وكيل القسم</label>
          <input className="field-input" style={{ marginBottom: 6 }} value={form.sectionDeputyName} onChange={e => handleInputChange('sectionDeputyName', e.target.value)} placeholder="اسم وكيل القسم" />
          <input className="field-input" dir="ltr" value={form.sectionDeputyPhone} onChange={e => handleInputChange('sectionDeputyPhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="تليفون وكيل القسم" />
        </div>

        {/* Student Affairs Vice */}
        <div className="field-group" style={{ background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <label className="field-label" style={{ fontWeight: 700 }}>وكيل شئون الطلاب بالقسم</label>
          <input className="field-input" style={{ marginBottom: 6 }} value={form.studentsViceName} onChange={e => handleInputChange('studentsViceName', e.target.value)} placeholder="اسم وكيل شئون الطلاب" />
          <input className="field-input" dir="ltr" value={form.studentsVicePhone} onChange={e => handleInputChange('studentsVicePhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="تليفون وكيل شئون الطلاب" />
        </div>

        {/* Staff/HR Vice */}
        <div className="field-group" style={{ background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <label className="field-label" style={{ fontWeight: 700 }}>وكيل شئون العاملين بالقسم</label>
          <input className="field-input" style={{ marginBottom: 6 }} value={form.staffViceName} onChange={e => handleInputChange('staffViceName', e.target.value)} placeholder="اسم وكيل شئون العاملين" />
          <input className="field-input" dir="ltr" value={form.staffVicePhone} onChange={e => handleInputChange('staffVicePhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="تليفون وكيل شئون العاملين" />
        </div>
      </div>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>⚠️ {error}</div>}

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-save" style={{ fontSize: 13, padding: '7px 18px' }} onClick={handleSave} disabled={saving}>
          {saving ? '⏳ جاري الحفظ...' : saved ? '✓ تم حفظ قيادات القسم' : '💾 حفظ قيادات القسم'}
        </button>
      </div>
    </div>
  );
}

// ── StageDirectorCard Component ───────────────────────────────
function StageDirectorCard({ stage, onSaved, API }) {
  const [form, setForm] = React.useState({
    stageDirectorName: stage?.stage_director_name || '',
    stageDirectorQualification: stage?.stage_director_qualification || '',
    stageDirectorNationalId: stage?.stage_director_national_id || '',
    stageDirectorPhone: stage?.stage_director_phone || '',
    stageDeputyName: stage?.stage_deputy_name || '',
    stageDeputyPhone: stage?.stage_deputy_phone || '',
    stageStudentsViceName: stage?.stage_students_vice_name || '',
    stageStudentsVicePhone: stage?.stage_students_vice_phone || '',
    stageStaffViceName: stage?.stage_staff_vice_name || '',
    stageStaffVicePhone: stage?.stage_staff_vice_phone || '',
  });

  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setForm({
      stageDirectorName: stage?.stage_director_name || '',
      stageDirectorQualification: stage?.stage_director_qualification || '',
      stageDirectorNationalId: stage?.stage_director_national_id || '',
      stageDirectorPhone: stage?.stage_director_phone || '',
      stageDeputyName: stage?.stage_deputy_name || '',
      stageDeputyPhone: stage?.stage_deputy_phone || '',
      stageStudentsViceName: stage?.stage_students_vice_name || '',
      stageStudentsVicePhone: stage?.stage_students_vice_phone || '',
      stageStaffViceName: stage?.stage_staff_vice_name || '',
      stageStaffVicePhone: stage?.stage_staff_vice_phone || '',
    });
  }, [stage]);

  React.useEffect(() => {
    let timer;
    if (saved) timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleInputChange = (field, value) => {
    if (error) setError('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError('');
    if (form.stageDirectorNationalId && form.stageDirectorNationalId.trim().length !== 14) {
      setError('الرقم القومي لمدير المرحلة يتكون من 14 رقماً.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/stages/${stage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageName: stage.stage_name,
          yearsCount: stage.years_count,
          displayOrder: stage.display_order || 0,
          ...form,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'تعذر حفظ بيانات قيادات المرحلة.');

      setSaved(true);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  if (!stage) return null;

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: '18px 22px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent-primary)', marginBottom: 14 }}>
        🎓 {stage.stage_name} {stage.section_name && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({stage.section_name})</span>}
      </div>

      {/* Stage Director Block */}
      <h5 style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '1px dashed var(--border-color)', paddingBottom: 4 }}>
        👤 مدير المرحلة
      </h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 14px', marginBottom: 16 }}>
        <div className="field-group">
          <label className="field-label">اسم مدير المرحلة</label>
          <input className="field-input" value={form.stageDirectorName} onChange={e => handleInputChange('stageDirectorName', e.target.value)} placeholder="الاسم رباعياً" />
        </div>
        <div className="field-group">
          <label className="field-label">المؤهل</label>
          <input className="field-input" value={form.stageDirectorQualification} onChange={e => handleInputChange('stageDirectorQualification', e.target.value)} placeholder="بكالوريوس تربية..." />
        </div>
        <div className="field-group">
          <label className="field-label">الرقم القومي</label>
          <input className="field-input" value={form.stageDirectorNationalId} dir="ltr" maxLength={14} onChange={e => handleInputChange('stageDirectorNationalId', e.target.value.replace(/\D/g, ''))} placeholder="14 رقماً" />
        </div>
        <div className="field-group">
          <label className="field-label">الهاتف</label>
          <input className="field-input" value={form.stageDirectorPhone} dir="ltr" onChange={e => handleInputChange('stageDirectorPhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="01xxxxxxxxx" />
        </div>
      </div>

      {/* Stage Deputies / Vices Block */}
      <h5 style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '1px dashed var(--border-color)', paddingBottom: 4 }}>
        👔 وكلاء المرحلة
      </h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 14px' }}>
        {/* Stage Deputy */}
        <div className="field-group" style={{ background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <label className="field-label" style={{ fontWeight: 700 }}>وكيل المرحلة</label>
          <input className="field-input" style={{ marginBottom: 6 }} value={form.stageDeputyName} onChange={e => handleInputChange('stageDeputyName', e.target.value)} placeholder="اسم وكيل المرحلة" />
          <input className="field-input" dir="ltr" value={form.stageDeputyPhone} onChange={e => handleInputChange('stageDeputyPhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="تليفون وكيل المرحلة" />
        </div>

        {/* Stage Student Affairs Vice */}
        <div className="field-group" style={{ background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <label className="field-label" style={{ fontWeight: 700 }}>وكيل شئون الطلاب بالمرحلة</label>
          <input className="field-input" style={{ marginBottom: 6 }} value={form.stageStudentsViceName} onChange={e => handleInputChange('stageStudentsViceName', e.target.value)} placeholder="اسم وكيل شئون الطلاب" />
          <input className="field-input" dir="ltr" value={form.stageStudentsVicePhone} onChange={e => handleInputChange('stageStudentsVicePhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="تليفون وكيل شئون الطلاب" />
        </div>

        {/* Stage Staff/HR Vice */}
        <div className="field-group" style={{ background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <label className="field-label" style={{ fontWeight: 700 }}>وكيل شئون العاملين بالمرحلة</label>
          <input className="field-input" style={{ marginBottom: 6 }} value={form.stageStaffViceName} onChange={e => handleInputChange('stageStaffViceName', e.target.value)} placeholder="اسم وكيل شئون العاملين" />
          <input className="field-input" dir="ltr" value={form.stageStaffVicePhone} onChange={e => handleInputChange('stageStaffVicePhone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="تليفون وكيل شئون العاملين" />
        </div>
      </div>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>⚠️ {error}</div>}

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-save" style={{ fontSize: 13, padding: '7px 18px' }} onClick={handleSave} disabled={saving}>
          {saving ? '⏳ جاري الحفظ...' : saved ? '✓ تم حفظ قيادات المرحلة' : '💾 حفظ قيادات المرحلة'}
        </button>
      </div>
    </div>
  );
}
