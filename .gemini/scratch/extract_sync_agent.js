const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Use unzipper or node zip extraction via python / AdmZip if available, or simple zip listing
const { execSync } = require('child_process');

const zipPath = 'd:/NeprasPro/sync-agent.zip';
const outDir = 'd:/NeprasPro/.gemini/scratch/sync_agent_extracted';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Extract using powershell Expand-Archive
try {
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir}' -Force"`);
  console.log('Extraction complete!');
  
  function listFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        console.log('[DIR]', fullPath);
        listFiles(fullPath);
      } else {
        console.log('[FILE]', fullPath, '(', fs.statSync(fullPath).size, 'bytes)');
      }
    }
  }
  
  listFiles(outDir);
} catch (err) {
  console.error('Error extracting:', err);
}
