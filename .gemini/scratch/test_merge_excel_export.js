fetch('http://localhost:3001/api/students/export/excel?academicYearId=1&isMerged=1&templateName=سجل_الطلاب_المدمجين')
  .then(r => {
    console.log('STATUS:', r.status);
    console.log('CONTENT-TYPE:', r.headers.get('content-type'));
    return r.arrayBuffer();
  })
  .then(buf => {
    console.log('EXCEL BUFFER SIZE:', buf.byteLength, 'bytes');
  })
  .catch(console.error);
