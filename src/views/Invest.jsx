import React, { useContext, useState } from 'react';
import { Briefcase, Zap } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { THEME } from '../utils/theme';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const InvestView = ({ navigate }) => {
  const { addPlan, addNotification, state, t } = useContext(AppContext);
  // Separate states for inputs
  const [stdAmount, setStdAmount] = useState('');
  const [premAmount, setPremAmount] = useState('');

  // Calculate totals
  const totalInvested = state.plans.reduce((acc, p) => p.active ? acc + p.amount : acc, 0);
  // Valor Disponível = Saldo Atual na Carteira (balance_usd)
  const availableBalance = state.wallet.balance_usd || state.wallet.usd || 0;

  const handleBuy = async (planType, min, max, valStr, setVal) => {
    const val = parseFloat(valStr);
    if (!val || val < min || val > max) {
      addNotification(`${t('invest.invalidAmount')} $${min} - $${max}`, 'danger');
      return;
    }
    const success = await addPlan(planType, val);
    if (success) {
        setVal('');
    }
  };

  return (
    <div className="px-4 pb-24 animate-fadeIn">
        {/* NEW HEADER CONTAINERS */}
       <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
          <Card className="flex flex-col items-center justify-center text-center border-purple-500 bg-purple-900/20">
            <span className="text-xs text-purple-300 uppercase mb-1">{t('invest.available')}</span>
            <span className="text-xl font-bold text-white">${availableBalance.toFixed(2)}</span>
          </Card>
          <Card className="flex flex-col items-center justify-center text-center border-green-500 bg-green-900/20">
             <span className="text-xs text-green-300 uppercase mb-1">{t('invest.applied')}</span>
             <span className="text-xl font-bold text-white">${totalInvested.toFixed(2)}</span>
          </Card>
       </div>

      <div className="text-center py-2 mb-4">
        <h2 className={`text-2xl font-bold ${THEME.accent}`}>{t('invest.investHash')}</h2>
        <p className="text-gray-400 text-xs">{t('invest.tagline')}</p>
      </div>

      <div className="grid gap-6">
        {/* Standard */}
        <Card className="border-gray-700 relative group">
          <div className="absolute top-0 right-0 bg-gray-700 text-[10px] px-2 py-1 rounded-bl text-white">{t('invest.standardBadge')}</div>
          <h3 className="text-xl font-bold text-white mb-1">{t('invest.standardName')}</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-3xl font-bold text-purple-400">180%</span>
            <span className="text-sm text-gray-400 mb-1">{t('invest.totalProfit')}</span>
          </div>
          <ul className="text-xs text-gray-300 space-y-2 mb-4">
            <li className="flex justify-between"><span>{t('invest.dailyReturn')}</span> <span className="text-white">~1.0%</span></li>
            <li className="flex justify-between"><span>{t('invest.duration')}</span> <span className="text-white">180 dias</span></li>
            <li className="flex justify-between"><span>{t('invest.minmax')}</span> <span className="text-white">$10 - $1,999</span></li>
          </ul>
          <input 
            type="number" 
            placeholder={t('invest.usdValuePlaceholder')} 
            className="w-full bg-black border border-gray-700 rounded p-2 text-white mb-2 focus:border-purple-500 outline-none"
            value={stdAmount}
            onChange={(e) => setStdAmount(e.target.value)}
            />
            <Button onClick={() => handleBuy('standard', 10, 1999, stdAmount, setStdAmount)} className="w-full text-sm">
              {t('invest.unlockPassive')}
            </Button>
        </Card>

        {/* Premium */}
        <Card className="border border-[#ff00ff] shadow-[0_0_15px_rgba(255,0,255,0.2)] relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#ff00ff] text-black font-bold text-[10px] px-3 py-1 rounded-full uppercase">
            {t('invest.popular')}
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{t('invest.premiumName')}</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-3xl font-bold text-[#ff00ff]">1.3%</span>
            <span className="text-sm text-gray-400 mb-1">{t('invest.premiumDaily')}</span>
          </div>
          <ul className="text-xs text-gray-300 space-y-2 mb-4">
            <li className="flex justify-between"><span>{t('invest.totalReturn')}</span> <span className="text-white">{t('invest.lifetime')}</span></li>
            <li className="flex justify-between"><span>{t('invest.minmax')}</span> <span className="text-white">$2,000 - $1M</span></li>
            <li className="flex justify-between"><span className="text-yellow-400">Bonus:</span> <span className="text-white">Prioridade na Fila</span></li>
          </ul>
           {/* NEW INPUT FOR PREMIUM */}
           <input 
            type="number" 
            placeholder={t('invest.usdValuePlaceholder')} 
            className="w-full bg-black border border-[#ff00ff] rounded p-2 text-white mb-2 focus:border-purple-500 outline-none placeholder-gray-600"
            value={premAmount}
            onChange={(e) => setPremAmount(e.target.value)}
          />
           <Button onClick={() => handleBuy('premium', 2000, 99999999, premAmount, setPremAmount)} variant="outline" className="w-full text-sm">
            {t('invest.unlockPassive')}
          </Button>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Briefcase size={16}/> {t('invest.contractsActive')}</h3>
        <div className="space-y-2">
          {state.plans.filter(p => p.active).length === 0 && <p className="text-gray-500 text-sm">{t('invest.noneActive')}</p>}
          {state.plans.filter(p => p.active).map(plan => (
            <div key={plan.id} className="bg-gray-900 p-3 rounded flex justify-between items-center text-sm border-l-2 border-green-500">
              <div>
                <p className="font-bold text-white uppercase">{plan.type}</p>
                <p className="text-xs text-gray-400">{new Date(plan.startDate).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-white">${plan.amount}</p>
                <button className="text-[10px] text-red-400 underline">{t('invest.cancel')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
