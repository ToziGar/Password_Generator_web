const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const outDir = path.resolve(__dirname, 'screenshots');
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

test.describe('Tutorial visual checks', ()=>{
  test('capture desktop and mobile tutorial tooltip', async ({ page, browserName })=>{
    await page.goto('http://localhost:8000');
    // open tutorial
    await page.waitForSelector('#tutorialBtn', { state: 'visible', timeout: 5000 });
    await page.click('#tutorialBtn');
    // wait for the spotlight label
    await page.waitForSelector('#pgw-tutorial-spot-label', { state: 'visible', timeout: 7000 });
    const label = await page.$('#pgw-tutorial-spot-label');
    expect(label).not.toBeNull();
    // desktop screenshot
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: path.join(outDir, 'tutorial-desktop.png'), fullPage: true });

    // mobile emulation (iPhone 12-ish)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300); // let layout settle
    await page.screenshot({ path: path.join(outDir, 'tutorial-mobile.png'), fullPage: true });
  });
});
