import React, { useState, useEffect } from 'react';
import { Activity, Zap, Server, Cpu, Radio, ShieldCheck } from 'lucide-react';

export const MiningCluster = ({ status, index }) => {
  const [metrics, setMetrics] = useState({
    temp: 45,
    usage: 30,
    hash: 120
  });

  // Simula variações nas métricas quando está executando
  useEffect(() => {
    let interval;
    if (status === 'executing') {
      interval = setInterval(() => {
        setMetrics({
          temp: 65 + Math.random() * 15,
          usage: 85 + Math.random() * 14,
          hash: 450 + Math.random() * 100
        });
      }, 1000);
    } else {
      setMetrics({
        temp: 40 + Math.random() * 5,
        usage: 10 + Math.random() * 5,
        hash: 0
      });
    }
    return () => clearInterval(interval);
  }, [status]);

  const getStatusColor = () => {
    if (status === 'searching') return 'text-yellow-400 border-yellow-500/50 bg-yellow-900/10';
    if (status === 'analyzing') return 'text-blue-400 border-blue-500/50 bg-blue-900/10';
    if (status === 'executing') return 'text-green-400 border-green-500/50 bg-green-900/20';
    return 'text-gray-500 border-gray-800 bg-gray-900/50';
  };

  const getStatusGlow = () => {
    if (status === 'searching') return 'shadow-[0_0_15px_rgba(234,179,8,0.3)]';
    if (status === 'analyzing') return 'shadow-[0_0_15px_rgba(59,130,246,0.3)]';
    if (status === 'executing') return 'shadow-[0_0_20px_rgba(34,197,94,0.4)]';
    return '';
  };

  const isActive = status === 'executing';

  return (
    <div className={`relative overflow-hidden rounded-lg border transition-all duration-500 ${getStatusColor()} ${getStatusGlow()} p-3`}>
      {/* Background Grid Animation Overlay */}
      {isActive && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30 animate-pulse pointer-events-none"></div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <Server size={14} className={isActive ? 'animate-pulse' : ''} />
          <span className="font-mono text-xs font-bold tracking-wider">CLUSTER #{String(index).padStart(2, '0')}</span>
        </div>
        {isActive && <Activity size={14} className="animate-bounce" />}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono relative z-10">
        <div className="bg-black/40 rounded p-1.5 flex flex-col justify-between">
            <span className="text-gray-500 mb-1 flex items-center gap-1"><Cpu size={10}/> GPU LOAD</span>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${isActive ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gray-600'}`} 
                    style={{ width: `${metrics.usage}%` }}
                />
            </div>
            <span className="text-right mt-1">{metrics.usage.toFixed(0)}%</span>
        </div>

        <div className="bg-black/40 rounded p-1.5 flex flex-col justify-between">
            <span className="text-gray-500 mb-1 flex items-center gap-1"><Zap size={10}/> HASHRATE</span>
            <span className={`text-lg font-bold leading-none ${isActive ? 'text-white' : 'text-gray-600'}`}>
                {isActive ? metrics.hash.toFixed(0) : '--'} <span className="text-[8px] font-normal text-gray-500">MH/s</span>
            </span>
        </div>
      </div>

      {/* Footer Status Line */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 relative z-10">
        <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-ping' : 'bg-gray-600'}`}></div>
            <span>{isActive ? 'ONLINE' : 'STANDBY'}</span>
        </div>
        <span>{metrics.temp.toFixed(0)}°C</span>
      </div>
    </div>
  );
};
