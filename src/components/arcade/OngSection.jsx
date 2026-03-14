import React from 'react';
import { Heart, Globe } from 'lucide-react';
import { Card } from '../ui/Card';

export const OngSection = ({ ong, t }) => {
    return (
        <Card className="mb-6 bg-pink-900/10 border-pink-500/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 blur-3xl opacity-10 rounded-full"></div>
            
            <div className="flex items-start gap-4 z-10 relative">
                <div className="bg-pink-100 p-3 rounded-xl shadow-lg shadow-pink-500/20">
                    <Heart className="text-pink-600 animate-pulse" size={24} fill="currentColor" />
                </div>
                
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{t('arcade.socialImpact') || 'Impacto Social'}</h3>
                    <p className="text-xs text-pink-300 mb-3">
                        {t('arcade.ongDescription')} <span className="font-bold text-white underline decoration-pink-500">{t(`arcade.${ong.nameKey}`) || ong.nameKey}</span>.
                    </p>
                    
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('arcade.totalDonated') || 'Total Doado'}</p>
                            <p className="text-xl font-mono font-bold text-pink-400">
                                {ong.totalDonated.toLocaleString()} MPH
                            </p>
                        </div>
                        <div className="pl-4 border-l border-pink-500/20">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('arcade.currentPool') || 'Acumulado Atual'}</p>
                            <p className="text-xl font-mono font-bold text-white">
                                {ong.pool.toFixed(2)} MPH
                            </p>
                        </div>
                    </div>
                    
                    <a 
                        href="https://www.instagram.com/jardimdasborboletas/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 mt-3 transition-colors"
                    >
                        <Globe size={10} /> @jardimdasborboletas
                    </a>
                </div>
            </div>
        </Card>
    );
};
