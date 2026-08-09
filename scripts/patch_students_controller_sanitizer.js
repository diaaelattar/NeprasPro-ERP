const fs = require('fs');
const filePath = 'd:/NeprasPro/backend/modules/students/students.controller.js';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Require excelSanitizer at the top
if (!content.includes('excelSanitizer')) {
  content = `const { sanitizeExcelBuffer } = require('./excelSanitizer');\n` + content;
}

// 2. Wrap all res.send Excel buffers with await sanitizeExcelBuffer(...)
content = content.replaceAll('return res.send(buffer);', 'return res.send(await sanitizeExcelBuffer(buffer));');
content = content.replaceAll('return res.send(finalBuffer);', 'return res.send(await sanitizeExcelBuffer(finalBuffer));');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully patched students.controller.js with sanitizeExcelBuffer!');
