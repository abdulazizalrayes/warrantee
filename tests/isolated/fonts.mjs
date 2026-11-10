import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import postcss from 'postcss';
import ts from 'typescript';

const weights = ['300', '400', '500', '600', '700'];
const agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36';

export function assertFontSource(root) {
  const source = ts.createSourceFile('DocumentShell.tsx', readFileSync(resolve(root, 'src/components/DocumentShell.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let options;
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'IBM_Plex_Sans_Arabic') {
      if (options || node.arguments.length !== 1 || !ts.isObjectLiteralExpression(node.arguments[0])) throw new Error('Unexpected isolated font source contract');
      options = Object.fromEntries(node.arguments[0].properties.map((property) => {
        if (!ts.isPropertyAssignment(property)) throw new Error('Unsupported font source property');
        const value = property.initializer;
        return [property.name.getText(source), ts.isArrayLiteralExpression(value) ? value.elements.map((element) => {
          if (!ts.isStringLiteral(element)) throw new Error('Unsupported font source array');
          return element.text;
        }) : ts.isStringLiteral(value) ? value.text : value.kind === ts.SyntaxKind.FalseKeyword ? false : null];
      }));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (JSON.stringify(options) !== JSON.stringify({ subsets: ['arabic'], weight: weights, variable: '--font-arabic-brand', display: 'swap', preload: false })) {
    throw new Error('Refresh isolated real-font dependency contract for DocumentShell');
  }
}

async function resource(url, limit) {
  const response = await fetch(url, { headers: { 'User-Agent': agent }, redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('Trusted font dependency could not be prefetched');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Trusted font dependency exceeds bounded size');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}

// Only build dependencies are fetched here, before the isolated process exists.
// Real upstream bytes are passed to next/font's absolute-file response branch.
export async function prepareRealFonts(root, directory) {
  assertFontSource(root);
  const require = createRequire(resolve(root, 'package.json'));
  const { getGoogleFontsUrl } = require('next/dist/compiled/@next/font/dist/google/get-google-fonts-url');
  const cssURL = getGoogleFontsUrl('IBM Plex Sans Arabic', { wght: weights }, 'swap');
  const target = new URL(cssURL);
  if (target.origin !== 'https://fonts.googleapis.com' || target.pathname !== '/css2') throw new Error('Untrusted font CSS dependency');
  const css = (await resource(cssURL, 200_000)).toString('utf8');
  const parsed = postcss.parse(css);
  const declarations = [];
  const seenWeights = new Set();
  parsed.walkAtRules('font-face', (rule) => {
    const properties = Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
    if (properties['font-family'].replaceAll("'", '').replaceAll('"', '') !== 'IBM Plex Sans Arabic' ||
        !weights.includes(properties['font-weight']) || properties['font-style'] !== 'normal' || properties['font-display'] !== 'swap') {
      throw new Error('Unexpected real-font CSS declaration');
    }
    seenWeights.add(properties['font-weight']);
    rule.walkDecls('src', (declaration) => declarations.push(declaration));
  });
  if (seenWeights.size !== weights.length || declarations.length < weights.length || declarations.length > 30) throw new Error('Incomplete real-font weight contract');
  mkdirSync(directory, { recursive: true });
  const downloaded = new Map();
  for (const declaration of declarations) {
    const match = declaration.value.match(/^url\((https:\/\/fonts\.gstatic\.com\/s\/ibmplexsansarabic\/v[0-9]+\/[A-Za-z0-9_.-]+\.woff2)\) format\(['"]woff2['"]\)$/);
    if (!match) throw new Error('Unexpected or non-WOFF2 font asset dependency');
    const url = match[1];
    let font = downloaded.get(url);
    if (!font) {
      const bytes = await resource(url, 2_000_000);
      if (bytes.length < 100 || bytes.subarray(0, 4).toString('ascii') !== 'wOF2') throw new Error('Font dependency is not actual WOFF2 bytes');
      const hash = createHash('sha256').update(bytes).digest('hex');
      const path = resolve(directory, `${hash}.woff2`);
      writeFileSync(path, bytes, { mode: 0o600 });
      if (!readFileSync(path).equals(bytes)) throw new Error('Font dependency byte verification failed');
      font = { path, hash, bytes: bytes.length };
      downloaded.set(url, font);
    }
    declaration.value = `url(${font.path}) format('woff2')`;
  }
  const responses = resolve(directory, 'responses.json');
  writeFileSync(responses, JSON.stringify({ [cssURL]: parsed.toString() }), { mode: 0o600 });
  // This record is temporary and removed with the isolated workspace, not a cache.
  writeFileSync(resolve(directory, 'verified-fonts.json'), JSON.stringify({ cssSha256: createHash('sha256').update(css).digest('hex'), assets: [...downloaded.values()].map(({ hash, bytes }) => ({ hash, bytes })) }), { mode: 0o600 });
  return { responses, count: downloaded.size };
}
