import React, { useState } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import { Card } from '../ui/Card';

export const PvpRankings = ({ rankings, t }) => {
    const [tab, setTab] = useState('monthly'); // 'monthly', 'biweekly'

    const currentRanking = tab === 'monthly' ? rankings.monthly : rankings.biweekly;
    const pool = currentRanking.pool;
    const getAvatarSrc = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '/assets/persona/mp_p6.svg';
        if (/^https?:\/\//i.test(raw)) return raw;
        return `/assets/persona/${raw}.svg`;
    };

    const getPrizeShare = (position) => {
        if (position === 1) return 0.40;
        if (position === 2) return 0.15;
        if (position === 3) return 0.10;
        if (position >= 4 && position <= 10) return 0.05;
        return 0;
    };

    return (
        <Card className="mb-6 border-yellow-500/50 bg-gradient-to-b from-gray-900 to-black">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="text-yellow-400" /> {t('arcade.rankingsTitle') || 'Rankings'}
                </h3>
                <div className="flex bg-gray-800 rounded-lg p-1">
                    <button 
                        onClick={() => setTab('monthly')}
                        className={`px-3 py-1 text-xs rounded transition-all ${tab === 'monthly' ? 'bg-yellow-500 text-black font-bold' : 'text-gray-400'}`}
                    >
                        {t('arcade.monthly') || 'Mensal'}
                    </button>
                    <button 
                        onClick={() => setTab('biweekly')}
                        className={`px-3 py-1 text-xs rounded transition-all ${tab === 'biweekly' ? 'bg-yellow-500 text-black font-bold' : 'text-gray-400'}`}
                    >
                        {t('arcade.biweekly') || 'Quinzenal'}
                    </button>
                </div>
            </div>

            <div className="text-center mb-6 bg-yellow-900/20 py-3 rounded-lg border border-yellow-900/50">
                <p className="text-xs text-yellow-500 uppercase tracking-widest mb-1">{t('arcade.prizePool') || 'Fundo de Prêmios'}</p>
                <p className="text-2xl font-mono font-bold text-yellow-400">{pool.toFixed(0)} MPH</p>
                <p className="text-[10px] text-gray-400 mt-1">
                    {t('arcade.participants') || 'Participantes'}: {Number(currentRanking.participants || 0)}
                </p>
            </div>

            <div className="space-y-2">
                {(currentRanking.users || []).map((user, index) => {
                    const position = index + 1;
                    const prize = pool * getPrizeShare(position);
                    
                    let rankIcon = <span className="font-mono font-bold text-gray-500 w-6 text-center">{position}º</span>;
                    if (position === 1) rankIcon = <Crown size={20} className="text-yellow-400 w-6" />;
                    if (position === 2) rankIcon = <Medal size={20} className="text-gray-300 w-6" />;
                    if (position === 3) rankIcon = <Medal size={20} className="text-amber-600 w-6" />;

                    return (
                        <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg border ${position === 1 ? 'bg-yellow-900/10 border-yellow-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8">
                                    {rankIcon}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600">
                                    <img src={getAvatarSrc(user.avatar || 'mp_p6')} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{user.name}</p>
                                    <p className="text-[10px] text-gray-400">{user.score} pts</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">{t('arcade.estimatedPrize') || 'Prêmio Est.'}</p>
                                <p className="font-mono font-bold text-green-400">+{prize.toFixed(0)} MPH</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
