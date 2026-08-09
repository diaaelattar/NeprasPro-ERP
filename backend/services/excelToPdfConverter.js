/**
 * excelToPdfConverter.js — Direct Native Excel Automation Engine
 * NeprasPro Educational ERP (Enterprise Edition)
 *
 * Rules:
 *   1. Direct 100% MS Excel COM automation (run macro `تصدير_PDF_تلقائي` or `ExportAsFixedFormat`).
 *   2. Support direct desktop open via `openXlsmInExcel`.
 *   3. NO HTML/Puppeteer fallback to preserve pure Excel layout.
 */

const fs        = require('fs');
const path      = require('path');
const os        = require('os');
const { exec, execSync } = require('child_process');

const TEMP_DIR = path.join(os.homedir(), '.nepraspro', 'temp_exports');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const PRINT_MACRO_NAME = 'تصدير_PDF_تلقائي';

/**
 * Run a PowerShell script string synchronously with timeout.
 * Always writes with UTF-8 BOM (\uFEFF) so Arabic text in PowerShell is preserved.
 */
function runPowerShellScript(scriptContent, timeoutMs = 60000) {
  const uid   = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tmpPs = path.join(TEMP_DIR, `ps_${uid}.ps1`);
  fs.writeFileSync(tmpPs, '\uFEFF' + scriptContent, { encoding: 'utf8' });
  try {
    const out = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpPs}"`,
      { timeout: timeoutMs, encoding: 'utf8' }
    );
    return { success: true, stdout: out };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    try { if (fs.existsSync(tmpPs)) fs.unlinkSync(tmpPs); } catch (_) {}
  }
}

/**
 * Engine 1 — MS Excel Native COM:
 *   a. Opens populated .xlsm in background MS Excel COM
 *   b. Runs macro `تصدير_PDF_تلقائي` if available
 *   c. Fallback to $wb.ExportAsFixedFormat(0, '$absPdf')
 */
async function convertViaExcelCom(xlsmPath, pdfPath) {
  const absXlsm = path.resolve(xlsmPath).replace(/\//g, '\\');
  const absPdf  = path.resolve(pdfPath).replace(/\//g, '\\');

  const script = `
$ErrorActionPreference = 'Stop'
$macroRan = $false
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.AutomationSecurity = 1 # msoAutomationSecurityLow: auto-enable macros without dialog
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false

  $wb = $excel.Workbooks.Open('${absXlsm}')

  # ── 1. Try executing the VBA print macro first ─────────────
  try {
    $excel.Run('${PRINT_MACRO_NAME}')
    $macroRan = $true
    Write-Output "MACRO_EXEC_OK"
  } catch {
    Write-Output "MACRO_SKIP:$($_.Exception.Message)"
  }

  # ── 2. If macro didn't output a PDF, export directly ───────
  if (-not $macroRan -or -not (Test-Path '${absPdf}')) {
    # 0 = xlTypePDF
    $wb.ExportAsFixedFormat(0, '${absPdf}')
    Write-Output "DIRECT_EXPORT_OK"
  }

  $wb.Close($false)
  $excel.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb)   | Out-Null
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
  [GC]::Collect()
  Write-Output "SUCCESS"
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
`;

  const res = runPowerShellScript(script, 60000);
  if (res.success && fs.existsSync(absPdf) && fs.statSync(absPdf).size > 1000) {
    console.log(`[ExcelToPdf] ✅ MS Excel COM engine succeeded. output: ${(res.stdout || '').trim()}`);
    return true;
  }
  if (!res.success) {
    console.warn('[ExcelToPdf] MS Excel COM failed:', res.error?.substring(0, 300));
  }
  return false;
}

/**
 * Engine 2 — LibreOffice headless CLI (Secondary backup)
 */
async function convertViaLibreOffice(xlsmPath, pdfPath) {
  const absXlsm = path.resolve(xlsmPath);
  const outDir  = path.dirname(path.resolve(pdfPath));

  const candidates = [
    'soffice',
    'libreoffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ];

  let soffice = null;
  for (const exe of candidates) {
    try { execSync(`"${exe}" --version`, { stdio: 'ignore' }); soffice = exe; break; } catch (_) {}
  }
  if (!soffice) return false;

  try {
    execSync(`"${soffice}" --headless --convert-to pdf --outdir "${outDir}" "${absXlsm}"`, {
      timeout: 45000, stdio: 'ignore',
    });
    const generated = path.join(outDir, `${path.basename(absXlsm, path.extname(absXlsm))}.pdf`);
    if (fs.existsSync(generated)) {
      if (generated !== path.resolve(pdfPath)) fs.renameSync(generated, path.resolve(pdfPath));
      return true;
    }
  } catch (e) {
    console.warn('[ExcelToPdf] LibreOffice failed:', e.message?.substring(0, 150));
  }
  return false;
}

/**
 * Converts a populated .xlsm Buffer or path to a PDF Buffer directly via Excel.
 * NO Puppeteer fallback.
 */
async function convertXlsmToPdf(xlsmInput) {
  const uid      = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const xlsmPath = typeof xlsmInput === 'string'
    ? xlsmInput
    : path.join(TEMP_DIR, `in_${uid}.xlsm`);
  const isTmp = Buffer.isBuffer(xlsmInput);

  if (isTmp) fs.writeFileSync(xlsmPath, xlsmInput);
  const pdfPath = path.join(TEMP_DIR, `out_${uid}.pdf`);

  try {
    console.log('[ExcelToPdf] Running MS Excel Native COM Engine…');
    if (await convertViaExcelCom(xlsmPath, pdfPath)) {
      return fs.readFileSync(pdfPath);
    }

    console.log('[ExcelToPdf] Running LibreOffice Engine…');
    if (await convertViaLibreOffice(xlsmPath, pdfPath)) {
      return fs.readFileSync(pdfPath);
    }

    throw new Error('يرجى التأكد من تثبيت برنامج Microsoft Excel على الجهاز لتشغيل ماكرو وطباعة التقرير.');
  } finally {
    if (isTmp) { try { fs.unlinkSync(xlsmPath); } catch (_) {} }
    try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch (_) {}
  }
}

/**
 * Opens a populated .xlsm Buffer directly in Microsoft Excel on the user's desktop screen.
 */
function openXlsmInExcel(xlsmBuffer, fileNameHint = 'تقرير.xlsm') {
  const safeName = fileNameHint.replace(/[\\/:*?"<>|]/g, '_');
  const filePath = path.join(TEMP_DIR, safeName);
  fs.writeFileSync(filePath, xlsmBuffer);

  // Open file with default Windows program (MS Excel)
  exec(`start "" "${filePath}"`, (err) => {
    if (err) console.error('[ExcelToPdf] Failed to open file in Excel:', err);
  });
  return filePath;
}

module.exports = { convertXlsmToPdf, openXlsmInExcel, convertViaExcelCom, convertViaLibreOffice };
