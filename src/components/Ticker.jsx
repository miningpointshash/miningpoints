import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'mp_ticker_cache_v1';

const defaultAssets = [
  { symbol: 'BTC', priceUsd: 64230.12, change24hPct: -0.1 },
  { symbol: 'ETH', priceUsd: 3450.45, change24hPct: 0.1 },
  { symbol: 'BNB', priceUsd: 590.2, change24hPct: 0.1 },
  { symbol: 'SOL', priceUsd: 145.8, change24hPct: -0.1 },
  { symbol: 'MPH', priceUsd: 0.001, change24hPct: 0.1 },
];

const formatUsd = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
};

const mapChange = (pct) => {
  const n = Number(pct);
  if (!Number.isFinite(n)) return { cls: 'text-gray-500', arrow: '' };
  if (n > 0) return { cls: 'text-green-500', arrow: '▲' };
  if (n < 0) return { cls: 'text-red-500', arrow: '▼' };
  return { cls: 'text-gray-500', arrow: '' };
};

export const Ticker = () => {
  const [assets, setAssets] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultAssets;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.assets)) return defaultAssets;
      if (!parsed.at || Date.now() - Number(parsed.at) > 1000 * 60 * 10) return defaultAssets;
      return parsed.assets;
    } catch {
      return defaultAssets;
    }
  });

  const marqueeAssets = useMemo(() => [...assets, ...assets], [assets]);

  useEffect(() => {
    let aborted = false;

    const fetchPrices = async () => {
      try {
        let next = null;

        if (supabase?.functions?.invoke) {
          const { data, error } = await supabase.functions.invoke('crypto-ticker', {
            body: { symbols: ['BTC', 'ETH', 'BNB', 'SOL'] },
          });

          if (!error && data?.assets && Array.isArray(data.assets)) {
            next = data.assets.map((a) => ({
              symbol: String(a?.symbol || ''),
              priceUsd: Number.isFinite(Number(a?.priceUsd)) ? Number(a.priceUsd) : 0,
              change24hPct: Number.isFinite(Number(a?.change24hPct)) ? Number(a.change24hPct) : 0,
            })).filter((a) => a.symbol);
          }
        }

        if (!next) {
          const url = new URL('https://api.coingecko.com/api/v3/simple/price');
          url.searchParams.set('ids', 'bitcoin,ethereum,binancecoin,solana');
          url.searchParams.set('vs_currencies', 'usd');
          url.searchParams.set('include_24hr_change', 'true');

          const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          next = [
            {
              symbol: 'BTC',
              priceUsd: data?.bitcoin?.usd ?? null,
              change24hPct: data?.bitcoin?.usd_24h_change ?? null,
            },
            {
              symbol: 'ETH',
              priceUsd: data?.ethereum?.usd ?? null,
              change24hPct: data?.ethereum?.usd_24h_change ?? null,
            },
            {
              symbol: 'BNB',
              priceUsd: data?.binancecoin?.usd ?? null,
              change24hPct: data?.binancecoin?.usd_24h_change ?? null,
            },
            {
              symbol: 'SOL',
              priceUsd: data?.solana?.usd ?? null,
              change24hPct: data?.solana?.usd_24h_change ?? null,
            },
            assets.find((a) => a.symbol === 'MPH') || defaultAssets.find((a) => a.symbol === 'MPH'),
          ].filter(Boolean).map((a) => ({
            symbol: a.symbol,
            priceUsd: Number.isFinite(Number(a.priceUsd)) ? Number(a.priceUsd) : 0,
            change24hPct: Number.isFinite(Number(a.change24hPct)) ? Number(a.change24hPct) : 0,
          }));
        }

        if (aborted) return;
        setAssets(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), assets: next }));
        } catch {}
      } catch {}
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => {
      aborted = true;
      clearInterval(interval);
    };
  }, []);
  
  return (
    <div className="overflow-hidden bg-black py-2 border-b border-gray-800">
      <div className="flex animate-marquee whitespace-nowrap gap-8">
        {marqueeAssets.map((c, i) => {
          const trend = mapChange(c.change24hPct);
          return (
          <div key={i} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-white font-bold">{c.symbol}</span>
            <span className={trend.cls}>
              {formatUsd(c.priceUsd)} {trend.arrow}
            </span>
          </div>
        )})}
      </div>
    </div>
  );
};
