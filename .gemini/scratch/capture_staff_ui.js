const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const browser = await puppeteer.launch({
    headless: 'new',
    viewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Check if login form is present
  const loginInput = await page.$('input[placeholder*="المستخدم"]');
  if (loginInput) {
    console.log('Login form detected. Logging in...');
    await page.type('input[placeholder*="المستخدم"]', 'admin');
    await page.type('input[placeholder*="المرور"]', 'admin');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Find and click on Staff HR in sidebar
  console.log('Navigating to Staff HR...');
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('*'));
    const staffItem = navItems.find(el => el.children.length === 0 && (el.textContent.includes('شئون العاملين') || el.textContent.includes('شؤون العاملين')));
    if (staffItem) staffItem.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  const artifactDir = 'C:/Users/diaa_elattar/.gemini/antigravity/brain/6e1b2df8-f33b-48a7-b83c-b3146b98daf5';
  const file1 = path.join(artifactDir, 'staff_list_preview.png');
  await page.screenshot({ path: file1, fullPage: true });
  console.log('SUCCESS: Saved staff list screenshot to', file1);

  // Click Add Staff button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.textContent.includes('إضافة موظف'));
    if (addBtn) addBtn.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  const file2 = path.join(artifactDir, 'staff_form_preview.png');
  await page.screenshot({ path: file2, fullPage: true });
  console.log('SUCCESS: Saved staff form screenshot to', file2);

  await browser.close();
}

capture().catch(console.error);
