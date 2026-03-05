/**
 * NDLA API Client
 *
 * Fetches educational content from NDLA's public API.
 * Caches responses locally to avoid repeated API calls during development.
 *
 * @see https://api.ndla.no
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '.cache');
const BASE_URL = 'https://api.ndla.no';
const DELAY_MS = 300; // Rate limit: wait between requests

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get cached response or null.
 */
async function getCache(key) {
  const path = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(path)) return null;
  try {
    const data = await readFile(path, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Write response to cache.
 */
async function setCache(key, data) {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
  await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(data, null, 2));
}

/**
 * Fetch a single article by ID with full content.
 *
 * @param {number} articleId - The NDLA article ID
 * @param {string} [language='nb'] - Language code
 * @returns {Promise<Object>} Article data with title, introduction, content (HTML), license, etc.
 */
export async function fetchArticle(articleId, language = 'nb') {
  const cacheKey = `article-${articleId}-${language}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`  [cache] Article ${articleId}`);
    return cached;
  }

  console.log(`  [fetch] Article ${articleId}...`);
  await sleep(DELAY_MS);

  const url = `${BASE_URL}/article-api/v2/articles/${articleId}?language=${language}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NDLA API error: ${res.status} ${res.statusText} for article ${articleId}`);
  }

  const data = await res.json();
  await setCache(cacheKey, data);
  return data;
}

/**
 * Search articles by query.
 *
 * @param {string} query - Search query
 * @param {Object} [options] - Search options
 * @param {string} [options.language='nb'] - Language code
 * @param {number} [options.pageSize=10] - Results per page
 * @returns {Promise<Object>} Search results with totalCount and results array
 */
export async function searchArticles(query, options = {}) {
  const { language = 'nb', pageSize = 10 } = options;
  const cacheKey = `search-${query.replace(/\s+/g, '_')}-${language}-${pageSize}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  console.log(`  [fetch] Search: "${query}"...`);
  await sleep(DELAY_MS);

  const params = new URLSearchParams({
    query,
    language,
    'page-size': String(pageSize),
  });
  const url = `${BASE_URL}/search-api/v1/search/?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NDLA search error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  await setCache(cacheKey, data);
  return data;
}
