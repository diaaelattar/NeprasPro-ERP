/**
 * Script to find JSX syntax issues in SettingsPage.jsx
 * Uses Node.js to parse and identify errors
 */

const fs = require('fs');
const content = fs.readFileSync('d:/NeprasPro/frontend/src/pages/settings/SettingsPage.jsx', 'utf8');

// Count opening vs closing braces (rough check)
const openBraces = (content.match(/\{/g) || []).length;
const closeBraces = (content.match(/\}/g) || []).length;
console.log(`Opening braces: ${openBraces}, Closing braces: ${closeBraces}, Diff: ${openBraces - closeBraces}`);

// Count JSX opening/closing tags for key components
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;
console.log(`Opening parens: ${openParens}, Closing parens: ${closeParens}, Diff: ${openParens - closeParens}`);

// Look for "return; }" pattern from regex migration
const returnMatches = [...content.matchAll(/\{ toast\.(error|success)\(([^)]+)\); return; \}/g)];
console.log(`\nFound ${returnMatches.length} fixed return;} patterns.`);
returnMatches.forEach((m, i) => {
  const lineNum = content.substring(0, m.index).split('\n').length;
  console.log(`  [${i+1}] Line ~${lineNum}: ${m[0].substring(0, 80)}`);
});

// Check for incomplete toast calls
const incompleteToast = [...content.matchAll(/\{ toast\.(error|success)\([^)]*$/gm)];
console.log(`\nIncomplete toast calls (not closed): ${incompleteToast.length}`);
