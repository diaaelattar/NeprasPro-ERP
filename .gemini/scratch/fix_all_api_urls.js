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
let updatedCount = 0;

srcFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('http://localhost:3001')) {
    console.log('Fixing API host in:', file);
    // Replace all instances of http://localhost:3001 with dynamic host
    content = content.replace(/http:\/\/localhost:3001/g, 'http://${window.location.hostname}:3001');
    
    // Fix string quotes to template literals if necessary
    // Check if replacing created single quote followed by `http://${window...}`
    content = content.replace(/'http:\/\/\${window\.location\.hostname}:3001([^']*)'/g, "`http://\${window.location.hostname}:3001$1`");
    content = content.replace(/"http:\/\/\${window\.location\.hostname}:3001([^"]*)"/g, "`http://\${window.location.hostname}:3001$1`");

    fs.writeFileSync(file, content);
    updatedCount++;
  }
});

console.log(`Successfully updated ${updatedCount} files to support LAN/Mobile access!`);
