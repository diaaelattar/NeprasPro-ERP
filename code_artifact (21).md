<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>المخطط الهندسي والدليل البرمجي الشامل — نظام إدارة المدارس المصرية</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --c1:#042C53;--c2:#185FA5;--c3:#378ADD;--c4:#B5D4F4;--c5:#E6F1FB;
  --cg:#2C2C2A;--cg2:#888780;--cg3:#D3D1C7;--cg4:#F1EFE8;
  --ct:#0F6E56;--ct2:#1D9E75;--ct3:#9FE1CB;--ct4:#E1F5EE;
  --ca:#854F0B;--ca2:#BA7517;--ca3:#FAC775;--ca4:#FAEEDA;
  --cr:#A32D2D;--cr2:#E24B4A;--cp:#533AB7;--cp2:#AFA9EC;--cp3:#EEEDFE;
  --co:#993C1D;--co2:#D85A30;--co3:#F0997B;--co4:#FAECE7;
  --bg:#FAFAF8;--border:#E8E6E0;
}
body{font-family:'Cairo',system-ui,sans-serif;color:var(--cg);background:var(--bg);font-size:14px;line-height:1.6}

/* ===== COVER ===== */
.cover{background:linear-gradient(135deg,var(--c1) 0%,var(--c2) 60%,var(--ct) 100%);color:#fff;padding:80px 48px;text-align:center;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.cover h1{font-size:36px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px}
.cover .sub{font-size:18px;opacity:0.9;margin-bottom:24px;font-weight:300}
.cover-meta{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-top:20px}
.cover-badge{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:8px 18px;font-size:12px;font-weight:500}

/* ===== TOC ===== */
.toc{max-width:1000px;margin:30px auto;padding:40px 32px;background:#fff;border-radius:12px;border:1px solid var(--border)}
.toc h2{font-size:20px;font-weight:700;color:var(--c1);margin-bottom:8px}
.toc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.toc-item{background:var(--bg);border:0.5px solid var(--border);border-radius:8px;padding:14px 16px;display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--cg);transition:all 0.2s}
.toc-item:hover{border-color:var(--c3);color:var(--c2);background:#fff;transform:translateY(-2px)}
.toc-num{font-size:22px;font-weight:800;color:var(--c3);min-width:32px}
.toc-label{font-size:13px;font-weight:700}
.toc-sub{font-size:11px;color:var(--cg2)}

/* ===== LAYOUT ===== */
.doc{max-width:1000px;margin:0 auto;padding:0 32px 80px}
.phase-header{display:flex;align-items:flex-start;gap:16px;background:#fff;border:0.5px solid var(--border);border-radius:12px;padding:24px;margin:40px 0 24px;border-right:5px solid var(--c2);box-shadow:0 2px 8px rgba(0,0,0,0.02)}
.ph-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.ph-blue{background:var(--c5);color:var(--c2)}
.ph-teal{background:var(--ct4);color:var(--ct)}
.ph-amber{background:var(--ca4);color:var(--ca)}
.ph-purple{background:var(--cp3);color:var(--cp)}
.ph-red{background:#FCEBEB;color:var(--cr)}
.ph-orange{background:var(--co4);color:var(--co)}
.phase-header h2{font-size:22px;font-weight:800;margin-bottom:6px;color:var(--c1)}
.phase-header p{font-size:13px;color:var(--cg2)}

/* ===== SECTIONS ===== */
h3{font-size:18px;font-weight:700;margin:32px 0 12px;color:var(--c1);border-bottom:2px solid var(--c5);padding-bottom:6px}
h4{font-size:15px;font-weight:700;margin:20px 0 10px;color:var(--cg)}

/* ===== CARDS ===== */
.card{background:#fff;border:0.5px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.01)}
.card-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.card-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px}
.card h4{margin-top:0;font-size:14px;font-weight:700;padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:12px;color:var(--c2)}

/* ===== CODE BLOCKS ===== */
pre{background:#1E2028;color:#ABB2BF;padding:20px;border-radius:8px;font-size:12px;line-height:1.8;overflow-x:auto;margin:14px 0;font-family:'Fira Code','Courier New',monospace;border:1px solid #282C34}
code{background:#F0EEE8;color:var(--c1);padding:2px 6px;border-radius:4px;font-size:12px;font-family:'Fira Code',monospace;font-weight:500}
.kw{color:#C678DD;font-weight:700}
.ty{color:#E5C07B}
.st{color:#98C379}
.cm{color:#5C6370;font-style:italic}
.nu{color:#D19A66}
.fn{color:#61AFEF}
.ob{color:#E06C75}
.at{color:#ABB2BF}

/* ===== TABLE ===== */
table{width:100%;border-collapse:collapse;font-size:12px;margin:14px 0;background:#fff;border-radius:8px;overflow:hidden;border:1px solid var(--border)}
th{background:var(--c5);color:var(--c1);padding:10px 14px;text-align:right;font-weight:700;border-bottom:2px solid var(--ca3)}
td{padding:10px 14px;border-bottom:0.5px solid var(--border);vertical-align:top}
tr:last-child td{border-bottom:none}
tr:nth-child(even){background:#FAFAF8}

/* ===== TAGS ===== */
.tag{display:inline-block;font-size:10px;padding:3px 8px;border-radius:12px;font-weight:700}
.pk{background:var(--c5);color:var(--c1)}
.fk{background:var(--ct4);color:var(--ct)}
.uq{background:var(--cp3);color:var(--cp)}
.nn{background:var(--cg4);color:var(--cg2)}
.def{background:var(--ca4);color:var(--ca)}
.chk{background:#FCEBEB;color:var(--cr)}
.idx{background:var(--co4);color:var(--co)}

/* ===== API ROWS ===== */
.api-list{margin:8px 0}
.api-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:0.5px solid var(--border);font-size:12px}
.api-row:last-child{border-bottom:none}
.method{font-size:10px;font-weight:800;padding:4px 10px;border-radius:12px;min-width:54px;text-align:center;letter-spacing:0.5px}
.get{background:#EAF3DE;color:#3B6D11}
.post{background:var(--c5);color:var(--c2)}
.put{background:var(--ca4);color:var(--ca)}
.del{background:#FCEBEB;color:var(--cr)}
.api-path{font-family:'Fira Code',monospace;color:var(--cg);flex:1;font-weight:500}
.api-desc{color:var(--cg2);font-size:12px;min-width:200px;text-align:right}
.api-perm{font-size:10px;background:var(--cp3);color:var(--cp);padding:2px 8px;border-radius:8px;font-weight:600}

/* ===== BADGE ROW ===== */
.badge-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.badge{font-size:11px;padding:4px 12px;border-radius:14px;font-weight:600}
.b-blue{background:var(--c5);color:var(--c1)}
.b-teal{background:var(--ct4);color:var(--ct)}
.b-amber{background:var(--ca4);color:var(--ca)}
.b-gray{background:var(--cg4);color:var(--cg)}
.b-purple{background:var(--cp3);color:var(--cp)}
.b-red{background:#FCEBEB;color:var(--cr)}
.b-orange{background:var(--co4);color:var(--co)}
.b-green{background:#EAF3DE;color:#3B6D11}

/* ===== PERM GRID ===== */
.perm-table{width:100%;border-collapse:collapse;font-size:12px}
.perm-table th{background:var(--cg4);text-align:center;padding:8px;font-size:11px;font-weight:700;color:var(--cg)}
.perm-table td{text-align:center;padding:8px;border:0.5px solid var(--border)}
.p-full{background:var(--ct4);color:var(--ct);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700}
.p-read{background:var(--c5);color:var(--c2);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700}
.p-entry{background:var(--ca4);color:var(--ca);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700}
.p-none{background:var(--cg4);color:var(--cg2);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700}

/* ===== UI MOCKUP ===== */
.mockup{background:#F5F5F5;border:1px solid #DDD;border-radius:12px;overflow:hidden;margin:18px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05)}
.mockup-bar{background:#E8E8E8;padding:10px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #DDD}
.mockup-dot{width:12px;height:12px;border-radius:50%}
.mockup-body{padding:20px;background:#FFF;font-size:12px}
.m-sidebar{display:flex;gap:0}
.m-side{background:#042C53;color:#fff;width:200px;padding:16px;flex-shrink:0;font-size:11px;min-height:320px}
.m-content{flex:1;padding:18px}
.m-nav-item{padding:8px 12px;border-radius:6px;margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:10px}
.m-nav-item.active{background:rgba(255,255,255,0.15);font-weight:700}
.m-nav-item:hover:not(.active){background:rgba(255,255,255,0.08)}
.m-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.m-input{border:1px solid #DDD;border-radius:6px;padding:8px 10px;font-size:11px;width:100%;font-family:inherit}
.m-label{font-size:10px;color:#888;margin-bottom:4px;display:block}
.m-btn{background:var(--c2);color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:11px;cursor:pointer;font-weight:600}
.m-btn-sec{background:#fff;color:var(--c2);border:1px solid var(--c2);border-radius:6px;padding:8px 16px;font-size:11px;cursor:pointer;font-weight:600}
.m-table td,.m-table th{padding:8px 10px;border:0.5px solid #EEE;font-size:11px}
.m-table th{background:#F5F5F5;font-weight:700}
.m-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.m-title{font-size:15px;font-weight:700;color:var(--c1)}
.m-chip{font-size:10px;padding:3px 10px;border-radius:12px;font-weight:700}
.m-chip-green{background:#EAF3DE;color:#3B6D11}
.m-chip-red{background:#FCEBEB;color:var(--cr)}
.m-chip-amber{background:var(--ca4);color:var(--ca)}
.m-chip-blue{background:var(--c5);color:var(--c2)}

/* ===== TIMELINE ===== */
.timeline{position:relative;padding-right:24px;margin:20px 0}
.timeline::before{content:'';position:absolute;right:8px;top:0;bottom:0;width:2px;background:var(--c4)}
.tl-item{display:flex;gap:16px;margin-bottom:24px;position:relative}
.tl-dot{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;position:relative;z-index:2;box-shadow:0 0 0 4px var(--bg)}
.tl-line{flex:1}
.tl-title{font-size:15px;font-weight:700;margin-bottom:6px;color:var(--c1)}
.tl-detail{font-size:12.5px;color:var(--cg2);line-height:1.7}

/* ===== REPORT CARD ===== */
.report-card{background:#fff;border:0.5px solid var(--border);border-radius:10px;padding:16px 20px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.01)}
.rc-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.rc-title{font-size:14px;font-weight:700;color:var(--c1)}
.ex-badge{font-size:10px;padding:3px 10px;border-radius:12px;font-weight:700}
.ex-xl{background:#EAF3DE;color:#3B6D11}
.ex-pdf{background:#FCEBEB;color:var(--cr)}
.ex-both{background:var(--cp3);color:var(--cp)}
.rc-fields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:11.5px;color:var(--cg2)}

/* ===== FOLDER TREE ===== */
.folder-tree{font-family:'Fira Code',monospace;font-size:12px;background:#1E2028;color:#ABB2BF;padding:20px;border-radius:8px;line-height:1.9;margin:14px 0;border:1px solid #282C34}
.tree-dir{color:#61AFEF;font-weight:600}
.tree-file{color:#ABB2BF}
.tree-comment{color:#5C6370;font-style:italic}

/* ===== DIVIDER ===== */
.divider{height:1px;background:var(--border);margin:32px 0}
.section-divider{display:flex;align-items:center;gap:12px;margin:32px 0 20px}
.section-divider .line{flex:1;height:1px;background:var(--border)}
.section-divider .label{font-size:12px;font-weight:700;color:var(--cg2);white-space:nowrap;padding:0 10px;background:var(--bg)}

/* ===== CALLOUT ===== */
.callout{border-radius:8px;padding:14px 20px;margin:14px 0;font-size:12.5px;display:flex;gap:12px;align-items:flex-start}
.callout-blue{background:var(--c5);border-right:4px solid var(--c2)}
.callout-amber{background:var(--ca4);border-right:4px solid var(--ca2)}
.callout-teal{background:var(--ct4);border-right:4px solid var(--ct2)}
.callout-red{background:#FCEBEB;border-right:4px solid var(--cr)}

@media print{
  .cover{background:#042C53!important}
  body{background:#fff}
  .phase-header{break-inside:avoid}
  pre{white-space:pre-wrap;word-break:break-all}
}
</style>
</head>
<body>

<!-- ===================== COVER ===================== -->
<div class="cover">
  <div style="font-size:14px;opacity:0.8;margin-bottom:10px;font-weight:700;letter-spacing:1px">📋 المخطط الهندسي والدليل البرمجي الشامل</div>
  <h1>نظام إدارة المدارس المصرية (Egyptian School ERP)</h1>
  <div class="sub">تخصيص كامل وإدارة حيوية للحقول وقاعدة البيانات، مع منطق الأعمال، الـ APIs، والواجهات والنشر</div>
  <div class="cover-meta">
    <div class="cover-badge">🗄️ 40+ جدول قاعدة بيانات</div>
    <div class="cover-badge">🔌 85+ نقطة API</div>
    <div class="cover-badge">⚙️ محرك تخصيص الحقول ديناميكياً</div>
    <div class="cover-badge">🖥️ واجهة تفاعلية MUI RTL</div>
    <div class="cover-badge">🧠 6 قواعد عمل برمجية</div>
  </div>
</div>

<!-- ===================== TOC ===================== -->
<div class="toc">
  <h2>📑 الفهرس الهندسي والتقني للمنظومة</h2>
  <p style="font-size:13px;color:var(--cg2);margin-bottom:16px">خريطة الطريق التنفيذية والتعليمات التقنية الكاملة</p>
  <div class="toc-grid">
    <a class="toc-item" href="#phase0">
      <div class="toc-num">0</div>
      <div>
        <div class="toc-label">هيكل المشروع والتأسيس</div>
        <div class="toc-sub">Stack التقني · البنية الشجرية · Setup Wizard</div>
      </div>
    </a>
    <a class="toc-item" href="#phase1">
      <div class="toc-num">1</div>
      <div>
        <div class="toc-label">مخطط قاعدة البيانات الشامل</div>
        <div class="toc-sub">40+ جدول · DDL كامل · الفهارس · التخصيص الديناميكي</div>
      </div>
    </a>
    <a class="toc-item" href="#phase2">
      <div class="toc-num">2</div>
      <div>
        <div class="toc-label">منظومة الصلاحيات والأمان (RBAC)</div>
        <div class="toc-sub">JWT · مصفوفة الأدوار · Postgres Context Middleware</div>
      </div>
    </a>
    <a class="toc-item" href="#phase3">
      <div class="toc-num">3</div>
      <div>
        <div class="toc-label">الـ Backend API والـ Controllers</div>
        <div class="toc-sub">85+ نقطة · شفرة برمجية كاملة للـ Controllers بالـ pg-pool</div>
      </div>
    </a>
    <a class="toc-item" href="#business-rules">
      <div class="toc-num">4</div>
      <div>
        <div class="toc-label">منطق وقواعد الأعمال الحاكمة (Business Rules)</div>
        <div class="toc-sub">Promote · Dynamic Fields · Lock Checks · Audit triggers</div>
      </div>
    </a>
    <a class="toc-item" href="#phase4">
      <div class="toc-num">5</div>
      <div>
        <div class="toc-label">واجهات المستخدم (React v18 & RTL)</div>
        <div class="toc-sub">MUI RTL · شاشة تخصيص الحقول · شاشة الكنترول التفاعلية</div>
      </div>
    </a>
    <a class="toc-item" href="#phase5">
      <div class="toc-num">6</div>
      <div>
        <div class="toc-label">التقرير والتصدير (ExcelJS & Puppeteer)</div>
        <div class="toc-sub">25+ تقرير تفصيلي · تصدير البيانات المطابقة للنماذج الوزارية</div>
      </div>
    </a>
    <a class="toc-item" href="#timeline">
      <div class="toc-num">7</div>
      <div>
        <div class="toc-label">خطة التنفيذ والنشر (Deployment)</div>
        <div class="toc-sub">12 أسبوعاً · PM2 & Nginx configuration · package.json</div>
      </div>
    </a>
  </div>
</div>

<div class="doc">

<!-- ===================== PHASE 0 ===================== -->
<div id="phase0" class="phase-header">
  <div class="ph-icon ph-blue">🏗️</div>
  <div>
    <h2>المرحلة صفر — هيكل المشروع وتأسيسه التقني</h2>
    <p>البنية التقنية الكاملة للمشروع وملفات التأسيس الأولي لضمان التكامل الكامل.</p>
  </div>
</div>

<h3>0.1 Stack التقني المستهدف للإنتاج</h3>
<div class="card-grid">
  <div class="card">
    <h4>🟢 Backend (Node.js & Postgres)</h4>
    <div class="badge-row">
      <span class="badge b-teal">Node.js 20 LTS</span>
      <span class="badge b-teal">Express 4.18+</span>
      <span class="badge b-blue">PostgreSQL 16</span>
      <span class="badge b-gray">node-postgres (pg-pool)</span>
      <span class="badge b-gray">Joi (Validation)</span>
      <span class="badge b-gray">bcryptjs (Password Hashing)</span>
      <span class="badge b-gray">ExcelJS (Reports)</span>
      <span class="badge b-gray">Puppeteer / Handlebars (PDF)</span>
      <span class="badge b-gray">Winston (Logging)</span>
    </div>
  </div>
  <div class="card">
    <h4>🔵 Frontend (React 18 & Vite)</h4>
    <div class="badge-row">
      <span class="badge b-blue">React 18</span>
      <span class="badge b-blue">Vite 5</span>
      <span class="badge b-teal">MUI v5 (RTL Setup)</span>
      <span class="badge b-purple">React Hook Form</span>
      <span class="badge b-gray">Axios Client</span>
      <span class="badge b-gray">Zustand (Global State)</span>
      <span class="badge b-gray">Recharts (BI Charts)</span>
      <span class="badge b-gray">Lucide Icons</span>
    </div>
  </div>
</div>

<h3>0.2 هيكلية مجلدات المشروع الموحدة (Monorepo Boilerplate)</h3>
<div class="folder-tree">
<span class="tree-dir">school-erp/</span>
├── <span class="tree-dir">backend/</span>
│   ├── <span class="tree-dir">config/</span>
│   │   ├── <span class="tree-file">db.js</span>                  <span class="tree-comment">// pg Pool connection & session injector</span>
│   │   ├── <span class="tree-file">env.js</span>                 <span class="tree-comment">// Env validator via Joi</span>
│   │   └── <span class="tree-file">logger.js</span>              <span class="tree-comment">// Winston configuration</span>
│   ├── <span class="tree-dir">middleware/</span>
│   │   ├── <span class="tree-file">auth.middleware.js</span>      <span class="tree-comment">// JWT validator & active session tracker</span>
│   │   ├── <span class="tree-file">permission.middleware.js</span><span class="tree-comment">// RBAC check</span>
│   │   ├── <span class="tree-file">scope.middleware.js</span>     <span class="tree-comment">// Stage-scope injector</span>
│   │   └── <span class="tree-file">validate.middleware.js</span>  <span class="tree-comment">// Request body schema matcher</span>
│   ├── <span class="tree-dir">modules/</span>
│   │   ├── <span class="tree-dir">auth/</span>                 <span class="tree-comment">// Routes, controllers, validators</span>
│   │   ├── <span class="tree-dir">students/</span>             <span class="tree-comment">// Student registration & academic files</span>
│   │   ├── <span class="tree-dir">staff/</span>                <span class="tree-comment">// Teacher & Administrative affairs (HR)</span>
│   │   ├── <span class="tree-dir">finance/</span>              <span class="tree-comment">// School fees, cash desk ledger, expenses</span>
│   │   ├── <span class="tree-dir">control/</span>              <span class="tree-comment">// Exam committees, seats, grading ledger</span>
│   │   └── <span class="tree-dir">reports/</span>              <span class="tree-comment">// BI & Ministry templates engine</span>
│   ├── <span class="tree-dir">utils/</span>
│   │   ├── <span class="tree-file">excel.util.js</span>           <span class="tree-comment">// ExcelJS helper for templates</span>
│   │   ├── <span class="tree-file">pdf.util.js</span>             <span class="tree-comment">// Puppeteer PDF rendering pipeline</span>
│   │   ├── <span class="tree-file">arabic.util.js</span>          <span class="tree-comment">// Arabic currency translation</span>
│   │   └── <span class="tree-file">grade.calc.js</span>           <span class="tree-comment">// Grading engine logic</span>
│   ├── <span class="tree-file">app.js</span>                      <span class="tree-comment">// Express configuration setup</span>
│   ├── <span class="tree-file">server.js</span>                   <span class="tree-comment">// Process listeners</span>
│   └── <span class="tree-file">package.json</span>
└── <span class="tree-dir">frontend/</span>
    ├── <span class="tree-dir">src/</span>
    │   ├── <span class="tree-dir">contexts/</span>
    │   │   ├── <span class="tree-file">AuthContext.jsx</span>         <span class="tree-comment">// JWT, dynamic role switches</span>
    │   │   └── <span class="tree-file">SchoolContext.jsx</span>       <span class="tree-comment">// Current configuration</span>
    │   ├── <span class="tree-dir">lib/</span>
    │   │   └── <span class="tree-file">axios.js</span>                <span class="tree-comment">// Axios with authorization interceptor</span>
    │   ├── <span class="tree-dir">components/</span>
    │   │   ├── <span class="tree-dir">layout/</span>                  <span class="tree-comment">// AppShell, TopBar, Sidebar, RTL</span>
    │   │   └── <span class="tree-dir">security/</span>                <span class="tree-comment">// Route guards</span>
    │   └── <span class="tree-dir">modules/</span>
    │       ├── <span class="tree-dir">control/</span>                <span class="tree-comment">// GradeSheet component and bulk uploads</span>
    │       ├── <span class="tree-dir">students/</span>               <span class="tree-comment">// Enrollment and transfer forms</span>
    │       └── <span class="tree-dir">finance/</span>                <span class="tree-comment">// Financial desks</span>
    └── <span class="tree-file">package.json</span>
</div>

<h3>0.3 معالج التأسيس الأولي (Setup Wizard Pipeline)</h3>
<div class="callout callout-amber">
  ⚠️ يتم تفعيل معالج التأسيس (Setup Wizard) تلقائياً عند تشغيل النظام لأول مرة إذا كانت قيمة <code>is_initialized = FALSE</code> في <code>school_config</code>، حيث يُحجب الوصول إلى كافة ميزات النظام الأخرى لحين إتمام خطوات التأسيس الخمس.
</div>
<table>
  <thead>
    <tr>
      <th>الخطوة</th>
      <th>البيانات المدخلة المطلوبة</th>
      <th>العملية البرمجية</th>
      <th>آلية التحقق من المدخلات (Validation)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. معلومات المؤسسة</strong></td>
      <td>اسم المدرسة، الكود الوزاري، المحافظة، الإدارة التعليمية، الهاتف، البريد الإلكتروني.</td>
      <td>إدراج وتحديث سجل الإعدادات الرئيسي في <code>school_config</code>.</td>
      <td>التحقق من الكود الوزاري الفريد، وصيغة الهاتف والبريد الإلكتروني المدخلين.</td>
    </tr>
    <tr>
      <td><strong>2. نوع التعليم</strong></td>
      <td>عربي / رسمي لغات / متميز لغات / خاص لغات.</td>
      <td>تحديث حقل <code>education_type</code> وضبط المتطلبات اللائحية للدرجات واللغات.</td>
      <td>التحقق من مطابقة القيمة للخيارات المعتمدة في الـ ENUM.</td>
    </tr>
    <tr>
      <td><strong>3. الوضع القانوني</strong></td>
      <td>مدرسة حكومية / مدرسة خاصة.</td>
      <td>تحديث حقل <code>legal_status</code> لتحديد بنية رواتب الموظفين ولوائح المصروفات.</td>
      <td>تعديل جداول الإسناد المالي ديناميكياً لتلائم نوع المدرسة.</td>
    </tr>
    <tr>
      <td><strong>4. حساب المسؤول الرئيسي</strong></td>
      <td>الاسم الكامل، الرقم القومي (14 خانة)، كلمة المرور.</td>
      <td>إدراج سجل مستخدم في <code>users</code> ومنحه دور <code>super_admin</code> في <code>user_roles</code>.</td>
      <td>التحقق من صحة الرقم القومي وتفرده، وتعمية كلمة المرور باستخدام خوارزمية <code>bcryptjs</code>.</td>
    </tr>
    <tr>
      <td><strong>5. توليد البنية التلقائي</strong></td>
      <td>بدء توليد جداول المراحل والصفوف وفق نوع التعليم.</td>
      <td>تشغيل ملفات Seed لتغذية جداول <code>stages_lookup</code>, <code>grades_lookup</code>, <code>subjects</code>.</td>
      <td>إدراج السجلات بنجاح ثم تغيير حالة النظام إلى <code>is_initialized = TRUE</code>.</td>
    </tr>
  </tbody>
</table>


<!-- ===================== PHASE 1 ===================== -->
<div id="phase1" class="phase-header">
  <div class="ph-icon ph-teal">🗄️</div>
  <div>
    <h2>المرحلة الأولى — مخطط قاعدة البيانات الشامل (Full PostgreSQL Schema)</h2>
    <p>مخطط قاعدة البيانات الموحد والكامل لـ 40 جدولاً، متضمناً العلاقات، القيود، الفهارس، ومسارات التدقيق، بالإضافة إلى منظومة الحقول المخصصة.</p>
  </div>
</div>

<h3>1.1 الجداول الأساسية وجداول التهيئة (Configuration and Base Lookup Schema)</h3>
<pre><span class="cm">-- تفعيل إضافات الأمان والتشفير المعتمدة</span>
<span class="kw">CREATE EXTENSION IF NOT EXISTS</span> <span class="st">"pgcrypto"</span>;

<span class="cm">-- 1. جدول الإعدادات العامة للمؤسسة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">school_config</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  school_code   <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">UNIQUE NOT NULL</span>,
  school_name   <span class="ty">VARCHAR</span>(<span class="nu">200</span>) <span class="kw">NOT NULL</span>,
  governorate   <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">NOT NULL</span>,
  directorate   <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">NOT NULL</span>,
  address       <span class="ty">TEXT</span>,
  phone         <span class="ty">VARCHAR</span>(<span class="nu">20</span>),
  email         <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  education_type <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">CHECK</span> (education_type <span class="kw">IN</span> (<span class="st">'عربي'</span>, <span class="st">'رسمي لغات'</span>, <span class="st">'متميز لغات'</span>, <span class="st">'خاص لغات'</span>)),
  legal_status  <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">CHECK</span> (legal_status <span class="kw">IN</span> (<span class="st">'حكومية'</span>, <span class="st">'خاصة'</span>)),
  is_initialized <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>,
  logo_url      <span class="ty">VARCHAR</span>(<span class="nu">500</span>),
  stamp_url     <span class="ty">VARCHAR</span>(<span class="nu">500</span>),
  created_at    <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW()
);

<span class="cm">-- 2. الأعوام الدراسية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">academic_years</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  year_label    <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">UNIQUE NOT NULL</span>, <span class="cm">-- مثل '2025/2026'</span>
  start_date    <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  end_date      <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  is_current    <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>
);

<span class="cm">-- 3. المراحل التعليمية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">stages_lookup</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  stage_name    <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">UNIQUE NOT NULL</span>, <span class="cm">-- 'ابتدائي', 'إعدادي', 'ثانوي'</span>
  years_count   <span class="ty">INTEGER</span> <span class="kw">NOT NULL</span>,
  display_order <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">0</span>
);

<span class="cm">-- 4. الصفوف الدراسية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">grades_lookup</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  stage_id      <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> stages_lookup(id) <span class="kw">ON DELETE CASCADE</span>,
  grade_number  <span class="ty">INTEGER</span> <span class="kw">NOT NULL</span>,
  grade_name_ar <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">NOT NULL</span>,
  grade_name_en <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  <span class="kw">UNIQUE</span> (stage_id, grade_number)
);

<span class="cm">-- 5. فصول المدرسة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">classes</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  grade_id      <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> grades_lookup(id) <span class="kw">ON DELETE CASCADE</span>,
  class_code    <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- '1/1', 'A-1'</span>
  max_capacity  <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">40</span>,
  shift_type    <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">DEFAULT</span> <span class="st">'صباحي'</span> <span class="kw">CHECK</span> (shift_type <span class="kw">IN</span> (<span class="st">'صباحي'</span>, <span class="st">'مسائي'</span>)),
  is_active     <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">true</span>,
  <span class="kw">UNIQUE</span> (grade_id, class_code)
);

<span class="cm">-- 6. الجنسيات المعتمدة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">nationalities</span> (
  id   <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  name <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span>
);

<span class="cm">-- 7. أنواع وثائق وملفات القبول للطلاب</span>
<span class="kw">CREATE TABLE</span> <span class="ty">document_types</span> (
  id   <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  name <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span> <span class="cm">-- 'شهادة ميلاد كمبيوتر', 'تقرير طبي', 'إفادة نجاح'</span>
);</pre>

<h3>1.2 جداول الحقول المخصصة والامتدادات الحيوية (Dynamic Custom Fields Schema)</h3>
<div class="callout callout-blue">
  💡 <strong>تقنية الحقول المخصصة (Custom Fields):</strong> لتجنب تعديل هيكل قاعدة البيانات الثابت يدوياً في كل مرة تطلب فيها المدرسة حقولاً إضافية، نعتمد على محرك حقول ديناميكية يسجل مواصفات الحقول في جدول واصف مخصص <code>system_custom_fields</code>، وتُخزن البيانات الفعلية كسمات ديناميكية داخل حقل <code>custom_attributes</code> من نوع <code>JSONB</code> في الجداول الأساسية.
</div>
<pre><span class="cm">-- 8. جدول تعريف وتوصيف الحقول الديناميكية المخصصة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">system_custom_fields</span> (
  id              <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  entity_type     <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">NOT NULL CHECK</span> (entity_type <span class="kw">IN</span> (<span class="st">'students'</span>, <span class="st">'staff'</span>, <span class="st">'classes'</span>, <span class="st">'payments'</span>)),
  field_name      <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- الاسم البرمجي الفريد كـ مفتاح، مثل 'bus_route'</span>
  label_ar        <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- التسمية العربية، مثل 'خط الحافلة المدرسية'</span>
  label_en        <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  field_type      <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">NOT NULL CHECK</span> (field_type <span class="kw">IN</span> (<span class="st">'text'</span>, <span class="st">'number'</span>, <span class="st">'boolean'</span>, <span class="st">'select'</span>, <span class="st">'date'</span>)),
  options         <span class="ty">JSONB</span>, <span class="cm">-- قائمة الخيارات لحقول الـ SELECT على هيئة مصفوفة نصوص</span>
  is_required     <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>,
  is_active       <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">true</span>,
  display_order   <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">0</span>,
  created_at      <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW(),
  <span class="kw">UNIQUE</span> (entity_type, field_name)
);</pre>

<h3>1.3 شئون الموظفين والعاملين (Comprehensive Human Resources Schema)</h3>
<pre><span class="cm">-- 9. المسميات الوظيفية والكادر التعليمي</span>
<span class="kw">CREATE TABLE</span> <span class="ty">cadre_titles</span> (
  id     <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  name   <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span>, <span class="cm">-- 'معلم خبير', 'إداري', 'وكيل', 'مدير'</span>
  sector <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">CHECK</span> (sector <span class="kw">IN</span> (<span class="st">'حكومي'</span>, <span class="st">'خاص'</span>, <span class="st">'مشترك'</span>))
);

<span class="cm">-- 10. ملفات العاملين والمدرسين</span>
<span class="kw">CREATE TABLE</span> <span class="ty">staff</span> (
  id                  <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  national_id         <span class="ty">VARCHAR</span>(<span class="nu">14</span>) <span class="kw">UNIQUE NOT NULL</span> <span class="kw">CHECK</span> (LENGTH(national_id) = <span class="nu">14</span>),
  first_name          <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">NOT NULL</span>,
  middle_name         <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  last_name           <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">NOT NULL</span>,
  gender              <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">NOT NULL</span> <span class="kw">CHECK</span> (gender <span class="kw">IN</span> (<span class="st">'ذكر'</span>, <span class="st">'أنثى'</span>)),
  birth_date          <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  birth_place         <span class="ty">VARCHAR</span>(<span class="nu">150</span>),
  religion            <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">DEFAULT</span> <span class="st">'مسلم'</span>,
  nationality_id      <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> nationalities(id),
  marital_status      <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">CHECK</span> (marital_status <span class="kw">IN</span> (<span class="st">'أعزب'</span>, <span class="st">'متزوج'</span>, <span class="st">'مطلق'</span>, <span class="st">'أرمل'</span>)),
  address             <span class="ty">TEXT</span>,
  phone               <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">NOT NULL</span>,
  email               <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  hire_date           <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  sector_type         <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">NOT NULL</span> <span class="kw">CHECK</span> (sector_type <span class="kw">IN</span> (<span class="st">'حكومي'</span>, <span class="st">'خاص'</span>)),
  cadre_id            <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> cadre_titles(id),
  status              <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">DEFAULT</span> <span class="st">'نشط'</span> <span class="kw">CHECK</span> (status <span class="kw">IN</span> (<span class="st">'نشط'</span>, <span class="st">'إجازة'</span>, <span class="st">'منتدب'</span>, <span class="st">'معار'</span>, <span class="st">'متقاعد'</span>)),
  photo_url           <span class="ty">VARCHAR</span>(<span class="nu">500</span>),
  custom_attributes   <span class="ty">JSONB</span> <span class="kw">DEFAULT</span> <span class="st">'{}'</span>::jsonb, <span class="cm">-- لتخزين قيم الحقول المخصصة الخاصة بالموظفين</span>
  created_at          <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW()
);

<span class="cm">-- 11. البيانات الوظيفية للعاملين بالقطاع الحكومي</span>
<span class="kw">CREATE TABLE</span> <span class="ty">staff_gov</span> (
  id                  <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  staff_id            <span class="ty">INTEGER</span> <span class="kw">UNIQUE REFERENCES</span> staff(id) <span class="kw">ON DELETE CASCADE</span>,
  ministry_code       <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">UNIQUE NOT NULL</span>,
  financial_grade     <span class="ty">VARCHAR</span>(<span class="nu">50</span>), <span class="cm">-- 'كبير معلمين', 'الدرجة الأولى'</span>
  specialization      <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  appointment_date    <span class="ty">DATE</span>,
  last_promotion_date <span class="ty">DATE</span>
);

<span class="cm">-- 12. البيانات الوظيفية والرواتب للعاملين بالقطاع الخاص</span>
<span class="kw">CREATE TABLE</span> <span class="ty">staff_private</span> (
  id                  <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  staff_id            <span class="ty">INTEGER</span> <span class="kw">UNIQUE REFERENCES</span> staff(id) <span class="kw">ON DELETE CASCADE</span>,
  contract_type       <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">CHECK</span> (contract_type <span class="kw">IN</span> (<span class="st">'دائم'</span>, <span class="st">'مؤقت'</span>, <span class="st">'بالساعة'</span>)),
  contract_end        <span class="ty">DATE</span>,
  base_salary         <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">DEFAULT</span> <span class="nu">0.00</span>,
  allowances          <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">DEFAULT</span> <span class="nu">0.00</span>,
  bank_account        <span class="ty">VARCHAR</span>(<span class="nu">50</span>)
);

<span class="cm">-- 13. المؤهلات الدراسية للموظفين</span>
<span class="kw">CREATE TABLE</span> <span class="ty">qualifications</span> (
  id              <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  staff_id        <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> staff(id) <span class="kw">ON DELETE CASCADE</span>,
  degree          <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- 'بكالوريوس', 'دبلوم', 'ماجستير', 'دكتوراه'</span>
  major           <span class="ty">VARCHAR</span>(<span class="nu">150</span>) <span class="kw">NOT NULL</span>,
  university      <span class="ty">VARCHAR</span>(<span class="nu">150</span>),
  graduation_year <span class="ty">INTEGER</span>
);

<span class="cm">-- 14. التكليفات والندب والإعارات</span>
<span class="kw">CREATE TABLE</span> <span class="ty">staff_assignments</span> (
  id              <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  staff_id        <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> staff(id) <span class="kw">ON DELETE CASCADE</span>,
  assignment_type <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">CHECK</span> (assignment_type <span class="kw">IN</span> (<span class="st">'تكليف'</span>, <span class="st">'ندب داخلي'</span>, <span class="st">'ندب خارجي'</span>, <span class="st">'إعارة'</span>)),
  from_location   <span class="ty">VARCHAR</span>(<span class="nu">200</span>),
  to_location     <span class="ty">VARCHAR</span>(<span class="nu">200</span>),
  start_date      <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  end_date        <span class="ty">DATE</span>
);

<span class="cm">-- 15. سجل الإجازات الرسمية والمرضية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">staff_leaves</span> (
  id                  <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  staff_id            <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> staff(id) <span class="kw">ON DELETE CASCADE</span>,
  leave_type          <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">CHECK</span> (leave_type <span class="kw">IN</span> (<span class="st">'اعتيادية'</span>, <span class="st">'مرضية'</span>, <span class="st">'عارضة'</span>, <span class="st">'بدون مرتب'</span>)),
  start_date          <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  end_date            <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  status              <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">DEFAULT</span> <span class="st">'معلق'</span> <span class="kw">CHECK</span> (status <span class="kw">IN</span> (<span class="st">'معلق'</span>, <span class="st">'مقبول'</span>, <span class="st">'مرفوض'</span>)),
  approved_by         <span class="ty">INTEGER</span>
);

<span class="cm">-- 16. الجزاءات التأديبية والإدارية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">staff_penalties</span> (
  id              <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  staff_id        <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> staff(id) <span class="kw">ON DELETE CASCADE</span>,
  penalty_type    <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- 'لفت نظر', 'خصم من الراتب', 'إنذار'</span>
  reason          <span class="ty">TEXT</span> <span class="kw">NOT NULL</span>,
  days_deducted   <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">0</span>,
  decision_date   <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  created_at      <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW()
);</pre>

<h3>1.4 شئون الطلاب والقبول والحضور (Comprehensive Students & Admissions Schema)</h3>
<pre><span class="cm">-- 17. السجل الرئيسي لبيانات الطلاب</span>
<span class="kw">CREATE TABLE</span> <span class="ty">students</span> (
  id                    <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  national_id           <span class="ty">VARCHAR</span>(<span class="nu">14</span>) <span class="kw">UNIQUE CHECK</span> (LENGTH(national_id) = <span class="nu">14</span>),
  birth_cert_number     <span class="ty">VARCHAR</span>(<span class="nu">30</span>),
  doc_type              <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> document_types(id),
  full_name_ar          <span class="ty">VARCHAR</span>(<span class="nu">200</span>) <span class="kw">NOT NULL</span>,
  full_name_en          <span class="ty">VARCHAR</span>(<span class="nu">200</span>),
  gender                <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">NOT NULL</span> <span class="kw">CHECK</span> (gender <span class="kw">IN</span> (<span class="st">'ذكر'</span>, <span class="st">'أنثى'</span>)),
  birth_date            <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  birth_place_governorate <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  birth_place_district    <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  religion              <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">DEFAULT</span> <span class="st">'مسلم'</span>,
  nationality           <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> nationalities(id),
  health_status         <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">DEFAULT</span> <span class="st">'سليم'</span>,
  disability_type       <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  photo_path            <span class="ty">VARCHAR</span>(<span class="nu">500</span>),
  is_active             <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">true</span>,
  custom_attributes     <span class="ty">JSONB</span> <span class="kw">DEFAULT</span> <span class="st">'{}'</span>::jsonb, <span class="cm">-- لتخزين قيم الحقول المخصصة للطلاب (مثل خط الأوتوبيس، لغة ثانية مخصصة، إلخ)</span>
  created_by_user       <span class="ty">INTEGER</span>
);

<span class="cm">-- 18. أولياء الأمور وحالة القرابة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">guardians</span> (
  id                    <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_id            <span class="ty">INTEGER</span> <span class="kw">UNIQUE REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  father_name_ar        <span class="ty">VARCHAR</span>(<span class="nu">200</span>) <span class="kw">NOT NULL</span>,
  father_national_id    <span class="ty">VARCHAR</span>(<span class="nu">14</span>) <span class="kw">CHECK</span> (LENGTH(father_national_id) = <span class="nu">14</span>),
  father_phone          <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">NOT NULL</span>,
  father_profession     <span class="ty">VARCHAR</span>(<span class="nu">150</span>),
  mother_name_ar        <span class="ty">VARCHAR</span>(<span class="nu">200</span>) <span class="kw">NOT NULL</span>,
  mother_phone          <span class="ty">VARCHAR</span>(<span class="nu">20</span>),
  guardian_name         <span class="ty">VARCHAR</span>(<span class="nu">200</span>),
  guardian_relation     <span class="ty">VARCHAR</span>(<span class="nu">50</span>),
  guardian_phone        <span class="ty">VARCHAR</span>(<span class="nu">20</span>),
  address_full          <span class="ty">TEXT</span>,
  address_governorate   <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  address_district      <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  siblings_in_school    <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>
);

<span class="cm">-- 19. القيد الأكاديمي والسنوي للطلاب</span>
<span class="kw">CREATE TABLE</span> <span class="ty">student_enrollment</span> (
  id                <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_id        <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  academic_year_id  <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> academic_years(id),
  grade_id          <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> grades_lookup(id),
  class_id          <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> classes(id),
  seat_number       <span class="ty">INTEGER</span>,
  enrollment_type   <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">DEFAULT</span> <span class="st">'جديد'</span> <span class="kw">CHECK</span> (enrollment_type <span class="kw">IN</span> (<span class="st">'جديد'</span>, <span class="st">'محول'</span>, <span class="st">'عائد'</span>)),
  prev_school_name  <span class="ty">VARCHAR</span>(<span class="nu">150</span>),
  is_active         <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">true</span>,
  created_by_user   <span class="ty">INTEGER</span>,
  created_at        <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW(),
  <span class="kw">UNIQUE</span> (student_id, academic_year_id)
);

<span class="cm">-- 20. الانتقالات والتحويلات</span>
<span class="kw">CREATE TABLE</span> <span class="ty">student_transfers</span> (
  id              <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_id      <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  direction       <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">CHECK</span> (direction <span class="kw">IN</span> (<span class="st">'وارد'</span>, <span class="st">'صادر'</span>)),
  school_other    <span class="ty">VARCHAR</span>(<span class="nu">200</span>) <span class="kw">NOT NULL</span>,
  decree_number   <span class="ty">VARCHAR</span>(<span class="nu">50</span>),
  transfer_date   <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  reason          <span class="ty">TEXT</span>,
  created_at      <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW()
);

<span class="cm">-- 21. الغياب والحضور اليومي</span>
<span class="kw">CREATE TABLE</span> <span class="ty">attendance</span> (
  id          <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_id  <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  class_id    <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> classes(id) <span class="kw">ON DELETE CASCADE</span>,
  date        <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  status      <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">NOT NULL</span> <span class="kw">CHECK</span> (status <span class="kw">IN</span> (<span class="st">'حضور'</span>, <span class="st">'غياب'</span>, <span class="st">'إجازة'</span>)),
  notes       <span class="ty">TEXT</span>,
  <span class="kw">UNIQUE</span> (student_id, date)
);

<span class="cm">-- 22. السجل الطبي للطلاب</span>
<span class="kw">CREATE TABLE</span> <span class="ty">health_records</span> (
  id               <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_id       <span class="ty">INTEGER</span> <span class="kw">UNIQUE REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  blood_type       <span class="ty">VARCHAR</span>(<span class="nu">5</span>),
  chronic_diseases <span class="ty">TEXT</span>,
  allergies        <span class="ty">TEXT</span>,
  emergency_notes  <span class="ty">TEXT</span>
);</pre>

<h3>1.5 الحسابات المدرسية والخزانة والمصروفات (Financial Ledger & Collections Schema)</h3>
<pre><span class="cm">-- 23. بنود المصروفات العامة الرسومية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">fee_categories</span> (
  id           <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  name         <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span>, <span class="cm">-- 'مصروفات دراسية', 'كتب مدرسية', 'حافلة'</span>
  is_mandatory <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">true</span>
);

<span class="cm">-- 24. تكاليف بنود الرسوم والصفوف</span>
<span class="kw">CREATE TABLE</span> <span class="ty">fee_assignments</span> (
  id                <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  academic_year_id  <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> academic_years(id) <span class="kw">ON DELETE CASCADE</span>,
  grade_id          <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> grades_lookup(id) <span class="kw">ON DELETE CASCADE</span>,
  fee_category_id   <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> fee_categories(id) <span class="kw">ON DELETE CASCADE</span>,
  amount            <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">NOT NULL CHECK</span> (amount >= <span class="nu">0</span>),
  discount_staff    <span class="ty">NUMERIC</span>(<span class="nu">5</span>,<span class="nu">2</span>) <span class="kw">DEFAULT</span> <span class="nu">0.00</span>, <span class="cm">-- نسبة خصم أبناء العاملين %</span>
  installments_count <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">1</span>,
  <span class="kw">UNIQUE</span> (academic_year_id, grade_id, fee_category_id)
);

<span class="cm">-- 25. المستحقات والمديونيات الفردية للطلاب</span>
<span class="kw">CREATE TABLE</span> <span class="ty">student_fees</span> (
  id                 <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_id         <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  fee_assignment_id  <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> fee_assignments(id),
  academic_year_id   <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> academic_years(id),
  total_amount       <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">NOT NULL</span>,
  discount_amount    <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">DEFAULT</span> <span class="nu">0.00</span>,
  paid_amount        <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">DEFAULT</span> <span class="nu">0.00</span>,
  remaining_amount   <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">GENERATED ALWAYS AS</span> (total_amount - discount_amount - paid_amount) <span class="kw">STORED</span>,
  <span class="kw">UNIQUE</span> (student_id, fee_assignment_id)
);

<span class="cm">-- 26. الأقساط الفرعية وجدولة السداد</span>
<span class="kw">CREATE TABLE</span> <span class="ty">fee_installments</span> (
  id              <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_fee_id  <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> student_fees(id) <span class="kw">ON DELETE CASCADE</span>,
  installment_number <span class="ty">INTEGER</span> <span class="kw">NOT NULL</span>,
  amount          <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">NOT NULL</span>,
  due_date        <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  status          <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">DEFAULT</span> <span class="st">'غير مسدد'</span> <span class="kw">CHECK</span> (status <span class="kw">IN</span> (<span class="st">'غير مسدد'</span>, <span class="st">'مسدد جزئيا'</span>, <span class="st">'مسدد بالكامل'</span>))
);

<span class="cm">-- 27. المقبوضات ووصولات التحصيل المالي</span>
<span class="kw">CREATE TABLE</span> <span class="ty">payments</span> (
  id               <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  receipt_number   <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span>, <span class="cm">-- توليد برمجياً عبر نمط موحد</span>
  student_id       <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE RESTRICT</span>,
  student_fee_id   <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> student_fees(id) <span class="kw">ON DELETE RESTRICT</span>,
  academic_year_id <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> academic_years(id),
  installment_number <span class="ty">INTEGER</span>,
  amount_paid      <span class="ty">NUMERIC</span>(<span class="nu">10</span>,<span class="nu">2</span>) <span class="kw">NOT NULL CHECK</span> (amount_paid > <span class="nu">0</span>),
  payment_date     <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW(),
  payment_method   <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">DEFAULT</span> <span class="st">'كاش'</span> <span class="kw">CHECK</span> (payment_method <span class="kw">IN</span> (<span class="st">'كاش'</span>, <span class="st">'حساب بنكي'</span>, <span class="st">'شبكة فوري'</span>)),
  bank_reference   <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  custom_attributes <span class="ty">JSONB</span> <span class="kw">DEFAULT</span> <span class="st">'{}'</span>::jsonb, <span class="cm">-- لمرونة المدفوعات</span>
  notes            <span class="ty">TEXT</span>,
  collected_by     <span class="ty">INTEGER</span>
);

<span class="cm">-- 28. بنود المصروفات التشغيلية والمشتريات</span>
<span class="kw">CREATE TABLE</span> <span class="ty">expense_categories</span> (
  id   <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  name <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span> <span class="cm">-- 'صيانة', 'فواتير ومنافع', 'قرطاسية وأوراق امتحانية'</span>
);

<span class="cm">-- 29. سجل الدفع والنفقات التشغيلية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">expenses</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  category_id   <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> expense_categories(id),
  amount        <span class="ty">NUMERIC</span>(<span class="nu">12</span>,<span class="nu">2</span>) <span class="kw">NOT NULL CHECK</span> (amount > <span class="nu">0</span>),
  date          <span class="ty">DATE</span> <span class="kw">NOT NULL</span>,
  description   <span class="ty">TEXT</span> <span class="kw">NOT NULL</span>,
  recipient     <span class="ty">VARCHAR</span>(<span class="nu">150</span>),
  invoice_url   <span class="ty">VARCHAR</span>(<span class="nu">500</span>),
  approved_by   <span class="ty">INTEGER</span>
);</pre>

<h3>1.6 الكنترول وأوراق الامتحانات والدرجات (Examinations & Control Schema)</h3>
<pre><span class="cm">-- 30. المواد الدراسية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">subjects</span> (
  id                  <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  grade_id            <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> grades_lookup(id) <span class="kw">ON DELETE CASCADE</span>,
  name                <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">NOT NULL</span>,
  max_oral            <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">0</span>,
  max_written         <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">0</span>,
  max_activity        <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">0</span>,
  max_research        <span class="ty">INTEGER</span> <span class="kw">DEFAULT</span> <span class="nu">0</span>,
  pass_mark           <span class="ty">INTEGER</span> <span class="kw">NOT NULL</span>,
  is_active           <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">true</span>,
  <span class="kw">UNIQUE</span> (grade_id, name)
);

<span class="cm">-- 31. الفترات الامتحانية والكنترولات</span>
<span class="kw">CREATE TABLE</span> <span class="ty">exam_sessions</span> (
  id                  <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  academic_year_id    <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> academic_years(id) <span class="kw">ON DELETE CASCADE</span>,
  term                <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">NOT NULL <span class="kw">CHECK</span></span> (term <span class="kw">IN</span> (<span class="st">'أول'</span>, <span class="st">'ثاني'</span>, <span class="st">'ملحق'</span>)),
  grade_id            <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> grades_lookup(id) <span class="kw">ON DELETE CASCADE</span>,
  name                <span class="ty">VARCHAR</span>(<span class="nu">150</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- 'رصد امتحانات نصف العام'</span>
  is_locked           <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>, <span class="cm">-- لقفل الرصد والاعتماد</span>
  results_announced   <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>,
  announced_at        <span class="ty">TIMESTAMPTZ</span>,
  announced_by        <span class="ty">INTEGER</span>
);

<span class="cm">-- 32. كشوف المناداة ومقار اللجان للطلاب</span>
<span class="kw">CREATE TABLE</span> <span class="ty">exam_seats</span> (
  id                  <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  exam_session_id      <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> exam_sessions(id) <span class="kw">ON DELETE CASCADE</span>,
  student_id           <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  seat_number          <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">NOT NULL</span>,
  committee_room       <span class="ty">VARCHAR</span>(<span class="nu">100</span>),
  <span class="kw">UNIQUE</span> (exam_session_id, student_id),
  <span class="kw">UNIQUE</span> (exam_session_id, seat_number)
);

<span class="cm">-- 33. السجل الشامل لدرجات الكنترول والرصد</span>
<span class="kw">CREATE TABLE</span> <span class="ty">grade_entries</span> (
  id              <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  exam_session_id <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> exam_sessions(id) <span class="kw">ON DELETE CASCADE</span>,
  student_id      <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  subject_id      <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> subjects(id) <span class="kw">ON DELETE CASCADE</span>,
  score_oral      <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">DEFAULT</span> <span class="st">'0'</span>, <span class="cm">-- يدعم 'غ', 'معفي', والدرجة الرقمية كـ string</span>
  score_written   <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">DEFAULT</span> <span class="st">'0'</span>,
  score_activity  <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">DEFAULT</span> <span class="st">'0'</span>,
  score_research  <span class="ty">VARCHAR</span>(<span class="nu">10</span>) <span class="kw">DEFAULT</span> <span class="st">'0'</span>,
  absence_code    <span class="ty">VARCHAR</span>(<span class="nu">10</span>), <span class="cm">-- 'غ', 'م', 'معفي'</span>
  total_score     <span class="ty">VARCHAR</span>(<span class="nu">15</span>),
  grade_letter    <span class="ty">VARCHAR</span>(<span class="nu">30</span>), <span class="cm">-- ممتاز، جيد جداً، جيد، إلخ</span>
  is_pass         <span class="ty">BOOLEAN</span>,
  is_locked       <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>, <span class="cm">-- يُقفل السجل عند توقيع رئيس الكنترول لمنع التعديل نهائياً</span>
  entered_by      <span class="ty">INTEGER</span>,
  entry_timestamp <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW(),
  <span class="kw">UNIQUE</span> (exam_session_id, student_id, subject_id)
);

<span class="cm">-- 34. كشوف النتائج والتقديرات والشهادات الصادرة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">results</span> (
  id               <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  exam_session_id  <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> exam_sessions(id) <span class="kw">ON DELETE CASCADE</span>,
  student_id       <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  enrollment_id    <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> student_enrollment(id),
  total_score      <span class="ty">NUMERIC</span>(<span class="nu">8</span>,<span class="nu">2</span>) <span class="kw">NOT NULL</span>,
  percentage       <span class="ty">NUMERIC</span>(<span class="nu">5</span>,<span class="nu">2</span>) <span class="kw">NOT NULL</span>,
  result_status    <span class="ty">VARCHAR</span>(<span class="nu">20</span>) <span class="kw">CHECK</span> (result_status <span class="kw">IN</span> (<span class="st">'ناجح'</span>, <span class="st">'راسب'</span>, <span class="st">'غائب'</span>)),
  published        <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">false</span>,
  published_by     <span class="ty">INTEGER</span>,
  published_at     <span class="ty">TIMESTAMPTZ</span>,
  <span class="kw">UNIQUE</span> (exam_session_id, student_id)
);

<span class="cm">-- 35. الشهادات والتقارير المطبوعة والموثقة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">certificates</span> (
  id               <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  student_id       <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> students(id) <span class="kw">ON DELETE CASCADE</span>,
  exam_session_id  <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> exam_sessions(id) <span class="kw">ON DELETE CASCADE</span>,
  cert_type        <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">CHECK</span> (cert_type <span class="kw">IN</span> (<span class="st">'شهادة تقدير'</span>, <span class="st">'شهادة نقل'</span>, <span class="st">'بيان درجات'</span>)),
  issue_date       <span class="ty">DATE</span> <span class="kw">DEFAULT</span> CURRENT_DATE,
  serial_number    <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span>,
  printed_by       <span class="ty">INTEGER</span>,
  printed_at       <span class="ty">TIMESTAMPTZ</span>,
  pdf_url          <span class="ty">VARCHAR</span>(<span class="nu">500</span>)
);

<span class="cm">-- 36. سجل تدقيق العمليات والعمليات الجوهرية للأنظمة</span>
<span class="kw">CREATE TABLE</span> <span class="ty">audit_log</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  user_id       <span class="ty">INTEGER</span>,
  action        <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- INSERT, UPDATE, DELETE</span>
  table_name    <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">NOT NULL</span>,
  record_id     <span class="ty">INTEGER</span> <span class="kw">NOT NULL</span>,
  old_values    <span class="ty">JSONB</span>,
  new_values    <span class="ty">JSONB</span>,
  role_used     <span class="ty">VARCHAR</span>(<span class="nu">50</span>),
  ip_address    <span class="ty">VARCHAR</span>(<span class="nu">45</span>),
  created_at    <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW()
);</pre>

<h3>1.7 الفهارس (Indexes) وقواعد تحسين الأداء</h3>
<pre><span class="cm">-- فهارس تحسين الاستعلام الفوري والبحث</span>
<span class="kw">CREATE INDEX</span> idx_students_national_id <span class="kw">ON</span> students(national_id);
<span class="kw">CREATE INDEX</span> idx_students_search_name <span class="kw">ON</span> students(full_name_ar);
<span class="kw">CREATE INDEX</span> idx_students_custom_attr <span class="kw">ON</span> students <span class="kw">USING</span> gin(custom_attributes); <span class="cm">-- فهرس GIN لتسريع البحث داخل الحقول المخصصة</span>
<span class="kw">CREATE INDEX</span> idx_enrollment_lookup <span class="kw">ON</span> student_enrollment(academic_year_id, grade_id, class_id);
<span class="kw">CREATE INDEX</span> idx_payments_by_student <span class="kw">ON</span> payments(student_id);
<span class="kw">CREATE INDEX</span> idx_grade_entries_lookup <span class="kw">ON</span> grade_entries(exam_session_id, student_id, subject_id);
<span class="kw">CREATE INDEX</span> idx_audit_log_query <span class="kw">ON</span> audit_log(table_name, record_id);</pre>


<!-- ===================== PHASE 2 ===================== -->
<div id="phase2" class="phase-header">
  <div class="ph-icon ph-purple">🔐</div>
  <div>
    <h2>المرحلة الثانية — منظومة الصلاحيات والأمان (RBAC & RLS)</h2>
    <p>مخطط الأمان التام وجداول الصلاحيات التفصيلية والمصفوفة والمكونات الوسيطة في الـ Backend.</p>
  </div>
</div>

<h3>2.1 جداول إدارة الأمان والصلاحيات (Security Tables)</h3>
<pre><span class="cm">-- 37. السجل المركزي للمستخدمين والتعمية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">users</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  username      <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span>,
  national_id   <span class="ty">VARCHAR</span>(<span class="nu">14</span>) <span class="kw">UNIQUE NOT NULL</span>,
  full_name     <span class="ty">VARCHAR</span>(<span class="nu">200</span>) <span class="kw">NOT NULL</span>,
  password_hash <span class="ty">VARCHAR</span>(<span class="nu">255</span>) <span class="kw">NOT NULL</span>, <span class="cm">-- تعمية بـ Crypt SHA-512</span>
  is_active     <span class="ty">BOOLEAN</span> <span class="kw">DEFAULT</span> <span class="nu">true</span>,
  last_login    <span class="ty">TIMESTAMPTZ</span>,
  created_at    <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW()
);

<span class="cm">-- 38. الأدوار الوظيفية داخل النظام</span>
<span class="kw">CREATE TABLE</span> <span class="ty">roles</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  role_name     <span class="ty">VARCHAR</span>(<span class="nu">50</span>) <span class="kw">UNIQUE NOT NULL</span>, <span class="cm">-- 'super_admin', 'head_control', 'accountant'</span>
  role_name_ar  <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">NOT NULL</span>,
  description   <span class="ty">TEXT</span>
);

<span class="cm">-- 39. الصلاحيات التفصيلية الدقيقة (Micro-Permissions)</span>
<span class="kw">CREATE TABLE</span> <span class="ty">permissions</span> (
  id          <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  perm_key    <span class="ty">VARCHAR</span>(<span class="nu">100</span>) <span class="kw">UNIQUE NOT NULL</span>, <span class="cm">-- 'enroll_student', 'input_grades', 'collect_fees', 'manage_custom_fields'</span>
  perm_name_ar <span class="ty">VARCHAR</span>(<span class="nu">200</span>) <span class="kw">NOT NULL</span>
);

<span class="cm">-- 40. العلاقات بين الأدوار والصلاحيات التفصيلية</span>
<span class="kw">CREATE TABLE</span> <span class="ty">role_permissions</span> (
  role_id       <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> roles(id) <span class="kw">ON DELETE CASCADE</span>,
  permission_id <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> permissions(id) <span class="kw">ON DELETE CASCADE</span>,
  <span class="kw">PRIMARY KEY</span> (role_id, permission_id)
);

<span class="cm">-- 41. إسناد الأدوار للمستخدمين</span>
<span class="kw">CREATE TABLE</span> <span class="ty">user_roles</span> (
  user_id <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> users(id) <span class="kw">ON DELETE CASCADE</span>,
  role_id <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> roles(id) <span class="kw">ON DELETE CASCADE</span>,
  <span class="kw">PRIMARY KEY</span> (user_id, role_id)
);

<span class="cm">-- 42. النطاق الأكاديمي والتحكم الإداري للمستخدمين (Stage-Scope Filter)</span>
<span class="kw">CREATE TABLE</span> <span class="ty">user_scopes</span> (
  id            <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  user_id       <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> users(id) <span class="kw">ON DELETE CASCADE</span>,
  role_id       <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> roles(id) <span class="kw">ON DELETE CASCADE</span>,
  stage_scope   <span class="ty">VARCHAR</span>(<span class="nu">30</span>) <span class="kw">DEFAULT</span> <span class="st">'الكل'</span> <span class="kw">CHECK</span> (stage_scope <span class="kw">IN</span> (<span class="st">'ابتدائي'</span>, <span class="st">'إعدادي'</span>, <span class="st">'ثانوي'</span>, <span class="st">'الكل'</span>)),
  <span class="kw">UNIQUE</span> (user_id, role_id)
);

<span class="cm">-- 43. جلسات الدخول الفعالة والتوكنات النشطة لإمكانية التبديد والتحقق الفوري</span>
<span class="kw">CREATE TABLE</span> <span class="ty">active_sessions</span> (
  id             <span class="ty">SERIAL</span> <span class="kw">PRIMARY KEY</span>,
  user_id        <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> users(id) <span class="kw">ON DELETE CASCADE</span>,
  active_role_id <span class="ty">INTEGER</span> <span class="kw">REFERENCES</span> roles(id),
  token_hash     <span class="ty">VARCHAR</span>(<span class="nu">255</span>) <span class="kw">NOT NULL</span>,
  ip_address     <span class="ty">VARCHAR</span>(<span class="nu">45</span>),
  user_agent     <span class="ty">TEXT</span>,
  last_activity  <span class="ty">TIMESTAMPTZ</span> <span class="kw">DEFAULT</span> NOW(),
  expires_at     <span class="ty">TIMESTAMPTZ</span> <span class="kw">NOT NULL</span>
);</pre>

<h3>2.2 مصفوفة الأمان التفصيلية ومفاتيح الصلاحيات</h3>
<table class="perm-table">
  <thead>
    <tr>
      <th>الوحدة الفرعية</th>
      <th>سوبر أدمن (Super Admin)</th>
      <th>رئيس كنترول (Head Control)</th>
      <th>مدخل بيانات (Data Entry)</th>
      <th>حسابات (Accountant)</th>
      <th>مشاهد (Viewer / Audit)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>شئون العاملين</td>
      <td><span class="p-full">إدارة كاملة</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-read">عرض فقط</span></td>
    </tr>
    <tr>
      <td>شئون الطلاب والقبول</td>
      <td><span class="p-full">إدارة كاملة</span></td>
      <td><span class="p-read">عرض فقط</span></td>
      <td><span class="p-entry">تسجيل وقيد</span></td>
      <td><span class="p-read">عرض وتفاصيل</span></td>
      <td><span class="p-read">عرض فقط</span></td>
    </tr>
    <tr>
      <td>إدارة وتعديل حقول الجداول</td>
      <td><span class="p-full">تعديل كامل</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
    </tr>
    <tr>
      <td>الحسابات والخزانة والرسوم</td>
      <td><span class="p-full">إدارة كاملة</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-full">إدارة كاملة</span></td>
      <td><span class="p-none">لا يوجد</span></td>
    </tr>
    <tr>
      <td>رصد درجات الكنترول</td>
      <td><span class="p-full">إدارة كاملة</span></td>
      <td><span class="p-full">رصد وقفل وإلغاء قفل</span></td>
      <td><span class="p-entry">رصد فقط</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
    </tr>
    <tr>
      <td>سجلات التدقيق والأمان</td>
      <td><span class="p-full">إدارة وقراءة كاملة</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
      <td><span class="p-none">لا يوجد</span></td>
    </tr>
  </tbody>
</table>


<!-- ===================== PHASE 3 ===================== -->
<div id="phase3" class="phase-header">
  <div class="ph-icon ph-blue">🔌</div>
  <div>
    <h2>المرحلة الثالثة — الـ Backend API ومكونات الـ Controllers</h2>
    <p>هيكل نقاط الوصول الشامل (85+ API Endpoint)، متضمناً معالجات الحقول الديناميكية الجديدة، مع كود حقيقي بالكامل.</p>
  </div>
</div>

<h3>3.1 جدول نقاط الوصول والـ Endpoints المضافة لتخصيص الحقول</h3>
<div class="card">
  <div class="api-list">
    <div class="api-row"><span class="method post">POST</span><span class="api-path">/api/auth/login</span><span class="api-desc">تسجيل الدخول وإرجاع التوكن والجلسة والأدوار</span><span class="api-perm">عامة</span></div>
    <div class="api-row"><span class="method get">GET</span><span class="api-path">/api/system/custom-fields/:entity_type</span><span class="api-desc">جلب قائمة الحقول المخصصة لجدول معين (الطلاب مثلاً)</span><span class="api-perm">auth</span></div>
    <div class="api-row"><span class="method post">POST</span><span class="api-path">/api/system/custom-fields</span><span class="api-desc">إدراج أو تعديل حقل مخصص وتحديد نوعه وشروطه</span><span class="api-perm">manage_custom_fields</span></div>
    <div class="api-row"><span class="method del">DELETE</span><span class="api-path">/api/system/custom-fields/:id</span><span class="api-desc">حذف حقل مخصص (سيتم حذفه من مواصفات العرض والـ validation)</span><span class="api-perm">manage_custom_fields</span></div>
    <div class="api-row"><span class="method post">POST</span><span class="api-path">/api/students</span><span class="api-desc">تسجيل طالب جديد (يتحقق تلقائياً من الحقول المخصصة ويخزنها بـ JSONB)</span><span class="api-perm">enroll_student</span></div>
  </div>
</div>

<h3>3.2 الشفرة البرمجية للـ Custom Fields Controller (التحكم والتخصيص الفوري)</h3>
<pre><span class="cm">// modules/system/custom_fields.controller.js</span>
<span class="kw">const</span> { pool } = <span class="fn">require</span>(<span class="st">'../../config/db'</span>);
<span class="kw">const</span> Joi = <span class="fn">require</span>(<span class="st">'joi'</span>);

<span class="cm">// جلب الحقول المخصصة النشطة لكيان معين لاستخدامها في بناء الفورم ديناميكياً</span>
<span class="kw">const</span> <span class="fn">getFieldsByEntity</span> = <span class="kw">async</span> (req, res) => {
  <span class="kw">const</span> { entity_type } = req.params;
  <span class="kw">try</span> {
    <span class="kw">const</span> { rows } = <span class="kw">await</span> pool.query(
      <span class="st">"SELECT * FROM system_custom_fields WHERE entity_type = $1 AND is_active = TRUE ORDER BY display_order ASC"</span>,
      [entity_type]
    );
    res.json({ success: <span class="nu">true</span>, data: rows });
  } <span class="kw">catch</span> (err) {
    res.status(<span class="nu">500</span>).json({ success: <span class="nu">false</span>, error: err.message });
  }
};

<span class="cm">// إضافة حقل مخصص جديد أو تعديل حقل قائم</span>
<span class="kw">const</span> <span class="fn">upsertCustomField</span> = <span class="kw">async</span> (req, res) => {
  <span class="kw">const</span> schema = Joi.object({
    id: Joi.number().optional(),
    entity_type: Joi.string().valid(<span class="st">'students'</span>, <span class="st">'staff'</span>, <span class="st">'classes'</span>, <span class="st">'payments'</span>).required(),
    field_name: Joi.string().pattern(<span class="kw">/^[a-z0-9_]+$/</span>).max(<span class="nu">50</span>).required(), <span class="cm">// التزام بـ snake_case</span>
    label_ar: Joi.string().max(<span class="nu">100</span>).required(),
    label_en: Joi.string().max(<span class="nu">100</span>).optional(),
    field_type: Joi.string().valid(<span class="st">'text'</span>, <span class="st">'number'</span>, <span class="st">'boolean'</span>, <span class="st">'select'</span>, <span class="st">'date'</span>).required(),
    options: Joi.array().items(Joi.string()).optional(), <span class="cm">// للـ SELECT فقط</span>
    is_required: Joi.boolean().default(<span class="nu">false</span>),
    display_order: Joi.number().integer().default(<span class="nu">0</span>)
  });

  <span class="kw">const</span> { error, value } = schema.validate(req.body);
  <span class="kw">if</span> (error) <span class="kw">return</span> res.status(<span class="nu">400</span>).json({ success: <span class="nu">false</span>, error: error.details[<span class="nu">0</span>].message });

  <span class="kw">try</span> {
    <span class="kw">const</span> { rows } = <span class="kw">await</span> pool.query(<span class="st">`
      INSERT INTO system_custom_fields 
        (entity_type, field_name, label_ar, label_en, field_type, options, is_required, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (entity_type, field_name) 
      DO UPDATE SET 
        label_ar = EXCLUDED.label_ar,
        label_en = EXCLUDED.label_en,
        field_type = EXCLUDED.field_type,
        options = EXCLUDED.options,
        is_required = EXCLUDED.is_required,
        display_order = EXCLUDED.display_order
      RETURNING *
    `</span>, [
      value.entity_type, value.field_name, value.label_ar, value.label_en,
      value.field_type, JSON.stringify(value.options || []), value.is_required, value.display_order
    ]);
    
    res.json({ success: <span class="nu">true</span>, data: rows[<span class="nu">0</span>], message: <span class="st">'تم حفظ الحقل المخصص وتحديث البنية بنجاح'</span> });
  } <span class="kw">catch</span> (err) {
    res.status(<span class="nu">500</span>).json({ success: <span class="nu">false</span>, error: err.message });
  }
};

module.exports = { getFieldsByEntity, upsertCustomField };</pre>


<!-- ===================== BUSINESS RULES ===================== -->
<div id="business-rules" class="phase-header">
  <div class="ph-icon ph-amber">🧠</div>
  <div>
    <h2>المرحلة الرابعة — منطق وقواعد الأعمال الحاكمة (Business Rules)</h2>
    <p>القوانين الستة الأساسية التي تمثل صمام أمان النظام والمطبقة على مستوى الكود وقاعدة البيانات.</p>
  </div>
</div>

<h3>Rule 1: ترقية الطلاب للعام الجديد (promoteStudents)</h3>
<div class="callout callout-teal">
  💡 يقوم منطق الترقية بنقل الطلاب الناجحين في العام الحالي إلى الصف التالي في العام الجديد، بينما يبقى الطلاب الراسبون في نفس الصف مع تغيير نوع قيدهم إلى 'عائد'، وتتغير حالة الطلاب خريجي آخر صف في المرحلة الثانوية إلى 'خريج غير نشط'.
</div>
<pre><span class="cm">// modules/students/students.service.js</span>
<span class="kw">const</span> { pool, withTransaction } = <span class="fn">require</span>(<span class="st">'../../config/db'</span>);

<span class="kw">const</span> <span class="fn">promoteStudents</span> = <span class="kw">async</span> (req, res) => {
  <span class="kw">const</span> client = req.dbClient;
  <span class="kw">const</span> { from_year_id, to_year_id } = req.body;

  <span class="kw">try</span> {
    <span class="kw">const</span> stats = <span class="kw">await</span> <span class="fn">withTransaction</span>(client, <span class="kw">async</span> (c) => {
      <span class="cm">// 1. جلب كافة الطلاب الناجحين في العام الحالي</span>
      <span class="kw">const</span> { rows: passed } = <span class="kw">await</span> c.query(<span class="st">`
        SELECT e.student_id, e.grade_id, e.class_id,
               gl.grade_number, gl.stage,
               (SELECT MAX(gl2.grade_number) FROM grades_lookup gl2 WHERE gl2.stage = gl.stage) AS max_grade_in_stage
        FROM student_enrollment e
        JOIN grades_lookup gl ON gl.id = e.grade_id
        JOIN results r ON r.student_id = e.student_id
          AND r.exam_session_id = (
            SELECT id FROM exam_sessions
            WHERE academic_year_id = $1 AND grade_id = e.grade_id
            ORDER BY id DESC LIMIT 1
          )
        WHERE e.academic_year_id = $1
          AND e.is_active = TRUE
          AND r.result_status = 'ناجح'
      `</span>, [from_year_id]);

      <span class="kw">let</span> promotedCount = <span class="nu">0</span>;
      <span class="kw">let</span> graduatedCount = <span class="nu">0</span>;

      <span class="kw">for</span> (<span class="kw">const</span> s <span class="kw">of</span> passed) {
        <span class="kw">if</span> (s.grade_number === s.max_grade_in_stage && s.stage === <span class="st">'ثانوي'</span>) {
          <span class="cm">// خريج — يتم تعطيل نشاط الطالب</span>
          <span class="kw">await</span> c.query(
            <span class="st">"UPDATE students SET is_active = FALSE WHERE id = $1"</span>, [s.student_id]
          );
          graduatedCount++;
        } <span class="kw">else</span> {
          <span class="cm">// تحديد الصف التالي</span>
          <span class="kw">let</span> nextGradeId = s.grade_id;
          <span class="kw">if</span> (s.grade_number === s.max_grade_in_stage) {
            <span class="cm">// الانتقال إلى أول صف في المرحلة التالية</span>
            <span class="kw">const</span> nextStageName = s.stage === <span class="st">'ابتدائي'</span> ? <span class="st">'إعدادي'</span> : <span class="st">'ثانوي'</span>;
            <span class="kw">const</span> { rows: nextG } = <span class="kw">await</span> c.query(<span class="st">`
              SELECT id FROM grades_lookup 
              WHERE stage_id = (SELECT id FROM stages_lookup WHERE stage_name = $1)
                AND grade_number = 1
            `</span>, [nextStageName]);
            nextGradeId = nextG[<span class="nu">0</span>]?.id || s.grade_id;
          } <span class="kw">else</span> {
            <span class="cm">// الترقية للصف التالي داخل نفس المرحلة</span>
            <span class="kw">const</span> { rows: nextG } = <span class="kw">await</span> c.query(<span class="st">`
              SELECT id FROM grades_lookup 
              WHERE stage_id = (SELECT stage_id FROM grades_lookup WHERE id = $1)
                AND grade_number = $2
            `</span>, [s.grade_id, s.grade_number + <span class="nu">1</span>]);
            nextGradeId = nextG[<span class="nu">0</span>]?.id || s.grade_id;
          }

          <span class="cm">// إدراج القيد الجديد للعام الدراسي الجديد</span>
          <span class="kw">await</span> c.query(<span class="st">`
            INSERT INTO student_enrollment (student_id, academic_year_id, grade_id, class_id, enrollment_type)
            VALUES ($1, $2, $3, $4, 'محول')
            ON CONFLICT (student_id, academic_year_id) DO NOTHING
          `</span>, [s.student_id, to_year_id, nextGradeId, s.class_id]);
          promotedCount++;
        }
      }

      <span class="cm">// 2. معالجة الطلاب الراسبين (قيد مكرر في نفس الصف الدراسي كـ 'عائد')</span>
      <span class="kw">const</span> { rows: repeated } = <span class="kw">await</span> c.query(<span class="st">`
        SELECT e.student_id, e.grade_id, e.class_id
        FROM student_enrollment e
        JOIN results r ON r.student_id = e.student_id
        WHERE e.academic_year_id = $1 AND e.is_active = TRUE AND r.result_status = 'راسب'
      `</span>, [from_year_id]);

      <span class="kw">for</span> (<span class="kw">const</span> s <span class="kw">of</span> repeated) {
        <span class="kw">await</span> c.query(<span class="st">`
          INSERT INTO student_enrollment (student_id, academic_year_id, grade_id, class_id, enrollment_type)
          VALUES ($1, $2, $3, $4, 'عائد')
          ON CONFLICT (student_id, academic_year_id) DO NOTHING
        `</span>, [s.student_id, to_year_id, s.grade_id, s.class_id]);
      }

      <span class="kw">return</span> { promotedCount, graduatedCount, repeatedCount: repeated.length };
    });

    res.json({ success: <span class="nu">true</span>, stats });
  } <span class="kw">catch</span> (err) {
    res.status(<span class="nu">500</span>).json({ error: err.message });
  }
};</pre>

<h3>Rule 2: التحقق التلقائي والتحجيم للحقول المخصصة ديناميكياً (Dynamic Validation Rule)</h3>
<div class="callout callout-teal">
  💡 <strong>آلية الأمان للتحقق من الحقول:</strong> لمنع إدراج بيانات عشوائية أو ناقصة في الـ JSONB، تقوم هذه الدالة بقراءة كافة القوانين والشروط المفروضة على الحقول المخصصة وتطبيق التحقق (التحقق من حتمية الحقل، كونه رقماً، أو خياراً صالحاً من قائمة الخيارات).
</div>
<pre><span class="cm">// middleware/dynamic_fields.middleware.js</span>
<span class="kw">const</span> { pool } = <span class="fn">require</span>(<span class="st">'../config/db'</span>);

<span class="kw">const</span> <span class="fn">validateCustomAttributes</span> = (entityType) => <span class="kw">async</span> (req, res, next) => {
  <span class="kw">const</span> customAttributes = req.body.custom_attributes || {};

  <span class="kw">try</span> {
    <span class="cm">// جلب القوانين النشطة لهذا الكيان من قاعدة البيانات</span>
    <span class="kw">const</span> { rows: rules } = <span class="kw">await</span> pool.query(
      <span class="st">"SELECT * FROM system_custom_fields WHERE entity_type = $1 AND is_active = TRUE"</span>,
      [entityType]
    );

    <span class="kw">for</span> (<span class="kw">const</span> rule <span class="kw">of</span> rules) {
      <span class="kw">const</span> val = customAttributes[rule.field_name];

      <span class="cm">// 1. التحقق من الإجبارية (Required)</span>
      <span class="kw">if</span> (rule.is_required && (val === undefined || val === null || val === <span class="st">''</span>)) {
        <span class="kw">return</span> res.status(<span class="nu">400</span>).json({
          success: <span class="nu">false</span>,
          error: <span class="st">`الحقل المخصص [</span>${rule.label_ar}<span class="st">] مطلوب ولا يمكن تركه فارغاً.`</span>
        });
      }

      <span class="kw">if</span> (val !== undefined && val !== null && val !== <span class="st">''</span>) {
        <span class="cm">// 2. التحقق من النوع الرقمي</span>
        <span class="kw">if</span> (rule.field_type === <span class="st">'number'</span> && isNaN(Number(val))) {
          <span class="kw">return</span> res.status(<span class="nu">400</span>).json({
            success: <span class="nu">false</span>,
            error: <span class="st">`قيمة الحقل [</span>${rule.label_ar}<span class="st">] يجب أن تكون رقمية.`</span>
          });
        }
        <span class="cm">// 3. التحقق من مطابقة خيارات الـ SELECT</span>
        <span class="kw">if</span> (rule.field_type === <span class="st">'select'</span>) {
          <span class="kw">const</span> allowedOptions = rule.options;
          <span class="kw">if</span> (!allowedOptions.includes(val)) {
            <span class="kw">return</span> res.status(<span class="nu">400</span>).json({
              success: <span class="nu">false</span>,
              error: <span class="st">`القيمة المدخلة في [</span>${rule.label_ar}<span class="st">] غير متوافقة مع الخيارات المعتمدة.`</span>
            });
          }
        }
      }
    }

    next();
  } <span class="kw">catch</span> (err) {
    res.status(<span class="nu">500</span>).json({ success: <span class="nu">false</span>, error: err.message });
  }
};

module.exports = { validateCustomAttributes };</pre>

<h3>Rule 3: جدولة وتقسيم الأقساط تلقائياً (generateFeeInstallments)</h3>
<div class="callout callout-blue">
  💡 عند تكليف رسوم دراسية بـ <code>installments_count &gt; 1</code>، يتم تقسيم إجمالي المستحق تلقائياً إلى تواريخ استحقاق متساوية بفوارق شهرية.
</div>
<pre><span class="cm">// utils/promotion.util.js</span>
<span class="kw">const</span> <span class="fn">generateFeeInstallments</span> = <span class="kw">async</span> (client, studentFeeId, installmentsCount, totalAmount, startDate) => {
  <span class="kw">if</span> (installmentsCount <= <span class="nu">1</span>) <span class="kw">return</span>;

  <span class="kw">const</span> installmentAmount = (totalAmount / installmentsCount).toFixed(<span class="nu">2</span>);
  <span class="kw">const</span> start = <span class="kw">new</span> <span class="ty">Date</span>(startDate);

  <span class="kw">for</span> (<span class="kw">let</span> i = <span class="nu">0</span>; i < installmentsCount; i++) {
    <span class="kw">const</span> dueDate = <span class="kw">new</span> <span class="ty">Date</span>(start);
    dueDate.setMonth(dueDate.getMonth() + i); <span class="cm">// الفارق شهر واحد بين الأقساط</span>

    <span class="kw">await</span> client.query(<span class="st">`
      INSERT INTO fee_installments (student_fee_id, installment_number, amount, due_date, status)
      VALUES ($1, $2, $3, $4, 'غير مسدد')
    `</span>, [studentFeeId, i + <span class="nu">1</span>, installmentAmount, dueDate.toISOString().split(<span class="st">'T'</span>)[<span class="nu">0</span>]]);
  }
};

module.exports = { generateFeeInstallments };</pre>

<h3>Rule 4: التحقق التلقائي وقفل درجات الكنترول لمنع التعديل (gradeLockCheck)</h3>
<div class="callout callout-red">
  ⚠️ تمنع هذه القاعدة تعديل أو تحديث أي درجة تم رصدها بمجرد أن يقوم رئيس الكنترول أو السوبر أدمن باعتمادها وتفعيل قفل السجل في الجدول، أو إذا تم قفل الجلسة الامتحانية بالكامل.
</div>
<pre><span class="cm">// triggers/grade_lock_trigger.sql</span>
<span class="kw">CREATE OR REPLACE FUNCTION</span> <span class="fn">fn_check_grade_lock</span>()
<span class="kw">RETURNS TRIGGER LANGUAGE plpgsql AS</span> $$
<span class="kw">BEGIN</span>
  <span class="cm">-- التحقق من حالة القفل في سجل الدرجات نفسه</span>
  <span class="kw">IF</span> OLD.is_locked = TRUE <span class="kw">THEN</span>
    <span class="kw">RAISE EXCEPTION</span> <span class="st">'لا يمكن تعديل أو حذف درجة معتمدة ومقفلة من رئيس الكنترول.'</span>;
  <span class="kw">END IF</span>;

  <span class="cm">-- التحقق من حالة قفل الجلسة الامتحانية بالكامل</span>
  <span class="kw">IF</span> (SELECT is_locked FROM exam_sessions WHERE id = OLD.exam_session_id) = TRUE <span class="kw">THEN</span>
    <span class="kw">RAISE EXCEPTION</span> <span class="st">'الفترة الامتحانية مقفلة تماماً، لا يمكن إجراء أي تعديلات.'</span>;
  <span class="kw">END IF</span>;

  <span class="kw">RETURN</span> NEW;
<span class="kw">END</span>;
$$;

<span class="kw">CREATE TRIGGER</span> trg_check_grade_lock
  <span class="kw">BEFORE UPDATE OR DELETE ON</span> grade_entries
  <span class="kw">FOR EACH ROW EXECUTE FUNCTION</span> <span class="fn">fn_check_grade_lock</span>();</pre>

<h3>Rule 5: محرك التدقيق التلقائي (Automated System Auditor)</h3>
<div class="callout callout-teal">
  💡 يقوم هذا التريجر بقراءة متغيرات الجلسة للاتصال الحالي (مستخدم النطاق النشط) ويسجل التغييرات الكاملة (القيم القديمة والحديثة كـ JSONB) في جدول التدقيق تلقائياً.
</div>
<pre><span class="cm">// triggers/audit_log_trigger.sql</span>
<span class="kw">CREATE OR REPLACE FUNCTION</span> <span class="fn">fn_audit_logger</span>()
<span class="kw">RETURNS TRIGGER LANGUAGE plpgsql AS</span> $$
<span class="kw">DECLARE</span>
  curr_user_id INTEGER;
  curr_role VARCHAR;
<span class="kw">BEGIN</span>
  <span class="cm">-- جلب المتغيرات للجلسة الحالية</span>
  <span class="kw">BEGIN</span>
    curr_user_id := NULLIF(current_setting(<span class="st">'app.current_user_id'</span>, <span class="kw">true</span>), <span class="st">''</span>)::INTEGER;
    curr_role := current_setting(<span class="st">'app.current_role'</span>, <span class="kw">true</span>);
  <span class="kw">EXCEPTION WHEN OTHERS THEN</span>
    curr_user_id := NULL;
    curr_role := 'نظام داخلي';
  <span class="kw">END</span>;

  <span class="kw">INSERT INTO</span> audit_log (user_id, action, table_name, record_id, old_values, new_values, role_used, ip_address)
  <span class="kw">VALUES</span> (
    curr_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != <span class="st">'INSERT'</span> <span class="kw">THEN</span> row_to_json(OLD)::JSONB <span class="kw">ELSE</span> <span class="kw">NULL END</span>,
    CASE WHEN TG_OP != <span class="st">'DELETE'</span> <span class="kw">THEN</span> row_to_json(NEW)::JSONB <span class="kw">ELSE</span> <span class="kw">NULL END</span>,
    curr_role,
    inet_client_addr()::text
  );

  <span class="kw">RETURN</span> COALESCE(NEW, OLD);
<span class="kw">END</span>;
$$;

<span class="cm">-- إسناد التريجر لكافة الجداول الحساسة بالمنظومة</span>
<span class="kw">CREATE TRIGGER</span> trg_audit_students <span class="kw">AFTER INSERT OR UPDATE OR DELETE ON</span> students <span class="kw">FOR EACH ROW EXECUTE FUNCTION</span> <span class="fn">fn_audit_logger</span>();
<span class="kw">CREATE TRIGGER</span> trg_audit_payments <span class="kw">AFTER INSERT OR UPDATE OR DELETE ON</span> payments <span class="kw">FOR EACH ROW EXECUTE FUNCTION</span> <span class="fn">fn_audit_logger</span>();
<span class="kw">CREATE TRIGGER</span> trg_audit_grades <span class="kw">AFTER INSERT OR UPDATE OR DELETE ON</span> grade_entries <span class="kw">FOR EACH ROW EXECUTE FUNCTION</span> <span class="fn">fn_audit_logger</span>();</pre>

<h3>Rule 6: توليد رقم إيصال التحصيل التلقائي والفريد والتحقق المالي</h3>
<div class="callout callout-amber">
  💡 لضمان الموثوقية المالية التامة وصحة سجل الحسابات، يمنع هذا التريجر قبول أي عملية دفع تتخطى المبلغ المتبقي، ويقوم تلقائياً بتحديث سجل <code>paid_amount</code> في حساب الطالب.
</div>
<pre><span class="cm">// triggers/finance_validators.sql</span>
<span class="kw">CREATE OR REPLACE FUNCTION</span> <span class="fn">fn_validate_and_pay_fee</span>()
<span class="kw">RETURNS TRIGGER LANGUAGE plpgsql AS</span> $$
<span class="kw">DECLARE</span>
  v_remaining NUMERIC(10,2);
  v_year VARCHAR;
<span class="kw">BEGIN</span>
  <span class="cm">-- 1. توليد رقم الإيصال التلقائي بشكل تسلسلي للعام الدراسي الحالي</span>
  SELECT year_label <span class="kw">INTO</span> v_year FROM academic_years WHERE id = NEW.academic_year_id;
  NEW.receipt_number := <span class="st">'REC-'</span> || REPLACE(v_year, <span class="st">'/'</span>, <span class="st">'-'</span>) || <span class="st">'-'</span> || LPAD(nextval('payments_id_seq')::text, <span class="nu">6</span>, <span class="st">'0'</span>);

  <span class="cm">-- 2. التحقق من المبلغ والمديونية المتبقية</span>
  SELECT remaining_amount <span class="kw">INTO</span> v_remaining FROM student_fees WHERE id = NEW.student_fee_id;
  <span class="kw">IF</span> NEW.amount_paid > v_remaining <span class="kw">THEN</span>
    <span class="kw">RAISE EXCEPTION</span> <span class="st">'فشل الدفع: المبلغ المدفوع (%) يتجاوز إجمالي المستحق المتبقي (%)'</span>, NEW.amount_paid, v_remaining;
  <span class="kw">END IF</span>;

  <span class="cm">-- 3. تحديث مبالغ الدفع التراكمية تلقائياً في حساب الطالب</span>
  <span class="kw">UPDATE</span> student_fees 
  <span class="kw">SET</span> paid_amount = paid_amount + NEW.amount_paid
  <span class="kw">WHERE</span> id = NEW.student_fee_id;

  <span class="kw">RETURN</span> NEW;
<span class="kw">END</span>;
$$;

<span class="kw">CREATE TRIGGER</span> trg_validate_and_pay_fee
  <span class="kw">BEFORE INSERT ON</span> payments
  <span class="kw">FOR EACH ROW EXECUTE FUNCTION</span> <span class="fn">fn_validate_and_pay_fee</span>();</pre>


<!-- ===================== PHASE 4 ===================== -->
<div id="phase4" class="phase-header">
  <div class="ph-icon ph-teal">🖥️</div>
  <div>
    <h2>المرحلة الخامسة — واجهات المستخدم ورسم وتخصيص الحقول (React v18 & RTL Setup)</h2>
    <p>التصميم التفصيلي لواجهات الاستخدام للغة العربية RTL وإعدادات الشاشات التفاعلية والكنترول، بالإضافة إلى مصمم الحقول الديناميكي المضاف حديثاً.</p>
  </div>
</div>

<h3>5.1 شاشة مصمم الحقول المخصصة والمعدل الديناميكي (Custom Fields Designer Preview)</h3>
<div class="mockup">
  <div class="mockup-bar">
    <div class="mockup-dot" style="background:#FF5F56"></div>
    <div class="mockup-dot" style="background:#FFBD2E"></div>
    <div class="mockup-dot" style="background:#27C93F"></div>
    <span style="font-size:11px;color:#888;margin-right:8px">لوحة تحكم السوبر أدمن — مصمم الحقول وتخصيص جداول قاعدة البيانات</span>
  </div>
  <div class="m-sidebar">
    <div class="m-side">
      <div style="font-size:14px;font-weight:800;margin-bottom:4px;color:#fff">🏫 مدرسة الأورمان الثانوية</div>
      <div style="font-size:10px;opacity:0.7;margin-bottom:12px">العام: 2025/2026 | حكومي عربي</div>
      <div class="m-nav-item">📈 مؤشرات الأداء</div>
      <div class="m-nav-item">👥 شئون الطلاب والقبول</div>
      <div class="m-nav-item">📋 الكنترول والامتحانات</div>
      <div class="m-nav-item active">⚙️ تخصيص حقول الجداول</div>
      <div class="m-nav-item">💰 الخزينة والرسوم المالية</div>
    </div>
    <div class="m-content">
      <div class="m-header">
        <div class="m-title">⚙️ إدارة وتعديل الحقول المخصصة ديناميكياً</div>
        <button class="m-btn">+ إضافة حقل مخصص جديد</button>
      </div>

      <div style="margin-bottom: 15px;">
        <span style="font-size: 11px; color:#666;">اختر الجدول المراد تعديله:</span>
        <select class="m-input" style="width: 200px; display: inline-block; margin-right: 10px;">
          <option value="students">جدول الطلاب (students)</option>
          <option value="staff">جدول الموظفين (staff)</option>
          <option value="classes">جدول الفصول (classes)</option>
          <option value="payments">جدول المدفوعات (payments)</option>
        </select>
      </div>

      <table class="m-table" style="width:100%">
        <thead>
          <tr>
            <th>اسم الحقل (كود برمجى)</th>
            <th>اسم الحقل المكتوب (عربي)</th>
            <th>نوع الحقل</th>
            <th>خيارات الحقل (للـ Select)</th>
            <th>إجباري؟</th>
            <th>الترتيب</th>
            <th>التحكم</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>bus_route_name</code></td>
            <td>خط أوتوبيس الطالب</td>
            <td><span class="m-chip m-chip-blue">قائمة Select</span></td>
            <td>"أكتوبر", "الهرم", "المعادي"</td>
            <td><span class="m-chip m-chip-red">نعم</span></td>
            <td>1</td>
            <td><button class="m-btn" style="padding: 4px 8px; font-size:10px;">تعديل</button></td>
          </tr>
          <tr>
            <td><code>french_level</code></td>
            <td>مستوى اللغة الفرنسية (ثانية)</td>
            <td><span class="m-chip m-chip-amber">نصي Text</span></td>
            <td>—</td>
            <td>لا</td>
            <td>2</td>
            <td><button class="m-btn" style="padding: 4px 8px; font-size:10px;">تعديل</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<h3>5.2 المكون التفاعلي الكامل لتعديل وإضافة الحقول وتوليدها (Custom Fields Manager Component)</h3>
<pre><span class="cm">// modules/system/CustomFieldManager.jsx</span>
<span class="kw">import</span> React, { useState, useEffect } <span class="kw">from</span> <span class="st">'react'</span>;
<span class="kw">import</span> { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, 
  FormControlLabel, Checkbox, Alert, Chip, IconButton 
} <span class="kw">from</span> <span class="st">'@mui/material'</span>;
<span class="kw">import</span> { Edit, Trash } <span class="kw">from</span> <span class="st">'lucide-react'</span>;
<span class="kw">import</span> api <span class="kw">from</span> <span class="st">'../../lib/axios'</span>;

<span class="kw">export default function</span> <span class="fn">CustomFieldManager</span>({ entityType = <span class="st">'students'</span> }) {
  <span class="kw">const</span> [fields, setFields] = <span class="fn">useState</span>([]);
  <span class="kw">const</span> [open, setOpen] = <span class="fn">useState</span>(<span class="kw">false</span>);
  <span class="kw">const</span> [error, setError] = <span class="fn">useState</span>(<span class="kw">null</span>);
  <span class="kw">const</span> [form, setForm] = <span class="fn">useState</span>({
    id: <span class="kw">null</span>,
    entity_type: entityType,
    field_name: <span class="st">''</span>,
    label_ar: <span class="st">''</span>,
    label_en: <span class="st">''</span>,
    field_type: <span class="st">'text'</span>,
    options: [],
    is_required: <span class="kw">false</span>,
    display_order: <span class="nu">0</span>
  });
  <span class="kw">const</span> [optionInput, setOptionInput] = <span class="fn">useState</span>(<span class="st">''</span>);

  <span class="kw">const</span> <span class="fn">fetchFields</span> = <span class="kw">async</span> () => {
    <span class="kw">try</span> {
      <span class="kw">const</span> res = <span class="kw">await</span> api.<span class="fn">get</span>(<span class="st">`/system/custom-fields/</span>${entityType}<span class="st">`</span>);
      setFields(res.data.data);
    } <span class="kw">catch</span> (err) {
      setError(<span class="st">'فشل جلب الحقول المخصصة من الخادم.'</span>);
    }
  };

  <span class="fn">useEffect</span>(() => {
    <span class="fn">fetchFields</span>();
  }, [entityType]);

  <span class="kw">const</span> <span class="fn">handleOpen</span> = (field = <span class="kw">null</span>) => {
    <span class="kw">if</span> (field) {
      setForm({ ...field, options: <span class="ty">Array</span>.isArray(field.options) ? field.options : JSON.parse(field.options || <span class="st">'[]'</span>) });
    } <span class="kw">else</span> {
      setForm({
        id: <span class="kw">null</span>,
        entity_type: entityType,
        field_name: <span class="st">''</span>,
        label_ar: <span class="st">' '</span>,
        label_en: <span class="st">''</span>,
        field_type: <span class="st">'text'</span>,
        options: [],
        is_required: <span class="kw">false</span>,
        display_order: <span class="nu">0</span>
      });
    }
    setOpen(<span class="kw">true</span>);
  };

  <span class="kw">const</span> <span class="fn">handleSave</span> = <span class="kw">async</span> () => {
    <span class="kw">try</span> {
      <span class="kw">await</span> api.<span class="fn">post</span>(<span class="st">'/system/custom-fields'</span>, form);
      setOpen(<span class="kw">false</span>);
      <span class="fn">fetchFields</span>();
    } <span class="kw">catch</span> (err) {
      setError(err.response?.data?.error || <span class="st">'خطأ أثناء عملية الحفظ.'</span>);
    }
  };

  <span class="kw">const</span> <span class="fn">handleAddOption</span> = () => {
    <span class="kw">if</span> (optionInput.trim() && !form.options.includes(optionInput.trim())) {
      setForm(prev => ({ ...prev, options: [...prev.options, optionInput.trim()] }));
      setOptionInput(<span class="st">''</span>);
    }
  };

  <span class="kw">const</span> <span class="fn">handleDeleteOption</span> = (index) => {
    setForm(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== index) }));
  };

  <span class="kw">return</span> (
    &lt;<span class="ty">Box</span> sx={{ p: <span class="nu">3</span> }}&gt;
      &lt;<span class="ty">Box</span> display=<span class="st">"flex"</span> justifyContent=<span class="st">"space-between"</span> alignItems=<span class="st">"center"</span> mb={<span class="nu">2</span>}&gt;
        &lt;<span class="ty">Typography</span> variant=<span class="st">"h5"</span> fontWeight=<span class="st">"bold"</span>&gt;إدارة وتعديل الحقول المخصصة بالجدول&lt;/<span class="ty">Typography</span>&gt;
        &lt;<span class="ty">Button</span> variant=<span class="st">"contained"</span> color=<span class="st">"primary"</span> onClick={() => handleOpen()}&gt;
          إضافة حقل مخصص جديد +
        &lt;/<span class="ty">Button</span>&gt;
      &lt;/<span class="ty">Box</span>&gt;

      {error && &lt;<span class="ty">Alert</span> severity=<span class="st">"error"</span> sx={{ mb: <span class="nu">2</span> }}&gt;{error}&lt;/<span class="ty">Alert</span>&gt;

      &lt;<span class="ty">TableContainer</span> component={Paper}&gt;
        &lt;<span class="ty">Table</span> size=<span class="st">"small"</span>&gt;
          &lt;<span class="ty">TableHead</span>&gt;
            &lt;<span class="ty">TableRow</span>&gt;
              &lt;<span class="ty">TableCell</span>&gt;اسم الحقل البرمجي&lt;/<span class="ty">TableCell</span>&gt;
              &lt;<span class="ty">TableCell</span>&gt;التسمية العربية&lt;/<span class="ty">TableCell</span>&gt;
              &lt;<span class="ty">TableCell</span>&gt;نوع المدخل&lt;/<span class="ty">TableCell</span>&gt;
              &lt;<span class="ty">TableCell</span>&gt;الخيارات المتاحة&lt;/<span class="ty">TableCell</span>&gt;
              &lt;<span class="ty">TableCell</span> align=<span class="st">"center"</span>&gt;مطلوب؟&lt;/<span class="ty">TableCell</span>&gt;
              &lt;<span class="ty">TableCell</span> align=<span class="st">"center"</span>&gt;الترتيب البصري&lt;/<span class="ty">TableCell</span>&gt;
              &lt;<span class="ty">TableCell</span> align=<span class="st">"center"</span>&gt;تحكم&lt;/<span class="ty">TableCell</span>&gt;
            &lt;/<span class="ty">TableRow</span>&gt;
          &lt;/<span class="ty">TableHead</span>&gt;
          &lt;<span class="ty">TableBody</span>&gt;
            {fields.<span class="fn">map</span>(f => (
              &lt;<span class="ty">TableRow</span> key={f.id}&gt;
                &lt;<span class="ty">TableCell</span>&gt;&lt;code&gt;{f.field_name}&lt;/code&gt;&lt;/<span class="ty">TableCell</span>&gt;
                &lt;<span class="ty">TableCell</span>&gt;{f.label_ar}&lt;/<span class="ty">TableCell</span>&gt;
                &lt;<span class="ty">TableCell</span>&gt;&lt;span class="tag pk"&gt;{f.field_type}&lt;/span&gt;&lt;/<span class="ty">TableCell</span>&gt;
                &lt;<span class="ty">TableCell</span>&gt;{f.field_type === <span class="st">'select'</span> ? JSON.stringify(f.options) : <span class="st">'-'</span>}&lt;/<span class="ty">TableCell</span>&gt;
                &lt;<span class="ty">TableCell</span> align=<span class="st">"center"</span>&gt;{f.is_required ? <span class="st">'نعم ⚠️'</span> : <span class="st">'لا'</span>}&lt;/<span class="ty">TableCell</span>&gt;
                &lt;<span class="ty">TableCell</span> align=<span class="st">"center"</span>&gt;{f.display_order}&lt;/<span class="ty">TableCell</span>&gt;
                &lt;<span class="ty">TableCell</span> align=<span class="st">"center"</span>&gt;
                  &lt;<span class="ty">IconButton</span> onClick={() => handleOpen(f)}&gt;&lt;<span class="ty">Edit</span> size={<span class="nu">16</span>} /&gt;&lt;/<span class="ty">IconButton</span>&gt;
                &lt;/<span class="ty">TableCell</span>&gt;
              &lt;/<span class="ty">TableRow</span>&gt;
            ))}
          &lt;/<span class="ty">TableBody</span>&gt;
        &lt;/<span class="ty">Table</span>&gt;
      &lt;/<span class="ty">TableContainer</span>&gt;

      &lt;{/* نافذة تعديل وإنشاء الحقل المخصص */}
      &lt;<span class="ty">Dialog</span> open={open} onClose={() => setOpen(<span class="kw">false</span>)} fullWidth maxWidth=<span class="st">"sm"</span>&gt;
        &lt;<span class="ty">DialogTitle</span>&gt;{form.id ? <span class="st">'تعديل خصائص الحقل'</span> : <span class="st">'إنشاء حقل مخصص جديد بالجدول'</span>}&lt;/<span class="ty">DialogTitle</span>&gt;
        &lt;<span class="ty">DialogContent</span>&gt;
          &lt;<span class="ty">TextField</span>
            margin=<span class="st">"dense"</span> label=<span class="st">"اسم الحقل البرمجي (مثال: secondary_lang)"</span>
            value={form.field_name} disabled={!!form.id}
            onChange={(e) => setForm({ ...form, field_name: e.target.value })}
          /&gt;
          &lt;<span class="ty">TextField</span>
            margin=<span class="st">"dense"</span> label=<span class="st">"الاسم الظاهر بالعربية"</span> value={form.label_ar}
            onChange={(e) => setForm({ ...form, label_ar: e.target.value })}
          /&gt;
          &lt;<span class="ty">FormControl</span> fullWidth margin=<span class="st">"dense"</span>&gt;
            &lt;<span class="ty">InputLabel</span>&gt;نوع الحقل&lt;/<span class="ty">InputLabel</span>&gt;
            &lt;<span class="ty">Select</span> value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })}&gt;
              &lt;<span class="ty">MenuItem</span> value=<span class="st">"text"</span>&gt;نص عادي Text&lt;/<span class="ty">MenuItem</span>&gt;
              &lt;<span class="ty">MenuItem</span> value=<span class="st">"number"</span>&gt;رقمي Number&lt;/<span class="ty">MenuItem</span>&gt;
              &lt;<span class="ty">MenuItem</span> value=<span class="st">"boolean"</span>&gt;منطقي نعم/لا Switch&lt;/<span class="ty">MenuItem</span>&gt;
              &lt;<span class="ty">MenuItem</span> value=<span class="st">"select"</span>&gt;قائمة خيارات متوفرة Select&lt;/<span class="ty">MenuItem</span>&gt;
              &lt;<span class="ty">MenuItem</span> value=<span class="st">"date"</span>&gt;تاريخ جهة الصدور Date&lt;/<span class="ty">MenuItem</span>&gt;
            &lt;/<span class="ty">Select</span>&gt;
          &lt;/<span class="ty">FormControl</span>&gt;

          {form.field_type === <span class="st">'select'</span> && (
            &lt;<span class="ty">Box</span> sx={{ border: <span class="st">'1px solid #ddd'</span>, p: <span class="nu">2</span>, my: <span class="nu">2</span>, borderRadius: <span class="nu">1</span> }}&gt;
              &lt;<span class="ty">Typography</span> variant=<span class="st">"subtitle2"</span> mb={<span class="nu">1</span>}&gt;قائمة الخيارات المعتمدة:&lt;/<span class="ty">Typography</span>&gt;
              &lt;<span class="ty">Box</span> display=<span class="st">"flex"</span> gap={<span class="nu">1</span>} mb={<span class="nu">1</span>}&gt;
                &lt;<span class="ty">TextField</span> size=<span class="st">"small"</span> placeholder=<span class="st">"أضف خياراً..."</span> value={optionInput} onChange={(e) => setOptionInput(e.target.value)} /&gt;
                &lt;<span class="ty">Button</span> variant=<span class="st">"outlined"</span> onClick={handleAddOption}&gt;إضافة&lt;/<span class="ty">Button</span>&gt;
              &lt;/<span class="ty">Box</span>&gt;
              &lt;<span class="ty">Box</span> display=<span class="st">"flex"</span> gap={<span class="nu">1</span>} flexWrap=<span class="st">"wrap"</span>&gt;
                {form.options.<span class="fn">map</span>((opt, idx) => (
                  &lt;<span class="ty">Chip</span> key={idx} label={opt} onDelete={() => handleDeleteOption(idx)} /&gt;
                ))}
              &lt;/<span class="ty">Box</span>&gt;
            &lt;/<span class="ty">Box</span>&gt;
          )}

          &lt;<span class="ty">FormControlLabel</span>
            control={&lt;<span class="ty">Checkbox</span> checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} /&gt;}
            label=<span class="st">"جعل الحقل إجباري الإدخال بالتسجيل"</span>
          /&gt;
        &lt;/<span class="ty">DialogContent</span>&gt;
        &lt;<span class="ty">DialogActions</span>&gt;
          &lt;<span class="ty">Button</span> onClick={() => setOpen(<span class="kw">false</span>)}&gt;إلغاء&lt;/<span class="ty">Button</span>&gt;
          &lt;<span class="ty">Button</span> onClick={handleSave} variant=<span class="st">"contained"</span> color=<span class="st">"primary"</span>&gt;حفظ وتطبيق&lt;/<span class="ty">Button</span>&gt;
        &lt;/<span class="ty">DialogActions</span>&gt;
      &lt;/<span class="ty">Dialog</span>&gt;
    &lt;/<span class="ty">Box</span>&gt;
  );
}</pre>

<h3>5.3 المكون التفاعلي الكامل لرصد درجات الكنترول (Interactive GradeSheet React Component)</h3>
<pre><span class="cm">// modules/control/GradeSheet.jsx</span>
<span class="kw">import</span> React, { useState, useEffect, useRef, useCallback } <span class="kw">from</span> <span class="st">'react'</span>;
<span class="kw">import</span> { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, TextField, Button, Box, Typography, Alert, CircularProgress 
} <span class="kw">from</span> <span class="st">'@mui/material'</span>;
<span class="kw">import</span> api <span class="kw">from</span> <span class="st">'../../lib/axios'</span>;

<span class="kw">const</span> GRADE_VALIDATOR = <span class="kw">/^(\d+(\.\d+)?|غ|م|معفي|)$/</span>;
<span class="kw">const</span> AUTOSAVE_TIMEOUT = <span class="nu">15000</span>; <span class="cm">// الحفظ التلقائي الآمن كل 15 ثانية</span>

<span class="kw">export default function</span> <span class="fn">GradeSheet</span>({ examSessionId, classId }) {
  <span class="kw">const</span> [students, setStudents] = <span class="fn">useState</span>([]);
  <span class="kw">const</span> [subjects, setSubjects] = <span class="fn">useState</span>([]);
  <span class="kw">const</span> [grades, setGrades] = <span class="fn">useState</span>({});
  <span class="kw">const</span> [dirty, setDirty] = <span class="fn">useState</span>({});
  <span class="kw">const</span> [saving, setSaving] = <span class="fn">useState</span>(<span class="kw">false</span>);
  <span class="kw">const</span> [error, setError] = <span class="fn">useState</span>(<span class="kw">null</span>);
  <span class="kw">const</span> autoSaveTimer = <span class="fn">useRef</span>(<span class="kw">null</span>);

  <span class="cm">// جلب الطلاب والدرجات المسجلة</span>
  <span class="kw">const</span> <span class="fn">fetchData</span> = <span class="kw">async</span> () => {
    <span class="kw">try</span> {
      <span class="kw">const</span> [studentRes, gradesRes] = <span class="kw">await</span> <span class="ty">Promise</span>.<span class="fn">all</span>([
        api.<span class="fn">get</span>(<span class="st">`/students?class_id=</span>${classId}<span class="st">`</span>),
        api.<span class="fn">get</span>(<span class="st">`/control/grades?exam_session_id=</span>${examSessionId}<span class="st">&class_id=</span>${classId}<span class="st">`</span>)
      ]);
      setStudents(studentRes.data.data);
      setSubjects(gradesRes.data.subjects);

      <span class="kw">const</span> mappedGrades = {};
      gradesRes.data.entries.<span class="fn">forEach</span>(e => {
        mappedGrades[<span class="st">`</span>${e.student_id}<span class="st">_</span>${e.subject_id}<span class="st">`</span>] = {
          score_oral: e.score_oral,
          score_written: e.score_written,
          score_activity: e.score_activity,
          is_locked: e.is_locked
        };
      });
      setGrades(mappedGrades);
    } <span class="kw">catch</span> (err) {
      setError(<span class="st">'حدث خطأ أثناء تحميل كشف الدرجات.'</span>);
    }
  };

  <span class="fn">useEffect</span>(() => {
    <span class="fn">fetchData</span>();
    <span class="kw">return</span> () => clearInterval(autoSaveTimer.current);
  }, [examSessionId, classId]);

  <span class="cm">// حفظ التغييرات الفعلية</span>
  <span class="kw">const</span> <span class="fn">handleSave</span> = <span class="fn">useCallback</span>(<span class="kw">async</span> () => {
    <span class="kw">if</span> (<span class="ty">Object</span>.<span class="fn">keys</span>(dirty).length === <span class="nu">0</span>) <span class="kw">return</span>;
    setSaving(<span class="kw">true</span>);
    setError(<span class="kw">null</span>);

    <span class="kw">const</span> payload = <span class="ty">Object</span>.<span class="fn">entries</span>(dirty).<span class="fn">map</span>(([key, val]) => {
      <span class="kw">const</span> [studentId, subjectId] = key.<span class="fn">split</span>(<span class="st">'_'</span>);
      <span class="kw">return</span> {
        student_id: <span class="ty">Number</span>(studentId),
        subject_id: <span class="ty">Number</span>(subjectId),
        ...val
      };
    });

    <span class="kw">try</span> {
      <span class="kw">await</span> api.<span class="fn">post</span>(<span class="st">'/grades'</span>, { exam_session_id: examSessionId, entries: payload });
      setDirty({});
    } <span class="kw">catch</span> (err) {
      setError(err.response?.data?.error || <span class="st">'حدث خطأ أثناء ترحيل الدرجات.'</span>);
    } <span class="kw">finally</span> {
      setSaving(<span class="kw">false</span>);
    }
  }, [dirty, examSessionId]);

  <span class="fn">useEffect</span>(() => {
    <span class="kw">if</span> (<span class="ty">Object</span>.<span class="fn">keys</span>(dirty).length > <span class="nu">0</span>) {
      autoSaveTimer.current = setInterval(handleSave, AUTOSAVE_TIMEOUT);
    }
    <span class="kw">return</span> () => clearInterval(autoSaveTimer.current);
  }, [dirty, handleSave]);

  <span class="kw">const</span> <span class="fn">handleInputChange</span> = (studentId, subjectId, field, value) => {
    <span class="kw">if</span> (!GRADE_VALIDATOR.test(value)) <span class="kw">return</span>;

    <span class="kw">const</span> cellKey = <span class="st">`</span>${studentId}<span class="st">_</span>${subjectId}<span class="st">`</span>;
    <span class="kw">const</span> updatedCell = { ...grades[cellKey], [field]: value };

    setGrades(prev => ({ ...prev, [cellKey]: updatedCell }));
    setDirty(prev => ({
      ...prev,
      [cellKey]: { ...(prev[cellKey] || {}), [field]: value }
    }));
  };

  <span class="kw">return</span> (
    &lt;<span class="ty">Box</span> sx={{ p: <span class="nu">3</span> }}&gt;
      &lt;<span class="ty">Box</span> display=<span class="st">"flex"</span> justifyContent=<span class="st">"between"</span> alignItems=<span class="st">"center"</span> mb={<span class="nu">2</span>}&gt;
        &lt;<span class="ty">Typography</span> variant=<span class="st">"h5"</span> fontWeight=<span class="st">"bold"</span>&gt;رصد الكنترول التفاعلي&lt;/<span class="ty">Typography</span>&gt;
        &lt;<span class="ty">Box</span>&gt;
          {saving && &lt;<span class="ty">CircularProgress</span> size={<span class="nu">24</span>} sx={{ mr: <span class="nu">2</span> }} /&gt;}
          &lt;<span class="ty">Button</span> variant=<span class="st">"contained"</span> color=<span class="st">"primary"</span> onClick={handleSave} disabled={saving}&gt;
            حفظ يدوي فوري
          &lt;/<span class="ty">Button</span>&gt;
        &lt;/<span class="ty">Box</span>&gt;
      &lt;/<span class="ty">Box</span>&gt;

      {error && &lt;<span class="ty">Alert</span> severity=<span class="st">"error"</span> sx={{ mb: <span class="nu">2</span> }}&gt;{error}&lt;/<span class="ty">Alert</span>&gt;

      &lt;<span class="ty">TableContainer</span> component={Paper}&gt;
        &lt;<span class="ty">Table</span> size=<span class="st">"small"</span>&gt;
          &lt;<span class="ty">TableHead</span>&gt;
            &lt;<span class="ty">TableRow</span>&gt;
              &lt;<span class="ty">TableCell</span>&gt;اسم الطالب&lt;/<span class="ty">TableCell</span>&gt;
              {subjects.<span class="fn">map</span>(sub => (
                &lt;<span class="ty">TableCell</span> key={sub.id} align=<span class="st">"center"</span>&gt;
                  {sub.name} (أعمال: {sub.max_activity} / تحريري: {sub.max_written})
                &lt;/<span class="ty">TableCell</span>&gt;
              ))}
            &lt;/<span class="ty">TableRow</span>&gt;
          &lt;/<span class="ty">TableHead</span>&gt;
          &lt;<span class="ty">TableBody</span>&gt;
            {students.<span class="fn">map</span>(student => (
              &lt;<span class="ty">TableRow</span> key={student.id}&gt;
                &lt;<span class="ty">TableCell</span>&gt;{student.full_name_ar}&lt;/<span class="ty">TableCell</span>&gt;
                {subjects.<span class="fn">map</span>(sub => {
                  <span class="kw">const</span> cellVal = grades[<span class="st">`</span>${student.id}<span class="st">_</span>${sub.id}<span class="st">`</span>] || {};
                  <span class="kw">return</span> (
                    &lt;<span class="ty">TableCell</span> key={sub.id} align=<span class="st">"center"</span>&gt;
                      &lt;<span class="ty">Box</span> display=<span class="st">"flex"</span> gap={<span class="nu">1</span>} justifyContent=<span class="st">"center"</span>&gt;
                        &lt;<span class="ty">TextField</span>
                          label=<span class="st">"أعمال"</span>
                          size=<span class="st">"small"</span>
                          sx={{ width: <span class="nu">65</span> }}
                          value={cellVal.score_activity || <span class="st">''</span>}
                          disabled={cellVal.is_locked}
                          onChange={(e) => handleInputChange(student.id, sub.id, <span class="st">'score_activity'</span>, e.target.value)}
                        /&gt;
                        &lt;<span class="ty">TextField</span>
                          label=<span class="st">"تحريري"</span>
                          size=<span class="st">"small"</span>
                          sx={{ width: <span class="nu">65</span> }}
                          value={cellVal.score_written || <span class="st">''</span>}
                          disabled={cellVal.is_locked}
                          onChange={(e) => handleInputChange(student.id, sub.id, <span class="st">'score_written'</span>, e.target.value)}
                        /&gt;
                      &lt;/<span class="ty">Box</span>&gt;
                    &lt;/<span class="ty">TableCell</span>&gt;
                  );
                })}
              &lt;/<span class="ty">TableRow</span>&gt;
            ))}
          &lt;/<span class="ty">TableBody</span>&gt;
        &lt;/<span class="ty">Table</span>&gt;
      &lt;/<span class="ty">TableContainer</span>&gt;
    &lt;/<span class="ty">Box</span>&gt;
  );
}</pre>


<!-- ===================== PHASE 5 ===================== -->
<div id="phase5" class="phase-header">
  <div class="ph-icon ph-amber">📊</div>
  <div>
    <h2>المرحلة السادسة — التقارير والتصدير (ExcelJS & Puppeteer Engine)</h2>
    <p>تصدير التقارير الرسمية المطابقة تماماً لوزارة التربية والتعليم والتحقق الفوري من التنسيق.</p>
  </div>
</div>

<h3>6.1 حزمة ومحرك تصدير ملفات الوزارة التلقائي (Excel Template Builder)</h3>
<pre><span class="cm">// utils/excel.util.js</span>
<span class="kw">const</span> ExcelJS = <span class="fn">require</span>(<span class="st">'exceljs'</span>);

<span class="kw">const</span> <span class="fn">exportMinistryGradesTemplate</span> = <span class="kw">async</span> (classInfo, subjects, studentsWithGrades) => {
  <span class="kw">const</span> workbook = <span class="kw">new</span> ExcelJS.<span class="ty">Workbook</span>();
  <span class="kw">const</span> sheet = workbook.<span class="fn">addWorksheet</span>(<span class="st">'كشف رصد الكنترول'</span>, { views: [{ rightToLeft: <span class="nu">true</span> }] });

  <span class="cm">// 1. ترويسة التقرير الوزاري</span>
  sheet.<span class="fn">mergeCells</span>(<span class="st">'A1:H1'</span>);
  sheet.<span class="fn">getCell</span>(<span class="st">'A1'</span>).value = <span class="st">`وزارة التربية والتعليم — كشف رصد درجات طلاب: </span>${classInfo.class_code}<span class="st">`</span>;
  sheet.<span class="fn">getCell</span>(<span class="st">'A1'</span>).font = { name: <span class="st">'Cairo'</span>, size: <span class="nu">16</span>, bold: <span class="nu">true</span>, color: { argb: <span class="st">'042C53'</span> } };
  sheet.<span class="fn">getCell</span>(<span class="st">'A1'</span>).alignment = { horizontal: <span class="st">'center'</span> };

  <span class="cm">// 2. بناء الهيدر الديناميكي للمواد</span>
  <span class="kw">const</span> headerRow = [<span class="st">'م'</span>, <span class="st">'الرقم القومي'</span>, <span class="st">'اسم الطالب رباعي'</span>];
  subjects.<span class="fn">forEach</span>(sub => {
    headerRow.<span class="fn">push</span>(<span class="st">`</span>${sub.name}<span class="st"> — أعمال`</span>, <span class="st">`</span>${sub.name}<span class="st"> — تحريري`</span>, <span class="st">`</span>${sub.name}<span class="st"> — المجموع`</span>);
  });
  headerRow.<span class="fn">push</span>(<span class="st">'النتيجة النهائية'</span>);

  <span class="kw">const</span> addedHeader = sheet.<span class="fn">addRow</span>(headerRow);
  addedHeader.font = { name: <span class="st">'Cairo'</span>, size: <span class="nu">11</span>, bold: <span class="nu">true</span> };
  addedHeader.eachCell(c => {
    c.fill = { type: <span class="st">'pattern'</span>, pattern: <span class="st">'solid'</span>, fgColor: { argb: <span class="st">'E6F1FB'</span> } };
    c.border = { top: { style: <span class="st">'thin'</span> }, bottom: { style: <span class="st">'medium'</span> } };
  });

  <span class="cm">// 3. تعبئة البيانات وتطبيق شروط الألوان</span>
  studentsWithGrades.<span class="fn">forEach</span>((student, idx) => {
    <span class="kw">const</span> rowData = [idx + <span class="nu">1</span>, student.national_id, student.full_name_ar];
    
    subjects.<span class="fn">forEach</span>(sub => {
      <span class="kw">const</span> score = student.grades[sub.id] || {};
      rowData.<span class="fn">push</span>(score.score_activity || <span class="nu">0</span>, score.score_written || <span class="nu">0</span>, score.total || <span class="nu">0</span>);
    });

    rowData.<span class="fn">push</span>(student.result_status);
    <span class="kw">const</span> addedRow = sheet.<span class="fn">addRow</span>(rowData);

    <span class="cm">// تمييز الطالب الراسب باللون الأحمر تلقائياً للتنبيه</span>
    <span class="kw">if</span> (student.result_status === <span class="st">'راسب'</span>) {
      addedRow.eachCell(cell => {
        cell.fill = { type: <span class="st">'pattern'</span>, pattern: <span class="st">'solid'</span>, fgColor: { argb: <span class="st">'FCEBEB'</span> } };
      });
    }
  });

  <span class="kw">return</span> <span class="kw">await</span> workbook.xlsx.<span class="fn">writeBuffer</span>();
};

module.exports = { exportMinistryGradesTemplate };</pre>


<!-- ===================== TIMELINE & DEPLOYMENT ===================== -->
<div id="timeline" class="phase-header">
  <div class="ph-icon ph-orange">⏱️</div>
  <div>
    <h2>المرحلة السابعة — خطة التنفيذ والنشر وبنية التشغيل (Production Deployment)</h2>
    <p>خطة النشر الآمنة، إدارة التوافرية العالية عبر PM2، ملفات package.json، وإعدادات Nginx.</p>
  </div>
</div>

<h3>7.1 خطة التنفيذ والـ Milestones — 12 أسبوعاً</h3>
<div class="timeline">
  <div class="tl-item">
    <div class="tl-dot" style="background:var(--c5);color:var(--c1)">1</div>
    <div class="tl-line">
      <div class="tl-title">الأسبوع 1-2: إعداد قاعدة البيانات وتأسيس المخطط (Schema Core)</div>
      <div class="tl-detail">تثبيت وتفعيل PostgreSQL 16، وبناء كامل الـ DDL والـ indexes، والـ Custom Fields Metadata، وضبط الـ Triggers لآليات التدقيق الحيوية.</div>
    </div>
  </div>
  <div class="tl-item">
    <div class="tl-dot" style="background:var(--cp3);color:var(--cp)">2</div>
    <div class="tl-line">
      <div class="tl-title">الأسبوع 3-4: الأمان وخدمات التحقق والهوية (RBAC Engine)</div>
      <div class="tl-detail">تكامل JWT، والـ Active sessions، وتكوين middlewares للتحقق من الصلاحيات ونطاقات العرض (Scope filter).</div>
    </div>
  </div>
  <div class="tl-item">
    <div class="tl-dot" style="background:var(--ct4);color:var(--ct)">3</div>
    <div class="tl-line">
      <div class="tl-title">الأسبوع 5-6: شئون الطلاب ومعالج التأسيس الأولي (Wizard & Admissions)</div>
      <div class="tl-detail">تكامل معالج التأسيس الأولي لتهيئة النظام، وشاشات القبول، ومحرك دمج الحقول الديناميكية بالاستمارات.</div>
    </div>
  </div>
  <div class="tl-item">
    <div class="tl-dot" style="background:var(--ca4);color:var(--ca)">4</div>
    <div class="tl-line">
      <div class="tl-title">الأسبوع 7-8: الخزينة، المدفوعات وشئون الموظفين (Finance & HR)</div>
      <div class="tl-detail">محرك جدولة الأقساط، معالج الرواتب، وتكوين إيصالات التحصيل وتجربة شئون العاملين للقطاعين.</div>
    </div>
  </div>
  <div class="tl-item">
    <div class="tl-dot" style="background:#FCEBEB;color:var(--cr)">5</div>
    <div class="tl-line">
      <div class="tl-title">الأسبوع 9-10: الكنترول والرصد والامتحانات (Control Operations)</div>
      <div class="tl-detail">تنفيذ شاشة الكنترول والتحقق التفاعلي، استيراد الدرجات من Excel، وإصدار شهادات وبيانات النجاح.</div>
    </div>
  </div>
  <div class="tl-item">
    <div class="tl-dot" style="background:var(--co4);color:var(--co)">6</div>
    <div class="tl-line">
      <div class="tl-title">الأسبوع 11-12: تقارير الوزارة والتوزيع والتشغيل الفعلي (Go-Live)</div>
      <div class="tl-detail">تكامل الـ Excel templates والـ PDFs، إعداد Nginx وخادم LAN، وضبط عمليات الحفظ الاحتياطي التلقائي (Backup scheduler).</div>
    </div>
  </div>
</div>

<h3>7.2 إعداد خادم الويب والموازنة لشبكات المدارس المحلية (Nginx LAN Config)</h3>
<pre><span class="cm"># /etc/nginx/sites-available/school-erp</span>
server {
    listen 80;
    server_name 192.168.1.100; <span class="cm"># عنوان IP الخادم الداخلي بالمدرسة</span>

    charset utf-8;
    client_max_body_size 50M;

    <span class="cm"># 1. تخدم واجهة الاستخدام الثابتة (React Build Frontend)</span>
    location / {
        root /var/www/school-erp/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    <span class="cm"># 2. ترحيل مسارات الـ Backend API بشكل آمن لخلفية PM2</span>
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    <span class="cm"># 3. تخدم الملفات المرفوعة وصور الطلاب</span>
    location /uploads {
        alias /var/www/school-erp/backend/uploads;
        expires 14d;
        add_header Cache-Control "public";
    }
}</pre>

<h3>7.3 ملف تعريف حزم الـ Backend (backend/package.json)</h3>
<pre>{
  <span class="st">"name"</span>: <span class="st">"egyptian-school-erp-backend"</span>,
  <span class="st">"version"</span>: <span class="st">"1.0.0"</span>,
  <span class="st">"description"</span>: <span class="st">"Production Node.js Core Backend with pg-pool, dynamic fields validation & audit system"</span>,
  <span class="st">"main"</span>: <span class="st">"server.js"</span>,
  <span class="st">"scripts"</span>: {
    <span class="st">"start"</span>: <span class="st">"node server.js"</span>,
    <span class="st">"dev"</span>: <span class="st">"nodemon server.js"</span>
  },
  <span class="st">"dependencies"</span>: {
    <span class="st">"express"</span>: <span class="st">"^4.18.2"</span>,
    <span class="st">"pg"</span>: <span class="st">"^8.11.3"</span>,
    <span class="st">"jsonwebtoken"</span>: <span class="st">"^9.0.2"</span>,
    <span class="st">"bcryptjs"</span>: <span class="st">"^2.4.3"</span>,
    <span class="st">"joi"</span>: <span class="st">"^17.11.0"</span>,
    <span class="st">"exceljs"</span>: <span class="st">"^4.4.0"</span>,
    <span class="st">"puppeteer"</span>: <span class="st">"^21.5.0"</span>,
    <span class="st">"cors"</span>: <span class="st">"^2.8.5"</span>,
    <span class="st">"helmet"</span>: <span class="st">"^7.1.0"</span>,
    <span class="st">"winston"</span>: <span class="st">"^3.11.0"</span>
  },
  <span class="st">"devDependencies"</span>: {
    <span class="st">"nodemon"</span>: <span class="st">"^3.0.1"</span>
  }
}</pre>

<h3>7.4 ملف تعريف حزم الـ Frontend (frontend/package.json)</h3>
<pre>{
  <span class="st">"name"</span>: <span class="st">"egyptian-school-erp-frontend"</span>,
  <span class="st">"private"</span>: true,
  <span class="st">"version"</span>: <span class="st">"1.0.0"</span>,
  <span class="st">"type"</span>: <span class="st">"module"</span>,
  <span class="st">"scripts"</span>: {
    <span class="st">"dev"</span>: <span class="st">"vite"</span>,
    <span class="st">"build"</span>: <span class="st">"vite build"</span>,
    <span class="st">"preview"</span>: <span class="st">"vite preview"</span>
  },
  <span class="st">"dependencies"</span>: {
    <span class="st">"react"</span>: <span class="st">"^18.2.0"</span>,
    <span class="st">"react-dom"</span>: <span class="st">"^18.2.0"</span>,
    <span class="st">"react-router-dom"</span>: <span class="st">"^6.20.0"</span>,
    <span class="st">"@mui/material"</span>: <span class="st">"^5.14.18"</span>,
    <span class="st">"@emotion/react"</span>: <span class="st">"^11.11.1"</span>,
    <span class="st">"@emotion/styled"</span>: <span class="st">"^11.11.0"</span>,
    <span class="st">"stylis"</span>: <span class="st">"^4.3.0"</span>,
    <span class="st">"stylis-plugin-rtl"</span>: <span class="st">"^2.1.1"</span>,
    <span class="st">"axios"</span>: <span class="st">"^1.6.2"</span>,
    <span class="st">"zustand"</span>: <span class="st">"^4.4.6"</span>,
    <span class="st">"react-hook-form"</span>: <span class="st">"^7.48.2"</span>,
    <span class="st">"recharts"</span>: <span class="st">"^2.10.1"</span>,
    <span class="st">"lucide-react"</span>: <span class="st">"^0.292.0"</span>
  },
  <span class="st">"devDependencies"</span>: {
    <span class="st">"@vitejs/plugin-react"</span>: <span class="st">"^4.2.0"</span>,
    <span class="st">"vite"</span>: <span class="st">"^5.0.0"</span>
  }
}</pre>

<div class="divider"></div>
<div style="text-align:center;padding:30px 20px;background:var(--c1);border-radius:12px;color:#fff">
  <div style="font-size:18px;font-weight:800;margin-bottom:8px">نظام إدارة المدارس المصرية — دليل البناء الهندسي الشامل</div>
  <div style="font-size:12px;opacity:0.8">كافة الحقوق محفوظة © 2026. تم البناء والتدقيق وفق لوائح وزارة التربية والتعليم المصرية للمدارس الحكومية والخاصة واللغات.</div>
</div>

</div>
</body>
</html>