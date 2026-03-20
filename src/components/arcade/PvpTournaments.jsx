import React from 'react';
import { Trophy, Calendar, Users, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const PvpTournaments = ({ tournaments, t, onJoin }) => {
    return (
        <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="text-purple-400" /> {t('arcade.tournamentsTitle') || 'Torneios'}
                </h3>
                <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('arcade.tournamentsPool') || 'Fundo Acumulado'}</p>
                    <p className="text-lg font-mono font-bold text-purple-400">{(tournaments.pool || 0).toFixed(0)} MPH</p>
                </div>
            </div>

            <div className="grid gap-4">
                {tournaments.list.map((tournament) => {
                    const statusColors = {
                        open: 'border-green-500 text-green-400',
                        live: 'border-red-500 text-red-400 animate-pulse',
                        upcoming: 'border-gray-500 text-gray-400'
                    };

                    const bgColors = {
                        yellow: 'from-yellow-900/20 to-black border-yellow-500/30',
                        green: 'from-green-900/20 to-black border-green-500/30',
                        blue: 'from-blue-900/20 to-black border-blue-500/30'
                    };

                    return (
                        <Card key={tournament.id} className={`bg-gradient-to-r ${bgColors[tournament.color] || 'from-gray-900 to-black'} p-4 relative overflow-hidden group`}>
                            <div className="absolute top-0 right-0 p-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusColors[tournament.status] || 'border-gray-500'}`}>
                                    {tournament.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="mb-4">
                                <h4 className="text-lg font-bold text-white mb-1">{tournament.nameKey ? (t(`arcade.${tournament.nameKey}`) || tournament.nameKey) : (tournament.name || '')}</h4>
                                <div className="flex gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Users size={12}/> {tournament.participants} {t('arcade.participants')}</span>
                                    <span className="flex items-center gap-1"><Calendar size={12}/> {tournament.status === 'live' ? t('arcade.live') : t('arcade.comingSoon')}</span>
                                </div>
                            </div>

                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] text-gray-500 mb-1">{t('arcade.entryFee') || 'Entrada'}</p>
                                    <p className="text-xl font-mono font-bold text-white">{tournament.entryFee} MPH</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 mb-1 text-right">{t('arcade.prizePool') || 'Prêmio'}</p>
                                    <p className="text-xl font-mono font-bold text-yellow-400">{tournament.prizePool} MPH</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <p className="text-[10px] text-gray-400 max-w-[60%]">
                                    {t('arcade.tournamentSplit')}
                                </p>
                                <Button 
                                    size="sm" 
                                    disabled={tournament.status !== 'open'}
                                    onClick={() => onJoin && onJoin(tournament.id)}
                                    className={`px-6 flex items-center justify-center gap-2 ${tournament.status === 'open' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                                >
                                    {tournament.status === 'open' ? t('arcade.participate') : t('arcade.closed')} <ArrowRight size={14} />
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
