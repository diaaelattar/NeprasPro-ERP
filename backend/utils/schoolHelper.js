/**
 * Unified School Helper Utility
 * Provides a single source of truth for institution/school metadata
 * across reports, exports, PDFs, control modules, and UI headers.
 */

const _get = (sqliteDb, sql, params = []) => {
  try {
    const stmt = sqliteDb.prepare(sql);
    if (params.length) stmt.bind(params);
    const hasRow = stmt.step();
    const row = hasRow ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  } catch (_) {
    return null;
  }
};

function getSchoolMasterInfo(sqliteDb) {
  if (!sqliteDb) return getDefaultSchoolInfo();

  try {
    const inst = _get(sqliteDb, `
      SELECT ic.*,
             COALESCE(NULLIF(ic.governorate, ''), g.name_ar, '') AS governorate_name,
             COALESCE(NULLIF(ic.directorate, ''), ea.name_ar, '') AS directorate_name,
             st.full_name_ar AS staff_director_name
      FROM institution_config ic
      LEFT JOIN governorates g ON g.id = ic.governorate_id
      LEFT JOIN educational_administrations ea ON ea.id = ic.administration_id
      LEFT JOIN staff st ON (st.id = ic.director_id OR (st.position_title LIKE '%مدير%' AND ic.director_name IS NULL))
      ORDER BY ic.id ASC
      LIMIT 1
    `) || _get(sqliteDb, 'SELECT * FROM institution_config LIMIT 1');

    if (!inst) return getDefaultSchoolInfo();

    const gov = (inst.governorate_name || inst.governorate || '').trim();
    const dir = (inst.directorate_name || inst.directorate || '').trim();
    const name = (inst.school_name || '').trim();
    const director = (inst.director_name || inst.staff_director_name || '').trim();

    return {
      id: inst.id || 1,
      school_code: inst.school_code || '',
      school_name: name,
      school_name_en: inst.school_name_en || '',
      governorate: gov,
      directorate: dir,
      governorate_id: inst.governorate_id || null,
      administration_id: inst.administration_id || null,
      education_type: inst.education_type || 'رسمي',
      director_name: director,
      address: inst.address || '',
      phone: inst.phone || '',
      email: inst.email || '',
      website: inst.website || '',
      logo_url: inst.logo_url || '',
      is_initialized: Boolean(inst.is_initialized),
      // camelCase aliases for JSON API consistency
      schoolCode: inst.school_code || '',
      schoolName: name,
      schoolNameEn: inst.school_name_en || '',
      governorateId: inst.governorate_id || null,
      administrationId: inst.administration_id || null,
      educationType: inst.education_type || 'رسمي',
      directorName: director,
      logoUrl: inst.logo_url || '',
      // Standard ministerial header strings
      headerRight: `محافظة: ${gov || '................'}\nإدارة: ${dir || '................'}\nمدرسة: ${name || '................'}`,
      headerGovDir: `مديرية التربية والتعليم بمحافظة: ${gov || '................'} - إدارة: ${dir || '................'} التعليمية`
    };
  } catch (_) {
    return getDefaultSchoolInfo();
  }
}

function getDefaultSchoolInfo() {
  return {
    id: 1,
    school_code: '',
    school_name: '',
    school_name_en: '',
    governorate: '',
    directorate: '',
    governorate_id: null,
    administration_id: null,
    education_type: 'رسمي',
    director_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    is_initialized: false,
    schoolCode: '',
    schoolName: '',
    schoolNameEn: '',
    governorateId: null,
    administrationId: null,
    educationType: 'رسمي',
    directorName: '',
    logoUrl: '',
    headerRight: 'محافظة: ................\nإدارة: ................\nمدرسة: ................',
    headerGovDir: 'مديرية التربية والتعليم بمحافظة: ................ - إدارة: ................ التعليمية'
  };
}

module.exports = {
  getSchoolMasterInfo,
  getDefaultSchoolInfo
};
