const fs = require('fs');
const path = require('path');

function searchFile(dir, target) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (item.toLowerCase() === target.toLowerCase()) {
        console.log('FOUND:', fullPath);
      } else if (fs.statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        searchFile(fullPath, target);
      }
    }
  } catch (e) {}
}

console.log('Searching for sync-agent.zip in d:/NeprasPro...');
searchFile('d:/NeprasPro', 'sync-agent.zip');

const userProfile = process.env.USERPROFILE || 'C:/Users/diaa_elattar';
console.log('Searching in Downloads / Desktop / AppData...');
searchFile(path.join(userProfile, 'Downloads'), 'sync-agent.zip');
searchFile(path.join(userProfile, 'Desktop'), 'sync-agent.zip');
