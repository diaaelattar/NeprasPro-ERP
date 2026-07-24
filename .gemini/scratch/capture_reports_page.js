const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Check login if present
  const hasLogin = await page.$('input[placeholder*="المستخدم"]');
  if (hasLogin) {
    await page.type('input[placeholder*="المستخدم"]', 'admin');
    await page.type('input[placeholder*="المرور"]', 'admin');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Click Reports menu item
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    const btn = els.find(e => e.children.length === 0 && (e.textContent.trim() === 'التقارير والطباعة' || e.textContent.trim() === 'التقارير' || e.textContent.trim().includes('التقارير')));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const imgPath = 'C:/Users/diaa_elattar/.gemini/antigravity/brain/6e1b2df8-f33b-48a7-b83c-b3146b98daf5/reports_page_current.png';
  await page.screenshot({ path: imgPath });
  console.log('Saved reports page screenshot to:', imgPath);

  await browser.close();
}

capture().catch(console.error);
