// ============================================================
//  جامع بيانات الطلاب الذكي - الإصدار 14.0
//  المطور : م. ضياء العطار | هاتف: 01118209309
//  تحسينات v14: إرسال مباشر لـ NeprasPro API
//              مزامنة فورية مع قاعدة بيانات نبراس برو
// ============================================================

(async function () {
    'use strict';

    const VER = 'v14.0';

    // NeprasPro API Endpoint
    const NEPRAS_API = 'http://localhost:3001/api/students/emis/sync';

    // ─────────────────────────────────────────
    // 1. الإعدادات والثوابت
    // ─────────────────────────────────────────
    const CONFIG = {
        BATCH_SIZE        : 50,
        WAIT_SHORT        : 800,
        WAIT_MED          : 1500,
        WAIT_LONG         : 3000,
        EDIT_WAIT_MAX     : 18000,
        EDIT_RETRY_INTERVAL: 1000,
        TARGET_TABLE_ROWS : 2000,
        MAX_AUTO_RETRY    : 3,
        SELECTORS: {
            STUDENT_LINK    : 'a[href*="/student/edit/"], a[href*="/Student/edit/"]',
            FORM_INPUTS     : 'input:not([type="hidden"]), select, textarea',
            SEARCH_BTN_TEXT : 'بحث',
            PAGE_SIZE_SELECT: 'select[name*="length"], select[name*="pageLength"], select[aria-label*="rows per page"], select[data-length], .dataTables_length select'
        },
        PREFERRED_COLUMNS: [
            "كود التلميذ","الرقم القومى","الاسم بالكامل","الاسم الأول*","اسم الوالد*",
            "اسم الجد*","اللقب / العائله*","الجنسيه*","الرقم القومى*","النوع*",
            "الديانه*","yyyy-mm-dd","محافظة الميلاد*","اسم الام الأول*","اسم الوالد للام*",
            "اسم الجد للام*","اللقب / العائله للام","العنوان","المرحلة*","الصف*","نظام التعليم*",
            "حالة قيد الطالب*","الفصل*","الشعبه*","التخصص*","اللغه الاجنبية الاولي*",
            "اللغه الاجنبية الثانية*","الموقف من الدمج*","الصف المستهدف","رقم التليفون","رقم المحمول"
        ]
    };

    // ─────────────────────────────────────────
    // 2. التخزين  (chrome.storage.local)
    // ─────────────────────────────────────────
    const Store = {
        async get(key, def = null) {
            if (typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local) {
                return new Promise(r => chrome.storage.local.get([key], res =>
                    r(res[key] !== undefined ? res[key] : def)));
            }
            try {
                const item = localStorage.getItem('nepras_ext_' + key);
                return item !== null ? JSON.parse(item) : def;
            } catch (_) { return def; }
        },
        async set(key, val) {
            if (typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local) {
                return new Promise(r => chrome.storage.local.set({ [key]: val }, r));
            }
            try {
                localStorage.setItem('nepras_ext_' + key, JSON.stringify(val));
            } catch (_) {}
        },
        async delete(key) {
            if (typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local) {
                return new Promise(r => chrome.storage.local.remove([key], r));
            }
            try {
                localStorage.removeItem('nepras_ext_' + key);
            } catch (_) {}
        },
        async clearAll() {
            if (typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local) {
                return new Promise(r => chrome.storage.local.clear(r));
            }
            try {
                localStorage.clear();
            } catch (_) {}
        }
    };

    // ─────────────────────────────────────────
    // 2.1 الربط المباشر وحسابات المزامنة (NeprasAPI)
    // ─────────────────────────────────────────
    const NeprasAPI = {
        async getRegisteredCodes() {
            // 1. Electron API
            try {
                if (window.electronAPI && typeof window.electronAPI.getRegisteredCodes === 'function') {
                    const res = await window.electronAPI.getRegisteredCodes();
                    if (res && res.success) return res;
                }
            } catch (_) {}

            // 2. Direct require IPC
            try {
                if (typeof require !== 'undefined') {
                    const { ipcRenderer } = require('electron');
                    const res = await ipcRenderer.invoke('emis:get-registered-codes');
                    if (res && res.success) return res;
                }
            } catch (_) {}

            // 3. HTTP Fetch
            try {
                const res = await fetch('http://localhost:3001/api/students/emis/registered-codes')
                    .catch(() => fetch('http://127.0.0.1:3001/api/students/emis/registered-codes'));
                if (res && res.ok) {
                    return await res.json();
                }
            } catch (_) {}

            return { success: false, allIdentifiers: [] };
        },

        async sendBatch(data, showModal = false) {
            if (!data || !data.length) {
                showToast('⚠️ لا توجد بيانات طلاب لإرسالها!', 'warning');
                return null;
            }

            showToast(`⏳ جاري إرسال ${data.length} طالب إلى نبراس برو...`, 'info');

            let syncResult = null;

            // 1. المحاولة الأولى والأقوى عبر Electron IPC Promise (تتخطى أي حظر للمتصفح 100%)
            try {
                if (window.electronAPI && typeof window.electronAPI.syncEmisPromise === 'function') {
                    syncResult = await window.electronAPI.syncEmisPromise({ students: data, source: 'extension_v14' });
                }
            } catch (ipcErr) {
                console.warn('[Ext] syncEmisPromise error:', ipcErr.message);
            }

            // 2. المحاولة الثانية عبر require('electron').ipcRenderer مباشرة
            if (!syncResult || !syncResult.success) {
                try {
                    if (typeof require !== 'undefined') {
                        const { ipcRenderer } = require('electron');
                        syncResult = await ipcRenderer.invoke('emis:sync-data-promise', { students: data, source: 'extension_v14' });
                    }
                } catch (reqErr) {
                    console.warn('[Ext] Require ipcRenderer invoke error:', reqErr.message);
                }
            }

            // 3. المحاولة الثالثة عبر Fetch المباشر لـ NEPRAS_API
            if (!syncResult || !syncResult.success) {
                try {
                    const res = await fetch(NEPRAS_API, {
                        method : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body   : JSON.stringify({ students: data, source: 'extension_v14' }),
                    });
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.success) syncResult = json;
                    }
                } catch (err) {
                    console.warn('[Ext] Fetch Sync error:', err.message);
                }
            }

            if (syncResult && syncResult.success) {
                const resDetails = syncResult.results || {};
                const nowStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                await Store.set('nepras_last_sync_time', nowStr);
                await Store.set('nepras_last_sync_count', syncResult.received || data.length);
                await Store.set('nepras_last_sync_results', resDetails);

                // تحديث بطاقة الحالة على اللوحة
                const syncBadge = document.getElementById('gm-sync-status-text');
                if (syncBadge) {
                    syncBadge.innerHTML = `<span style="color:#10b981">🟢 تم حفظ ${syncResult.received || data.length} طالب بنجاح (${nowStr})</span>`;
                }

                showToast(`✅ تم حفظ وإدراج ${syncResult.received || data.length} طالب بنجاح بجدول الطلاب الرئيسي!`, 'success');

                if (showModal) {
                    this.showSyncReportModal(syncResult, data.length, nowStr);
                }
                return syncResult;
            } else {
                showToast('❌ تعذر الاتصال ببرنامج نبراس برو! تأكد أن التطبيق يعمل على الجهاز.', 'error');
                if (showModal) {
                    alert('❌ فشل الإرسال: تعذر الاتصال بخادم نبراس برو الداخلي (http://localhost:3001).\nتأكد أن برنامج نبراس برو مفتوح وتعمل الخدمة بنجاح.');
                }
                return null;
            }
        },

        showSyncReportModal(syncData, sentCount, timeStr) {
            const existing = document.getElementById('gm-sync-report-modal');
            if (existing) existing.remove();

            const res = syncData.results || {};
            const modal = document.createElement('div');
            modal.id = 'gm-sync-report-modal';
            Object.assign(modal.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
                zIndex: '99999999', display: 'flex', alignItems: 'center', justifyContent: 'center',
                direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif'
            });

            modal.innerHTML = `
                <div style="background: #ffffff; width: 440px; max-width: 90vw; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); padding: 24px; text-align: center; border: 1px solid #e2e8f0; animation: gmPop .25s ease-out;">
                    <div style="width: 56px; height: 56px; background: #dcfce7; color: #15803d; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px auto;">
                        ✅
                    </div>
                    <h3 style="margin: 0 0 6px 0; font-size: 20px; color: #0f172a; font-weight: 800;">تقرير مزامنة نبراس برو</h3>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">تأكيد الإرسال والحفظ المباشر في قاعدة البيانات</p>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: right;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                            <span style="color: #475569;">📋 إجمالي السجلات المرسلة:</span>
                            <strong style="color: #0f172a;">${sentCount} طالب</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                            <span style="color: #16a34a;">🆕 سجلات جديدة مضافة:</span>
                            <strong style="color: #16a34a;">${res.new || 0} طالب</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                            <span style="color: #2563eb;">🔄 سجلات تم تحديثها بكود الوزارة:</span>
                            <strong style="color: #2563eb;">${res.updated || 0} طالب</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                            <span style="color: #64748b;">⏩ سجلات متخطاة (بدون رقم قومي/كود):</span>
                            <strong style="color: #64748b;">${res.skipped || 0} طالب</strong>
                        </div>
                        <div style="border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8;">
                            <span>🕒 وقت التأكيد بالخادم:</span>
                            <span>${timeStr}</span>
                        </div>
                    </div>

                    <button id="gm-close-sync-modal" style="width: 100%; padding: 12px; border: none; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-weight: 700; font-size: 15px; cursor: pointer; transition: all .2s;">
                        👍 تم والرجوع للأداة
                    </button>
                </div>
            `;

            document.body.appendChild(modal);
            document.getElementById('gm-close-sync-modal').onclick = () => modal.remove();
        },

        async fetchConfig() {
            try {
                const res = await fetch('http://localhost:3001/api/students/emis/config', {
                    signal: AbortSignal.timeout(5000)
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.config) {
                        const cfg = json.config;
                        if (cfg.delayMs) {
                            CONFIG.WAIT_SHORT = Math.max(500, cfg.delayMs);
                            CONFIG.WAIT_MED   = Math.max(1000, cfg.delayMs * 1.5);
                        }
                        if (cfg.batchSize) CONFIG.BATCH_SIZE = cfg.batchSize;
                        await Store.set('nepras_app_config', cfg);
                        return cfg;
                    }
                }
            } catch (err) {
                console.warn('[Ext] Could not fetch Nepras app config:', err);
            }
            return null;
        },

        async fetchDiff(ministryList) {
            try {
                const res = await fetch('http://localhost:3001/api/students/emis/diff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ministryList }),
                    signal: AbortSignal.timeout(8000)
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) return json;
                }
            } catch (err) {
                console.warn('[Ext] Could not fetch Nepras diff:', err);
            }
            return null;
        }
    };

    // ─────────────────────────────────────────
    // 3. أدوات مساعدة
    // ─────────────────────────────────────────
    const Utils = {
        sleep: ms => new Promise(r => setTimeout(r, ms)),

        async getSpeedDelays() {
            const mode = (await Store.get('speed_mode', 'balanced')) || 'balanced';
            if (mode === 'fast' || mode === 'turbo') {
                return {
                    mode: 'fast',
                    pollInterval: 100,
                    settlingTime: 600,
                    shortWait: 500,
                    medWait: 1000,
                    maxSearchWait: 4000,
                    searchPostSleep: 300
                };
            }
            if (mode === 'safe') {
                return {
                    mode: 'safe',
                    pollInterval: 200,
                    settlingTime: 1200,
                    shortWait: 1000,
                    medWait: 2000,
                    maxSearchWait: 7000,
                    searchPostSleep: 600
                };
            }
            // balanced (default - highly reliable & stable)
            return {
                mode: 'balanced',
                pollInterval: 120,
                settlingTime: 800,
                shortWait: 700,
                medWait: 1400,
                maxSearchWait: 5000,
                searchPostSleep: 400
            };
        },

        async waitForElement(selector, maxTimeout = 2800, pollInterval = 100) {
            const startTime = Date.now();
            while (Date.now() - startTime < maxTimeout) {
                const el = document.querySelector(selector);
                if (el) return el;
                await this.sleep(pollInterval);
            }
            return document.querySelector(selector);
        },

        extractStudentId(url) {
            if (!url) return null;
            const m = url.match(/edit\/([^/?#]+)/i) || url.match(/id=([^&#]+)/i) || url.match(/code=([^&#]+)/i);
            if (m) {
                const clean = m[1].trim();
                if (/^\d{5,14}$/.test(clean)) return clean;
            }
            const digitMatch = url.match(/\b\d{6,14}\b/);
            return digitMatch ? digitMatch[0] : null;
        },

        findInputByLabelText(text) {
            for (const lbl of document.querySelectorAll('label')) {
                if (lbl.textContent.trim().includes(text)) {
                    const inp = lbl.parentElement?.querySelector('input, select');
                    if (inp) return inp;
                }
            }
            return null;
        },

        setInputValueAngular(el, val) {
            if (!el) return;
            el.value = val;
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        },

        formatDuration(ms) {
            if (ms < 0 || !isFinite(ms)) return '--:--';
            const s  = Math.floor(ms / 1000);
            const m  = Math.floor(s / 60);
            const h  = Math.floor(m / 60);
            if (h > 0) return `${h}س ${m % 60}د`;
            if (m > 0) return `${m}د ${s % 60}ث`;
            return `${s}ث`;
        },

        // ─── Toast Notifications ───
        showToast(msg, type = 'info') {
            let container = document.getElementById('gm-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'gm-toast-container';
                document.body.appendChild(container);
            }
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            const toast = document.createElement('div');
            toast.className = `gm-toast gm-toast-${type}`;
            toast.innerHTML = `<span class="gm-toast-icon">${icons[type] || icons.info}</span>
                               <span class="gm-toast-text">${msg}</span>`;
            container.appendChild(toast);
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            });
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(30px)';
                setTimeout(() => toast.remove(), 400);
            }, 5000);
        },

        // صوت بسيط عند الإنجاز
        playDone() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                [523, 659, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
                    osc.start(ctx.currentTime + i * 0.15);
                    osc.stop(ctx.currentTime + i * 0.15 + 0.3);
                });
            } catch (_) { /* متصفح لا يدعم AudioContext */ }
        }
    };
    const showToast = Utils.showToast.bind(Utils);



    // ─────────────────────────────────────────
    // 4. التصدير
    // ─────────────────────────────────────────
    const Exporter = {
        async exportData(dataToExport = null, batchNumber = null) {
            const allHist  = await Store.get('collected_all_history', []);
            const currData = await Store.get('collected_data', []);
            const data     = dataToExport || (allHist.length ? allHist : currData);
            if (!data?.length) {
                if (!dataToExport) showToast('لا توجد بيانات لتصديرها!', 'warning');
                return;
            }

            // عند التصدير اليدوي (أو النهائي)، نرسل البيانات فوراً لنبراس برو
            await NeprasAPI.sendBatch(data);

            showToast('جاري تحضير ملف Excel...', 'info');

            const allKeys = new Set();
            data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));

            const orderedKeys = [];
            CONFIG.PREFERRED_COLUMNS.forEach(k => { orderedKeys.push(k); allKeys.delete(k); });
            allKeys.delete('تاريخ الميلاد*');
            allKeys.delete('تاريخ الميلاد');
            allKeys.forEach(k => orderedKeys.push(k));

            const normalized = data.map(row => {
                const nr = {};
                orderedKeys.forEach(key => {
                    if (key === 'yyyy-mm-dd') {
                        nr[key] = row['yyyy-mm-dd'] || row['تاريخ الميلاد*'] || row['تاريخ الميلاد'] || '';
                    } else if (key === 'الرقم القومى' || key === 'الرقم القومى*') {
                        nr[key] = row['الرقم القومى*'] || row['الرقم القومى'] || '';
                    } else {
                        nr[key] = row[key] || '';
                    }
                });
                return nr;
            });

            try {
                const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const fileName = batchNumber
                    ? `Students_Batch_${batchNumber}_${ts}.xlsx`
                    : `Students_Final_${ts}.xlsx`;

                // ── محاولة ExcelJS (المحقونة) ─────────────────────────────────
                if (typeof ExcelJS !== 'undefined') {
                    const wb = new ExcelJS.Workbook();
                    const ws = wb.addWorksheet('الطلاب', { views: [{ rightToLeft: true }] });

                    // رأس الأعمدة
                    ws.columns = orderedKeys.map(k => ({
                        header: k,
                        key: k,
                        width: Math.max(k.length + 4, 16)
                    }));

                    // تنسيق رأس الأعمدة
                    ws.getRow(1).eachCell(cell => {
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    });

                    // إضافة الصفوف
                    normalized.forEach(row => ws.addRow(row));

                    // تجميد الصف الأول
                    ws.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true }];

                    const buffer = await wb.xlsx.writeBuffer();
                    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url    = URL.createObjectURL(blob);
                    const a      = document.createElement('a');
                    a.href     = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast(`✅ تم التصدير: ${fileName} (${normalized.length} سجل)`, 'success');
                    return;
                }

                // ── احتياطي: XLSX/SheetJS إن وُجد ───────────────────────────
                if (typeof XLSX !== 'undefined') {
                    const ws = XLSX.utils.json_to_sheet(normalized);
                    ws['!cols'] = orderedKeys.map(k => ({ wch: Math.max(k.length + 2, 12) }));
                    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
                    XLSX.writeFile(wb, fileName);
                    showToast(`✅ تم التصدير: ${fileName} (${normalized.length} سجل)`, 'success');
                    return;
                }

                throw new Error('لم يتم العثور على مكتبة Excel. تأكد من تشغيل التطبيق عبر نبراس برو.');
            } catch (err) {
                console.error('[Ext] Export Error:', err);
                showToast(`فشل التصدير: ${err.message}`, 'error');
            }
        }
    };

    // ─────────────────────────────────────────
    // 5. واجهة المستخدم

    // ─────────────────────────────────────────
    const UI = {
        _startTime   : null,
        _processedLog: [],   // [{ts, count}] لحساب السرعة

        // ── CSS ──────────────────────────────
        injectStyles() {
            if (document.getElementById('gm-styles')) return;
            const s = document.createElement('style');
            s.id = 'gm-styles';
            s.textContent = `
/* ── المتغيرات ── */
:root {
  --gm-primary   : #10b981; --gm-primary-h : #059669;
  --gm-accent    : #6366f1; --gm-accent-h  : #4f46e5;
  --gm-danger    : #ef4444; --gm-danger-h  : #dc2626;
  --gm-warn      : #f59e0b;
  --gm-bg        : #ffffff; --gm-bg2       : #f8fafc;
  --gm-text      : #1f2937; --gm-sub       : #6b7280;
  --gm-border    : #e5e7eb; --gm-shadow    : rgba(0,0,0,.18);
  --gm-radius    : 14px;    --gm-panel-w   : 355px;
}
body.gm-dark-mode {
  --gm-bg        : #1e2535; --gm-bg2       : #151c2c;
  --gm-text      : #e2e8f0; --gm-sub       : #94a3b8;
  --gm-border    : #2d3a52; --gm-shadow    : rgba(0,0,0,.45);
}

/* ── اللوحة الرئيسية ── */
#gm-scraper-panel {
  position: fixed; bottom: 20px; left: 20px; z-index: 999999;
  background: var(--gm-bg); border: 1px solid var(--gm-border);
  border-radius: var(--gm-radius); width: var(--gm-panel-w);
  box-shadow: 0 20px 40px -8px var(--gm-shadow);
  font-family: 'Segoe UI', Tahoma, sans-serif;
  direction: rtl; text-align: right; color: var(--gm-text);
  max-height: 92vh; overflow: hidden;
  display: flex; flex-direction: column;
  transition: box-shadow .3s;
  user-select: none;
}
#gm-scraper-panel:hover { box-shadow: 0 24px 48px -8px var(--gm-shadow); }

/* ── رأس اللوحة (قابل للسحب) ── */
#gm-panel-header {
  background: linear-gradient(135deg, #0f766e 0%, #065f46 50%, #1e3a5f 100%);
  border-radius: var(--gm-radius) var(--gm-radius) 0 0;
  padding: 12px 14px 10px;
  cursor: grab; cursor: -webkit-grab;
  flex-shrink: 0;
}
#gm-panel-header:active { cursor: grabbing; cursor: -webkit-grabbing; }
#gm-header-top { display: flex; align-items: center; justify-content: space-between; }
#gm-header-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: #fff; margin: 0;
}
#gm-header-title .gm-logo {
  width: 28px; height: 28px; border-radius: 7px;
  background: rgba(255,255,255,.15); display: grid; place-items: center;
  font-size: 16px;
}
#gm-header-actions { display: flex; gap: 6px; }
.gm-hdr-btn {
  width: 26px; height: 26px; border: none; border-radius: 7px; cursor: pointer;
  background: rgba(255,255,255,.15); color: #fff; font-size: 13px;
  display: grid; place-items: center; transition: background .2s;
}
.gm-hdr-btn:hover { background: rgba(255,255,255,.3); }
#gm-dev-badge {
  font-size: 10.5px; color: rgba(255,255,255,.7); margin-top: 5px;
  display: flex; align-items: center; justify-content: space-between;
}
#gm-status-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700;
  background: rgba(255,255,255,.15); color: #fff;
}
#gm-status-badge.active { background: #10b981; color: #fff; }
#gm-status-badge.active::before {
  content: ''; display: inline-block; width: 6px; height: 6px;
  background: #fff; border-radius: 50%;
  animation: gm-pulse 1.2s infinite;
}
@keyframes gm-pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.5; transform:scale(1.4); }
}

/* ── شريط التقدم ── */
#gm-progress-wrap {
  height: 4px; background: rgba(255,255,255,.2); margin-top: 8px; border-radius: 4px; overflow: hidden;
}
#gm-progress-bar {
  height: 100%; background: #34d399; border-radius: 4px;
  transition: width .6s ease; width: 0%;
}

/* ── محتوى اللوحة ── */
#gm-panel-body {
  padding: 14px; overflow-y: auto; flex: 1;
  scrollbar-width: thin; scrollbar-color: var(--gm-border) transparent;
}
#gm-panel-body.collapsed { display: none; }

/* ── الإحصائيات ── */
#gm-stats-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 12px;
}
.gm-stat-card {
  background: var(--gm-bg2); border: 1px solid var(--gm-border);
  border-radius: 10px; padding: 8px 6px; text-align: center;
  transition: transform .2s;
}
.gm-stat-card:hover { transform: translateY(-2px); }
.gm-stat-val {
  font-size: 18px; font-weight: 800; color: var(--gm-primary);
  line-height: 1.2;
}
.gm-stat-val.danger { color: var(--gm-danger); }
.gm-stat-label { font-size: 10px; color: var(--gm-sub); margin-top: 2px; }

/* ── شريط السرعة والوقت ── */
#gm-speed-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: var(--gm-sub); margin-bottom: 10px;
  padding: 6px 10px; background: var(--gm-bg2); border-radius: 8px;
  border: 1px solid var(--gm-border);
}
#gm-speed-row span b { color: var(--gm-primary); }

/* ── الحقول ── */
.gm-row { margin-bottom: 10px; }
.gm-row label {
  font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--gm-sub);
  text-transform: uppercase; letter-spacing: .4px;
}
.gm-select, .gm-input {
  width: 100%; padding: 7px 10px; border: 1px solid var(--gm-border);
  border-radius: 8px; background: var(--gm-bg); color: var(--gm-text);
  font-family: inherit; font-size: 13px; box-sizing: border-box;
  transition: border-color .2s;
}
.gm-select:focus, .gm-input:focus {
  outline: none; border-color: var(--gm-primary);
  box-shadow: 0 0 0 3px rgba(16,185,129,.15);
}
.gm-textarea {
  width: 100%; padding: 7px 10px; border: 1px solid var(--gm-border);
  border-radius: 8px; background: var(--gm-bg); color: var(--gm-text);
  font-family: 'Consolas', 'Courier New', monospace; font-size: 12px;
  height: 80px; resize: vertical; box-sizing: border-box;
  transition: border-color .2s; direction: ltr; text-align: left;
}
.gm-textarea:focus { outline: none; border-color: var(--gm-primary); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }

/* ── الأزرار ── */
.gm-btn {
  width: 100%; padding: 10px 12px; border: none; border-radius: 9px;
  font-weight: 700; cursor: pointer; font-size: 13px;
  transition: all .2s; margin-bottom: 7px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.gm-btn:last-child { margin-bottom: 0; }
.gm-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
.gm-btn:active { transform: translateY(0); }
.gm-btn-primary   { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
.gm-btn-danger    { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
.gm-btn-purple    { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; }
.gm-btn-teal      { background: linear-gradient(135deg, #0d9488, #0f766e); color: #fff; }
.gm-btn-orange    { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }
.gm-btn-blue      { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; }
.gm-btn-ghost     { background: var(--gm-bg2); color: var(--gm-sub); border: 1px solid var(--gm-border); }
.gm-btn-ghost:hover { background: var(--gm-border); }
.gm-btn:disabled  { opacity: .5; cursor: not-allowed; transform: none; }

/* ── فاصل ── */
.gm-divider {
  height: 1px; background: var(--gm-border);
  margin: 10px 0; border-radius: 1px;
}

/* ── Toasts ── */
#gm-toast-container {
  position: fixed; top: 20px; left: 20px; z-index: 9999999;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}
.gm-toast {
  background: var(--gm-bg); border-radius: 10px;
  padding: 10px 16px; box-shadow: 0 8px 24px rgba(0,0,0,.18);
  display: flex; align-items: center; gap: 10px;
  min-width: 240px; max-width: 320px; direction: rtl;
  opacity: 0; transform: translateX(-20px);
  transition: all .35s cubic-bezier(.34,1.56,.64,1);
  border-right: 4px solid #3b82f6; pointer-events: auto;
  font-size: 13px; color: var(--gm-text);
}
.gm-toast-success { border-color: #10b981; }
.gm-toast-error   { border-color: #ef4444; }
.gm-toast-warning { border-color: #f59e0b; }
.gm-toast-info    { border-color: #3b82f6; }
.gm-toast-icon    { font-size: 16px; flex-shrink: 0; }
`;
            document.head.appendChild(s);
        },

        // ── بناء اللوحة ──────────────────────
        async ensureUI() {
            if (document.getElementById('gm-scraper-panel')) return;
            this.injectStyles();

            const isCollecting   = await Store.get('collecting', false);
            const data           = await Store.get('collected_data', []);
            const targetCodes    = await Store.get('target_codes', []);
            const currentIndex   = await Store.get('current_code_index', 0);
            const currentBatch   = await Store.get('current_batch', 1);
            const failedCodes    = await Store.get('failed_codes', []);
            const isDark         = await Store.get('dark_mode', false);

            if (isDark) document.body.classList.add('gm-dark-mode');

            const pct = targetCodes.length
                ? Math.round((currentIndex / targetCodes.length) * 100) : 0;

            const panel = document.createElement('div');
            panel.id = 'gm-scraper-panel';
            panel.innerHTML = `
<!-- ── Header ── -->
<div id="gm-panel-header">
  <div id="gm-header-top">
    <h3 id="gm-header-title">
      <span class="gm-logo">🤖</span>
      <span>جامع الطلاب الذكي</span>
    </h3>
    <div id="gm-header-actions">
      <span id="gm-status-badge" class="${isCollecting ? 'active' : ''}">${isCollecting ? 'يعمل' : 'متوقف'}</span>
      <button class="gm-hdr-btn" id="gm-btn-dark"   title="تبديل الوضع المظلم">🌙</button>
      <button class="gm-hdr-btn" id="gm-btn-min"    title="تصغير اللوحة">➖</button>
      <button class="gm-hdr-btn" id="gm-btn-close"  title="إخفاء مؤقت">✕</button>
    </div>
  </div>
  <div id="gm-dev-badge">
    <span>${VER} | م. ضياء العطار</span>
    <span>📞 01118209309</span>
  </div>
  <!-- شريط تقدم -->
  <div id="gm-progress-wrap">
    <div id="gm-progress-bar" style="width:${pct}%"></div>
  </div>
</div>

<!-- ── Body ── -->
<div id="gm-panel-body">

  <!-- إحصائيات -->
  <div id="gm-stats-grid">
    <div class="gm-stat-card">
      <div class="gm-stat-val" id="gm-stat-done">${currentIndex}</div>
      <div class="gm-stat-label">✅ مُنجز</div>
    </div>
    <div class="gm-stat-card">
      <div class="gm-stat-val" id="gm-stat-total">${targetCodes.length}</div>
      <div class="gm-stat-label">📋 إجمالي</div>
    </div>
    <div class="gm-stat-card">
      <div class="gm-stat-val danger" id="gm-stat-failed">${failedCodes.length}</div>
      <div class="gm-stat-label">❌ فاشل</div>
    </div>
  </div>

  <!-- سرعة + وقت -->
  <div id="gm-speed-row">
    <span>⚡ السرعة: <b id="gm-speed-val">—</b> طالب/دقيقة</span>
    <span>⏱ المتبقي: <b id="gm-eta-val">—</b></span>
    <span>📦 الدفعة: <b id="gm-batch-val">${data.length}/${CONFIG.BATCH_SIZE}</b></span>
  </div>

  <!-- وضع سرعة السحب والتأخير -->
  <div class="gm-row">
    <label>⚡ سرعة التجميع ومعدل الاستجابة الذكي</label>
    <select id="gm-speed-mode-select" class="gm-select" style="font-weight:700; color:#0284c7;">
      <option value="fast">🚀 فائق السرعة (أسرع 4 مرات - انتقال فوري عند ظهور البيانات)</option>
      <option value="balanced" selected>⚡ متوازن وسريع (موصى به - معدل استجابة ذكي)</option>
      <option value="safe">🛡️ آمن ومتأني (لسيرفر الوزارة البطيء أو الاتصال المتقطع)</option>
    </select>
  </div>

  <!-- القسم التعليمي -->
  <div class="gm-row">
    <label>القسم التعليمي (نبراس)</label>
    <select id="gm-user-section-select" class="gm-select">
      <option value="القسم العربي">القسم العربي</option>
      <option value="قسم اللغات">قسم اللغات</option>
      <option value="القسم الدولي">القسم الدولي</option>
    </select>
  </div>

  <!-- المرحلة التعليمية -->
  <div class="gm-row">
    <label>المرحلة التعليمية (نبراس)</label>
    <select id="gm-user-stage-select" class="gm-select">
      <option value="">-- اختر المرحلة التعليمية --</option>
      <option value="ابتدائي">ابتدائي</option>
      <option value="إعدادي">إعدادي</option>
      <option value="ثانوي">ثانوي</option>
      <option value="رياض أطفال">رياض أطفال</option>
      <option value="تمهيدي">تمهيدي</option>
    </select>
  </div>

  <!-- الصف -->
  <div class="gm-row">
    <label>الصف المستهدف</label>
    <select id="gm-level-select" class="gm-select">
      <option value="-1">⏳ جاري تحميل الصفوف...</option>
    </select>
  </div>

  <!-- الأكواد -->
  <div class="gm-row">
    <label>أكواد الطلاب <span style="font-weight:400;text-transform:none">(كود في كل سطر)</span></label>
    <textarea id="gm-codes-input" class="gm-textarea"
      placeholder="أدخل الأكواد هنا أو استخرجها من الجدول...">${targetCodes.join('\n')}</textarea>
  </div>

  <!-- البدء من -->
  <div class="gm-row">
    <label>البدء من الكود رقم</label>
    <input type="number" id="gm-start-index" class="gm-input"
      value="${currentIndex + 1}" min="1" style="text-align:center;font-weight:700;">
  </div>

  <!-- الأزرار الأساسية -->
  <button id="gm-btn-sync-visible-table" class="gm-btn" style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #fff; font-size: 13.5px; padding: 12px; margin-bottom: 9px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);">
    ⚡ سحب وتحديث بيانات الجدول المعروض فوراً (تسكين الفصول)
  </button>
  <button id="gm-btn-send-all" class="gm-btn gm-btn-primary" style="font-size: 13px; padding: 11px;">
    ⚡ إرسال وحفظ جميع الطلاب المسحوبين لنبراس برو
  </button>
  <button id="gm-btn-export-all" class="gm-btn gm-btn-blue" style="font-size: 13px; padding: 11px;">
    📊 تصدير جميع البيانات المجمعة Excel (الكل)
  </button>

  <div class="gm-divider"></div>

  <button id="gm-btn-toggle" class="gm-btn ${isCollecting ? 'gm-btn-danger' : 'gm-btn-purple'}">
    ${isCollecting ? '⏹ إيقاف التجميع' : '▶️ بدء / استكمال التجميع'}
  </button>

  <button id="gm-btn-extract-codes" class="gm-btn gm-btn-teal">📋 استخراج الأكواد من الجدول الحالي</button>

  <button id="gm-btn-compare-nepras" class="gm-btn gm-btn-orange" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; font-size: 13px;">
    🔄 مقارنة مباشرة مع نبراس واستبعاد المسجلين
  </button>

  <input type="file" id="gm-file-upload" accept=".xlsx,.xls" style="display:none;">
  <button id="gm-btn-compare"      class="gm-btn gm-btn-ghost">📁 رفع Excel لاستبعاد المكررين (يدوي)</button>

  <button id="gm-btn-retry-failed" class="gm-btn gm-btn-orange">🔄 إعادة محاولة الفاشلين (<span id="gm-failed-count">${failedCodes.length}</span>)</button>

  <div class="gm-divider"></div>

  <button id="gm-btn-export" class="gm-btn gm-btn-ghost">📊 تصدير الدفعة الحالية فقط</button>
  <button id="gm-btn-clear"  class="gm-btn gm-btn-ghost">🗑 مسح الذاكرة وبدء عمل جديد</button>

</div><!-- end body -->
`;
            document.body.appendChild(panel);
            this._makeDraggable(panel, document.getElementById('gm-panel-header'));
            this._attachEvents();
        },

        // ── السحب والإفلات ───────────────────
        _makeDraggable(panel, handle) {
            let ox = 0, oy = 0, dragging = false;
            handle.addEventListener('mousedown', e => {
                if (e.target.closest('.gm-hdr-btn, #gm-status-badge')) return;
                dragging = true;
                const rect = panel.getBoundingClientRect();
                ox = e.clientX - rect.left;
                oy = e.clientY - rect.top;
                handle.style.cursor = 'grabbing';
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!dragging) return;
                let nx = e.clientX - ox;
                let ny = e.clientY - oy;
                const maxX = window.innerWidth  - panel.offsetWidth;
                const maxY = window.innerHeight - panel.offsetHeight;
                nx = Math.max(0, Math.min(nx, maxX));
                ny = Math.max(0, Math.min(ny, maxY));
                panel.style.left   = nx + 'px';
                panel.style.top    = ny + 'px';
                panel.style.bottom = 'auto';
            });
            document.addEventListener('mouseup', () => {
                dragging = false;
                handle.style.cursor = '';
            });
        },

        // ── ربط الأحداث ──────────────────────
        _attachEvents() {
            // الزر الرئيسي
            document.getElementById('gm-btn-toggle').addEventListener('click', async () => {
                const collecting = await Store.get('collecting', false);
                if (collecting) {
                    await Store.set('collecting', false);
                    this.updateStatus('متوقف', false);
                    this._setToggleBtn(false);
                    showToast('تم إيقاف التجميع', 'warning');
                } else {
                    const sel = document.getElementById('gm-level-select');
                    if (sel.value === '-1' || sel.options.length <= 1) {
                        showToast('يرجى الانتظار واختيار الصف أولاً.', 'warning'); return;
                    }
                    const raw   = document.getElementById('gm-codes-input').value;
                    const codes = raw.split(/\r?\n|,/).map(c => c.trim()).filter(Boolean);
                    if (!codes.length) {
                        showToast('يرجى إدخال كود واحد على الأقل.', 'error'); return;
                    }
                    let startVal = parseInt(document.getElementById('gm-start-index').value, 10);
                    if (isNaN(startVal) || startVal < 1) startVal = 1;
                    if (startVal > codes.length) startVal = codes.length;

                    await Store.set('current_code_index', startVal - 1);
                    await Store.set('target_codes',       codes);
                    await Store.set('collecting',         true);
                    await Store.set('target_level_val',   sel.value);
                    await Store.set('list_page_url',      window.location.href);
                    await Store.set('auto_retry_count',   0);
                    await Store.set('collect_start_time', Date.now());

                    document.getElementById('gm-stat-total').textContent = codes.length;
                    document.getElementById('gm-stat-done').textContent  = startVal - 1;
                    this._updateProgress(startVal - 1, codes.length);
                    this.updateStatus('يعمل', true);
                    this._setToggleBtn(true);
                    Scraper.onListPageResume();
                }
            });

            // سحب وتحديث بيانات الجدول المعروض فوراً (تسكين الفصول وتحديث السجلات)
            const syncVisibleBtn = document.getElementById('gm-btn-sync-visible-table');
            if (syncVisibleBtn) {
                syncVisibleBtn.addEventListener('click', async () => {
                    await Scraper.syncVisibleTableToNepras();
                });
            }

            // إرسال جميع الطلاب المجمعين لنبراس برو
            document.getElementById('gm-btn-send-all').addEventListener('click', async () => {
                const allHistory = (await Store.get('collected_all_history', [])) || (await Store.get('collected_data', []));
                if (!allHistory.length) {
                    showToast('⚠️ لا توجد بيانات مسحوبة لإرسالها حتى الآن!', 'warning');
                    return;
                }
                await NeprasAPI.sendBatch(allHistory, true);
            });

            // تصدير جميع البيانات المجمعة Excel (الكل)
            document.getElementById('gm-btn-export-all').addEventListener('click', async () => {
                const allHistory = (await Store.get('collected_all_history', [])) || (await Store.get('collected_data', []));
                await Exporter.exportData(allHistory, 'ALL_STUDENTS');
            });

            // استخراج الأكواد
            document.getElementById('gm-btn-extract-codes').addEventListener('click', async () => {
                await Scraper.extractCodesAndFillTextarea();
            });

            // مقارنة ذكية مباشرة مع قاعدة بيانات نبراس برو
            const compNeprasBtn = document.getElementById('gm-btn-compare-nepras');
            if (compNeprasBtn) {
                compNeprasBtn.addEventListener('click', async () => {
                    const raw = document.getElementById('gm-codes-input').value;
                    const currentCodes = raw.split(/\r?\n|,/).map(c => c.trim()).filter(Boolean);
                    if (!currentCodes.length) {
                        showToast('ضع الأكواد في المربع أولاً أو اضغط استخراج من الجدول!', 'warning');
                        return;
                    }

                    showToast('⏳ جاري جلب الأكواد المسجلة في نبراس برو...', 'info');
                    const res = await NeprasAPI.getRegisteredCodes();
                    if (!res || !res.success || !Array.isArray(res.allIdentifiers)) {
                        showToast('❌ تعذر الاتصال بقاعدة بيانات نبراس (تأكد من تشغيل البرنامج).', 'error');
                        return;
                    }

                    const regSet = new Set(res.allIdentifiers.map(x => String(x).trim()));
                    const remaining = currentCodes.filter(c => !regSet.has(c));
                    const removedCount = currentCodes.length - remaining.length;

                    document.getElementById('gm-codes-input').value = remaining.join('\n');
                    document.getElementById('gm-start-index').value = '1';
                    document.getElementById('gm-stat-total').textContent = remaining.length;
                    this._updateProgress(0, remaining.length);
                    await Store.set('target_codes', remaining);
                    await Store.set('current_code_index', 0);

                    if (removedCount > 0) {
                        showToast(`✅ تم استبعاد ${removedCount} طالب مسجل مسبقاً في نبراس برو! المتبقي المطلوب سحبه: ${remaining.length}`, 'success');
                    } else {
                        showToast(`ℹ️ جميع الطلاب الموجودين بالمربع (${remaining.length}) غير مسجلين في نبراس ومطلوب سحبهم.`, 'info');
                    }
                });
            }

            // تصدير الدفعة الحالية فقط
            document.getElementById('gm-btn-export').addEventListener('click', async () => {
                const batchData = await Store.get('collected_data', []);
                await Exporter.exportData(batchData, 'BATCH');
            });

            // إعادة الفاشلين
            document.getElementById('gm-btn-retry-failed').addEventListener('click', async () => {
                const failed = await Store.get('failed_codes', []);
                if (!failed.length) { showToast('لا توجد أكواد فاشلة!', 'info'); return; }
                document.getElementById('gm-codes-input').value = failed.join('\n');
                await Store.set('failed_codes', []);
                document.getElementById('gm-failed-count').textContent = '0';
                document.getElementById('gm-stat-failed').textContent  = '0';
                document.getElementById('gm-start-index').value = '1';
                showToast(`تم تحميل ${failed.length} كود فاشل. اضغط بدء التجميع.`, 'success');
            });

            // مسح الذاكرة
            document.getElementById('gm-btn-clear').addEventListener('click', async () => {
                if (!confirm('تحذير: سيتم حذف جميع البيانات والأكواد. هل أنت متأكد؟')) return;
                await Store.clearAll();
                document.getElementById('gm-stat-done').textContent    = '0';
                document.getElementById('gm-stat-total').textContent   = '0';
                document.getElementById('gm-stat-failed').textContent  = '0';
                document.getElementById('gm-failed-count').textContent = '0';
                document.getElementById('gm-batch-val').textContent    = `0/${CONFIG.BATCH_SIZE}`;
                document.getElementById('gm-codes-input').value        = '';
                document.getElementById('gm-start-index').value        = '1';
                document.getElementById('gm-speed-val').textContent    = '—';
                document.getElementById('gm-eta-val').textContent      = '—';
                this._updateProgress(0, 0);
                this.updateStatus('متوقف', false);
                this._setToggleBtn(false);
                showToast('تم مسح الذاكرة بالكامل بنجاح.', 'success');
            });

            // رفع Excel للمقارنة
            const fileInput = document.getElementById('gm-file-upload');
            document.getElementById('gm-btn-compare').addEventListener('click', () => {
                const codes = document.getElementById('gm-codes-input').value.trim();
                if (!codes) { showToast('ضع الأكواد في المربع أولاً.', 'warning'); return; }
                fileInput.click();
            });
            fileInput.addEventListener('change', async e => {
                const file = e.target.files[0];
                if (!file) return;
                if (typeof XLSX === 'undefined') {
                    showToast('مكتبة XLSX غير موجودة.', 'error'); return;
                }
                showToast('جاري قراءة الملف...', 'info');
                const reader = new FileReader();
                reader.onload = async ev => {
                    try {
                        const wb  = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                        const ws  = wb.Sheets[wb.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(ws);
                        if (!json.length) { showToast('الملف فارغ.', 'warning'); return; }

                        const importedCodes = new Set();
                        json.forEach(row => {
                            const k = Object.keys(row).find(k => k.includes('كود') || k.toLowerCase().includes('code'));
                            if (k && row[k]) importedCodes.add(String(row[k]).trim());
                        });

                        if (!importedCodes.size) {
                            showToast('لم يُعثر على عمود "كود التلميذ".', 'error'); return;
                        }

                        const raw     = document.getElementById('gm-codes-input').value;
                        const current = raw.split(/\r?\n|,/).map(c => c.trim()).filter(Boolean);
                        const remain  = current.filter(c => !importedCodes.has(c));
                        const removed = current.length - remain.length;

                        document.getElementById('gm-codes-input').value = remain.join('\n');
                        document.getElementById('gm-start-index').value  = '1';
                        document.getElementById('gm-stat-total').textContent = remain.length;
                        this._updateProgress(0, remain.length);
                        await Store.set('target_codes', remain);
                        await Store.set('current_code_index', 0);

                        showToast(
                            removed > 0
                                ? `✅ تم استبعاد ${removed} طالب مكرر. متبقي ${remain.length}.`
                                : `لم يُعثر على تطابق. الكل (${remain.length}) يحتاج بحث.`,
                            removed > 0 ? 'success' : 'info'
                        );
                    } catch (err) {
                        console.error('[Ext] Compare Error:', err);
                        showToast('خطأ في تحليل الملف.', 'error');
                    }
                    fileInput.value = '';
                };
                reader.readAsArrayBuffer(file);
            });

            // زر الوضع المظلم
            document.getElementById('gm-btn-dark').addEventListener('click', async () => {
                const isDark = document.body.classList.toggle('gm-dark-mode');
                await Store.set('dark_mode', isDark);
                document.getElementById('gm-btn-dark').textContent = isDark ? '☀️' : '🌙';
                showToast(isDark ? 'تم تفعيل الوضع المظلم' : 'تم إلغاء الوضع المظلم', 'info');
            });

            // زر التصغير
            document.getElementById('gm-btn-min').addEventListener('click', () => {
                const body = document.getElementById('gm-panel-body');
                const isMin = body.classList.toggle('collapsed');
                document.getElementById('gm-btn-min').textContent = isMin ? '➕' : '➖';
            });

            // اختيار وضع السرعة
            const speedSel = document.getElementById('gm-speed-mode-select');
            if (speedSel) {
                Store.get('speed_mode', 'balanced').then(m => {
                    if (m) speedSel.value = m;
                });
                speedSel.addEventListener('change', async () => {
                    await Store.set('speed_mode', speedSel.value);
                    showToast(`تم ضبط سرعة السحب إلى: ${speedSel.options[speedSel.selectedIndex].text}`, 'info');
                });
            }

            // اختيار القسم التعليمي
            const sectionSel = document.getElementById('gm-user-section-select');
            if (sectionSel) {
                Store.get('user_selected_section', 'القسم العربي').then(sec => {
                    if (sec) sectionSel.value = sec;
                });
                sectionSel.addEventListener('change', async () => {
                    await Store.set('user_selected_section', sectionSel.value);
                });
            }

            // اختيار المرحلة التعليمية
            const stageSel = document.getElementById('gm-user-stage-select');
            if (stageSel) {
                Store.get('user_selected_stage', '').then(st => {
                    if (st) stageSel.value = st;
                });
                stageSel.addEventListener('change', async () => {
                    await Store.set('user_selected_stage', stageSel.value);
                });
            }

            // زر الإخفاء
            document.getElementById('gm-btn-close').addEventListener('click', () => {
                const panel = document.getElementById('gm-scraper-panel');
                panel.style.opacity = '0';
                panel.style.transform = 'scale(.9)';
                panel.style.transition = 'all .3s';
                setTimeout(() => {
                    panel.style.display = 'none';
                    // زر إظهار عائم
                    const fab = document.createElement('button');
                    fab.id = 'gm-fab';
                    fab.title = 'إظهار لوحة الجامع';
                    Object.assign(fab.style, {
                        position: 'fixed', bottom: '20px', left: '20px', zIndex: '999998',
                        width: '50px', height: '50px', borderRadius: '50%', border: 'none',
                        background: 'linear-gradient(135deg,#10b981,#065f46)',
                        color: '#fff', fontSize: '22px', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0,0,0,.3)',
                        display: 'grid', placeItems: 'center'
                    });
                    fab.textContent = '🤖';
                    fab.addEventListener('click', () => {
                        panel.style.display = 'flex';
                        panel.style.opacity = '1';
                        panel.style.transform = 'scale(1)';
                        fab.remove();
                    });
                    document.body.appendChild(fab);
                }, 300);
            });
        },

        // ── مساعدات الواجهة ──────────────────
        updateStatus(text, isActive = false) {
            const el = document.getElementById('gm-status-badge');
            if (!el) return;
            el.textContent = text;
            el.className = isActive ? 'active' : '';
        },

        _setToggleBtn(collecting) {
            const btn = document.getElementById('gm-btn-toggle');
            if (!btn) return;
            btn.className = `gm-btn ${collecting ? 'gm-btn-danger' : 'gm-btn-primary'}`;
            btn.textContent = collecting ? '⏹ إيقاف التجميع' : '▶️ بدء / استكمال التجميع';
        },

        _updateProgress(done, total) {
            const bar = document.getElementById('gm-progress-bar');
            if (!bar) return;
            bar.style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
        },

        async _updateSpeedETA(done, total) {
            const startTime = await Store.get('collect_start_time', null);
            if (!startTime || done === 0) return;
            const elapsed = (Date.now() - startTime) / 1000 / 60;   // دقائق
            const speed   = done / elapsed;
            const remain  = total - done;
            const etaMin  = speed > 0 ? remain / speed : Infinity;

            const speedEl = document.getElementById('gm-speed-val');
            const etaEl   = document.getElementById('gm-eta-val');
            if (speedEl) speedEl.textContent = speed.toFixed(1);
            if (etaEl)   etaEl.textContent   = Utils.formatDuration(etaMin * 60 * 1000);
        },

        async updateStats() {
            const done    = await Store.get('current_code_index', 0);
            const total   = (await Store.get('target_codes', [])).length;
            const failed  = (await Store.get('failed_codes', [])).length;
            const dataLen = (await Store.get('collected_data', [])).length;
            const batch   = await Store.get('current_batch', 1);

            const el = id => document.getElementById(id);
            if (el('gm-stat-done'))    el('gm-stat-done').textContent    = done;
            if (el('gm-stat-total'))   el('gm-stat-total').textContent   = total;
            if (el('gm-stat-failed'))  el('gm-stat-failed').textContent  = failed;
            if (el('gm-failed-count')) el('gm-failed-count').textContent = failed;
            if (el('gm-batch-val'))    el('gm-batch-val').textContent    = `${dataLen}/${CONFIG.BATCH_SIZE}`;
            this._updateProgress(done, total);
            await this._updateSpeedETA(done, total);
        },

        // ── تحميل قائمة الصفوف ────────────────
        async populateLevels() {
            const sel = document.getElementById('gm-level-select');
            if (!sel) return;
            let pageSel = null;
            for (let i = 0; i < 15; i++) {
                pageSel = Utils.findInputByLabelText('الصف');
                if (pageSel?.options?.length > 1) break;
                await Utils.sleep(500);
            }
            if (pageSel?.options?.length > 1) {
                sel.innerHTML = '';
                Array.from(pageSel.options).forEach(o => {
                    const no   = document.createElement('option');
                    no.value   = o.value; no.text = o.text;
                    sel.appendChild(no);
                });
                const saved = await Store.get('target_level_val', null);
                if (saved && Array.from(sel.options).some(o => o.value === saved)) sel.value = saved;

                const fresh = sel.cloneNode(true);
                sel.parentNode.replaceChild(fresh, sel);
                fresh.addEventListener('change', e => Utils.setInputValueAngular(pageSel, e.target.value));
            } else {
                sel.innerHTML = '<option value="-1">❌ لم يُعثر على قائمة الصفوف</option>';
            }
        }
    };

    // ─────────────────────────────────────────
    // 6. منطق التجميع
    // ─────────────────────────────────────────
    const Scraper = {

        // توسيع الجدول الشامل — متوافق مع كافة بوابات الوزارة (DataTables, ASP.NET, Angular)
        async maximizeTableLength(targetSize = CONFIG.TARGET_TABLE_ROWS) {
            let expanded = false;

            // استراتيجية 1: jQuery DataTables API المباشرة
            try {
                const jq = window.$ || window.jQuery || (typeof $ !== 'undefined' ? $ : null);
                if (jq && jq.fn && jq.fn.dataTable) {
                    if (jq.fn.dataTable.tables) {
                        try {
                            const apiTables = jq.fn.dataTable.tables({ api: true });
                            if (apiTables && apiTables.length) {
                                apiTables.page.len(-1).draw(false);
                                expanded = true;
                            }
                        } catch (_) {}
                    }
                    jq('table').each(function() {
                        try {
                            if (jq.fn.dataTable.isDataTable(this)) {
                                jq(this).DataTable().page.len(targetSize).draw(false);
                                expanded = true;
                            }
                        } catch (_) {}
                    });
                }
            } catch (_) {}

            // استراتيجية 2: البحث عن جميع القوائم المنسدلة الخاصة بحجم الصفحة
            const candidateSelects = Array.from(document.querySelectorAll(
                'select[name*="length"], select[name*="pageLength"], select[name*="pageSize"], select[name*="count"], select[aria-label*="rows"], select[data-length], .dataTables_length select, select[id*="PageSize"], select[id*="ddlPage"]'
            ));

            // إضافة أي select في الصفحة يحتوي خيارات أرقام صفوف (10, 25, 50, 100...)
            document.querySelectorAll('select').forEach(sel => {
                if (!candidateSelects.includes(sel)) {
                    const optVals = Array.from(sel.options).map(o => parseInt(o.value, 10) || 0);
                    if (optVals.includes(10) && (optVals.includes(25) || optVals.includes(50) || optVals.includes(100))) {
                        candidateSelects.push(sel);
                    }
                }
            });

            for (const ps of candidateSelects) {
                if (ps && ps.tagName === 'SELECT') {
                    const opts = Array.from(ps.options);
                    // ابحث عن -1 أو الكل أو أكبر قيمة
                    let target = opts.find(o => o.value === '-1' || /الكل|All/i.test(o.text)) ||
                                 opts.find(o => parseInt(o.value, 10) >= targetSize);
                    
                    if (!target) {
                        // إضافة خيار 2000 صف
                        const no = document.createElement('option');
                        no.value = String(targetSize);
                        no.text = `${targetSize} طالب (عرض كامل)`;
                        ps.appendChild(no);
                        target = no;
                    }

                    const valToSet = target.value;
                    if (ps.value !== valToSet) {
                        ps.value = valToSet;
                        
                        // إطلاق كافة أحداث التغيير
                        ps.dispatchEvent(new Event('input', { bubbles: true }));
                        ps.dispatchEvent(new Event('change', { bubbles: true }));

                        if (window.$ || window.jQuery) {
                            try { (window.$ || window.jQuery)(ps).val(valToSet).trigger('change'); } catch (_) {}
                        }

                        if (typeof ps.onchange === 'function') {
                            try { ps.onchange(); } catch (_) {}
                        }

                        expanded = true;
                    }
                }
            }

            // استراتيجية 3: البحث عن أزرار أو روابط "عرض الكل" أو "All"
            const allBtn = Array.from(document.querySelectorAll('button, a, span.btn, div.btn'))
                .find(el => /^\s*(عرض الكل|الكل|Show All|All)\s*$/i.test(el.innerText?.trim()));
            if (allBtn) {
                try {
                    allBtn.click();
                    expanded = true;
                } catch (_) {}
            }

            if (expanded) {
                await Utils.sleep(CONFIG.WAIT_MED);
                const rowCount = document.querySelectorAll('table tbody tr').length || document.querySelectorAll('table tr').length;
                showToast(`✅ تم توسيع الجدول لعرض (${rowCount}) صف بنجاح.`, 'success');
                return true;
            }

            return false;
        },

        // استخراج الأكواد من الجدول
        async extractCodesAndFillTextarea() {
            showToast('جاري استخراج الأكواد وتوسيع الجدول...', 'info');
            await this.maximizeTableLength();
            await Utils.sleep(CONFIG.WAIT_SHORT);

            const codesSet = new Set();

            // 1. استخراج الأكواد من الروابط (href و onclick)
            const links = Array.from(document.querySelectorAll(CONFIG.SELECTORS.STUDENT_LINK));
            links.forEach(l => {
                const codeFromHref = Utils.extractStudentId(l.href);
                if (codeFromHref && /^\d{5,14}$/.test(codeFromHref)) codesSet.add(codeFromHref);
                const codeFromClick = Utils.extractStudentId(l.getAttribute('onclick') || '');
                if (codeFromClick && /^\d{5,14}$/.test(codeFromClick)) codesSet.add(codeFromClick);
            });

            // 2. استخراج الأكواد والأرقام القومية من خلايا الجدول (td)
            document.querySelectorAll('table td, table th').forEach(td => {
                const text = td.innerText?.trim();
                if (text && /^\d{6,14}$/.test(text)) {
                    codesSet.add(text);
                }
            });

            const codes = Array.from(codesSet);
            if (!codes.length) {
                showToast('لم يُعثر على أكواد طلاب صالحة في الجدول. اختر الصف وابحث أولاً.', 'error');
                return;
            }

            document.getElementById('gm-codes-input').value        = codes.join('\n');
            document.getElementById('gm-stat-total').textContent   = codes.length;
            document.getElementById('gm-start-index').value        = '1';
            UI._updateProgress(0, codes.length);
            await Store.set('target_codes', codes);
            await Store.set('current_code_index', 0);
            showToast(`✅ تم استخراج ${codes.length} كود وتعبئتها بنجاح.`, 'success');
        },

        // سحب وتسكين الجدول المعروض كاملاً في نبراس برو فوراً
        async syncVisibleTableToNepras() {
            showToast('⏳ جاري فحص وتوسيع الجدول المعروض وسحب البيانات...', 'info');
            await this.maximizeTableLength();
            await Utils.sleep(CONFIG.WAIT_SHORT);

            // 1. قراءة الصف والفصل والمرحلة من القوائم المنسدلة بالصفحة
            let pageLevel = '';
            const levelSel = Utils.findInputByLabelText('الصف') || document.querySelector('select[name*="grade"], select[name*="level"], select[id*="grade"], select[id*="level"]');
            if (levelSel && levelSel.selectedIndex >= 0) {
                pageLevel = levelSel.options[levelSel.selectedIndex]?.text?.trim() || '';
            }

            let pageClass = '';
            const classSel = Utils.findInputByLabelText('الفصل') || document.querySelector('select[name*="class"], select[name*="fasl"], select[id*="class"], select[id*="fasl"]');
            if (classSel && classSel.selectedIndex >= 0) {
                pageClass = classSel.options[classSel.selectedIndex]?.text?.trim() || '';
            }

            let pageStage = '';
            const stageSel = Utils.findInputByLabelText('المرحلة') || document.querySelector('select[name*="stage"], select[id*="stage"]');
            if (stageSel && stageSel.selectedIndex >= 0) {
                pageStage = stageSel.options[stageSel.selectedIndex]?.text?.trim() || '';
            }

            const userSection = (await Store.get('user_selected_section', 'القسم العربي')) || 'القسم العربي';

            // 2. العثور على الجدول النشط
            const tables = Array.from(document.querySelectorAll('table'));
            if (!tables.length) {
                showToast('❌ لم يتم العثور على أي جدول في الصفحة الحالية!', 'error');
                return;
            }

            let bestTable = tables[0];
            let maxRows = 0;
            for (const t of tables) {
                const rowCount = t.querySelectorAll('tr').length;
                if (rowCount > maxRows) {
                    maxRows = rowCount;
                    bestTable = t;
                }
            }

            const rows = Array.from(bestTable.querySelectorAll('tr'));
            if (rows.length < 2) {
                showToast('❌ الجدول لا يحتوي على صفوف بيانات كافية.', 'warning');
                return;
            }

            // استخراج رؤوس الأعمدة
            const headerRow = rows.find(r => r.querySelector('th')) || rows[0];
            const headerCells = Array.from(headerRow.querySelectorAll('th, td')).map(c => c.innerText?.trim() || '');

            const colMap = {};
            headerCells.forEach((h, idx) => {
                const norm = h.replace(/[\u064B-\u0652]/g, '').replace(/[\*]/g, '').trim();
                if (/كود|Code/i.test(norm) && !/فصل|مرحلة|صف/i.test(norm)) colMap.code = idx;
                else if (/قومي|قومى|National|الرقم القوم/i.test(norm)) colMap.nationalId = idx;
                else if (/اسم|الاسم|طالب|تلميذ|Name/i.test(norm) && !/أب|اب|والد|أم|ام|جد|عائلة/i.test(norm)) colMap.name = idx;
                else if (/فصل|الفصل|Class/i.test(norm)) colMap.classroom = idx;
                else if (/صف|الصف|Grade|Level/i.test(norm)) colMap.grade = idx;
                else if (/مرحلة|المرحلة|Stage/i.test(norm)) colMap.stage = idx;
                else if (/نوع|النوع|جنس|Gender/i.test(norm)) colMap.gender = idx;
                else if (/ديانة|الديانة|Religion/i.test(norm)) colMap.religion = idx;
                else if (/حالة القيد|القيد|Status/i.test(norm)) colMap.status = idx;
                else if (/دمج|الدمج/i.test(norm)) colMap.isMerged = idx;
                else if (/لغة ثانية|اللغة الاجنبية الثانية/i.test(norm)) colMap.secondLanguage = idx;
                else if (/عنوان|العنوان|Address/i.test(norm)) colMap.address = idx;
                else if (/هاتف|تليفون|محمول|Phone|Mobile/i.test(norm)) colMap.phone = idx;
            });

            // استخراج الصفوف
            const extractedStudents = [];
            const dataRows = rows.filter(r => r !== headerRow && r.querySelectorAll('td').length > 0);

            for (const r of dataRows) {
                const cells = Array.from(r.querySelectorAll('td')).map(c => c.innerText?.trim() || '');
                if (!cells.length) continue;

                let code = colMap.code !== undefined ? cells[colMap.code] : '';
                let nationalId = colMap.nationalId !== undefined ? cells[colMap.nationalId] : '';
                let name = colMap.name !== undefined ? cells[colMap.name] : '';
                let classroom = colMap.classroom !== undefined ? cells[colMap.classroom] : pageClass;
                let grade = colMap.grade !== undefined ? cells[colMap.grade] : pageLevel;
                let stage = colMap.stage !== undefined ? cells[colMap.stage] : pageStage;

                // استخراج الأكواد والأرقام القومية من الروابط وخلايا الصف كبديل ذكي
                if (!code || !nationalId) {
                    for (const c of cells) {
                        if (/^\d{14}$/.test(c)) {
                            if (!nationalId) nationalId = c;
                        } else if (/^\d{6,10}$/.test(c)) {
                            if (!code) code = c;
                        }
                    }
                    const link = r.querySelector('a[href*="/edit/"], a[onclick*="/edit/"]');
                    if (link) {
                        const extractedId = Utils.extractStudentId(link.href || link.getAttribute('onclick') || '');
                        if (extractedId) {
                            if (extractedId.length === 14 && !nationalId) nationalId = extractedId;
                            else if (!code) code = extractedId;
                        }
                    }
                }

                if (!name) {
                    name = cells.find(c => c.length > 5 && !/^\d+$/.test(c) && !/تعديل|عرض|حذف|طباعة/.test(c)) || '';
                }

                if (!code && !nationalId && !name) continue;

                const studentObj = {
                    "كود التلميذ": code,
                    "الرقم القومى": nationalId,
                    "الاسم بالكامل": name,
                    "الفصل*": classroom,
                    "الصف*": grade,
                    "المرحلة*": stage,
                    "القسم": userSection
                };

                if (colMap.gender !== undefined && cells[colMap.gender]) studentObj["النوع*"] = cells[colMap.gender];
                if (colMap.religion !== undefined && cells[colMap.religion]) studentObj["الديانه*"] = cells[colMap.religion];
                if (colMap.status !== undefined && cells[colMap.status]) studentObj["حالة قيد الطالب*"] = cells[colMap.status];
                if (colMap.isMerged !== undefined && cells[colMap.isMerged]) studentObj["الموقف من الدمج*"] = cells[colMap.isMerged];
                if (colMap.secondLanguage !== undefined && cells[colMap.secondLanguage]) studentObj["اللغه الاجنبية الثانية*"] = cells[colMap.secondLanguage];
                if (colMap.address !== undefined && cells[colMap.address]) studentObj["العنوان"] = cells[colMap.address];
                if (colMap.phone !== undefined && cells[colMap.phone]) studentObj["رقم المحمول"] = cells[colMap.phone];

                extractedStudents.push(studentObj);
            }

            if (!extractedStudents.length) {
                showToast('❌ لم نتمكن من استخراج بيانات طلاب صالحة من الجدول.', 'error');
                return;
            }

            showToast(`🚀 تم استخراج ${extractedStudents.length} طالب من الجدول! جاري الإرسال والتسكين في نبراس برو...`, 'info');

            // إرسال البيانات المجمعة مباشرة لـ NeprasPro API
            const syncRes = await NeprasAPI.sendBatch(extractedStudents, true);
            if (syncRes && syncRes.success) {
                showToast(`🎉 تم بنجاح تحديث وتسكين ${extractedStudents.length} طالب في فصولهم بنبراس برو!`, 'success');
            }
        },

        // البحث الذكي عن حقل كود التلميذ
        findCodeInput() {
            return Utils.findInputByLabelText('كود التلميذ') ||
                   Utils.findInputByLabelText('كود الطالب') ||
                   Utils.findInputByLabelText('الكود') ||
                   Utils.findInputByLabelText('كود') ||
                   document.querySelector('input[name*="code" i], input[id*="code" i], input[placeholder*="كود" i], input[name*="student_code" i], input[id*="student_code" i], input[name*="txtCode" i], input[id*="txtCode" i]');
        },

        // البحث الذكي عن زر البحث
        findSearchButton() {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.btn-primary, a[role="button"]'));
            return buttons.find(b => {
                const txt = (b.innerText || b.value || '').trim();
                return /بحث|Search/i.test(txt) || b.querySelector('.fa-search, .bi-search, svg, [class*="search" i]');
            }) || document.querySelector('button[type="submit"], #btnSearch, #btn_search, .btn-search, input[name*="search" i], input[id*="search" i]');
        },

        // البحث الذكي عن رابط أو زر تعديل الطالب
        findStudentLink(code) {
            if (code) {
                const directCodeLink = document.querySelector(`a[href*="${code}" i], button[onclick*="${code}" i], a[onclick*="${code}" i]`);
                if (directCodeLink) return directCodeLink;
            }

            const standardLink = document.querySelector('a[href*="/student/edit/" i], a[href*="/Student/edit/" i], a[href*="/student/Edit/" i], a[href*="/Student/Edit/" i]');
            if (standardLink) return standardLink;

            // البحث داخل جدول النتائج
            const tables = Array.from(document.querySelectorAll('table'));
            for (const table of tables) {
                const rows = Array.from(table.querySelectorAll('tbody tr, tr')).filter(r => r.querySelectorAll('td').length > 0);
                for (const row of rows) {
                    const rowText = row.innerText || '';
                    if (!code || rowText.includes(code)) {
                        const actionLink = row.querySelector('a[href*="edit" i], a[onclick*="edit" i], button[onclick*="edit" i], a.btn-edit, a.btn-info, a.btn-primary, a[title*="تعديل"], a[title*="عرض"]') || row.querySelector('a');
                        if (actionLink) return actionLink;
                    }
                }
            }

            return document.querySelector(CONFIG.SELECTORS.STUDENT_LINK);
        },

        // تنفيذ البحث عن كود
        async executeSearchForCode(code) {
            const savedLevel = await Store.get('target_level_val');
            const gradeEl    = Utils.findInputByLabelText('الصف') || document.querySelector('select[name*="grade" i], select[id*="grade" i], select[name*="level" i], select[id*="level" i]');
            if (gradeEl && savedLevel && gradeEl.value !== savedLevel) {
                Utils.setInputValueAngular(gradeEl, savedLevel);
                await Utils.sleep(CONFIG.WAIT_SHORT);
            }

            const codeEl = this.findCodeInput();
            if (!codeEl) {
                showToast('❌ لم يُعثر على حقل "كود التلميذ" في هذه الصفحة!', 'error');
                return false;
            }
            Utils.setInputValueAngular(codeEl, code);
            await Utils.sleep(300);

            const nidEl = Utils.findInputByLabelText('الرقم القومى') || document.querySelector('input[name*="national" i], input[id*="national" i], input[placeholder*="الرقم القومي" i]');
            if (nidEl?.value) Utils.setInputValueAngular(nidEl, '');

            const searchBtn = this.findSearchButton();
            if (!searchBtn) {
                showToast('❌ لم يُعثر على زر "بحث"!', 'error');
                return false;
            }

            searchBtn.click();
            showToast(`🔍 جاري البحث عن كود التلميذ: ${code}...`, 'info');
            return true;
        },

        // صفحة القائمة: استكمال
        async onListPageResume() {
            const collecting = await Store.get('collecting', false);
            if (!collecting) return;

            const targetCodes = await Store.get('target_codes', []);
            const currentIdx  = await Store.get('current_code_index', 0);

            if (currentIdx >= targetCodes.length) {
                const failedCodes  = await Store.get('failed_codes', []);
                const retryCount   = await Store.get('auto_retry_count', 0);

                if (failedCodes.length > 0 && retryCount < CONFIG.MAX_AUTO_RETRY) {
                    showToast(
                        `⏳ يوجد ${failedCodes.length} أكواد فاشلة. إعادة محاولة (${retryCount + 1}/${CONFIG.MAX_AUTO_RETRY}) بعد 10 ثواني...`,
                        'warning'
                    );
                    await Utils.sleep(10000);
                    await Store.set('target_codes', failedCodes);
                    await Store.set('current_code_index', 0);
                    await Store.set('failed_codes', []);
                    await Store.set('auto_retry_count', retryCount + 1);
                    window.location.reload();
                    return;
                }

                if (failedCodes.length > 0) {
                    showToast(`⚠️ تعذر تجميع ${failedCodes.length} أكواد بعد ${CONFIG.MAX_AUTO_RETRY} محاولات.`, 'error');
                } else {
                    showToast('🎉 اكتمل العمل! جميع الأكواد بنجاح.', 'success');
                    Utils.playDone();
                }

                await Store.set('collecting', false);
                await Store.set('auto_retry_count', 0);
                UI.updateStatus('مكتمل', false);
                UI._setToggleBtn(false);

                const finalData = await Store.get('collected_data', []);
                if (finalData.length > 0) {
                    await NeprasAPI.sendBatch(finalData);
                    await Exporter.exportData(finalData, 'Final');
                    await Store.set('collected_data', []);
                }
                return;
            }

            const delays = await Utils.getSpeedDelays();
            await UI.updateStats();
            const code    = targetCodes[currentIdx];
            const started = await this.executeSearchForCode(code);
            if (!started) {
                await Store.set('collecting', false);
                UI.updateStatus('متوقف', false);
                UI._setToggleBtn(false);
                return;
            }

            // الانتظار المتأني لظهور رابط الطالب في الجدول
            let link = null;
            let elapsed = 0;
            const searchTimeout = Math.max(delays.maxSearchWait, 3500);

            while (elapsed < searchTimeout) {
                await Utils.sleep(delays.pollInterval);
                elapsed += delays.pollInterval;
                link = this.findStudentLink(code);
                if (link) break;
            }

            if (link) {
                await Utils.sleep(delays.searchPostSleep);
                showToast(`🚀 جاري فتح صفحة الطالب [${code}]...`, 'success');
                const href = link.getAttribute('href');
                if (href && !href.startsWith('javascript:')) {
                    window.location.href = href;
                } else {
                    link.click();
                }
            } else {
                showToast(`⚠️ الكود [${code}] غير موجود أو لم تظهر نتائجه. تسجيل كفاشل والانتقال للتالي.`, 'warning');
                let failed = await Store.get('failed_codes', []);
                if (!failed.includes(code)) { failed.push(code); await Store.set('failed_codes', failed); }
                await Store.set('current_code_index', currentIdx + 1);
                await Utils.sleep(1200);
                window.location.reload();
            }
        },

        // صفحة التعديل: سحب البيانات والعودة الفورية
        async onEditPageCollectAndBack() {
            const collecting = await Store.get('collecting', false);
            if (!collecting) return;

            const targetCodes = await Store.get('target_codes', []);
            const currentIdx  = await Store.get('current_code_index', 0);
            const currentCode = targetCodes[currentIdx];

            const delays = await Utils.getSpeedDelays();

            // 1. فحص حقيقي لجاهزية بيانات الطالب في صفحة التعديل (الاسم والرقم القومي الفعلي)
            const isStudentFormReady = () => {
                const inputs = Array.from(document.querySelectorAll(CONFIG.SELECTORS.FORM_INPUTS));
                let hasValidName = false;
                let hasValidNationalId = false;
                let hasValidCode = false;
                let filledCount = 0;

                for (const inp of inputs) {
                    const val = (inp.value || '').trim();
                    if (!val) continue;

                    // استبعاد حقول ASP.NET التقنية وحقول الإخفاء
                    if (['__VIEWSTATE', '__EVENTVALIDATION', '__EVENTTARGET', '__EVENTARGUMENT'].some(k => (inp.name || '').includes(k))) {
                        continue;
                    }

                    filledCount++;

                    // 14 رقم قومي صحيح
                    if (/^[23]\d{13}$/.test(val)) {
                        hasValidNationalId = true;
                    }
                    // كود التلميذ
                    else if (/^\d{6,10}$/.test(val)) {
                        hasValidCode = true;
                    }
                    // اسم عربي حقيقي (ليس نص زر)
                    else if (/[\u0621-\u064A]{3,}/.test(val)) {
                        if (!['اختر', 'بحث', 'حفظ', 'تعديل', 'رجوع', 'إلغاء', 'القسم العربي', 'رسمي', 'مستجد', 'منقول'].includes(val)) {
                            hasValidName = true;
                        }
                    }
                }

                // نعتبر الصفحة جاهزة فقط عند اكتمال تحميل اسم أو رقم قومي أو كود الطالب
                return (hasValidNationalId || (hasValidName && hasValidCode) || (hasValidName && filledCount >= 3));
            };

            // 2. انتظار ذكي مرن: ينتظر ظهور بيانات الطالب الحقيقية قبل المتابعة
            let elapsed = 0;
            const maxWait = delays.mode === 'safe' ? 10000 : (delays.mode === 'fast' ? 5000 : 7000);
            while (elapsed < maxWait) {
                if (isStudentFormReady()) break;
                await Utils.sleep(100);
                elapsed += 100;
            }
            await Utils.sleep(delays.settlingTime);

            try {
                const studentData = {};
                document.querySelectorAll(CONFIG.SELECTORS.FORM_INPUTS).forEach(el => {
                    if (el.name?.startsWith('__VIEWSTATE') || el.name?.startsWith('__EVENT')) return;
                    if (['hidden', 'submit', 'button'].includes(el.type?.toLowerCase())) return;

                    let label = '';
                    const grp = el.closest('.form-group') || el.closest('tr') || el.closest('div');
                    if (grp) {
                        const lblEl = grp.querySelector('label');
                        if (lblEl) label = lblEl.innerText.trim().replace(':', '');
                    }
                    if (!label) label = el.placeholder || el.name || el.id;

                    let value = el.value?.trim();
                    if (el.tagName.toLowerCase() === 'select')
                        value = el.options[el.selectedIndex]?.text?.trim() || value;

                    if (label && value) studentData[label] = value;
                });

                // ── استنباط واستخراج "الفصل*" صراحة ────────
                let classVal = studentData['الفصل*'] || studentData['الفصل'] || studentData['فصل'] || studentData['اسم الفصل'] || studentData['رقم الفصل'] || studentData['فصل الطالب'];
                if (!classVal || ['اختر', 'اختيار', 'الكل', '-- اختر --', '0', '-- اختر الفصل --', '--اختر--'].includes(classVal.trim())) {
                    const classSelect = document.querySelector('select[name*="class" i], select[id*="class" i], select[name*="Class"], select[id*="ddlClass" i], select[name*="ddl_class" i], select[name*="ddlClassRoom" i]');
                    if (classSelect && classSelect.selectedIndex >= 0) {
                        const clText = classSelect.options[classSelect.selectedIndex]?.text?.trim();
                        if (clText && !['اختر', 'اختيار', 'الكل', '-- اختر --', '0', '-- اختر الفصل --', '--اختر--'].includes(clText)) {
                            classVal = clText;
                        }
                    }
                }
                if (!classVal || ['اختر', 'اختيار', 'الكل', '-- اختر --', '0'].includes(classVal.trim())) {
                    const classInp = document.querySelector('input[name*="class" i], input[id*="class" i], input[name*="Class"], input[id*="txtClass" i]');
                    if (classInp && classInp.value && classInp.value.trim()) {
                        classVal = classInp.value.trim();
                    }
                }
                if (classVal && !['اختر', 'اختيار', 'الكل', '-- اختر --', '0', '-- اختر الفصل --', '--اختر--'].includes(classVal.trim())) {
                    studentData['الفصل*'] = classVal;
                    studentData['الفصل'] = classVal;
                    studentData['classroomName'] = classVal;
                }

                if (Object.keys(studentData).length > 0) {
                    let dataArr    = await Store.get('collected_data', []);
                    let allHistory = await Store.get('collected_all_history', []);
                    let batchNum   = await Store.get('current_batch', 1);

                    dataArr.push(studentData);
                    allHistory.push(studentData);
                    await Store.set('collected_all_history', allHistory);

                    if (dataArr.length >= CONFIG.BATCH_SIZE) {
                        showToast(`✅ اكتملت الدفعة ${batchNum}! جاري التصدير والإرسال...`, 'success');
                        await NeprasAPI.sendBatch(dataArr);
                        await Exporter.exportData(dataArr, batchNum);
                        dataArr = [];
                        await Store.set('collected_data', []);
                        await Store.set('current_batch', batchNum + 1);
                    } else {
                        await Store.set('collected_data', dataArr);
                    }
                    await Store.set('current_code_index', currentIdx + 1);
                } else {
                    showToast('لم يُعثر على بيانات في الصفحة! تسجيل كفاشل.', 'error');
                    if (currentCode) {
                        let failed = await Store.get('failed_codes', []);
                        if (!failed.includes(currentCode)) { failed.push(currentCode); await Store.set('failed_codes', failed); }
                    }
                    await Store.set('current_code_index', currentIdx + 1);
                }
            } catch (err) {
                console.error('[Ext] Scraping Error:', err);
            }

            await Utils.sleep(delays.shortWait);
            const listUrl = await Store.get('list_page_url', '/student/list');
            window.location.href = listUrl;
        }
    };

    // ─────────────────────────────────────────
    // 7. نقطة الانطلاق
    // ─────────────────────────────────────────
    let booting = false;
    async function boot() {
        if (booting) return;
        booting = true;
        try {
            const url = window.location.href.toLowerCase();
            const isLoginPage = url.includes('/login') || url.includes('/account') || url.includes('/auth') || url === 'https://student.emis.gov.eg/' || url === 'https://student.emis.gov.eg';

            // تفعيل الأداة واللوحة على كافة صفحات المنظومة فور تسجيل الدخول (استبعاد صفحة تسجيل الدخول فقط)
            if (!isLoginPage && (url.includes('emis.gov.eg') || url.includes('/student'))) {
                await UI.ensureUI();
                // تحميل الصفوف فقط في صفحة البحث والقوائم لتجنب تعطيل صفحة الطالب
                if (!url.includes('/edit/')) {
                    await UI.populateLevels();
                }
                await UI.updateStats();

                if (url.includes('/edit/')) {
                    await Scraper.onEditPageCollectAndBack();
                } else if (url.includes('/list') || url.includes('/index') || url.includes('/search') || url.includes('/student')) {
                    const delays = await Utils.getSpeedDelays();
                    await Utils.sleep(delays.shortWait);
                    await Scraper.onListPageResume();
                }
            } else {
                // إزالة اللوحة بصفحة تسجيل الدخول لضمان الدخول النقي السلس
                const existingPanel = document.getElementById('gm-scraper-panel');
                if (existingPanel) existingPanel.remove();
            }
        } catch (err) {
            console.error('[Ext] Boot Error:', err);
        } finally {
            booting = false;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    console.log(`[جامع الطلاب ${VER}] تم التحميل بنجاح ✅`);

})();
