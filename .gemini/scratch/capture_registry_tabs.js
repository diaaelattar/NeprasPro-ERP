const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Check login
  const hasLogin = await page.$('input[placeholder*="المستخدم"]');
  if (hasLogin) {
    await page.type('input[placeholder*="المستخدم"]', 'admin');
    await page.type('input[placeholder*="المرور"]', 'admin');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  const dir = 'C:/Users/diaa_elattar/.gemini/antigravity/brain/6e1b2df8-f33b-48a7-b83c-b3146b98daf5';

  // 1. Dashboard screenshot
  const imgDash = path.join(dir, 'dashboard_preview.png');
  await page.screenshot({ path: imgDash });
  console.log('Saved dashboard screenshot:', imgDash);

  // 2. Click Students List
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    const btn = els.find(e => e.children.length === 0 && (e.textContent.trim() === 'شئون الطلاب والقبول' || e.textContent.trim().includes('الطلاب والقبول')));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const imgMainReg = path.join(dir, 'students_main_registry.png');
  await page.screenshot({ path: imgMainReg });
  console.log('Saved main registry screenshot:', imgMainReg);

  // 3. Click Disconnected Tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button.form-tab'));
    const btn = btns.find(b => b.textContent.includes('المنقطعين'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const imgDisc = path.join(dir, 'students_disconnected_tab.png');
  await page.screenshot({ path: imgDisc });
  console.log('Saved disconnected tab screenshot:', imgDisc);

  // 4. Click Suspended Tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button.form-tab'));
    const btn = btns.find(b => b.textContent.includes('الموقوف قيدهم'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const imgSusp = path.join(dir, 'students_suspended_tab.png');
  await page.screenshot({ path: imgSusp });
  console.log('Saved suspended tab screenshot:', imgSusp);

  // 5. Click Excluded Tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button.form-tab'));
    const btn = btns.find(b => b.textContent.includes('المستبعدين'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const imgExcl = path.join(dir, 'students_excluded_tab.png');
  await page.screenshot({ path: imgExcl });
  console.log('Saved excluded tab screenshot:', imgExcl);

  await browser.close();
}

capture().catch(console.error);
