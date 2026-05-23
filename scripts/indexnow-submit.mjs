#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://warrantee.io";
const DEFAULT_KEY = "99975fddf27362d564d730362b73f94d";

const baseUrl = (process.env.INDEXNOW_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const host = new URL(baseUrl).hostname;
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const keyLocation =
  process.env.INDEXNOW_KEY_LOCATION || `${baseUrl}/${encodeURIComponent(key)}.txt`;
const endpoints = (process.env.INDEXNOW_ENDPOINTS || "https://api.indexnow.org/indexnow,https://www.bing.com/indexnow")
  .split(",")
  .map((endpoint) => endpoint.trim())
  .filter(Boolean);

function printHelp() {
  console.log(`Usage:
  npm run indexnow:submit
  npm run indexnow:submit -- https://warrantee.io/en https://warrantee.io/en/features

Environment:
  INDEXNOW_BASE_URL       Defaults to ${DEFAULT_BASE_URL}
  INDEXNOW_KEY            Defaults to the production Warrantee key
  INDEXNOW_KEY_LOCATION   Defaults to <base>/<key>.txt
  INDEXNOW_ENDPOINTS      Comma-separated endpoints; defaults to IndexNow and Bing`);
}

async function readSitemapUrls() {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const response = await fetch(sitemapUrl, {
    headers: {
      "User-Agent": "Warrantee-IndexNow/1.0 (+https://warrantee.io)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sitemapUrl}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((url) => {
      try {
        return new URL(url).hostname === host;
      } catch {
        return false;
      }
    });
}

async function submit(endpoint, urlList) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "Warrantee-IndexNow/1.0 (+https://warrantee.io)",
    },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList,
    }),
  });

  return {
    endpoint,
    status: response.status,
    ok: response.status === 200 || response.status === 202,
    body: await response.text(),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const urls = args.map((arg) => {
    try {
      return new URL(arg).toString();
    } catch {
      throw new Error(`Invalid URL argument: ${arg}`);
    }
  });
  const urlList = urls.length > 0 ? urls : await readSitemapUrls();

  if (urlList.length === 0) {
    throw new Error("No URLs found to submit.");
  }

  const offHostUrl = urlList.find((url) => new URL(url).hostname !== host);
  if (offHostUrl) {
    throw new Error(`Refusing to submit URL outside ${host}: ${offHostUrl}`);
  }

  const results = [];
  for (const endpoint of endpoints) {
    results.push(await submit(endpoint, urlList));
  }

  const failed = results.filter((result) => !result.ok);
  console.log(
    JSON.stringify(
      {
        status: failed.length === 0 ? "ok" : "failed",
        host,
        keyLocation,
        submittedUrls: urlList.length,
        results,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
