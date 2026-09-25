import { test, expect } from '@playwright/test';

for (const locale of ['en', 'ar']) {
  test(`${locale} dropdown search preserves values and keyboard navigation`, async ({ page }) => {
    await page.goto(`/${locale}/contact`);
    const rejectCookies = page.getByRole('button', { name: /Reject All|رفض الكل/ });
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    const select = page.locator('select[name="subject"]');
    const search = select.locator('..').locator('input[type="search"]');
    const initial = await select.inputValue();
    await search.fill('support');
    await expect(select.locator('option[value="support"]')).toHaveCount(1);
    await expect(select.locator('option[value="press"]')).toHaveCount(0);
    await expect(select).toHaveValue(initial);
    await search.press('Enter');
    await expect(select).toBeFocused();
    await select.selectOption('support');
    await search.fill('no-match-999');
    await expect(select).toHaveValue('support');
    await expect(select.locator('..').getByRole('status')).toBeVisible();
    await search.press('Escape');
    await expect(select.locator('option')).toHaveCount(6);
    if (locale === 'ar') await expect(search).toHaveAttribute('dir', 'rtl');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/searchable-${locale}-${width}.png`, fullPage: true });
    }
  });
}
