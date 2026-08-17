import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, Shield, Lock, UserPlus, Key, Save, Trash2, 
  Edit3, CheckCircle2, AlertCircle, X, ShieldAlert, BookOpen, Plus,
  Calendar, Building, Printer, RotateCcw
} from 'lucide-react';
import API_BASE_URL from '../../config/api';
import { useToast } from '../../context/ToastContext';
import { formatClassroomLabel } from '../../utils/classroomFormatter';

const API = `${API_BASE_URL}/settings`;

export default function SettingsPage({ 
  initialTab = 'institution', 
  allowedTabs = ['institution', 'sections_stages', 'classrooms', 'academic_years', 'users', 'roles', 'perms', 'system_reset'] 
}) {
  const toast = useToast();
  const [activeTab,    setActiveTab]    = useState(initialTab);
  const [users,        setUsers]        = useState([]);
  const [roles,        setRoles]        = useState([]);
  const [perms,               setPerms]               = useState([]);
  const [staffList,           setStaffList]           = useState([]);
  const [governoratesList,    setGovernoratesList]    = useState([
    { id: 1, name_ar: 'القاهرة' },
    { id: 2, name_ar: 'الجيزة' },
    { id: 3, name_ar: 'الإسكندرية' },
    { id: 4, name_ar: 'الأقصر' },
    { id: 5, name_ar: 'أسوان' },
    { id: 6, name_ar: 'الدقهلية' },
    { id: 7, name_ar: 'البحيرة' },
    { id: 8, name_ar: 'الفيوم' },
    { id: 9, name_ar: 'الغربية' },
    { id: 10, name_ar: 'الإسماعيلية' },
    { id: 11, name_ar: 'المنوفية' },
    { id: 12, name_ar: 'المنيا' },
    { id: 13, name_ar: 'القليوبية' },
    { id: 14, name_ar: 'السويس' },
    { id: 15, name_ar: 'الشرقية' },
    { id: 16, name_ar: 'أسيوط' },
    { id: 17, name_ar: 'بني سويف' },
    { id: 18, name_ar: 'بورسعيد' },
    { id: 19, name_ar: 'دمياط' },
    { id: 20, name_ar: 'الوادي الجديد' },
    { id: 21, name_ar: 'شمال سيناء' },
    { id: 22, name_ar: 'جنوب سيناء' },
    { id: 23, name_ar: 'كفر الشيخ' },
    { id: 24, name_ar: 'مطروح' },
    { id: 25, name_ar: 'قنا' },
    { id: 26, name_ar: 'سوهاج' },
    { id: 27, name_ar: 'البحر الأحمر' }
  ]);
  const [administrationsList, setAdministrationsList] = useState([]);
  const [isCustomAdmin,       setIsCustomAdmin]       = useState(false);
  const [loading,             setLoading]             = useState(true);

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
  const [selectedStartYear, setSelectedStartYear] = useState('2026');
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

  // Role Matrix & Custom Roles State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalForm, setRoleModalForm] = useState({ roleName: '', roleNameAr: '', description: '' });
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState('all');

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

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetAdminPassword, setResetAdminPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleExecuteReset = async (e) => {
    e.preventDefault();
    if (resetConfirmText !== 'إعادة تهيئة النظام بالكامل') {
      setResetError('يرجى كتابة نص التأكيد بدقة: "إعادة تهيئة النظام بالكامل"');
      return;
    }
    if (!resetAdminPassword) {
      setResetError('يرجى إدخال كلمة مرور مسؤول النظام للتأكيد.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch(`${API_BASE_URL}/setup/reset-institution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: resetConfirmText, password: resetAdminPassword })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل تصفير النظام');

      alert(data.message || 'تم إعادة تهيئة وتصفير النظام بنجاح!');
      window.location.reload();
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const loadData = () => {
    setLoading(true);

    const safeJson = (promise, label) =>
      promise
        .then(r => {
          if (!r.ok) return { success: false, _error: `${label}: HTTP ${r.status}` };
          return r.json().catch(() => ({ success: false, _error: `${label}: invalid JSON` }));
        })
        .catch(e => ({ success: false, _error: `${label}: ${e.message}` }));

    Promise.all([
      safeJson(fetch(`${API}/users`),                                       'users'),
      safeJson(fetch(`${API}/roles`),                                       'roles'),
      safeJson(fetch(`${API}/permissions`),                                 'permissions'),
      safeJson(fetch(`${API_BASE_URL}/students/form-options`),              'form-options'),
      safeJson(fetch(`${API}/academic-years`),                              'academic-years'),
      safeJson(fetch(`${API}/institution`),                                 'institution'),
      safeJson(fetch(`${API}/sections`),                                    'sections'),
      safeJson(fetch(`${API}/stages`),                                      'stages'),
      safeJson(fetch(`${API_BASE_URL}/setup/master-structure-lookups`),     'master-lookups'),
    ])
      .then(([userData, roleData, permData, optData, yearsData, instData, secData, stageData, masterData]) => {
        // Collect errors for feedback
        const failures = [
          { name: 'المستخدمين', d: userData },
          { name: 'الأدوار', d: roleData },
          { name: 'الصلاحيات', d: permData },
          { name: 'خيارات النماذج', d: optData },
          { name: 'السنوات الدراسية', d: yearsData },
          { name: 'بيانات المؤسسة', d: instData },
          { name: 'الأقسام', d: secData },
          { name: 'المراحل', d: stageData },
          { name: 'الهيكل الرئيسي', d: masterData },
        ].filter(item => item.d._error || (item.d.success === false));

        if (failures.length > 0) {
          console.warn('[Settings loadData failures]:', failures);
          const errList = failures.map(f => f.d.error || f.d._error || f.name).join(', ');
          toast.error(`تعذر تحميل بعض الإعدادات: (${errList})`);
        }

        if (masterData.success && masterData.masterLookups) {
          setMasterLookups(masterData.masterLookups);
        }
        if (userData.success) setUsers(userData.users);
        if (roleData.success)  setRoles(roleData.roles);
        if (permData.success)  setPerms(permData.permissions);
        if (optData.success) {
          setFormOpts(optData);
          const cur = optData.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
          setClassroomFilters(f => ({
            ...f,
            academicYearId: f.academicYearId || (cur ? String(cur.id) : ''),
          }));
        }
        if (yearsData.success) {
          setAcademicYears(yearsData.academicYears);
          const cur = yearsData.academicYears?.find(y => y.is_current === 1 || y.is_current === true) || yearsData.academicYears[0];
          if (cur && cur.year_label) {
            const m = cur.year_label.match(/(\d{4})/);
            if (m) setSelectedStartYear(m[1]);
          }
        }
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
        if (instData.staffList) setStaffList(instData.staffList);
        if (instData.governorates) setGovernoratesList(instData.governorates);
        if (instData.administrations) setAdministrationsList(instData.administrations);
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
      .catch(err => {
        console.error('[Settings loadData] Unexpected error:', err);
        toast.error('فشل تحميل الإعدادات: ' + (err.message || 'خطأ غير متوقع'));
      })
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
          toast.error(data.error || 'فشل تحميل الفصول.');
        }
      })
      .catch(() => toast.error('تعذر الاتصال بالخادم لتحميل الفصول.'));
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

    if (userForm.nationalId.length !== 14 || isNaN(userForm.nationalId)) {
      toast.error('الرقم القومي يجب أن يكون 14 رقماً.'); return;
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

      toast.success(data.message || 'تم حفظ المستخدم بنجاح.');
      setShowForm(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.username === 'admin') return alert('لا يمكن حذف الحساب الرئيسي.');
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${user.full_name}"؟`)) return;
    try {
      const res = await fetch(`${API}/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المستخدم.');
      toast.success(data.message || 'تم حذف المستخدم بنجاح.');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleRolePermission = async (role, permissionId) => {
    if (role.role_name === 'super_admin') return;
    const currentPermIds = role.permissions?.map(p => p.id) || [];
    const isGranted = currentPermIds.includes(permissionId);
    const newPermIds = isGranted 
      ? currentPermIds.filter(id => id !== permissionId)
      : [...currentPermIds, permissionId];

    // Optimistic UI update
    setRoles(prevRoles => prevRoles.map(r => {
      if (r.id === role.id) {
        const matchingPerm = perms.find(p => p.id === permissionId);
        const updatedPerms = isGranted 
          ? (r.permissions || []).filter(p => p.id !== permissionId)
          : [...(r.permissions || []), matchingPerm].filter(Boolean);
        return { ...r, permissions: updatedPerms };
      }
      return r;
    }));

    try {
      const res = await fetch(`${API}/roles/${role.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: newPermIds })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل حفظ الصلاحية');
    } catch (err) {
      toast.error(err.message);
      loadData();
    }
  };

  const handleCreateCustomRole = async (e) => {
    e.preventDefault();
    if (!roleModalForm.roleNameAr.trim()) return toast.error('يرجى كتابة مسمى الدور الوظيفي.');
    try {
      const autoKey = roleModalForm.roleName?.trim() || `role_${Date.now()}`;
      const res = await fetch(`${API}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleName: autoKey,
          roleNameAr: roleModalForm.roleNameAr,
          description: roleModalForm.description,
          permissionIds: []
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل إنشاء الدور');
      toast.success(data.message || 'تم إنشاء الدور الوظيفي بنجاح.');
      setShowRoleModal(false);
      setRoleModalForm({ roleName: '', roleNameAr: '', description: '' });
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCustomRole = async (role) => {
    if (!window.confirm(`هل أنت متأكد من حذف الدور الوظيفي "${role.role_name_ar}"؟`)) return;
    try {
      const res = await fetch(`${API}/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل حذف الدور');
      toast.success(data.message || 'تم حذف الدور بنجاح.');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Classroom Handlers ────────────────────────────────
  // Compute generated names preview based on naming style + count
  // ── Classroom Handlers ────────────────────────────────
  // Compute generated names & class codes preview based on naming style + count, skipping existing names
  const getGeneratedClassItems = (gradeId) => {
    const grade = formOpts.grades?.find(g => String(g.id) === String(gradeId));
    const gradeNum = grade?.grade_number || 1;
    const stage = formOpts.stages?.find(s => String(s.id) === String(grade?.stage_id));
    const section = formOpts.sections?.find(s => String(s.id) === String(classroomFilters.sectionId || grade?.section_id));

    let stageCode = 3;
    if (stage) {
      const sn = stage.stage_name || '';
      if (sn.includes('تمهيدي'))        stageCode = 1;
      else if (sn.includes('رياض') || sn.includes('حضانة')) stageCode = 2;
      else if (sn.includes('ابتدائي')) stageCode = 3;
      else if (sn.includes('إعدادي') || sn.includes('اعدادي')) stageCode = 4;
      else if (sn.includes('ثانوي'))   stageCode = 5;
    }

    let secCode = 1;
    if (section) {
      const secName = section.name || section.section_name || '';
      if (secName.includes('لغات') || section.code === 'languages') secCode = 2;
      else if (secName.includes('دولي') || section.code === 'international') secCode = 3;
    }

    const existingNums = new Set(classrooms.map(c => Number(c.class_number || extractClassNumber(c.class_name))));
    const items = [];
    let i = 1;
    const targetTotal = Math.max(1, parseInt(bulkForm.count) || 1);
    const existingCount = classrooms.length;
    const neededCount = Math.max(0, targetTotal - existingCount);

    if (neededCount === 0) return [];

    while (items.length < neededCount && i <= 150) {
      if (!existingNums.has(i)) {
        const classNumStr = String(i).padStart(2, '0');
        const classCode = `${secCode}${stageCode}${gradeNum}${classNumStr}`;
        const formatted = formatClassroomLabel({
          classNumber: i,
          gradeNumber: gradeNum,
          stageCode: String(stageCode),
          stageName: stage?.stage_name,
          sectionType: section?.type || section?.code
        });

        items.push({
          name: `فصل ${i}`,
          formattedName: formatted,
          classCode,
          classNum: i
        });
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
    return items.map(item => `فصل ${item.classNum} ➔ ${item.formattedName} (${item.classCode})`);
  };

  const handleBulkCreate = async () => {
    if (!classroomFilters.gradeId || !classroomFilters.academicYearId) {
      toast.error('يرجى اختيار الصف الدراسي والعام الدراسي أولاً.'); return;
    }
    const targetTotal = Math.max(1, parseInt(bulkForm.count) || 1);
    const existingCount = classrooms.length;

    if (targetTotal <= existingCount) {
      toast.error(`الصف يحتوي بالفعل على ${existingCount} فصل. لا داعي للإضافة لأن العدد المستهدف المطلوب (${targetTotal}) مستوفى بالفعل.`); return;
    }

    const items = getGeneratedClassItems(classroomFilters.gradeId);
    if (items.length === 0) {
      toast.error('لم يتم التمكن من توليد فصول جديدة فريدة.'); return;
    }

    setBulkCreating(true);
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
            classNumber: item.classNum,
            className: item.name,
            classCode: item.classCode,
            capacity: safeCap,
          }),
        });
        const data = await res.json();
        if (data.success) created++;
        else skipped.push(`فصل ${item.classNum}`);
      } catch { skipped.push(`فصل ${item.classNum}`); }
    }
    setBulkCreating(false);
    if (created > 0) {
      toast.success(`تم إضافة ${created} فصل جديد لتكملة الفصول المسجلة سابقاً (${existingCount}) ليكون إجمالي الفصول (${existingCount + created}) فصلاً بنجاح${skipped.length ? ` (تم تخطي المكرر: ${skipped.join(', ')})` : ''}.`);
    } else {
      toast.error('لم يتم إضافة أي فصل. ربما تكون جميع الأسماء المقترحة مسجلة بالفعل.');
    }
    loadClassrooms();
  };

  const handleSaveEditClassroom = async () => {
    const num = parseInt(editForm.classNumber, 10);
    if (!num || isNaN(num) || num < 1) { toast.error('رقم الفصل يجب أن يكون عدداً موجباً.'); return; }
    const safeCap = editForm.capacity ? Math.min(49, Math.max(1, parseInt(editForm.capacity) || 40)) : 40;
    try {
      const res = await fetch(`${API}/classrooms/${editingClassroom}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classNumber: num,
          className: editForm.className?.trim() || `فصل ${num}`,
          capacity: safeCap
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث الفصل.');
      toast.success('تم تحديث بيانات الفصل بنجاح.');
      setEditingClassroom(null);
      loadClassrooms();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteClassroom = async (cls) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفصل "${cls.class_name}"؟`)) return;
    try {
      const res = await fetch(`${API}/classrooms/${cls.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الفصل.');
      toast.success(data.message || 'تم حذف الفصل بنجاح.');
      loadClassrooms();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteAllGradeClassrooms = async (confirmUnenroll = false) => {
    if (!classroomFilters.gradeId || !classroomFilters.academicYearId) return;
    const grade = formOpts.grades?.find(g => String(g.id) === String(classroomFilters.gradeId));
    const gradeName = grade?.grade_name_ar || 'الصف';

    if (!confirmUnenroll) {
      if (!window.confirm(`هل أنت متأكد من حذف كافة فصول (${gradeName})؟`)) return;
    }
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

      toast.success(data.message || 'تم حذف كافة فصول الصف بنجاح.');
      loadClassrooms();
    } catch (err) {
      toast.error(err.message);
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
      toast.success(data.message || 'تم حفظ القسم بنجاح.');
      setShowSectionForm(false);
      window.dispatchEvent(new Event('sections-updated'));
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteSection = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف القسم "${name}"؟`)) return;
    try {
      const res = await fetch(`${API}/sections/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف القسم.');
      toast.success(data.message || 'تم حذف القسم بنجاح.');
      window.dispatchEvent(new Event('sections-updated'));
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleToggleSectionActive = async (sec) => {
    try {
      const res = await fetch(`${API}/sections/${sec.id}/toggle-active`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة القسم.');
      toast.success(data.message);
      window.dispatchEvent(new Event('sections-updated'));
      loadData();
    } catch (err) { toast.error(err.message); }
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
      toast.success(data.message || 'تم حفظ المرحلة بنجاح.');
      setShowStageForm(false);
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteStage = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف المرحلة "${name}" وكل الصفوف التابعة لها؟`)) return;
    try {
      const res = await fetch(`${API}/stages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المرحلة.');
      toast.success(data.message || 'تم حذف المرحلة بنجاح.');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleToggleStageActive = async (stg) => {
    try {
      const res = await fetch(`${API}/stages/${stg.id}/toggle-active`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة المرحلة.');
      toast.success(data.message);
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleAddSectionInline = () => {
    const availableTypes = [
      { code: 'arabic', name: 'القسم العربي' },
      { code: 'languages', name: 'قسم اللغات' },
      { code: 'international', name: 'القسم الدولي' }
    ].filter(t => !sections.some(s => s.type === t.code));

    if (availableTypes.length === 0) {
      alert('جميع الأقسام القياسية الثلاثة (عربي - لغات - دولي) مسجلة بالفعل بالمدرسة.');
      return;
    }

    const nextType = availableTypes[0];
    setSections(prev => [
      ...prev,
      {
        id: 'temp_' + Date.now(),
        name: nextType.name,
        type: nextType.code,
        education_type: nextType.name,
        legal_status: 'حكومي'
      }
    ]);
  };

  const handleDeleteSectionInline = async (id) => {
    if (sections.length <= 1) {
      alert('يجب إبقاء قسم واحد على الأقل للمؤسسة.');
      return;
    }
    if (!window.confirm('هل أنت متأكد من إلغاء/حذف هذا القسم من المؤسسة؟')) return;
    try {
      const res = await fetch(`${API}/sections/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل حذف القسم');
      toast.success('تم حذف القسم بنجاح');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
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

    if (!institutionForm.schoolName || !institutionForm.schoolName.trim()) {
      toast.error('كود واسم المدرسة حقول ملزمة.');
      return;
    }
    try {
      const res = await fetch(`${API}/institution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...institutionForm,
          sections: sections
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ بيانات المؤسسة.');

      toast.success('✅ تم حفظ بيانات المؤسسة والأقسام المعتمدة بنجاح!');
      loadData();
    } catch (err) {
      toast.error(err.message);
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

      toast.success(data.message || 'تم حفظ العام الدراسي بنجاح.');
      setShowYearForm(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteYear = async (id, label) => {
    if (!window.confirm(`هل أنت متأكد من حذف العام الدراسي "${label}"؟`)) return;
    try {
      const res = await fetch(`${API}/academic-years/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف العام الدراسي.');
      toast.success(data.message || 'تم حذف العام الدراسي بنجاح.');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSetCurrentYear = async (id) => {
    const targetYear = academicYears.find(y => y.id === id);
    const label = targetYear?.year_label || '';
    if (!window.confirm(`⚠️ تنبيه هام:\nتغيير السنة الدراسية الحالية إلى "${label}" سينعكس على كافة شاشات وبيانات البرنامج وسيصبح هو العام النشط للنظام.\n\nهل تريد الاستمرار؟`)) return;
    try {
      const res = await fetch(`${API}/academic-years/${id}/set-current`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تعيين العام الدراسي النشط.');
      toast.success(data.message || 'تم تعيين العام الدراسي النشط بنجاح.');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const activeSections = formOpts.sections || [];
  const selectedSectionId = classroomFilters.sectionId || (activeSections.length === 1 ? String(activeSections[0].id) : '');

  const filteredStages = formOpts.stages?.filter(s => {
    if (selectedSectionId) {
      return String(s.section_id) === String(selectedSectionId);
    }
    return activeSections.some(sec => String(sec.id) === String(s.section_id));
  }) || [];

  const selectedStageId = classroomFilters.stageId || (filteredStages.length === 1 ? String(filteredStages[0].id) : '');

  const filteredGrades = formOpts.grades?.filter(g => {
    if (selectedStageId) {
      return String(g.stage_id) === String(selectedStageId);
    }
    return filteredStages.some(st => String(st.id) === String(g.stage_id));
  }) || [];

  useEffect(() => {
    if (formOpts.academicYears?.length) {
      const cur = formOpts.academicYears.find(y => y.is_current === 1 || y.is_current === true) || formOpts.academicYears[0];
      if (cur && !classroomFilters.academicYearId) {
        setClassroomFilters(f => ({ ...f, academicYearId: String(cur.id) }));
      }
    }
    if (formOpts.sections?.length === 1 && !classroomFilters.sectionId) {
      setClassroomFilters(f => ({ ...f, sectionId: String(formOpts.sections[0].id) }));
    }
  }, [formOpts.academicYears, formOpts.sections]);

  useEffect(() => {
    if (filteredStages.length === 1 && (!classroomFilters.stageId || classroomFilters.stageId !== String(filteredStages[0].id))) {
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
                sub: 'البيانات الرسمية والتبعية الجغرافية والشعار والترويسة المعتمدة للتقارير والشهادات'
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
            📅 الأعوام الدراسية
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
        {allowedTabs.includes('system_reset') && (
          <button className={`form-tab ${activeTab === 'system_reset' ? 'active' : ''}`} onClick={() => { setActiveTab('system_reset'); setShowForm(false); }} style={{ color: '#ef4444', fontWeight: 800 }}>
            💣 تصفير وإعادة تهيئة النظام
          </button>
        )}
      </div>



      {/* ── Tab Content ─────────────────────────────────── */}
      <div className="settings-content-wrapper">
        
        {/* ── DANGER ZONE RESET TAB ──────────────────────── */}
        {activeTab === 'system_reset' && (
          <div className="glass-panel form-body" style={{ border: '2px solid #ef4444', background: 'rgba(254, 242, 242, 0.4)', borderRadius: 12, padding: 24 }}>
            <h3 className="section-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, borderBottom: '1px solid #fca5a5', paddingBottom: 12 }}>
              💣 تصفير وإعادة تهيئة النظام بالكامل (Factory Reset)
            </h3>
            <p style={{ color: '#991b1b', fontSize: 13.5, lineHeight: 1.7, marginBottom: 20 }}>
              ⚠️ <strong>تحذير عالي الخطورة:</strong> هذه العملية تقوم بمسح وتصفير كافة البيانات التشغيلية بالمؤسسة (الطلاب، الكنترول، الدرجات، الفصول، المعلمين، السجلات المالية)، وتلقائياً تحويل البرنامج لـ <strong>معالج التهيئة الأولى (Setup Wizard)</strong> لتجهيز مدرسة جديدة من الصفر.<br/>
              🔒 <strong>النسخ الاحتياطي التلقائي:</strong> سيقوم النظام تلقائياً بأخذ نسخة احتياطية من قاعدة البيانات وتخزينها في مجلد النسخ الاحتياطية قبل التصفير لحمايتك من فقدان البيانات بالخطأ.
            </p>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 10, border: '1px solid #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>إعادة ضبط المصنع وتفريغ السجلات</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>يتطلب إدخال كلمة مرور مسؤول النظام والتأكيد النصي الصريح.</div>
              </div>
              <button 
                type="button" 
                onClick={() => { setIsResetModalOpen(true); setResetError(''); setResetConfirmText(''); setResetAdminPassword(''); }} 
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)' }}
              >
                🗑️ تصفير وإعادة تهيئة النظام
              </button>
            </div>
          </div>
        )}
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

        {/* ── ENTERPRISE RBAC PERMISSIONS MATRIX TAB ────────────── */}
        {activeTab === 'roles' && (() => {
          const PERM_CATEGORIES = [
            { key: 'students', label: '🎒 قطاع شؤون الطلاب', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
            { key: 'staff',    label: '👥 قطاع شؤون العاملين (HR)', color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
            { key: 'control',  label: '📝 قطاع الكنترول والامتحانات', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            { key: 'finance',  label: '💰 قطاع الحسابات والخزينة', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
            { key: 'admin',    label: '⚙️ إدارة النظام والأمان', color: '#ec4899', bg: 'rgba(236,72,153,0.08)' }
          ];

          const filteredCategories = matrixCategoryFilter === 'all'
            ? PERM_CATEGORIES
            : PERM_CATEGORIES.filter(c => c.key === matrixCategoryFilter);

          return (
            <div className="glass-panel" style={{ padding: '24px 28px' }}>
              {/* Matrix Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    🛡️ مصفوفة الصلاحيات والأدوار الوظيفية (Enterprise RBAC Matrix)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    التحكم المركزي في صلاحيات الوصول لجميع قطاعات المنظومة بنقرة واحدة مع الحفظ اللحظي.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn-add-student"
                    style={{ padding: '8px 16px', fontSize: 12.5 }}
                    onClick={() => { setShowRoleModal(true); setRoleModalForm({ roleName: '', roleNameAr: '', description: '' }); }}
                  >
                    <Plus size={15} /> إضافة دور وظيفي مخصص
                  </button>
                </div>
              </div>

              {/* Sector Filter Bar */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setMatrixCategoryFilter('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: matrixCategoryFilter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    color: matrixCategoryFilter === 'all' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  🌐 كافة القطاعات ({perms.length})
                </button>
                {PERM_CATEGORIES.map(cat => {
                  const count = perms.filter(p => p.category === cat.key || p.perm_key.startsWith(cat.key)).length;
                  const isActive = matrixCategoryFilter === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setMatrixCategoryFilter(cat.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: 'none',
                        background: isActive ? cat.color : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Interactive Matrix Table */}
              <div className="table-scroll" style={{ maxHeight: '680px', overflowY: 'auto' }}>
                <table className="students-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                    <tr>
                      <th style={{ minWidth: 260, textAlign: 'right', padding: '12px 16px' }}>الصلاحية والإجراء الأمني</th>
                      {roles.map(r => (
                        <th key={r.id} style={{ minWidth: 120, textAlign: 'center', padding: '12px 8px' }}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{r.role_name_ar}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.role_name}</div>
                          {!['super_admin', 'data_entry', 'hr_officer', 'head_control', 'accountant', 'viewer'].includes(r.role_name) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomRole(r)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer', marginTop: 4, textDecoration: 'underline' }}
                            >
                              حذف الدور
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map(cat => {
                      const catPerms = perms.filter(p => p.category === cat.key || p.perm_key.startsWith(cat.key));
                      if (catPerms.length === 0) return null;

                      return (
                        <React.Fragment key={cat.key}>
                          {/* Category Header Row */}
                          <tr style={{ background: cat.bg }}>
                            <td colSpan={roles.length + 1} style={{ padding: '10px 16px', fontWeight: 800, color: cat.color, fontSize: 13.5 }}>
                              {cat.label}
                            </td>
                          </tr>

                          {/* Perm Rows */}
                          {catPerms.map(p => (
                            <tr key={p.id} className="table-row">
                              <td style={{ padding: '10px 16px' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{p.perm_name_ar}</div>
                                <code style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.perm_key}</code>
                              </td>

                              {roles.map(r => {
                                const isSuper = r.role_name === 'super_admin';
                                const hasPerm = isSuper || (r.permissions || []).some(rp => rp.id === p.id || rp.perm_key === p.perm_key);

                                return (
                                  <td key={r.id} style={{ textAlign: 'center', padding: '8px' }}>
                                    {isSuper ? (
                                      <span title="صلاحية كاملة غير قابلة للإلغاء" style={{ fontSize: 16 }}>👑</span>
                                    ) : (
                                      <input
                                        type="checkbox"
                                        checked={Boolean(hasPerm)}
                                        onChange={() => handleToggleRolePermission(r, p.id)}
                                        style={{
                                          width: 18,
                                          height: 18,
                                          cursor: 'pointer',
                                          accentColor: cat.color
                                        }}
                                        title={`تفعيل/تعطيل صلاحية (${p.perm_name_ar}) لدور (${r.role_name_ar})`}
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── PERMISSIONS LIST TAB ──────────────────────────── */}
        {activeTab === 'perms' && (
          <div className="table-container glass-panel" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>🔑 دليل الصلاحيات الأمنية للنظام</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>قائمة موحدة بكافة الصلاحيات البرمجية المعرفة داخل نبراس برو</p>
            </div>
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>كود الصلاحية</th>
                    <th>اسم الصلاحية بالعربية</th>
                    <th>القطاع التابع له</th>
                  </tr>
                </thead>
                <tbody>
                  {perms.map(p => (
                    <tr key={p.id} className="table-row">
                      <td><code className="student-code" style={{ fontFamily: 'monospace' }}>{p.perm_key}</code></td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.perm_name_ar}</td>
                      <td>
                        <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11.5 }}>
                          {p.category === 'students' ? 'شؤون الطلاب' : p.category === 'staff' ? 'شؤون العاملين' : p.category === 'control' ? 'الكنترول' : p.category === 'finance' ? 'الحسابات' : 'إدارة النظام'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CUSTOM ROLE MODAL ────────────────────────────── */}
        {showRoleModal && (
          <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
            <div className="modal-card glass-panel text-right" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>➕ إضافة دور وظيفي مخصص جديد</h3>
                <button type="button" className="btn-icon" onClick={() => setShowRoleModal(false)}>✕</button>
              </div>

              <form onSubmit={handleCreateCustomRole} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field-group">
                  <label className="field-label">مسمى الدور الوظيفي بالعربية ★</label>
                  <input
                    type="text"
                    className="field-input"
                    required
                    placeholder="مثال: عضو لجنة الكنترول"
                    value={roleModalForm.roleNameAr}
                    onChange={e => setRoleModalForm({ ...roleModalForm, roleNameAr: e.target.value })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">كود الدور بالإنجليزية (اختياري)</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="مثال: control_member"
                    dir="ltr"
                    value={roleModalForm.roleName}
                    onChange={e => setRoleModalForm({ ...roleModalForm, roleName: e.target.value })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">وصف المهام والمسؤوليات</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    placeholder="وصف مختصر لطبيعة عمل هذا الدور..."
                    value={roleModalForm.description}
                    onChange={e => setRoleModalForm({ ...roleModalForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="submit" className="btn-save" style={{ padding: '8px 20px', fontSize: 13 }}>
                    <Save size={14} /> إنشاء الدور
                  </button>
                  <button type="button" className="btn-cancel" style={{ padding: '8px 18px', fontSize: 13 }} onClick={() => setShowRoleModal(false)}>
                    <X size={14} /> إلغاء
                  </button>
                </div>
              </form>
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
                    value={classroomFilters.academicYearId || (formOpts.academicYears?.[0]?.id ? String(formOpts.academicYears[0].id) : '')}
                    onChange={e => setClassroomFilters(f => ({ ...f, academicYearId: e.target.value }))}>
                    {formOpts.academicYears?.length !== 1 && <option value="">اختر العام...</option>}
                    {formOpts.academicYears?.map(y => <option key={y.id} value={String(y.id)}>{y.year_label}</option>)}
                  </select>
                </div>

                <div className="field-group" style={{ minWidth: 130 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>القسم</label>
                  <select className="filter-select" style={{ width: '100%', padding: '8px 12px' }}
                    value={classroomFilters.sectionId || selectedSectionId}
                    onChange={e => setClassroomFilters(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '' }))}>
                    {formOpts.sections?.length !== 1 && <option value="">كل الأقسام</option>}
                    {formOpts.sections?.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                </div>

                <div className="field-group" style={{ minWidth: 130 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>المرحلة</label>
                  <select className="filter-select" style={{ width: '100%', padding: '8px 12px' }}
                    value={classroomFilters.stageId || selectedStageId}
                    onChange={e => setClassroomFilters(f => ({ ...f, stageId: e.target.value, gradeId: '' }))}>
                    {filteredStages.length !== 1 && <option value="">اختر المرحلة...</option>}
                    {filteredStages.map(s => <option key={s.id} value={String(s.id)}>{s.stage_name}</option>)}
                  </select>
                </div>

                <div className="field-group" style={{ minWidth: 150 }}>
                  <label className="field-label" style={{ marginBottom: 4 }}>الصف الدراسي ★</label>
                  <select className="filter-select" style={{ width: '100%', padding: '8px 12px', borderColor: !classroomFilters.gradeId ? '#f59e0b44' : '' }}
                    value={classroomFilters.gradeId}
                    onChange={e => setClassroomFilters(f => ({ ...f, gradeId: e.target.value }))}>
                    <option value="">اختر الصف...</option>
                    {filteredGrades.map(g => <option key={g.id} value={String(g.id)}>{g.grade_name_ar}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Bulk Creation Panel (shown only when grade+year selected) ── */}
            {classroomFilters.gradeId && classroomFilters.academicYearId && (
              <div className="glass-panel" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0 }}>➕ تسجيل الفصول بترقيم تصاعدي</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      يتم تسجيل الفصول بأرقام تصاعدية (1، 2، 3...) وتظهر تلقائياً في المطبوعات والشهادات بالشكل المعتمد (مثل 1/1ع أو G5.C2)
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  {/* Count */}
                  <div className="field-group">
                    <label className="field-label">
                      {classrooms.length > 0
                        ? `إجمالي عدد الفصول المطلوب (يوجد ${classrooms.length} فصل حالياً)`
                        : 'إجمالي عدد الفصول المطلوب للصف'}
                    </label>
                    <input type="number" className="field-input"
                      min={classrooms.length > 0 ? classrooms.length + 1 : 1} max={50} value={bulkForm.count}
                      onChange={e => setBulkForm(f => ({ ...f, count: Math.min(50, Math.max(classrooms.length > 0 ? classrooms.length + 1 : 1, parseInt(e.target.value) || 1)) }))} />
                  </div>

                  {/* Capacity */}
                  <div className="field-group">
                    <label className="field-label">السعة الاستيعابية لكل فصل (الحد الأقصى 49)</label>
                    <input type="number" className="field-input" min={1} max={49} value={bulkForm.capacity}
                      onChange={e => setBulkForm(f => ({ ...f, capacity: Math.min(49, Math.max(1, parseInt(e.target.value) || 1)) }))} />
                  </div>
                </div>

                {/* Preview badges */}
                {classroomFilters.gradeId && (
                  <div style={{ marginTop: 18 }}>
                    <p className="field-label" style={{ marginBottom: 8 }}>
                      {classrooms.length > 0
                        ? `معاينة الفصول الجديدة المراد إضافتها لتكملة الفصول من (${classrooms.length}) إلى (${bulkForm.count}):`
                        : 'معاينة أسماء وأكواد الفصول الجديدة وصيغتها في المطبوعات:'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {getGeneratedNames(classroomFilters.gradeId).map((n, i) => (
                        <span key={i} style={{
                          background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.25)',
                          borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 700
                        }}>{n}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-save" onClick={handleBulkCreate} disabled={bulkCreating}
                    style={{ gap: 8, minWidth: 180 }}>
                    {bulkCreating
                      ? <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جاري الحفظ...</>
                      : <><Plus size={17} /> {classrooms.length > 0
                          ? `إضافة ${Math.max(0, (parseInt(bulkForm.count) || 1) - classrooms.length)} فصل جديد لتكملة العدد إلى ${bulkForm.count}`
                          : `تسجيل ${bulkForm.count} فصل للصف`}</>}
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
                      🏫 الفصول المسجلة ({classrooms.length} فصل مرتبة تصاعدياً)
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
                  <div className="classrooms-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
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
                                <label className="field-label">رقم الفصل (ترتيب عددي)</label>
                                <input type="number" className="field-input" min={1} max={99} value={editForm.classNumber}
                                  onChange={e => setEditForm(f => ({ ...f, classNumber: e.target.value }))} />
                              </div>
                              <div className="field-group">
                                <label className="field-label">مسمى الفصل المخصص (اختياري)</label>
                                <input type="text" className="field-input" value={editForm.className} placeholder={`فصل ${editForm.classNumber || 1}`}
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 0.5, margin: 0 }}>
                                    🏫 فصل {c.class_number || c.class_name}
                                  </h4>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                    <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                                      🖨️ في المطبوعات: {c.formatted_name || c.class_name}
                                    </span>
                                    {c.class_code && (
                                      <span style={{ fontSize: 11, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontFamily: 'monospace' }}>
                                        🏷️ كود: {c.class_code}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="row-actions">
                                  <button className="action-btn view" title="تعديل"
                                    onClick={() => { setEditingClassroom(c.id); setEditForm({ classNumber: c.class_number || 1, className: c.class_name, capacity: c.capacity }); }}>
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
        {activeTab === 'institution' && (() => {
          const currentGovName = (institutionForm.governorate || '').trim();
          const currentGovObj = (governoratesList || []).find(g => 
            (g.name_ar && g.name_ar.trim() === currentGovName) || 
            (institutionForm.governorateId && Number(g.id) === Number(institutionForm.governorateId))
          );
          const currentAdmins = currentGovObj 
            ? (administrationsList || []).filter(a => Number(a.governorate_id) === Number(currentGovObj.id)) 
            : (administrationsList || []);

          const handleGovernorateChange = (govName) => {
            const foundGov = governoratesList.find(g => g.name_ar === govName);
            setInstitutionForm(prev => ({
              ...prev,
              governorate: govName,
              governorateId: foundGov ? foundGov.id : null,
              directorate: '',
              administrationId: null
            }));
            setIsCustomAdmin(false);
          };

          const handleAdminSelect = (adminName) => {
            if (adminName === '__custom__') {
              setIsCustomAdmin(true);
              setInstitutionForm(prev => ({ ...prev, directorate: '', administrationId: null }));
            } else {
              const foundAdmin = administrationsList.find(a => a.name_ar === adminName);
              setInstitutionForm(prev => ({
                ...prev,
                directorate: adminName,
                administrationId: foundAdmin ? foundAdmin.id : null
              }));
            }
          };

          return (
            <form onSubmit={handleSaveInstitution} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Card 1: الهوية وبيانات المؤسسة ── */}
              <div className="glass-panel" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                    🏛️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      بيانات وهوية المؤسسة
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      كود المدرسة ونوع التعليم والاسم بالعربية والإنجليزية للتقارير والمستندات
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div className="field-group">
                    <label className="field-label">اسم المدرسة باللغة العربية ★</label>
                    <input type="text" className="field-input" required value={institutionForm.schoolName}
                      onChange={e => setInstitutionForm({ ...institutionForm, schoolName: e.target.value })} placeholder="مثال: مدرسة منارة العلم" />
                  </div>

                  <div className="field-group">
                    <label className="field-label">كود المدرسة ★</label>
                    <input type="text" className="field-input" required value={institutionForm.schoolCode}
                      onChange={e => setInstitutionForm({ ...institutionForm, schoolCode: e.target.value })} placeholder="مثال: 2102419" dir="ltr" />
                  </div>

                  <div className="field-group">
                    <label className="field-label">نوع التعليم ★</label>
                    <select className="field-input" required value={institutionForm.educationType || 'رسمي'}
                      onChange={e => setInstitutionForm({ ...institutionForm, educationType: e.target.value })}>
                      {['رسمي', 'رسمي لغات', 'رسمي لغات متميز', 'خاص عربي', 'خاص لغات', 'دولي', 'ثقافي', 'مجتمعي'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label">اسم المدرسة باللغة الإنجليزية (للمستندات الدولية)</label>
                    <input type="text" className="field-input" value={institutionForm.schoolNameEn}
                      onChange={e => setInstitutionForm({ ...institutionForm, schoolNameEn: e.target.value })} placeholder="Example: Menar El-Elm School" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* ── Card 2: التبعية الجغرافية والقيادة الإدارية ── */}
              <div className="glass-panel" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                    📍
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      التبعية الجغرافية والقيادة الإدارية
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      المحافظة والإدارة التعليمية واسم مدير المدرسة لتذييل وتوقيع التقارير والشهادات
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  {/* المحافظة */}
                  <div className="field-group">
                    <label className="field-label">المحافظة ★</label>
                    <select className="field-input" required value={institutionForm.governorate}
                      onChange={e => handleGovernorateChange(e.target.value)}>
                      <option value="">اختر المحافظة...</option>
                      {governoratesList.length > 0 ? (
                        governoratesList.map(g => (
                          <option key={g.id} value={g.name_ar}>{g.name_ar}</option>
                        ))
                      ) : (
                        ['القاهرة','الجيزة','الإسكندرية','الدقهلية','البحيرة','الفيوم','الغربية','الإسماعيلية',
                          'المنوفية','المنيا','القليوبية','السويس','الشرقية','أسوان','أسيوط','بني سويف','بورسعيد',
                          'دمياط','الوادي الجديد','شمال سيناء','جنوب سيناء','كفر الشيخ','مطروح','الأقصر','قنا','سوهاج','البحر الأحمر'
                        ].map(g => <option key={g} value={g}>{g}</option>)
                      )}
                    </select>
                  </div>

                  {/* الإدارة التعليمية */}
                  <div className="field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="field-label" style={{ margin: 0 }}>الإدارة التعليمية ★</label>
                      <button type="button" onClick={() => setIsCustomAdmin(!isCustomAdmin)}
                        style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                        {isCustomAdmin ? '🔍 اختيار من القائمة الرسمية' : '✍️ إدخال يدوي'}
                      </button>
                    </div>
                    {isCustomAdmin ? (
                      <input type="text" className="field-input" required value={institutionForm.directorate}
                        onChange={e => setInstitutionForm({ ...institutionForm, directorate: e.target.value })}
                        placeholder="مثال: إدارة الهرم التعليمية" />
                    ) : (
                      <select className="field-input" required value={institutionForm.directorate}
                        onChange={e => handleAdminSelect(e.target.value)}>
                        <option value="">اختر الإدارة التعليمية...</option>
                        {currentAdmins.map(a => (
                          <option key={a.id} value={a.name_ar}>{a.name_ar}</option>
                        ))}
                        {institutionForm.directorate && !currentAdmins.some(a => a.name_ar === institutionForm.directorate) && (
                          <option value={institutionForm.directorate}>{institutionForm.directorate}</option>
                        )}
                        <option value="__custom__">➕ كتابة إدارة أخرى مخصصة...</option>
                      </select>
                    )}
                  </div>

                  {/* مدير المدرسة */}
                  <div className="field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">مدير المدرسة ★ (توقيع المطبوعات والشهادات وسجلات الكنترول)</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input type="text" className="field-input" required value={institutionForm.directorName}
                        onChange={e => setInstitutionForm({ ...institutionForm, directorName: e.target.value })}
                        placeholder="اسم مدير المدرسة" style={{ flex: 1 }} />
                      {staffList.length > 0 && (
                        <select className="field-input" style={{ width: 230, fontSize: 12.5 }}
                          value=""
                          onChange={e => {
                            const st = staffList.find(s => String(s.id) === e.target.value);
                            if (st) setInstitutionForm(prev => ({ ...prev, directorName: st.full_name_ar }));
                          }}>
                          <option value="">اختيار من قاعدة العاملين...</option>
                          {staffList.map(s => (
                            <option key={s.id} value={s.id}>{s.full_name_ar} {s.position_title ? `(${s.position_title})` : ''}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 3: بيانات التواصل والعنوان ── */}
              <div className="glass-panel" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                    📞
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      بيانات العنوان والتواصل الرسمي
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      العنوان التفصيلي وأرقام الهواتف والبريد والموقع الإلكتروني للمدرسة
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
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
                </div>
              </div>

              {/* ── Card 4: الشعار الرسمي والمعاينة الحية للترويسة ── */}
              <div className="glass-panel" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                    🖼️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      الهوية البصرية والمعاينة الحية لترويسة المطبوعات
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      شعار المدرسة الرسمي وكيف تظهر ترويسة المدرسة في أعلى كافة التقارير والشهادات وسجلات الكنترول
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'center' }}>
                  {/* الشعار */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 18, background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
                    {institutionForm.logoUrl ? (
                      <img src={institutionForm.logoUrl} alt="شعار المدرسة" style={{ maxHeight: 100, maxWidth: 160, objectFit: 'contain', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    ) : (
                      <div style={{ width: 90, height: 90, borderRadius: 12, background: 'rgba(99,102,241,0.08)', color: '#818cf8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Building size={30} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>بدون شعار</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="file" accept="image/*" id="logo-file-input" style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setInstitutionForm(prev => ({ ...prev, logoUrl: reader.result }));
                            reader.readAsDataURL(file);
                          }
                        }} />
                      <label htmlFor="logo-file-input" className="btn-secondary" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12.5 }}>
                        📁 {institutionForm.logoUrl ? 'تغيير الشعار' : 'رفع شعار'}
                      </label>
                      {institutionForm.logoUrl && (
                        <button type="button" className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => setInstitutionForm(prev => ({ ...prev, logoUrl: '' }))}>
                          حذف
                        </button>
                      )}
                    </div>
                  </div>

                  {/* المعاينة الحية للترويسة الرسمية */}
                  <div style={{ padding: '18px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#6366f1' }}>🖨️ معاينة حية لترويسة المستندات والتقارير:</span>
                      <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>معتمدة وزارياً</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, lineHeight: 1.6 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>مديرية التربية والتعليم بمحافظة {institutionForm.governorate || '................'}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>إدارة {institutionForm.directorate || '................'} التعليمية</div>
                        <div style={{ fontWeight: 800, color: '#6366f1', fontSize: 13.5 }}>مدرسة {institutionForm.schoolName || '................'}</div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>كود المدرسة: <strong style={{ color: 'var(--text-primary)' }}>{institutionForm.schoolCode || '—'}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>نوع التعليم: <strong style={{ color: '#10b981' }}>{institutionForm.educationType || 'رسمي'}</strong></div>
                      </div>

                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>توقيع مدير المدرسة:</div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{institutionForm.directorName || '................'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 16 }}>
                <button type="submit" className="btn-save" style={{ minWidth: 200, padding: '10px 24px', fontSize: 14, fontWeight: 800 }}>
                  <Save size={17} /> حفظ جميع بيانات المدرسة
                </button>
              </div>
            </form>
          );
        })()}

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
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>🏢 الأقسام والمسارات التعليمية المعتمدة للمؤسسة</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    إدارة أقسام ومسارات المدرسة (مثل القسم العربي، قسم اللغات، القسم الدولي...) وإمكانية إضافة مسار جديد.
                  </p>
                </div>
                {!showSectionForm && (
                  <button className="btn-add-student" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={handleOpenSectionAdd}>
                    <Plus size={14} /> إضافة قسم / مسار جديد
                  </button>
                )}
              </div>

              {/* Form to Add / Edit Section */}
              {/* Form to Add / Edit Section */}
              {showSectionForm && (() => {
                const standardSections = [
                  { type: 'arabic', name: 'القسم العربي', educationType: 'رسمي', legalStatus: 'حكومي' },
                  { type: 'languages', name: 'قسم اللغات', educationType: 'رسمي لغات', legalStatus: 'حكومي' },
                  { type: 'international', name: 'القسم الدولي', educationType: 'دولي', legalStatus: 'خاص' },
                  { type: 'kindergarten', name: 'قسم رياض أطفال (مستقل)', educationType: 'رسمي', legalStatus: 'حكومي' }
                ];
                const availableSectionsToAdd = editingSection 
                  ? standardSections 
                  : standardSections.filter(std => !sections.some(s => s.type === std.type));

                return (
                  <form onSubmit={handleSaveSection} style={{ marginBottom: 24, padding: 18, background: 'rgba(99, 102, 241, 0.04)', borderRadius: 10, border: '1.5px solid rgba(99, 102, 241, 0.3)' }}>
                    <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#4f46e5', marginBottom: 14 }}>
                      {editingSection ? '✏️ تعديل بيانات القسم' : '➕ إضافة مسار / قسم جديد للمؤسسة'}
                    </h4>
                    <div className="fields-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                      <div className="field-group">
                        <label className="field-label">اختر القسم المتاح للتسجيل ★</label>
                        <select 
                          className="field-input" 
                          required 
                          value={sectionForm.type}
                          onChange={e => {
                            const chosen = standardSections.find(s => s.type === e.target.value);
                            if (chosen) {
                              setSectionForm({
                                ...sectionForm,
                                type: chosen.type,
                                name: chosen.name,
                                educationType: chosen.educationType,
                                legalStatus: chosen.legalStatus
                              });
                            }
                          }}
                        >
                          <option value="">اختر القسم المراد إضافته...</option>
                          {availableSectionsToAdd.map(secOpt => (
                            <option key={secOpt.type} value={secOpt.type}>{secOpt.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label className="field-label">اسم القسم المسجل ★</label>
                        <input type="text" className="field-input" required value={sectionForm.name}
                          onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })}
                          placeholder="اسم القسم" />
                      </div>

                      <div className="field-group">
                        <label className="field-label">نوعية التعليم المعتمدة للقسم ★</label>
                        <select className="field-input" required value={sectionForm.educationType}
                          onChange={e => setSectionForm({ ...sectionForm, educationType: e.target.value })}>
                          {['رسمي', 'رسمي لغات', 'رسمي لغات متميز', 'خاص عربي', 'خاص لغات', 'دولي', 'ثقافي', 'مجتمعي'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label className="field-label">الوضعية القانونية / الترخيص</label>
                        <select className="field-input" value={sectionForm.legalStatus}
                          onChange={e => setSectionForm({ ...sectionForm, legalStatus: e.target.value })}>
                          <option value="حكومي">حكومي</option>
                          <option value="خاص">خاص</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn-save" style={{ padding: '6px 18px', fontSize: 13 }}><Save size={14} /> حفظ القسم</button>
                      <button type="button" className="btn-cancel" style={{ padding: '6px 18px', fontSize: 13 }} onClick={() => setShowSectionForm(false)}><X size={14} /> إلغاء</button>
                    </div>
                  </form>
                );
              })()}

              <div className="table-scroll">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>اسم القسم</th>
                      <th>النوع / المسار</th>
                      <th>نوعية التعليم</th>
                      <th>الوضعية القانونية</th>
                      <th style={{ width: 100, textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5, padding: 16 }}>
                          لا توجد أقسام مسجلة حالياً بالمؤسسة.
                        </td>
                      </tr>
                    ) : (
                      sections.map(sec => (
                        <tr key={sec.id} className="table-row">
                          <td style={{ fontWeight: 800, fontSize: 14 }}>🏢 {sec.name}</td>
                          <td>{sec.type === 'arabic' ? 'عربي' : sec.type === 'languages' ? 'لغات' : sec.type === 'kindergarten' ? 'رياض أطفال' : 'دولي'}</td>
                          <td><span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>{sec.education_type || sec.educationType || '—'}</span></td>
                          <td>{sec.legal_status || sec.legalStatus || 'حكومي'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="row-actions" style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="action-btn view"
                                onClick={() => handleOpenSectionEdit(sec)}
                                title="تعديل بيانات القسم"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                className="action-btn view"
                                style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                                disabled={sections.length <= 1}
                                onClick={() => handleDeleteSection(sec.id, sec.name)}
                                title={sections.length <= 1 ? 'يجب إبقاء قسم واحد على الأقل للمؤسسة' : 'حذف القسم'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">اختر المرحلة التعليمية ★</label>
                      {(() => {
                        const existingStagesForSec = stages.filter(st => String(st.section_id) === String(stageForm.sectionId));
                        const availableStagesToAdd = editingStage
                          ? masterLookups.stages
                          : masterLookups.stages.filter(mst => !existingStagesForSec.some(es => es.stage_code === mst.code || es.stage_name === mst.name_ar));

                        return (
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
                              else if (code === 'kindergarten' || code === 'kg') defaultYears = 2;
                              else if (code === 'preliminary') defaultYears = 1;
                              else if (code === 'preparatory' || code === 'prep' || code === 'secondary' || code === 'sec') defaultYears = 3;

                              setStageForm({
                                ...stageForm,
                                stageName: name,
                                stageCode: code,
                                yearsCount: defaultYears
                              });
                            }}
                          >
                            <option value="">اختر المرحلة المراد إضافتها...</option>
                            {availableStagesToAdd.map(stg => (
                              <option key={stg.id} value={stg.code}>
                                {stg.name_ar}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
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
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', opacity: 0.7, padding: 24, fontSize: 13 }}>
                          📋 لا توجد مراحل مضافة في هذا القسم - اضغط <strong>«إضافة مرحلة جديدة»</strong> لربط المرحلة بالقسم.
                        </td>
                      </tr>
                    ) : (
                      stages.map(stg => (
                        <tr key={stg.id} className="table-row">
                          <td style={{ fontWeight: 700 }}>{stg.stage_name}</td>
                          <td><code className="student-code">{stg.stage_code || '—'}</code></td>
                          <td>{stg.section_name}</td>
                          <td>{stg.years_count} صفوف دراسية</td>
                          <td>{stg.display_order}</td>
                          <td>
                            <div className="row-actions">
                              <button className="action-btn view" onClick={() => handleOpenStageEdit(stg)} title="تعديل">
                                <Edit3 size={14} />
                              </button>
                              <button className="action-btn view" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                                onClick={() => handleDeleteStage(stg.id, stg.stage_name)} title="حذف">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Stage Leadership Cards hidden to reduce distraction */}
            </div>

          </div>
        )}

        {/* ── ACADEMIC YEARS TAB ──────────────────────────────── */}
        {activeTab === 'academic_years' && (
          <div className="glass-panel form-body" style={{ maxWidth: '650px', margin: '0 auto', padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>📅</span>
              <div>
                <h3 className="section-title" style={{ margin: 0 }}>العام الدراسي المعتمد للمؤسسة</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  تحديد وتعديل العام الدراسي الحالي النشط في البرنامج بالكامل
                </p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`${API_BASE_URL}/settings/academic-years/set-single`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ startYear: selectedStartYear })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'فشل حفظ العام الدراسي');
                toast.success(data.message || 'تم اعتماد العام الدراسي بنجاح');
                loadData();
              } catch (err) {
                toast.error(err.message);
              }
            }}>
              <div className="field-group" style={{ marginBottom: 20 }}>
                <label className="field-label" style={{ fontWeight: 700, fontSize: 14 }}>
                  سنة بدء العام الدراسي (أدخل سنة البداية للاستكمال التلقائي)
                </label>
                <select
                  className="field-input"
                  style={{ fontSize: 15, fontWeight: 700, padding: '10px 14px' }}
                  value={selectedStartYear}
                  onChange={e => setSelectedStartYear(e.target.value)}
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <option key={y} value={y}>{y} / {y + 1} م</option>
                  ))}
                </select>
              </div>

              {/* Live Preview Box */}
              <div style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1.5px solid rgba(16,185,129,0.3)',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 24
              }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>العام الدراسي الحالي المعتمد بالنظام والتقارير:</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', direction: 'rtl', textAlign: 'right' }}>
                  {selectedStartYear} / {parseInt(selectedStartYear) + 1} م
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  تاريخ الإطار الفعلي: من <strong>{selectedStartYear}-09-01</strong> إلى <strong>{parseInt(selectedStartYear) + 1}-08-31</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-save" style={{ padding: '10px 24px', fontSize: 14 }}>
                  💾 حفظ واعتماد العام الدراسي للمدرسة بالكامل
                </button>
              </div>
            </form>
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

      <RenderResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onSubmit={handleExecuteReset}
        resetAdminPassword={resetAdminPassword}
        setResetAdminPassword={setResetAdminPassword}
        resetConfirmText={resetConfirmText}
        setResetConfirmText={setResetConfirmText}
        resetLoading={resetLoading}
        resetError={resetError}
      />
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
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (form.sectionDirectorNationalId && form.sectionDirectorNationalId.trim().length !== 14) {
      toast.error('الرقم القومي لمدير القسم يجب أن يتكون من 14 رقماً.');
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
      toast.error(err.message);
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
    if (error) toast.error('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    toast.error('');
    if (form.stageDirectorNationalId && form.stageDirectorNationalId.trim().length !== 14) {
      toast.error('الرقم القومي لمدير المرحلة يتكون من 14 رقماً.');
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
      toast.error(err.message || 'حدث خطأ أثناء الحفظ.');
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



      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-save" style={{ fontSize: 13, padding: '7px 18px' }} onClick={handleSave} disabled={saving}>
          {saving ? '⏳ جاري الحفظ...' : saved ? '✓ تم حفظ قيادات المرحلة' : '💾 حفظ قيادات المرحلة'}
        </button>
      </div>
    </div>
  );
}

// ── RenderResetModal Component ────────────────────────────────
function RenderResetModal({
  isOpen, onClose, onSubmit,
  resetAdminPassword, setResetAdminPassword,
  resetConfirmText, setResetConfirmText,
  resetLoading, resetError
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl'
    }}>
      <div style={{
        background: '#1a1a2e', border: '1.5px solid #ef4444',
        borderRadius: 16, padding: '32px 36px', maxWidth: 520, width: '95%',
        boxShadow: '0 0 40px rgba(239,68,68,0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 28 }}>💣</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#ef4444' }}>منطقة الخطر — تصفير قاعدة البيانات</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>هذا الإجراء لا يمكن التراجع عنه</div>
          </div>
          <button onClick={onClose} style={{ marginRight: 'auto', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Warning box */}
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#fca5a5', lineHeight: 1.7 }}>
          ⚠️ سيتم <strong>نسخ قاعدة البيانات احتياطياً</strong> تلقائياً إلى مجلد الـ Backups قبل تصفيرها.<br/>
          ثم سيتم <strong>مسح كافة بيانات المؤسسة والطلاب والمستخدمين</strong> وإعادة البرنامج إلى حالة التهيئة الأولى.
        </div>

        <form onSubmit={onSubmit}>
          {/* Admin password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#d1d5db', marginBottom: 6, fontWeight: 700 }}>
              🔑 كلمة مرور مسؤول النظام
            </label>
            <input
              type="password"
              value={resetAdminPassword}
              onChange={e => setResetAdminPassword(e.target.value)}
              placeholder="ادخل كلمة مرور الأدمن للتحقق"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.4)', background: '#0f0f1a',
                color: '#f3f4f6', fontSize: 13, boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Confirm text */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#d1d5db', marginBottom: 6, fontWeight: 700 }}>
              ✏️ اكتب للتأكيد: <span style={{ color: '#ef4444', fontFamily: 'monospace' }}>إعادة تهيئة النظام بالكامل</span>
            </label>
            <input
              type="text"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              placeholder="اكتب الجملة التأكيدية بالضبط..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.4)', background: '#0f0f1a',
                color: '#f3f4f6', fontSize: 13, boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Error */}
          {resetError && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
              ⚠️ {resetError}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={resetLoading}
              style={{ padding: '9px 22px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#d1d5db', cursor: 'pointer', fontSize: 13 }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={resetLoading || resetConfirmText !== 'إعادة تهيئة النظام بالكامل' || !resetAdminPassword}
              style={{
                padding: '9px 22px', borderRadius: 8, border: 'none',
                background: resetLoading || resetConfirmText !== 'إعادة تهيئة النظام بالكامل' || !resetAdminPassword
                  ? 'rgba(239,68,68,0.3)' : '#ef4444',
                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700
              }}
            >
              {resetLoading ? '⏳ جاري التصفير...' : '💣 تصفير وإعادة التهيئة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
