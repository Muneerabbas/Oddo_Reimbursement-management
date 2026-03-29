import React, { useEffect, useState } from 'react';
import { useCurrency } from '../../hooks/useCurrency';
import { convertCurrencyAmount, formatCurrencyValue, normalizeCurrencyCode } from '../../services/currencyService';

const CurrencyAmount = ({
  amount,
  currency,
  className = '',
  showOriginal = false,
  fallback = '-',
}) => {
  const { selectedCurrency } = useCurrency();
  const [displayValue, setDisplayValue] = useState(() => formatCurrencyValue(amount, currency));
  const [originalValue, setOriginalValue] = useState(() => formatCurrencyValue(amount, currency));

  useEffect(() => {
    let active = true;

    const renderAmount = async () => {
      const numericAmount = Number(amount);
      const sourceCurrency = normalizeCurrencyCode(currency, selectedCurrency);
      const targetCurrency = normalizeCurrencyCode(selectedCurrency);

      if (!Number.isFinite(numericAmount)) {
        if (!active) return;
        setDisplayValue(fallback);
        setOriginalValue(fallback);
        return;
      }

      const formattedOriginal = formatCurrencyValue(numericAmount, sourceCurrency);
      if (!active) return;
      setOriginalValue(formattedOriginal);

      if (sourceCurrency === targetCurrency) {
        setDisplayValue(formattedOriginal);
        return;
      }

      try {
        const result = await convertCurrencyAmount(numericAmount, sourceCurrency, targetCurrency);
        if (!active || !result) return;
        setDisplayValue(formatCurrencyValue(result.convertedAmount, targetCurrency));
      } catch {
        if (!active) return;
        setDisplayValue(formattedOriginal);
      }
    };

    void renderAmount();
    return () => {
      active = false;
    };
  }, [amount, currency, fallback, selectedCurrency]);

  if (showOriginal && displayValue !== originalValue) {
    return (
      <span className={className}>
        <span>{displayValue}</span>
        <span className="block text-xs font-medium text-slate-500">{originalValue}</span>
      </span>
    );
  }

  return <span className={className}>{displayValue}</span>;
};

export default CurrencyAmount;
