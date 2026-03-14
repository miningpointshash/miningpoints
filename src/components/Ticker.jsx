import React from 'react';

export const Ticker = () => {
  const cryptos = [
    { s: 'BTC', p: 64230.12, c: 'down' },
    { s: 'ETH', p: 3450.45, c: 'up' },
    { s: 'BNB', p: 590.20, c: 'up' },
    { s: 'SOL', p: 145.80, c: 'down' },
    { s: 'MPH', p: 0.001, c: 'up' },
  ];
  
  return (
    <div className="overflow-hidden bg-black py-2 border-b border-gray-800">
      <div className="flex animate-marquee whitespace-nowrap gap-8">
        {[...cryptos, ...cryptos].map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-white font-bold">{c.s}</span>
            <span className={c.c === 'up' ? 'text-green-500' : 'text-red-500'}>
              ${c.p} {c.c === 'up' ? '▲' : '▼'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
