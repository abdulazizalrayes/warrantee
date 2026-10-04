import { chromium } from '@playwright/test';
import { load } from 'cheerio';
import { writeFile } from 'node:fs/promises';

const base = 'https://warrantee.io';
const sitemap = load(await (await fetch(`${base}/sitemap.xml`)).text(), { xmlMode: true });
const urls = sitemap('url > loc').map((_, node) => sitemap(node).text()).get();
const browser = await chromium.launch();
const context = await browser.newContext({ userAgent: 'Warrantee-QA/1.0 public-read-only-audit' });
const results = [];
const targets = new Set();
try {
  for (const url of urls) {
    if (new URL(url).origin !== base) throw new Error('Company identity mismatch');
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const started = Date.now();
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
    await page.getByRole('button', { name: /^(Reject All|رفض الكل)$/i }).click({ timeout: 500 }).catch(() => {});
    const layouts = [];
    for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      layouts.push(await page.evaluate(width => ({ width,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        escapedControls: [...document.querySelectorAll('main button, main input, main select, footer a')]
          .filter(el => el.getBoundingClientRect().width && getComputedStyle(el).position !== 'fixed')
          .filter(el => { const r = el.getBoundingClientRect(); const p = el.parentElement.getBoundingClientRect();
            return r.left < p.left - 2 || r.right > p.right + 2 || r.bottom > p.bottom + 2; })
          .map(el => ({ tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 100) }))
      }), width));
    }
    const metadata = await page.evaluate(() => ({
      title: document.title, language: document.documentElement.lang, direction: document.documentElement.dir,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      description: document.querySelector('meta[name="description"]')?.content,
      links: [...document.querySelectorAll('a[href]')].map(a => a.href),
      ids: [...document.querySelectorAll('[id]')].map(el => el.id),
      controls: [...document.querySelectorAll('button, input, select, textarea')].length
    }));
    metadata.links.filter(link => new URL(link).origin === base).forEach(link => targets.add(link));
    results.push({ url, status: response?.status(), elapsedMs: Date.now() - started, errors, layouts, ...metadata });
    await page.close();
  }
  const links = [];
  for (const target of targets) {
    const url = new URL(target);
    const destination = results.find(result => result.url === `${url.origin}${url.pathname}`);
    if (url.hash && destination) {
      links.push({ target, anchorExists: destination.ids.includes(decodeURIComponent(url.hash.slice(1))) });
    } else if (!url.hash) {
      const response = await fetch(target, { method: 'HEAD', headers: { 'User-Agent': 'Warrantee-QA/1.0' } }).catch(() => null);
      links.push({ target, status: response?.status });
    }
  }
  await writeFile('/private/tmp/warrantee-public-audit-20261004.json', JSON.stringify({ classification: 'read-only public audit; geometry flags require visual review', results, links }, null, 2));
  console.log(JSON.stringify({ pages: results.length, layouts: results.length * 7, pageErrors: results.filter(r => r.errors.length).length,
    overflowPages: results.filter(r => r.layouts.some(l => l.overflow > 1)).length,
    brokenAnchors: links.filter(l => l.anchorExists === false), badLinks: links.filter(l => l.status >= 400) }, null, 2));
} finally { await browser.close(); }
