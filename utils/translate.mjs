import fs from 'node:fs/promises';

const index = 7;

const DEFAULT_URL = `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/refs/heads/main/wordlists/exclusive/new/${index}.json`;

const url = process.argv[2] || DEFAULT_URL;
const outPath = process.argv[3] || `./${index}.vi.json`;

// Tune nếu cần
const CONCURRENCY = 4; // giảm xuống 1-2 nếu bị rate limit
const MIN_DELAY_MS = 250; // delay giữa các request trong cùng worker
const MAX_RETRIES = 6;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s ?? '').trim();

// --- Your translate() function (JS version) ---
export async function translate(inputText, options) {
  return fetch(`https://translate-pa.googleapis.com/v1/translateHtml`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json+protobuf',
      'X-Goog-API-Key': 'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520',
    },
    body: JSON.stringify([[[inputText], options?.from || 'en', options?.to || 'vi'], 'wt_lib']),
    ...(options?.fetchOptions ?? {}),
  })
    .then(r => r.json())
    .then(response => {
      return {
        text: response?.[0]?.[0] ?? '',
        raw: inputText,
      };
    });
}

async function fetchJson(u) {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function translateWithRetry(text) {
  if (!text) return '';
  let lastErr = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const {text: vi} = await translate(text, {from: 'en', to: 'vi'});
      return typeof vi === 'string' ? vi : '';
    } catch (e) {
      lastErr = e;
      const backoff = Math.min(8000, 500 * Math.pow(2, attempt));
      await sleep(backoff);
    }
  }
  throw lastErr ?? new Error('translate failed');
}

function collectMeanings(data) {
  const list = [];
  for (const item of data) {
    for (const form of item?.forms ?? []) {
      if (!Array.isArray(form?.meanings)) continue;
      for (const m of form.meanings) {
        const key = norm(m);
        if (key) list.push(key);
      }
    }
  }
  return list;
}

function applyTranslations(data, map) {
  for (const item of data) {
    for (const form of item?.forms ?? []) {
      if (!Array.isArray(form?.meanings)) continue;
      form.meanings = form.meanings.map(m => {
        const key = norm(m);
        return map.get(key) ?? m;
      });
    }
  }
  return data;
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx], idx);
      await sleep(MIN_DELAY_MS);
    }
  }

  const workers = Array.from({length: Math.max(1, concurrency)}, () => runner());
  await Promise.all(workers);
  return results;
}

(async () => {
  console.log('Fetching:', url);
  const data = await fetchJson(url);

  if (!Array.isArray(data)) {
    throw new Error('Expected JSON array at top level');
  }

  // cache để tránh dịch trùng
  const cache = new Map();
  const allMeanings = collectMeanings(data);

  const unique = [];
  for (const m of allMeanings) {
    if (!cache.has(m)) {
      cache.set(m, ''); // placeholder
      unique.push(m);
    }
  }

  let done = 0;

  await runPool(
    unique,
    async m => {
      const vi = await translateWithRetry(m);
      cache.set(m, vi);

      done++;
      if (done % 25 === 0 || done === unique.length) {
        console.log(`Translated ${done}/${unique.length}`);
      }
      return vi;
    },
    CONCURRENCY
  );

  const out = applyTranslations(data, cache);

  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote:', outPath);
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
