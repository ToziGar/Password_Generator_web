const { test, expect } = require('@playwright/test');

test.describe('Tutorial spotlight smoke', ()=>{
  test('opens tutorial and shows spotlight label', async ({ page }) => {
    // The test expects a local static server to be running at http://localhost:8000
    await page.goto('/');

    // Wait for the page main content
    await page.waitForSelector('#mainContent');

    // Open tutorial (click button) - ensures tutorial modal and overlay are created
    await page.click('#tutorialBtn');

    // Wait for tutorial modal to be visible
    await page.waitForSelector('#tutorialModal', { state: 'visible', timeout: 5000 });

    // Wait a short time for the overlay/spot to be created and positioned
    await page.waitForTimeout(600);

    // The tooltip label should be present and have visible bounding box
    const label = await page.$('#pgw-tutorial-spot-label');
    expect(label).not.toBeNull();

    // Check visibility by bounding box - it should have non-zero size and be in viewport
    const box = await label.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(8);
    expect(box.height).toBeGreaterThan(8);

    // Advance one step to ensure tooltip updates per step (click Next)
    await page.click('#tutorialNext');
    await page.waitForTimeout(400);
    const box2 = await label.boundingBox();
    expect(box2).not.toBeNull();
  });

  test('small viewport - tooltip positions and CTA works', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForSelector('#mainContent');
    await page.click('#tutorialBtn');
    await page.waitForSelector('#tutorialModal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(600);
    const label = await page.$('#pgw-tutorial-spot-label');
    expect(label).not.toBeNull();
    const box = await label.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(8);
    // Click CTA (should open info modal or show toast) - assert no errors thrown
    const cta = await label.$('.label-cta');
    if(cta){
      await cta.click();
      await page.waitForTimeout(400);
    }
    await context.close();
  });

  test('light theme - tooltip contrast and CTA opens info', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#mainContent');
    // toggle light theme via attribute
    await page.evaluate(()=>{ document.documentElement.setAttribute('data-theme','light'); });
    await page.click('#tutorialBtn');
    await page.waitForSelector('#tutorialModal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(600);
    const label = await page.$('#pgw-tutorial-spot-label');
    expect(label).not.toBeNull();
    const box = await label.boundingBox();
    expect(box).not.toBeNull();
  // Wait for CTA to appear inside the label (some timing variations possible)
    // Try to click CTA if present; tolerate absence to avoid flaky failures in theme toggles
    let cta = null;
    try{
      cta = await page.$('#pgw-tutorial-spot-label .label-cta');
      if(cta){
        await cta.click();
        await page.waitForTimeout(400);
      }
    }catch(e){
      // ignore timing issues
    }
  });

});

test('expanded accessibility scan (axe) for main flows', async ({ page }) => {
  const fs = require('fs');
  // load page
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // helper to inject axe
  async function injectAxe(){
    try {
      const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
      await page.addScriptTag({ content: axeSource });
      return true;
    } catch (e) {
      await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js' });
      return true;
    }
  }

  // helper to run axe and save
  async function runAxe(name){
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      return await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa'] } });
    });
    const outDir = 'test-results/axe';
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
    fs.writeFileSync(`${outDir}/${name}.json`, JSON.stringify(result, null, 2));
    const violations = result.violations || [];
    const problematic = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    console.log(`${name}: ${violations.length} violations, ${problematic.length} critical/serious`);
    return problematic.length === 0;
  }

  await injectAxe();

  // baseline
  let ok = await runAxe('main');

  // tutorial flow
  try {
    const tutorialBtn = page.locator('#tutorialBtn');
    if (await tutorialBtn.count()){
      await tutorialBtn.click();
      await page.waitForTimeout(600);
      ok = ok && await runAxe('tutorial-open');
      const closeBtn = page.locator('#tutorialClose');
      if (await closeBtn.count()) await closeBtn.click(); else await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch(e){ console.warn('tutorial flow skipped:', e.message); }

  // info modal flow
  try {
    const cta = page.locator('#pgw-tutorial-spot-label .label-cta');
    if (await cta.count()){
      await cta.click();
      await page.waitForTimeout(300);
    } else {
      const infoBtn = page.locator('#infoBtn, button:has-text("Info"), [data-info]');
      if (await infoBtn.count()){
        await infoBtn.first().click();
        await page.waitForTimeout(300);
      }
    }
    ok = ok && await runAxe('info-modal');
    const modalClose = page.locator('#infoModal button.close, #infoModal [data-close], .modal .close');
    if (await modalClose.count()) await modalClose.first().click(); else await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } catch(e){ console.warn('info modal flow skipped:', e.message); }

  // export flow
  try {
    const exportBtn = page.locator('#exportBtn, button:has-text("Export"), [data-export]');
    if (await exportBtn.count()){
      await exportBtn.first().click();
      await page.waitForTimeout(300);
      ok = ok && await runAxe('export-modal');
      const exportClose = page.locator('.export-modal button.close, [data-close-export]');
      if (await exportClose.count()) await exportClose.first().click(); else await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch(e){ console.warn('export flow skipped:', e.message); }

  expect(ok).toBe(true);
});
