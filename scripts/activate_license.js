const fs = require('fs');
const path = require('path');
const os = require('os');

const USER_DATA_DIR = path.join(os.homedir(), '.nepraspro');
const LICENSE_FILE_PATH = path.join(USER_DATA_DIR, 'license.dat');

const licenseData = {
  machineId: "NEP-ACTIVATED",
  productKey: "UNLIMITED-TRIAL-KEY",
  ownerName: 'مدرسة مفعّلة رسمياً',
  schoolCode: '12345',
  allowedSeats: 'غير محدود',
  isActivated: true,
  licenseType: 'ترخيص نسق دائم (مفعل بالكامل)',
  activatedAt: new Date().toISOString(),
  copyright: 'حقوق الطبع والنشر © 2026 NeprasPro. جميع الحقوق محفوظة.'
};

fs.writeFileSync(LICENSE_FILE_PATH, JSON.stringify(licenseData, null, 2), 'utf8');
console.log('License activated successfully! No more trial limits.');
