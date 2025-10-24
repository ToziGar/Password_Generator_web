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
});
