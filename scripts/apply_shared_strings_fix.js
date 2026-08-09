const fs = require('fs');
const filePath = 'd:/NeprasPro/backend/modules/students/students.controller.js';

let content = fs.readFileSync(filePath, 'utf8');

// Replace landscape setCell and zip updating
const oldLandscapeBlock = `    // Smart setCell preserving existing cell formatting/style (s="..." attribute)
    const setCell = (xml, cellRef, text) => {
      if (text === null || text === undefined) text = '';
      const esc = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const cellRegex = new RegExp(\`<c r="\${cellRef}"([^>]*?)>(.*?)</c>|<c r="\${cellRef}"([^>]*?)/?>\`, 's');
      const match = xml.match(cellRegex);

      if (match) {
        const attrs = match[1] || match[3] || '';
        const styleMatch = attrs.match(/\\bs="[^"]*"/);
        const styleAttr = styleMatch ? \` \${styleMatch[0]}\` : '';
        const replacement = \`<c r="\${cellRef}"\${styleAttr} t="inlineStr"><is><t>\${esc}</t></is></c>\`;
        return xml.replace(cellRegex, replacement);
      } else {
        const rowNum = cellRef.match(/\\d+/)[0];
        const rowOpenRegex = new RegExp(\`(<row r="\${rowNum}"[^>]*>)\`);
        const newCellXml = \`<c r="\${cellRef}" t="inlineStr"><is><t>\${esc}</t></is></c>\`;
        if (rowOpenRegex.test(xml)) {
          return xml.replace(rowOpenRegex, \`$1\${newCellXml}\`);
        }
        return xml.replace('</sheetData>', \`<row r="\${rowNum}">\${newCellXml}</row></sheetData>\`);
      }
    };`;

const newLandscapeBlock = `    // Load sharedStrings.xml for clean, formula-compatible string injection
    let sharedStringsXml = zip.file('xl/sharedStrings.xml') ? await zip.file('xl/sharedStrings.xml').async('string') : '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"></sst>';
    const stringMap = new Map();
    const existingMatches = [...sharedStringsXml.matchAll(/<t[^>]*>(.*?)<\/t>/g)];
    existingMatches.forEach((m, idx) => {
      stringMap.set(m[1], idx);
    });
    let stringCount = existingMatches.length;

    const addSharedString = (text) => {
      if (text === null || text === undefined) text = '';
      const strText = String(text);
      if (stringMap.has(strText)) {
        return stringMap.get(strText);
      }
      const esc = strText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const newIdx = stringCount++;
      stringMap.set(strText, newIdx);
      sharedStringsXml = sharedStringsXml.replace('</sst>', \`<si><t>\${esc}</t></si></sst>\`);
      return newIdx;
    };

    // Smart setCell using Shared Strings (t="s") for 100% formula & OpenXML compatibility
    const setCell = (xml, cellRef, text) => {
      const sIdx = addSharedString(text);
      const cellRegex = new RegExp(\`<c r="\${cellRef}"([^>]*?)>(.*?)</c>|<c r="\${cellRef}"([^>]*?)/?>\`, 's');
      const match = xml.match(cellRegex);

      if (match) {
        const attrs = match[1] || match[3] || '';
        const styleMatch = attrs.match(/\\bs="[^"]*"/);
        const styleAttr = styleMatch ? \` \${styleMatch[0]}\` : '';
        const replacement = \`<c r="\${cellRef}"\${styleAttr} t="s"><v>\${sIdx}</v></c>\`;
        return xml.replace(cellRegex, replacement);
      } else {
        const rowNum = cellRef.match(/\\d+/)[0];
        const rowOpenRegex = new RegExp(\`(<row r="\${rowNum}"[^>]*>)\`);
        const newCellXml = \`<c r="\${cellRef}" t="s"><v>\${sIdx}</v></c>\`;
        if (rowOpenRegex.test(xml)) {
          return xml.replace(rowOpenRegex, \`$1\${newCellXml}\`);
        }
        return xml.replace('</sheetData>', \`<row r="\${rowNum}">\${newCellXml}</row></sheetData>\`);
      }
    };`;

let matchesFound = 0;
while (content.includes(oldLandscapeBlock)) {
  content = content.replace(oldLandscapeBlock, newLandscapeBlock);
  matchesFound++;
}

// Add sharedStringsXml update before zip.generateAsync
const oldZipSave = `    zip.file('xl/worksheets/sheet1.xml', sheet1);`;
const newZipSave = `    sharedStringsXml = sharedStringsXml.replace(/count="\\d+"/, \`count="\${stringCount}"\`);
    sharedStringsXml = sharedStringsXml.replace(/uniqueCount="\\d+"/, \`uniqueCount="\${stringCount}"\`);
    zip.file('xl/sharedStrings.xml', sharedStringsXml);
    zip.file('xl/worksheets/sheet1.xml', sheet1);`;

content = content.replaceAll(oldZipSave, newZipSave);

fs.writeFileSync(filePath, content, 'utf8');
console.log(`✅ Applied Shared Strings fix to students.controller.js! Matches replaced: ${matchesFound}`);
