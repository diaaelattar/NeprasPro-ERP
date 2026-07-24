const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1366, height: 768 }
  });
  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Check if we need to click login or if we are already logged in / setup wizard
  // Try to find the Staff link in sidebar
  await page.waitForTimeout(2000);

  // Take screenshot of home / dashboard
  const artifactDir = 'C:/Users/diaa_elattar/.gemini/antigravity/brain/6e1b2df8-f33b-48a7-b83c-b3146b98daf5';
  
  // Click on Staff HR link in sidebar
  const staffLink = await page.$('a[href*="staff"], div:contains("شئون العاملين"), span:contains("شئون العاملين"), div:contains("شؤون العاملين"), li:contains("العاملين")');
  
  // Or evaluate clicking sidebar menu item with text 'شئون العاملين'
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    const staffEl = elements.find(el => el.children.length === 0 && (el.textContent.includes('شئون العاملين') || el.textContent.includes('شؤون العاملين')));
    if (staffEl) {
      staffEl.click();
      return true;
    }
    return false;
  });

  await page.waitForTimeout(2000);

  // Take screenshot 1: Staff List
  const screenshot1Path = path.join(artifactDir, 'staff_list_styled.png');
  await page.screenshot({ path: screenshot1Path, fullPage: true });
  console.log('Saved screenshot 1:', screenshot1Path);

  // Click on Add Staff button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find(b => b.textContent.includes('إضافة موظف'));
    if (addBtn) addBtn.click();
  });

  await page.waitForTimeout(1500);

  // Take screenshot 2: Staff Form
  const screenshot2Path = path.join(artifactDir, 'staff_form_styled.png');
  await page.screenshot({ path: screenshot2Path, fullPage: true });
  console.log('Saved screenshot 2:', screenshot2Path);

  await browser.close();
}

run().catch(console.error);
