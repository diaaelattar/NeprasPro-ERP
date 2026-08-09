const fs = require('fs');
const JSZip = require('jszip');

async function checkRows(filePath) {
  if (!fs.existsSync(filePath)) return console.log('File not found:', filePath);
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  let xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  let sharedStrings = zip.file('xl/sharedStrings.xml') ? await zip.file('xl/sharedStrings.xml').async('string') : '';
  
  // extract shared strings
  const strings = [];
  const matches = [...sharedStrings.matchAll(/<t.*?>(.*?)<\/t>/g)];
  matches.forEach(m => strings.push(m[1]));
  
  // extract cells
  const cellRegex = /<c r=\"(.*?)\"[^>]*>(.*?)<\/c>/g;
  let cmatch;
  let cells = [];
  while ((cmatch = cellRegex.exec(xml)) !== null) {
    const ref = cmatch[1];
    let valMatch = cmatch[2].match(/<v>(.*?)<\/v>/);
    let val = valMatch ? valMatch[1] : '';
    let isStr = cmatch[0].includes('t="s"');
    let isInline = cmatch[0].includes('t="inlineStr"');
    if (isStr && strings[val]) val = strings[val];
    else if (isInline) {
      let inl = cmatch[2].match(/<t.*?>(.*?)<\/t>/);
      if (inl) val = inl[1];
    }
    if (val && (val.includes('م') || val.includes('اسم') || val.includes('طالب') || val.includes('حالة') || val.includes('قيد'))) {
      cells.push({ref, val});
    }
  }
  console.log('--- ' + filePath);
  console.log(cells.slice(0, 10));
}

(async () => {
  const tpls = [
    'كشف_رصد_صفوف_أولى_بالعرض.xltm',
    'كشف_رصد_صفوف_أولى_بالطول.xltm',
    'كشف_رصد_صفوف_عليا_بالعرض.xltm',
    'كشف_رصد_صفوف_عليا_بالطول.xltm',
    'كشف_رصد_اعدادى_بالعرض.xltm',
    'كشف_رصد_اعدادى_بالطول.xltm',
    'كشف_رصد_ثانوى_بالعرض.xltm',
    'كشف_رصد_ثانوى_بالطول.xltm'
  ];
  for (const t of tpls) {
    await checkRows('d:\\NeprasPro\\backend\\templates\\students\\' + t);
  }
})();
