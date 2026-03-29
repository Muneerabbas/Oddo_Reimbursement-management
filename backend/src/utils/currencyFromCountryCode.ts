import axios from "axios";

const REST_TIMEOUT_MS = 12_000;

export async function getDefaultCurrencyForCountryCode(alpha2: string): Promise<string> {
  const code = alpha2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error("INVALID_COUNTRY_CODE");
  }

  const { data } = await axios.get<unknown>(
    `https://restcountries.com/v3.1/alpha/${code}?fields=currencies,name`,
    { timeout: REST_TIMEOUT_MS },
  );

  const country = Array.isArray(data) ? data[0] : data;
  if (!country || typeof country !== "object" || !("currencies" in country)) {
    return "USD";
  }

  const currencies = (country as { currencies?: Record<string, unknown> }).currencies;
  if (!currencies || typeof currencies !== "object") {
    return "USD";
  }

  const keys = Object.keys(currencies).filter((k) => /^[A-Z]{3}$/.test(k));
  if (keys.length === 0) {
    return "USD";
  }

  return keys[0];
}
