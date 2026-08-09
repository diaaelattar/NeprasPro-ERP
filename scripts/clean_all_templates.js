const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function cleanTemplateFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`\nInspecting template: ${filePath}`);
  
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    let modified = false;

    // 1. Remove calcChain.xml if present
    if (zip.file('xl/calcChain.xml')) {
      zip.remove('xl/calcChain.xml');
      modified = true;
      console.log('  - Removed xl/calcChain.xml');
    }

    // 2. Remove calcChain from [Content_Types].xml
    if (zip.file('[Content_Types].xml')) {
      let ct = await zip.file('[Content_Types].xml').async('string');
      if (ct.includes('calcChain.xml')) {
        ct = ct.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
        zip.file('[Content_Types].xml', ct);
        modified = true;
        console.log('  - Removed calcChain from [Content_Types].xml');
      }
    }

    // 3. Remove calcChain relationship from xl/_rels/workbook.xml.rels
    if (zip.file('xl/_rels/workbook.xml.rels')) {
      let rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
      if (rels.includes('calcChain.xml')) {
        rels = rels.replace(/<Relationship [^>]*Target="calcChain\.xml"[^>]*\/>/g, '');
        zip.file('xl/_rels/workbook.xml.rels', rels);
        modified = true;
        console.log('  - Removed calcChain relationship from workbook.xml.rels');
      }
    }

    // 4. Remove broken/draft definedNames from xl/workbook.xml (#REF! or lolo, ty_u)
    if (zip.file('xl/workbook.xml')) {
      let wbXml = await zip.file('xl/workbook.xml').async('string');
      let origWb = wbXml;

      wbXml = wbXml.replace(/<definedName [^>]*>.*?#REF!.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedName name="lolo[^"]*"[^>]*>.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedName name="ty_u[^"]*"[^>]*>.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedNames>\s*<\/definedNames>/g, '');

      if (wbXml !== origWb) {
        zip.file('xl/workbook.xml', wbXml);
        modified = true;
        console.log('  - Cleaned broken definedNames from xl/workbook.xml');
      }
    }

    if (modified) {
      const cleanBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      fs.writeFileSync(filePath, cleanBuf);
      console.log(`✅ Successfully cleaned template: ${filePath}`);
    } else {
      console.log(`✨ Template is already clean: ${filePath}`);
    }
  } catch (err) {
    console.error(`❌ Error cleaning template ${filePath}:`, err.message);
  }
}

async function runAllTemplatesCleaning() {
  const dirsToScan = [
    'd:/NeprasPro',
    'd:/NeprasPro/frontend/public',
    'd:/NeprasPro/backend/templates',
    'd:/NeprasPro/backend/templates/reports'
  ];

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.endsWith('.xltm') || f.endsWith('.xltx') || f.endsWith('.xlsm')) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isFile()) {
          await cleanTemplateFile(fullPath);
        }
      }
    }
  }
}

runAllTemplatesCleaning().catch(console.error);
