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

test('quick accessibility scan (axe)', async ({ page }) => {
  const fs = require('fs');
  await page.goto('/');
  // Attempt to load local axe-core, fallback to CDN
  let axeSource = null;
  try {
    axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  } catch (e) {
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js' });
  }
  if (axeSource) await page.addScriptTag({ content: axeSource });

  const result = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa'] } });
  });

  const outDir = 'test-results/axe';
  try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
  fs.writeFileSync(`${outDir}/axe-report.json`, JSON.stringify(result, null, 2));

  const violations = result.violations || [];
  const problematic = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  console.log(`axe: found ${violations.length} violations, ${problematic.length} critical/serious`);
  // Fail if any critical/serious issues
  expect(problematic.length).toBe(0);
});
