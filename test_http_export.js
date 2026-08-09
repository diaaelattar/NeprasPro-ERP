const http = require('http');
const fs = require('fs');
const path = require('path');

const url = 'http://localhost:3001/api/students/export/class-list?mode=primary_portrait&academicYearId=1';

console.log('📡 Sending HTTP GET request to backend server:', url);

http.get(url, (res) => {
  console.log('✅ Response Status:', res.statusCode);
  console.log('✅ Response Content-Type:', res.headers['content-type']);
  console.log('✅ Response Content-Disposition:', res.headers['content-disposition']);

  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    console.log(`🎉 Downloaded ${(buffer.length / 1024).toFixed(2)} KB over HTTP!`);
    fs.writeFileSync(path.join(__dirname, 'test_http_download.xlsm'), buffer);
    console.log('Saved to test_http_download.xlsm successfully!');
  });
}).on('error', (err) => {
  console.error('❌ HTTP Error:', err.message);
});
