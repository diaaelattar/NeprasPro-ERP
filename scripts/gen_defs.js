const fs = require('fs');
const path = require('path');

const defs = [
  { file: 'primaryPortraitSheet.jsx', id: 'primary_portrait', title: 'سجل أعمال السنة للصفوف الأولى (طولي)', group: 'سجلات رصد أعمال السنة' },
  { file: 'primaryLandscapeSheet.jsx', id: 'primary_landscape', title: 'سجل أعمال السنة للصفوف الأولى (عرضي)', group: 'سجلات رصد أعمال السنة' },
  { file: 'upperPrimaryPortraitSheet.jsx', id: 'upper_primary_portrait', title: 'سجل أعمال السنة للصفوف (3-4-5-6) (طولي)', group: 'سجلات رصد أعمال السنة' },
  { file: 'upperPrimaryLandscapeSheet.jsx', id: 'upper_primary_landscape', title: 'سجل أعمال السنة للصفوف (3-4-5-6) (عرضي)', group: 'سجلات رصد أعمال السنة' },
  { file: 'prepPortraitSheet.jsx', id: 'prep_portrait', title: 'سجل أعمال السنة للمرحلة الإعدادية (طولي)', group: 'سجلات رصد أعمال السنة' },
  { file: 'prepLandscapeSheet.jsx', id: 'prep_landscape', title: 'سجل أعمال السنة للمرحلة الإعدادية (عرضي)', group: 'سجلات رصد أعمال السنة' },
  { file: 'secPortraitSheet.jsx', id: 'sec_portrait', title: 'سجل أعمال السنة للمرحلة الثانوية (طولي)', group: 'سجلات رصد أعمال السنة' },
  { file: 'secLandscapeSheet.jsx', id: 'sec_landscape', title: 'سجل أعمال السنة للمرحلة الثانوية (عرضي)', group: 'سجلات رصد أعمال السنة' },
];

const template = (d) => `import React from 'react';
import MacroGradesPreview from './MacroGradesPreview';

const ${d.file.replace('.jsx', '')} = {
  id: '${d.id}',
  title: '${d.title}',
  group: '${d.group}',
  excelOnly: true,
  requireClass: true,
  
  fetchData: async (filters, api) => {
    return await api.fetchStudentsByClass(filters.classId, filters);
  },

  renderPreview: (data, meta, schoolInfo) => {
    const title = '${d.title}';
    return (
      <MacroGradesPreview 
        students={data}
        meta={meta}
        schoolInfo={schoolInfo}
        title={title}
      />
    );
  }
};

export default ${d.file.replace('.jsx', '')};
`;

defs.forEach(d => {
  const filepath = path.join('d:\\NeprasPro\\frontend\\src\\pages\\reports\\definitions', d.file);
  fs.writeFileSync(filepath, template(d));
});
console.log('8 definitions generated.');
