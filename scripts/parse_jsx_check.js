const fs = require('fs');
const path = require('path');
const parser = require(path.join('d:/NeprasPro/frontend/node_modules/@babel/parser'));

const code = fs.readFileSync('d:/NeprasPro/frontend/src/pages/settings/SettingsPage.jsx', 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('✅ File parsed OK - no JSX errors!');
} catch (e) {
  console.error('❌ JSX Parse Error:');
  console.error(`  Message: ${e.message}`);
  console.error(`  Line: ${e.loc?.line}, Column: ${e.loc?.column}`);

  // Show context around error
  const lines = code.split('\n');
  const errLine = (e.loc?.line || 1) - 1;
  const start = Math.max(0, errLine - 5);
  const end = Math.min(lines.length - 1, errLine + 5);
  console.error('\n--- Context ---');
  for (let i = start; i <= end; i++) {
    const marker = i === errLine ? '>>> ' : '    ';
    console.error(`${marker}${i + 1}: ${lines[i]}`);
  }
}
