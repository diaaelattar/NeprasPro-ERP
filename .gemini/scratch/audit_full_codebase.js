const fs = require('fs');
const path = require('path');

console.log('=== NEPRASPRO FULL SYSTEM ARCHITECT AUDIT ===');

const dbJs = fs.readFileSync('d:/NeprasPro/backend/config/db.js', 'utf8');

// 1. Extract all CREATE TABLE statements in db.js
const tables = [];
const tableRegex = /CREATE TABLE IF NOT EXISTS ([a_z0-9_]+)\s*\(([^;]+)\);/gis;
let match;
while ((match = tableRegex.exec(dbJs)) !== null) {
  tables.push({ tableName: match[1], definition: match[2].trim() });
}

console.log(`\n--- TOTAL TABLES DEFINED (${tables.length}) ---`);
tables.forEach(t => {
  const fkCount = (t.definition.match(/REFERENCES/gi) || []).length;
  console.log(`- ${t.tableName}: ${fkCount} Foreign Keys`);
});

// 2. Check foreign key enforcement
console.log('\n--- FOREIGN KEY PRAGMA ---');
console.log('PRAGMA foreign_keys = ON in _openSQLite:', dbJs.includes('PRAGMA foreign_keys = ON;'));

// 3. Inspect controllers for error handling and transaction usage
const modulesDir = 'd:/NeprasPro/backend/modules';
const modules = fs.readdirSync(modulesDir);

console.log('\n--- MODULE CONTROLLER INSPECTION ---');
modules.forEach(mod => {
  const modPath = path.join(modulesDir, mod);
  if (fs.statSync(modPath).isDirectory()) {
    const files = fs.readdirSync(modPath);
    files.forEach(f => {
      if (f.endsWith('.controller.js')) {
        const content = fs.readFileSync(path.join(modPath, f), 'utf8');
        const lines = content.split('\n').length;
        const txCount = (content.match(/runTransaction/g) || []).length;
        const selectStar = (content.match(/SELECT \*/gi) || []).length;
        console.log(`  Module [${mod}/${f}]: ${lines} lines, ${txCount} Transactions, ${selectStar} SELECT * queries`);
      }
    });
  }
});
