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
        BATCH_SIZE        : 2000,
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
            "اسم الجد للام*","اللقب / العائله للام","العنوان","الصف*","نظام التعليم*",
            "حالة قيد الطالب*","الفصل*","الشعبه*","التخصص*","اللغه الاجنبية الاولي*",
            "اللغه الاجنبية الثانية*","الموقف من الدمج*","الصف المستهدف","رقم التليفون","رقم المحمول"
        ]
    };

    // ─────────────────────────────────────────
    // 2. التخزين  (chrome.storage.local)
    // ─────────────────────────────────────────
    const Store = {
        async get(key, def = null) {
            return new Promise(r => chrome.storage.local.get([key], res =>
                r(res[key] !== undefined ? res[key] : def)));
        },
        async set(key, val) {
            return new Promise(r => chrome.storage.local.set({ [key]: val }, r));
        },
        async delete(key) {
            return new Promise(r => chrome.storage.local.remove([key], r));
        },
        async clearAll() {
            return new Promise(r => chrome.storage.local.clear(r));
        }
    };

    // ─────────────────────────────────────────
    // 3. أدوات مساعدة
    // ─────────────────────────────────────────
    const Utils = {
        sleep: ms => new Promise(r => setTimeout(r, ms)),

        extractStudentId(url) {
            if (!url) return null;
            const m = url.match(/edit\/([^/?#]+)/i);
            return m ? m[1].toLowerCase() : url.toLowerCase();
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
    // 4b. إرسال لـ NeprasPro API
    // ─────────────────────────────────────────
    const NeprasAPI = {
        async sendBatch(data) {
            if (!data || data.length === 0) return;
            const sendEnabled = await Store.get('nepras_send_enabled', true);
            if (!sendEnabled) return;
            try {
                const res = await fetch(NEPRAS_API, {
                    method : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body   : JSON.stringify({ students: data, source: 'extension_v14' }),
                    signal : AbortSignal.timeout(15000),
                });
                if (res.ok) {
                    const json = await res.json();
                    const r    = json.results || {};
                    showToast(
                        `✅ نبراس: مطابق ${r.matched||0} | جديد ${r.new||0} | تعارض ${r.conflict||0}`,
                        'success'
                    );
                    await Store.set('nepras_last_sync', new Date().toISOString());
                } else {
                    showToast(`⚠️ نبراس: خطأ ${res.status} - تحقق من تشغيل الخادم`, 'warning');
                }
            } catch (err) {
                if (err.name === 'TimeoutError' || err.name === 'AbortError') {
                    showToast('⚠️ نبراس: انتهت مهلة الاتصال - تأكد من تشغيل نبراس', 'warning');
                } else {
                    showToast('ℹ️ نبراس غير متصل - سيتم حفظ في Excel فقط', 'info');
                }
            }
        }
    };

    // ─────────────────────────────────────────
    // 4. التصدير
    // ─────────────────────────────────────────
    const Exporter = {
        async exportData(dataToExport = null, batchNumber = null) {
            const data = dataToExport || await Store.get('collected_data', []);
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
                if (typeof XLSX === 'undefined') throw new Error('مكتبة XLSX غير موجودة');
                const ws = XLSX.utils.json_to_sheet(normalized);

                // ───── تنسيق العرض التلقائي للأعمدة ─────
                const colWidths = orderedKeys.map(k => ({
                    wch: Math.max(k.length + 2, 12)
                }));
                ws['!cols'] = colWidths;

                // تجميد الصف الأول
                ws['!freeze'] = { xSplit: 0, ySplit: 1 };

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');

                const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const fileName = batchNumber
                    ? `Students_Batch_${batchNumber}_${ts}.xlsx`
                    : `Students_Final_${ts}.xlsx`;

                XLSX.writeFile(wb, fileName);
                showToast(`✅ تم التصدير: ${fileName} (${normalized.length} سجل)`, 'success');
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
  <button id="gm-btn-toggle" class="gm-btn ${isCollecting ? 'gm-btn-danger' : 'gm-btn-primary'}">
    ${isCollecting ? '⏹ إيقاف التجميع' : '▶️ بدء / استكمال التجميع'}
  </button>

  <div class="gm-divider"></div>

  <button id="gm-btn-extract-codes" class="gm-btn gm-btn-purple">📋 استخراج الأكواد من الجدول الحالي</button>

  <input type="file" id="gm-file-upload" accept=".xlsx,.xls" style="display:none;">
  <button id="gm-btn-compare"      class="gm-btn gm-btn-teal">📁 رفع Excel لاستبعاد المكررين</button>

  <button id="gm-btn-retry-failed" class="gm-btn gm-btn-orange">🔄 إعادة محاولة الفاشلين (<span id="gm-failed-count">${failedCodes.length}</span>)</button>

  <div class="gm-divider"></div>

  <button id="gm-btn-export" class="gm-btn gm-btn-blue">📊 تصدير الدفعة الحالية يدوياً</button>
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

            // استخراج الأكواد
            document.getElementById('gm-btn-extract-codes').addEventListener('click', async () => {
                await Scraper.extractCodesAndFillTextarea();
            });

            // تصدير
            document.getElementById('gm-btn-export').addEventListener('click', async () => {
                await Exporter.exportData();
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

        // توسيع الجدول
        async maximizeTableLength(targetSize = CONFIG.TARGET_TABLE_ROWS) {
            const ps = document.querySelector(CONFIG.SELECTORS.PAGE_SIZE_SELECT);
            if (ps?.tagName === 'SELECT') {
                const opts = Array.from(ps.options);
                let target = opts.find(o => parseInt(o.value, 10) >= targetSize);
                if (!target) {
                    const no = document.createElement('option');
                    no.value = targetSize; no.text = String(targetSize);
                    ps.appendChild(no); target = no;
                    showToast(`تم إضافة خيار ${targetSize} طالب`, 'info');
                }
                if (ps.value !== target.value) {
                    ps.value = target.value;
                    ps.dispatchEvent(new Event('change', { bubbles: true }));
                    await Utils.sleep(CONFIG.WAIT_MED);
                    showToast(`تم تعيين عرض ${target.value} صف`, 'success');
                    return true;
                }
                return true;
            }
            // جرب زر "الكل"
            const allBtn = Array.from(document.querySelectorAll('button, a'))
                .find(el => /الكل|All|جميع/.test(el.innerText?.trim()));
            if (allBtn) { allBtn.click(); await Utils.sleep(CONFIG.WAIT_MED); return true; }
            // جرب DataTables API
            if (typeof $ !== 'undefined' && $.fn.dataTable) {
                try {
                    $('table').DataTable().page.len(targetSize).draw();
                    await Utils.sleep(CONFIG.WAIT_MED); return true;
                } catch (_) { /* تجاهل */ }
            }
            showToast('لم نتمكن من توسيع الجدول تلقائياً.', 'warning');
            return false;
        },

        // استخراج الأكواد من الجدول
        async extractCodesAndFillTextarea() {
            showToast('جاري توسيع الجدول...', 'info');
            await this.maximizeTableLength();
            await Utils.sleep(CONFIG.WAIT_SHORT);

            const links = Array.from(document.querySelectorAll(CONFIG.SELECTORS.STUDENT_LINK));
            if (!links.length) {
                showToast('لا يوجد طلاب في الجدول. اختر الصف وابحث أولاً.', 'error'); return;
            }
            const codes = [...new Set(
                links.map(l => Utils.extractStudentId(l.href)).filter(Boolean)
            )];
            if (!codes.length) { showToast('لم يُعثر على أكواد صالحة.', 'error'); return; }

            document.getElementById('gm-codes-input').value        = codes.join('\n');
            document.getElementById('gm-stat-total').textContent   = codes.length;
            document.getElementById('gm-start-index').value        = '1';
            UI._updateProgress(0, codes.length);
            await Store.set('target_codes', codes);
            await Store.set('current_code_index', 0);
            showToast(`✅ تم استخراج ${codes.length} كود وتعبئتها.`, 'success');
        },

        // تنفيذ البحث عن كود
        async executeSearchForCode(code) {
            const savedLevel = await Store.get('target_level_val');
            const gradeEl    = Utils.findInputByLabelText('الصف');
            if (gradeEl && gradeEl.value !== savedLevel) {
                Utils.setInputValueAngular(gradeEl, savedLevel);
                await Utils.sleep(CONFIG.WAIT_SHORT);
            }
            const codeEl = Utils.findInputByLabelText('كود التلميذ');
            if (!codeEl) { showToast('❌ لم يُعثر على حقل "كود التلميذ"!', 'error'); return false; }
            Utils.setInputValueAngular(codeEl, code);
            await Utils.sleep(500);

            const nidEl = Utils.findInputByLabelText('الرقم القومى');
            if (nidEl?.value) Utils.setInputValueAngular(nidEl, '');

            const searchBtn = Array.from(document.querySelectorAll('button'))
                .find(b => b.innerText.trim() === CONFIG.SELECTORS.SEARCH_BTN_TEXT);
            if (!searchBtn) { showToast('❌ لم يُعثر على زر "بحث"!', 'error'); return false; }
            searchBtn.click();
            showToast(`🔍 بحث عن: ${code}`, 'info');
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
                    // إرسال لنبراس برو أولاً
                    await NeprasAPI.sendBatch(finalData);
                    // ثم تصدير Excel احتياطياً
                    await Exporter.exportData(finalData, 'Final');
                    await Store.set('collected_data', []);
                }
                return;
            }

            await UI.updateStats();
            const code    = targetCodes[currentIdx];
            const started = await this.executeSearchForCode(code);
            if (!started) { await Store.set('collecting', false); return; }

            await Utils.sleep(CONFIG.WAIT_LONG);
            const links = document.querySelectorAll(CONFIG.SELECTORS.STUDENT_LINK);
            if (links.length > 0) {
                window.location.href = links[0].getAttribute('href');
            } else {
                showToast(`⚠️ الكود ${code} غير موجود. تخطي وتسجيل كفاشل.`, 'warning');
                let failed = await Store.get('failed_codes', []);
                if (!failed.includes(code)) { failed.push(code); await Store.set('failed_codes', failed); }
                await Store.set('current_code_index', currentIdx + 1);
                await Utils.sleep(CONFIG.WAIT_SHORT);
                window.location.reload();
            }
        },

        // صفحة التعديل: سحب البيانات والعودة
        async onEditPageCollectAndBack() {
            const collecting = await Store.get('collecting', false);
            if (!collecting) return;

            const targetCodes = await Store.get('target_codes', []);
            const currentIdx  = await Store.get('current_code_index', 0);
            const currentCode = targetCodes[currentIdx];

            showToast('جاري سحب بيانات الطالب...', 'info');

            // انتظار تحميل النموذج
            let elapsed = 0;
            while (elapsed < CONFIG.EDIT_WAIT_MAX) {
                const inp = document.querySelector(CONFIG.SELECTORS.FORM_INPUTS);
                if (inp?.value !== '') break;
                await Utils.sleep(CONFIG.EDIT_RETRY_INTERVAL);
                elapsed += CONFIG.EDIT_RETRY_INTERVAL;
            }
            await Utils.sleep(CONFIG.WAIT_SHORT);

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

                if (Object.keys(studentData).length > 0) {
                    let dataArr  = await Store.get('collected_data', []);
                    let batchNum = await Store.get('current_batch', 1);
                    dataArr.push(studentData);

                    if (dataArr.length >= CONFIG.BATCH_SIZE) {
                        showToast(`✅ اكتملت الدفعة ${batchNum}! جاري التصدير والإرسال...`, 'success');
                        // إرسال لنبراس برو أولاً
                        await NeprasAPI.sendBatch(dataArr);
                        // ثم تصدير Excel احتياطياً
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

            await Utils.sleep(CONFIG.WAIT_SHORT);
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
            if (url.includes('/student/')) {
                await UI.ensureUI();
                await UI.populateLevels();
                await UI.updateStats();
            }
            if (url.includes('/student/edit/')) {
                await Scraper.onEditPageCollectAndBack();
            } else if (url.includes('/student/list') || url.includes('/student/index')) {
                await Utils.sleep(1000);
                await Scraper.onListPageResume();
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
