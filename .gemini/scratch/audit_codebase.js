const fs = require('fs');
const path = require('path');

console.log('--- AUDITING NEPRASPRO DATABASE & CONTROLLERS ---');

const dbJs = fs.readFileSync('d:/NeprasPro/backend/config/db.js', 'utf8');

// Check foreign key status
console.log('FK Pragma enabled in _openSQLite:', dbJs.includes("PRAGMA foreign_keys = ON;"));

// Check indexes in schema
const indexMatches = dbJs.match(/CREATE INDEX[^\n]+/gi) || [];
console.log('INDEXES CREATED IN DB.JS:', indexMatches.length);
indexMatches.forEach(idx => console.log('  -', idx));

// Check tables created
const tableMatches = dbJs.match(/CREATE TABLE IF NOT EXISTS [a_z0-9_]+/gi) || [];
console.log('TABLES CREATED IN DB.JS:', tableMatches.length);
tableMatches.forEach(tbl => console.log('  -', tbl));

// Check control.controller.js for transaction wrapping and bounds checks
const controlCtrl = fs.readFileSync('d:/NeprasPro/backend/modules/control/control.controller.js', 'utf8');
console.log('Control Marks Save has Transaction:', controlCtrl.includes('db.runTransaction'));
console.log('Control Marks Range Check (0..max):', controlCtrl.includes('m.written_marks >'));
