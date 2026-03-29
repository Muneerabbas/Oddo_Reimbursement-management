async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const ratesCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchRates(baseCurrency) {
  const base = String(baseCurrency || '').toUpperCase();
  const cached = ratesCache.get(base);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const response = await fetchWithTimeout(
    `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(base)}`,
    10000,
  );
  if (!response.ok) {
    throw new Error('Currency conversion service unavailable.');
  }
  const data = await response.json();
  ratesCache.set(base, { data, fetchedAt: Date.now() });
  return data;
}

export async function convertCurrencyAmount(amount, baseCurrency, targetCurrency) {
  const a = Number(amount);
  const base = String(baseCurrency || '').toUpperCase();
  const target = String(targetCurrency || '').toUpperCase();

  if (!Number.isFinite(a) || a <= 0) return null;
  if (!base || !target || base === target) {
    return { convertedAmount: a, rate: 1 };
  }

  const data = await fetchRates(base);
  const rate = data?.rates?.[target];
  if (!rate) throw new Error(`No conversion rate for ${target}.`);

  return {
    convertedAmount: Number((a * rate).toFixed(2)),
    rate: Number(rate),
  };
}

