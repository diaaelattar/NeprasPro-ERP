/**
 * Script to replace all setError/setSuccess calls in SettingsPage.jsx
 * with toast.error / toast.success calls from useToast context.
 * Also removes the error/success useState declarations and their inline display JSX.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/settings/SettingsPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove useState declarations for error/success
content = content.replace(
  /\s*const \[error,\s+setError\]\s+=\s+useState\(''\);\n/g,
  '\n'
);
content = content.replace(
  /\s*const \[success,\s+setSuccess\]\s+=\s+useState\(''\);\n/g,
  '\n'
);

// 2. Replace combined reset patterns: setError(''); setSuccess('');
content = content.replace(/\s*setError\(''\);\s*setSuccess\(''\);/g, '');

// 3. Replace setSuccess(...) with toast.success(...)
// Capture the string argument
content = content.replace(
  /setSuccess\((`[^`]*`|'[^']*'|"[^"]*"|data\.message\s*\|\|\s*(?:`[^`]*`|'[^']*'|"[^"]*")|data\.message)\)/g,
  (match, arg) => `toast.success(${arg})`
);

// 4. Replace setError(err.message) with toast.error(err.message)
content = content.replace(/setError\(err\.message\)/g, 'toast.error(err.message)');

// 5. Replace setError('...literal...') with toast.error('...literal...')
content = content.replace(
  /setError\(('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)\)/g,
  (match, arg) => `toast.error(${arg})`
);

// 6. Replace return setError(...) patterns
content = content.replace(
  /return toast\.error\(/g,
  '{ toast.error('
);
// Fix trailing semicolons in return patterns (add closing brace)
content = content.replace(
  /\{ toast\.error\(([^)]+)\);\s*\n/g,
  (match, arg) => `{ toast.error(${arg}); return; }\n`
);

// 7. Remove standalone toast.error('') and toast.success('') (empty resets)
content = content.replace(/\s*toast\.error\(''\);\s*toast\.success\(''\);/g, '');

// 8. Remove JSX inline error/success display blocks
// Remove: {error && (<div className/style ... >{error}</div>)}
content = content.replace(
  /\{(?:\s*\/\*[^*]*\*\/\s*)?\s*error\s*&&\s*\([^)]*\)\s*\}/gs,
  ''
);
content = content.replace(
  /\{(?:\s*\/\*[^*]*\*\/\s*)?\s*success\s*&&\s*\([^)]*\)\s*\}/gs,
  ''
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Toast migration completed for SettingsPage.jsx');
console.log(`File size after: ${fs.statSync(filePath).size} bytes`);
