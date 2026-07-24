const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const srcFiles = getFiles('d:/NeprasPro/frontend/src');
let totalMatches = 0;

srcFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('http://localhost:3001')) {
    console.log('Found http://localhost:3001 in:', file);
    // Replace with relative '/api' or dynamic host helper
    // If the string is 'http://localhost:3001/api...', we can use window.location.hostname
    content = content.replaceAll("'http://localhost:3001", "(`http://${window.location.hostname}:3001` + '");
    // Also clean up any template literals like `http://localhost:3001/api/...`
    content = content.replaceAll('http://localhost:3001', '${window.location.protocol}//${window.location.hostname}:3001');
    fs.writeFileSync(file, content);
    totalMatches++;
  }
});

console.log(`Replaced in ${totalMatches} files!`);
