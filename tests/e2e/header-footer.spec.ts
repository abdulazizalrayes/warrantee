import { test, expect } from '@playwright/test';

for (const locale of ['en', 'ar']) {
  test(`${locale} header and footer keep compact language controls and working contact links`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const rejectCookies = page.getByRole('button', { name: /Reject All|رفض الكل/ });
    if (await rejectCookies.isVisible()) await rejectCookies.click();

    const footer = page.getByRole('contentinfo');
    const navigation = page.getByRole('navigation').first();
    await expect(footer.locator('input[type="search"]')).toHaveCount(0);
    await expect(navigation.locator('input[type="search"]')).toHaveCount(0);
    await expect(footer.getByRole('link', { name: 'hello@warrantee.io', exact: true }))
      .toHaveAttribute('href', 'mailto:hello@warrantee.io');

    for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await footer.scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => {
        const elements = [...document.querySelectorAll<HTMLElement>('footer a, footer select, nav select')]
          .filter((element) => element.getBoundingClientRect().width && element.getBoundingClientRect().height);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          escaped: elements.filter((element) => {
            const box = element.getBoundingClientRect();
            const parent = element.parentElement!.getBoundingClientRect();
            return box.left < parent.left - 1 || box.right > parent.right + 1 || box.top < parent.top - 1 || box.bottom > parent.bottom + 1;
          }).map((element) => element.tagName),
        };
      });
      expect(layout).toEqual({ overflow: false, escaped: [] });
      await page.screenshot({ path: `test-results/footer-${locale}-${width}.png`, fullPage: true });
      await footer.screenshot({ path: `test-results/footer-detail-${locale}-${width}.png` });
      await navigation.screenshot({ path: `test-results/header-detail-${locale}-${width}.png` });
    }

    await footer.locator(`a[href="/${locale}/contact"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/contact$`));
    await expect(page.locator('input[name="email"]')).toBeVisible();

    const otherLocale = locale === 'en' ? 'ar' : 'en';
    await page.getByRole('contentinfo').getByRole('combobox', { name: 'Language', exact: true }).selectOption(otherLocale);
    await expect(page).toHaveURL(new RegExp(`/${otherLocale}/contact$`));
    await expect(page.locator('html')).toHaveAttribute('dir', otherLocale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.getByRole('contentinfo').locator('input[type="search"]')).toHaveCount(0);
  });
}
