-- Seed roles
INSERT INTO roles (role_name, role_name_ar, description) VALUES
('super_admin', 'مدير النظام الأول', 'صلاحيات كاملة وغير مقيدة على كافة الوحدات والإعدادات'),
('hr_officer', 'مسؤول شئون العاملين', 'إدارة ملفات الموظفين والرواتب والندب والإجازات'),
('data_entry', 'مدخل بيانات شئون الطلاب', 'قيد وتسجيل الطلاب وتوزيع الفصول وتسجيل الحضور والغياب'),
('accountant', 'مسؤول الحسابات والخزينة', 'إدارة الرسوم والأقساط وتحصيل الرسوم وإيصالات الدفع والمصاريف'),
('head_control', 'رئيس الكنترول والامتحانات', 'إعداد لجان الكنترول ورصد الدرجات واعتماد وإغلاق الفترات الامتحانية'),
('viewer', 'مشاهد', 'عرض البيانات واستخراج التقارير بدون صلاحيات تعديل أو حذف')
ON CONFLICT (role_name) DO NOTHING;

-- Seed permissions
INSERT INTO permissions (perm_key, perm_name_ar) VALUES
('manage_settings', 'إدارة إعدادات النظام وتخصيص الحقول'),
('enroll_student', 'تسجيل وقبول طالب جديد'),
('edit_student', 'تعديل ونقل بيانات الطلاب'),
('manage_staff', 'إدارة ملفات الموظفين والعاملين'),
('collect_fees', 'تحصيل الرسوم وإصدار إيصالات دفع'),
('input_grades', 'رصد وتعديل درجات الطلاب'),
('lock_grades', 'اعتماد وإغلاق رصد الدرجات'),
('print_reports', 'استخراج وتصدير التقارير والشهادات'),
('view_only', 'عرض واستعراض البيانات فقط')
ON CONFLICT (perm_key) DO NOTHING;

-- Seed role-permission associations
-- super_admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.role_name = 'super_admin'
ON CONFLICT DO NOTHING;

-- hr_officer gets manage_staff, print_reports, view_only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.role_name = 'hr_officer' AND p.perm_key IN ('manage_staff', 'print_reports', 'view_only')
ON CONFLICT DO NOTHING;

-- data_entry gets enroll_student, edit_student, print_reports, view_only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.role_name = 'data_entry' AND p.perm_key IN ('enroll_student', 'edit_student', 'print_reports', 'view_only')
ON CONFLICT DO NOTHING;

-- accountant gets collect_fees, print_reports, view_only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.role_name = 'accountant' AND p.perm_key IN ('collect_fees', 'print_reports', 'view_only')
ON CONFLICT DO NOTHING;

-- head_control gets input_grades, lock_grades, print_reports, view_only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.role_name = 'head_control' AND p.perm_key IN ('input_grades', 'lock_grades', 'print_reports', 'view_only')
ON CONFLICT DO NOTHING;

-- viewer gets view_only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.role_name = 'viewer' AND p.perm_key = 'view_only'
ON CONFLICT DO NOTHING;

-- Seed default nationalities
INSERT INTO nationalities (name) VALUES
('مصري'), ('سعودي'), ('إماراتي'), ('كويتي'), ('أردني'), ('سوري'), ('فلسطيني'), ('سوداني'), ('يمني'), ('عراقي'), ('لبناني'), ('آخر')
ON CONFLICT (name) DO NOTHING;

-- Seed default document types
INSERT INTO document_types (name) VALUES
('شهادة ميلاد كمبيوتر رقمية'), ('بيان نجاح معتمد'), ('إفادة قيد معتمدة'), ('ملف طبي معتمد'), ('صورة الرقم القومي لولي الأمر'), ('طلب التحاق رسمي')
ON CONFLICT (name) DO NOTHING;
