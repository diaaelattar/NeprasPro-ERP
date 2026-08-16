const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const artDir = 'C:/Users/diaa_elattar/.gemini/antigravity-ide/brain/61a0e1cc-c83d-4aca-80e3-15eab6bd3234';
  const outDir = 'd:/NeprasPro/screenshots';
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // 1. Gateway
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  const shot1 = path.join(outDir, 'shot_1_gateway.png');
  const shot1Art = path.join(artDir, 'shot_1_gateway.png');
  await page.screenshot({ path: shot1 });
  fs.copyFileSync(shot1, shot1Art);
  console.log('Saved shot 1:', shot1);

  // 2. Select students domain & login
  await page.evaluate(() => {
    const card = document.querySelector('.gateway-domain-card');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
    const setNativeValue = (element, value) => {
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const inputs = document.querySelectorAll('.gateway-form input');
    if (inputs.length >= 2) {
      setNativeValue(inputs[0], 'admin');
      setNativeValue(inputs[1], 'admin');
      const btn = document.querySelector('.gateway-form button[type="submit"]');
      if (btn) btn.click();
    }
  });

  await new Promise(r => setTimeout(r, 2000));
  const shot2 = path.join(outDir, 'shot_2_students_table.png');
  const shot2Art = path.join(artDir, 'shot_2_students_table.png');
  await page.screenshot({ path: shot2 });
  fs.copyFileSync(shot2, shot2Art);
  console.log('Saved shot 2:', shot2);

  // 3. Open Merge modal & toggle
  await page.evaluate(() => {
    const row = document.querySelector('.students-table tbody tr');
    if (row) {
      const actionBtns = row.querySelectorAll('button');
      if (actionBtns.length >= 2) actionBtns[1].click();
    }
  });
  await new Promise(r => setTimeout(r, 700));
  await page.evaluate(() => {
    const toggle = document.querySelector('.merge-modal input[type="checkbox"]');
    if (toggle) toggle.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const shot3 = path.join(outDir, 'shot_3_merge_modal.png');
  const shot3Art = path.join(artDir, 'shot_3_merge_modal.png');
  await page.screenshot({ path: shot3 });
  fs.copyFileSync(shot3, shot3Art);
  console.log('Saved shot 3:', shot3);

  // Close modal and navigate to Quick edit
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal-overlay button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('*'));
    const qe = links.find(el => el.children.length === 0 && el.textContent.trim() === 'تعديل سريع');
    if (qe) qe.click();
  });
  await new Promise(r => setTimeout(r, 1800));
  const shot4 = path.join(outDir, 'shot_4_quick_edit.png');
  const shot4Art = path.join(artDir, 'shot_4_quick_edit.png');
  await page.screenshot({ path: shot4 });
  fs.copyFileSync(shot4, shot4Art);
  console.log('Saved shot 4:', shot4);

  await browser.close();
  console.log('All 4 screenshots saved successfully!');
})();
