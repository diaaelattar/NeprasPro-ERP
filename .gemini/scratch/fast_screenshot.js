const puppeteer = require('puppeteer');
const path = require('path');

async function main() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('1. Loading http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Check login
  const hasLogin = await page.$('input[placeholder*="المستخدم"]');
  if (hasLogin) {
    await page.type('input[placeholder*="المستخدم"]', 'admin');
    await page.type('input[placeholder*="المرور"]', 'admin');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Click Staff
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    const btn = els.find(e => e.children.length === 0 && e.textContent.trim().includes('شئون العاملين'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const dir = 'C:/Users/diaa_elattar/.gemini/antigravity/brain/6e1b2df8-f33b-48a7-b83c-b3146b98daf5';
  const img1 = path.join(dir, 'staff_list_preview.png');
  await page.screenshot({ path: img1 });
  console.log('Saved image 1:', img1);

  // Click Add Staff
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.textContent.includes('إضافة موظف'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const img2 = path.join(dir, 'staff_form_preview.png');
  await page.screenshot({ path: img2 });
  console.log('Saved image 2:', img2);

  await browser.close();
}

main().catch(console.error);
