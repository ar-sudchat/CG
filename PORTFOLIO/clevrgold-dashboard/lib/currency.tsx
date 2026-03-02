'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

type Currency = 'USD' | 'THB';

interface CurrencyContextType {
  currency: Currency;
  rate: number;
  toggle: () => void;
  convert: (usd: number) => number;
  symbol: string;
}

const FALLBACK_RATE = 31;

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  rate: FALLBACK_RATE,
  toggle: () => {},
  convert: (usd) => usd,
  symbol: '$',
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rate, setRate] = useState(FALLBACK_RATE);

  // Fetch live USD/THB rate
  useEffect(() => {
    let mounted = true;
    async function fetchRate() {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.rates?.THB) {
          setRate(Math.round(data.rates.THB * 100) / 100);
        }
      } catch {
        // keep fallback rate
      }
    }
    fetchRate();
    // Refresh rate every 30 minutes
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const toggle = useCallback(() => {
    setCurrency((prev) => (prev === 'USD' ? 'THB' : 'USD'));
  }, []);

  const convert = useCallback(
    (usd: number) => (currency === 'THB' ? usd * rate : usd),
    [currency, rate]
  );

  const symbol = currency === 'THB' ? '฿' : '$';

  return (
    <CurrencyContext.Provider value={{ currency, rate, toggle, convert, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
