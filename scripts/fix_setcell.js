/**
 * fix_setcell.js — patches both setCell functions in students.controller.js
 * with a robust version that handles missing rows (Case 3).
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/modules/students/students.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

// ── The fixed setCell (plain string, no template literal confusion) ────────────
const fixedSetCell = [
  '    const setCell = (xml, cellRef, text) => {',
  '      if (text === null || text === undefined) text = \'\';',
  '      const esc = String(text)',
  '        .replace(/&/g, \'&amp;\')',
  '        .replace(/</g, \'&lt;\')',
  '        .replace(/>/g, \'&gt;\');',
  '',
  '      const newCellXml = `<c r="${cellRef}" t="inlineStr"><is><t>${esc}</t></is></c>`;',
  '',
  '      // Case 1: cell already exists → replace it',
  '      const cellRegex = new RegExp(',
  '        `<c r="${cellRef}"(?:[^>]*)>[\\\\s\\\\S]*?</c>|<c r="${cellRef}"(?:[^>]*)/>`,',
  '        \'g\'',
  '      );',
  '      if (cellRegex.test(xml)) {',
  '        cellRegex.lastIndex = 0;',
  '        return xml.replace(cellRegex, newCellXml);',
  '      }',
  '',
  '      // Case 2: row exists but cell absent → prepend cell into the row',
  '      const rowNum = cellRef.match(/\\\\d+/)[0];',
  '      const rowOpenRegex = new RegExp(`(<row r="${rowNum}"(?:[^>]*)>)`);',
  '      if (rowOpenRegex.test(xml)) {',
  '        return xml.replace(rowOpenRegex, `$1${newCellXml}`);',
  '      }',
  '',
  '      // Case 3: row does not exist → insert brand-new row before </sheetData>',
  '      // Excel omits blank template rows from XML — this was causing empty output',
  '      return xml.replace(\'</sheetData>\', `<row r="${rowNum}">${newCellXml}</row></sheetData>`);',
  '    };',
].join('\n');

// ── Old setCell pattern to find and replace ───────────────────────────────────
const OLD_SETCELL_REGEX = /    const setCell = \(xml, cellRef, text\) => \{[\s\S]*?      \}\n    \};/g;

const matches = content.match(OLD_SETCELL_REGEX);
if (!matches) {
  console.error('ERROR: Could not find setCell function in the file!');
  process.exit(1);
}

console.log(`Found ${matches.length} setCell function(s). Replacing all...`);

let count = 0;
content = content.replace(OLD_SETCELL_REGEX, () => {
  count++;
  console.log(`  Replaced occurrence #${count}`);
  return fixedSetCell;
});

if (count === 0) {
  console.error('ERROR: No replacements were made!');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Done. Replaced ${count} setCell function(s) with the robust 3-case version.`);
console.log('File saved:', filePath);
