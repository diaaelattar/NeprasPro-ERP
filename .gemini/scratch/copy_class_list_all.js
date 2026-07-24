const fs = require('fs');
const path = require('path');

const dir = 'd:/NeprasPro/backend/templates/reports';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const src = 'd:/NeprasPro/class_list_template.xltx';
const dst1 = path.join(dir, 'class_list_template.xltx');
const dst2 = path.join(dir, 'class_list_all_template.xltx');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dst1);
  fs.copyFileSync(src, dst2);
  console.log('Copied class_list_all_template.xltx successfully!');
}
