const fs = require('fs');
const path = require('path');

const targetDir = 'd:/NeprasPro/backend/templates/reports';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Sources to copy from
const templates = [
  { src: 'd:/NeprasPro/register_template.xltx', dstName: 'student_register_41d_template.xltx' },
  { src: 'd:/NeprasPro/class_list_template.xltx', dstName: 'class_list_template.xltx' },
];

templates.forEach(t => {
  if (fs.existsSync(t.src)) {
    const dst = path.join(targetDir, t.dstName);
    fs.copyFileSync(t.src, dst);
    console.log(`Copied ${t.src} -> ${dst}`);
  }
});
