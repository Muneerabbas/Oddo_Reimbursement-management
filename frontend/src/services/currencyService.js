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

export async function getExchangeRates(baseCurrency) {
  return await fetchRates(baseCurrency);
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

export function normalizeCurrencyCode(code) {
  if (!code || typeof code !== 'string') return 'USD';
  return code.trim().toUpperCase();
}

export async function fetchCountryCurrencyCatalog() {
  const response = await fetchWithTimeout('https://restcountries.com/v3.1/all?fields=name,currencies,cca2', 10000);
  if (!response.ok) {
    throw new Error('Failed to load country catalog from restcountries.com');
  }
  const data = await response.json();
  
  const countries = [];
  const currenciesMap = new Map();

  for (const item of data) {
    if (!item.currencies) continue;
    
    // ISO 3166-1 alpha-2 country code
    const code = item.cca2;
    const name = item.name?.common || item.name?.official;
    
    if (!code || !name) continue;

    const currencyCodes = Object.keys(item.currencies);
    const countryCurrencies = [];
    
    for (const cCode of currencyCodes) {
      const curr = item.currencies[cCode];
      if (!currenciesMap.has(cCode)) {
        currenciesMap.set(cCode, {
          code: cCode,
          name: curr.name || cCode,
          symbol: curr.symbol || cCode
        });
      }
      countryCurrencies.push({ code: cCode, name: curr.name });
    }

    if (countryCurrencies.length > 0) {
      countries.push({
        name,
        code,
        currencies: countryCurrencies,
        defaultCurrency: countryCurrencies[0].code
      });
    }
  }

  // Sort alphabetically
  countries.sort((a, b) => a.name.localeCompare(b.name));
  const currencies = Array.from(currenciesMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  return { countries, currencies };
}

export async function getDefaultCurrencyForCountryCode(cca2) {
  if (!cca2) return 'USD';
  try {
    const { countries } = await fetchCountryCurrencyCatalog();
    const country = countries.find(c => c.code === cca2.toUpperCase());
    return country ? country.defaultCurrency : 'USD';
  } catch (error) {
    console.error('Failed to get default currency:', error);
    return 'USD';
  }
}

