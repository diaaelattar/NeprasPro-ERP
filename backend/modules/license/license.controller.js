const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Path for permanent license storage in user profile (Rule 3 compliant)
const USER_DATA_DIR = path.join(os.homedir(), '.nepraspro');
const LICENSE_FILE_PATH = path.join(USER_DATA_DIR, 'license.dat');

// Ensure directory exists
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// Generate unique Hardware Machine ID based on CPU, OS & Hostname
const getMachineId = () => {
  const cpus = os.cpus().map(c => c.model).join('');
  const hostname = os.hostname();
  const platform = os.platform();
  const raw = `${cpus}-${hostname}-${platform}-NEPRAS2026`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  return `NEP-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
};

const SECRET_SALT = 'NEPRAS_PRO_ENTERPRISE_SECRET_KEY_2026';

// 1. Direct Machine ID Key Verification
const verifyDirectKey = (machineId, productKey) => {
  if (!productKey || typeof productKey !== 'string') return false;
  const cleanKey = productKey.trim().toUpperCase().replace(/-/g, '');
  const expectedHash = crypto.createHash('sha256').update(`${machineId}-${SECRET_SALT}`).digest('hex').toUpperCase();
  const expectedKey = `${expectedHash.substring(0, 5)}${expectedHash.substring(5, 10)}${expectedHash.substring(10, 15)}${expectedHash.substring(15, 20)}`;
  return cleanKey === expectedKey;
};

// 2. Master School Code / Universal Key Verification (Reverse Method - No Machine ID required from client)
const verifyMasterKey = (schoolCode, productKey) => {
  if (!productKey || typeof productKey !== 'string' || !schoolCode) return false;
  const cleanKey = productKey.trim().toUpperCase().replace(/-/g, '');
  const cleanCode = String(schoolCode).trim().toUpperCase();
  const masterHash = crypto.createHash('sha256').update(`MASTER-${cleanCode}-${SECRET_SALT}`).digest('hex').toUpperCase();
  const expectedMasterKey = `${masterHash.substring(0, 5)}${masterHash.substring(5, 10)}${masterHash.substring(10, 15)}${masterHash.substring(15, 20)}`;
  return cleanKey === expectedMasterKey;
};

// Read License Status
const getLicenseStatus = (req, res) => {
  try {
    const machineId = getMachineId();
    let licenseData = {
      machineId,
      isActivated: false,
      isTrial: true,
      trialDaysRemaining: 30,
      trialStartDate: new Date().toISOString(),
      licenseType: 'تجريبية (30 يوم)',
      ownerName: 'مؤسسة تعليمية (نسخة تجريبية)',
      copyright: 'حقوق الطبع والنشر © 2026 NeprasPro. جميع الحقوق محفوظة.'
    };

    if (fs.existsSync(LICENSE_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(LICENSE_FILE_PATH, 'utf8');
        const saved = JSON.parse(raw);
        if (saved.isActivated) {
          licenseData.isActivated = true;
          licenseData.isTrial = false;
          licenseData.licenseType = saved.licenseType || 'ترخيص نسق دائم (مفعل بالكامل)';
          licenseData.ownerName = saved.ownerName || 'مدرسة مفعّلة رسمياً';
          licenseData.productKey = saved.productKey;
          licenseData.activatedAt = saved.activatedAt;
          licenseData.allowedSeats = saved.allowedSeats || 'غير محدود';
        } else if (saved.trialStartDate) {
          licenseData.trialStartDate = saved.trialStartDate;
        }
      } catch (e) {
        console.error('[License Read Error]:', e.message);
      }
    } else {
      fs.writeFileSync(LICENSE_FILE_PATH, JSON.stringify(licenseData, null, 2), 'utf8');
    }

    if (!licenseData.isActivated) {
      const startDate = new Date(licenseData.trialStartDate);
      const now = new Date();
      const elapsedDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
      licenseData.trialDaysRemaining = Math.max(0, 30 - elapsedDays);
      if (licenseData.trialDaysRemaining <= 0) {
        licenseData.isTrialExpired = true;
        licenseData.licenseType = 'منتهية الفترة التجريبية (30 يوم)';
      }
    }

    res.json({ success: true, license: licenseData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Activate Product (Supports both Machine ID & School Master Key)
const activateLicense = (req, res) => {
  try {
    const { productKey, ownerName, schoolCode, seatsAllowed } = req.body;
    const machineId = getMachineId();

    if (!productKey) {
      return res.status(400).json({ success: false, error: 'يرجى أدخال كود التفعيل الرقمي.' });
    }

    const isDirectValid = verifyDirectKey(machineId, productKey);
    const isMasterValid = schoolCode ? verifyMasterKey(schoolCode, productKey) : false;

    if (!isDirectValid && !isMasterValid) {
      return res.status(400).json({
        success: false,
        error: 'رمز التفعيل المدخل غير صحيح. تحقق من المفتاح أو كود المدرسة.'
      });
    }

    const licenseData = {
      machineId,
      productKey: productKey.trim().toUpperCase(),
      ownerName: ownerName || 'مدرسة مفعّلة رسمياً',
      schoolCode: schoolCode || '',
      allowedSeats: seatsAllowed || 'متاح لعدة أجهزة',
      isActivated: true,
      licenseType: 'ترخيص نسق دائم (مفعل بالكامل)',
      activatedAt: new Date().toISOString(),
      copyright: 'حقوق الطبع والنشر © 2026 NeprasPro. جميع الحقوق محفوظة.'
    };

    fs.writeFileSync(LICENSE_FILE_PATH, JSON.stringify(licenseData, null, 2), 'utf8');

    res.json({
      success: true,
      message: '🎉 تم تفعيل ترخيص منظومة NeprasPro بنجاح لجميع أجهزة المدرسة!',
      license: licenseData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getLicenseStatus,
  activateLicense,
  getMachineId,
  verifyDirectKey,
  verifyMasterKey
};
