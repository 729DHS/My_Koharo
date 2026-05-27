/**
 * IndexNow submission script
 * Reads the built sitemap and submits all URLs to Bing/Yandex via IndexNow API.
 *
 * Usage: node scripts/submit-indexnow.mjs
 * Run after `pnpm build` when deploying to production.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE = 'https://www.729dhs.site';
const KEY = '6e8f4b2c1a3d5f7e9b0c2d4a6f8e1b3c';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const DIST_DIR = resolve(process.cwd(), 'dist');

function parseUrls(xml) {
  const urls = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  for (const m of xml.matchAll(regex)) {
    urls.push(m[1].trim());
  }
  return urls;
}

async function main() {
  // 1. Read sitemap index
  const indexPath = resolve(DIST_DIR, 'sitemap-index.xml');
  let indexXml;
  try {
    indexXml = readFileSync(indexPath, 'utf8');
  } catch {
    console.error('sitemap-index.xml not found. Run `pnpm build` first.');
    process.exit(1);
  }

  // 2. Extract individual sitemap filenames from the index
  const sitemapRefs = parseUrls(indexXml);
  const allUrls = [];

  for (const ref of sitemapRefs) {
    // The sitemap ref is an absolute URL like https://www.729dhs.site/sitemap-0.xml
    const filename = ref.split('/').pop();
    const localPath = resolve(DIST_DIR, filename);
    try {
      const sitemapXml = readFileSync(localPath, 'utf8');
      const pageUrls = parseUrls(sitemapXml);
      allUrls.push(...pageUrls);
    } catch {
      console.warn(`Warning: Could not read ${localPath}, skipping.`);
    }
  }

  if (allUrls.length === 0) {
    console.log('No URLs found in sitemap.');
    return;
  }

  console.log(`Found ${allUrls.length} URLs in sitemap. Submitting to IndexNow...`);

  // 3. Submit to IndexNow API
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: allUrls,
    }),
  });

  if (response.ok) {
    console.log(`IndexNow: Successfully submitted ${allUrls.length} URLs to Bing & Yandex.`);
  } else {
    const body = await response.text();
    console.error(`IndexNow: Submission failed — HTTP ${response.status}: ${body}`);
    process.exit(1);
  }
}

main();
