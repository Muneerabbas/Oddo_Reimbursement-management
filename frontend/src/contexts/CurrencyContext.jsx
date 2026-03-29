import React, { createContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchCountryCurrencyCatalog,
  getDefaultCurrencyForCountryCode,
  normalizeCurrencyCode,
  getExchangeRates
} from '../services/currencyService';

const DISPLAY_CURRENCY_KEY = 'displayCurrency';

export const CurrencyContext = createContext({
  selectedCurrency: 'USD',
  setSelectedCurrency: () => {},
  currencyOptions: [],
  countries: [],
  isLoading: true,
  getCountryDefaultCurrency: async () => null,
});

export const CurrencyProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrencyState] = useState(() => {
    const stored = localStorage.getItem(DISPLAY_CURRENCY_KEY);
    return normalizeCurrencyCode(stored || user?.company?.defaultCurrency || 'USD');
  });
  const [catalog, setCatalog] = useState({ countries: [], currencies: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState(null);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        const nextCatalog = await fetchCountryCurrencyCatalog();
        if (!active) return;
        setCatalog(nextCatalog);
      } catch (error) {
        if (!active) return;
        console.error('Failed to load country/currency catalog:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(DISPLAY_CURRENCY_KEY);
    if (stored) {
      return;
    }

    if (user?.company?.defaultCurrency) {
      setSelectedCurrencyState(normalizeCurrencyCode(user.company.defaultCurrency));
    }
  }, [user?.company?.defaultCurrency]);

  useEffect(() => {
    localStorage.setItem(DISPLAY_CURRENCY_KEY, normalizeCurrencyCode(selectedCurrency));
  }, [selectedCurrency]);

  useEffect(() => {
    let active = true;
    const loadRates = async () => {
      try {
        const data = await getExchangeRates(selectedCurrency);
        if (active && data?.rates) {
          setExchangeRates(data.rates);
        }
      } catch (err) {
        if (active) console.error('Failed to load rates for', selectedCurrency, err);
      }
    };
    void loadRates();
    return () => { active = false; };
  }, [selectedCurrency]);

  const convertAmount = useCallback((amount, expenseCurrency = 'USD') => {
    const a = Number(amount);
    if (!Number.isFinite(a)) return 0;
    if (!exchangeRates) return a;
    
    const targetCode = normalizeCurrencyCode(expenseCurrency);
    if (targetCode === selectedCurrency) return a;
    
    const rate = exchangeRates[targetCode];
    if (!rate) return a;
    
    return a / rate;
  }, [exchangeRates, selectedCurrency]);

  const formatAmount = useCallback((amount, expenseCurrency = 'USD') => {
    const converted = convertAmount(amount, expenseCurrency);
    const code = selectedCurrency;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
      }).format(converted);
    } catch {
      return `${code} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
  }, [convertAmount, selectedCurrency]);

  const contextValue = useMemo(() => ({
    selectedCurrency: normalizeCurrencyCode(selectedCurrency),
    setSelectedCurrency: (value) => setSelectedCurrencyState(normalizeCurrencyCode(value)),
    currencyOptions: catalog.currencies,
    countries: catalog.countries,
    isLoading,
    getCountryDefaultCurrency: getDefaultCurrencyForCountryCode,
    convertAmount,
    formatAmount,
    exchangeRatesLoaded: !!exchangeRates
  }), [catalog.countries, catalog.currencies, isLoading, selectedCurrency, convertAmount, formatAmount, exchangeRates]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};
