const { test, expect } = require('@playwright/test');

test.describe('Visual baseline snapshots - tutorial', ()=>{
  test('desktop - tutorial tooltip baseline', async ({ page })=>{
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#tutorialBtn', { state: 'visible', timeout: 5000 });
    await page.click('#tutorialBtn');
    await page.waitForSelector('#pgw-tutorial-spot-label', { state: 'visible', timeout: 7000 });
    await page.setViewportSize({ width: 1280, height: 800 });
    // wait for layout/animations to settle
    await page.waitForTimeout(400);
    // First run will create the snapshot under test-results if not present; subsequent runs compare
    await expect(page).toHaveScreenshot('tutorial-desktop-approved.png', { animations: 'disabled', fullPage: true });
  });

  test('mobile - tutorial tooltip baseline', async ({ page })=>{
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#tutorialBtn', { state: 'visible', timeout: 5000 });
    await page.click('#tutorialBtn');
    await page.waitForSelector('#pgw-tutorial-spot-label', { state: 'visible', timeout: 7000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('tutorial-mobile-approved.png', { animations: 'disabled', fullPage: true });
  });
});
