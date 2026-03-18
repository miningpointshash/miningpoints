import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { 
    Users, DollarSign, TrendingUp, Trophy, ChevronDown, ChevronUp, 
    Activity, ArrowLeft, Loader, User, X
} from 'lucide-react';
import { Card } from '../components/ui/Card';

export const TeamDashboard = ({ onBack }) => {
    const { state, t } = useContext(AppContext);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [networkData, setNetworkData] = useState([]);
    const [earnings, setEarnings] = useState({
        total: 0,
        direct: 0,
        residual: 0,
        pvp: 0,
        lastDate: null
    });
    const [expandedLevel, setExpandedLevel] = useState(1);
    const [statusFilter, setStatusFilter] = useState('all');
    const [pvpVolumeTarget, setPvpVolumeTarget] = useState(null);
    const [pvpVolumeRows, setPvpVolumeRows] = useState([]);
    const [pvpVolumeLoading, setPvpVolumeLoading] = useState(false);
    const [pvpPersonalStats, setPvpPersonalStats] = useState(null);

    useEffect(() => {
        fetchTeamData();
    }, []);

    useEffect(() => {
        const fetchPvpVolume = async () => {
            if (!pvpVolumeTarget?.user_id) return;
            setPvpVolumeLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_pvp_downline_volume_by_level', {
                    p_root_user_id: pvpVolumeTarget.user_id,
                    p_max_level: 7
                });
                if (error) throw error;
                setPvpVolumeRows(Array.isArray(data) ? data : []);

                const { data: personal, error: personalError } = await supabase.rpc('get_pvp_personal_volume_stats', {
                    p_target_user_id: pvpVolumeTarget.user_id
                });
                if (!personalError && personal?.ok) setPvpPersonalStats(personal);
                else setPvpPersonalStats(null);
            } catch (e) {
                console.error('Erro ao buscar volume PVP:', e);
                setPvpVolumeRows([]);
                setPvpPersonalStats(null);
            } finally {
                setPvpVolumeLoading(false);
            }
        };
        fetchPvpVolume();
    }, [pvpVolumeTarget?.user_id]);

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const userId = state.user.id;

            // 1. Fetch Network Tree
            const { data: treeData, error: treeError } = await supabase
                .rpc('get_user_network', { search_user_id: userId });

            if (treeError) {
                console.error("RPC get_user_network error:", treeError);
                throw treeError;
            }
            
            console.log("Network Data Fetched:", treeData); // DEBUG LOG
            setNetworkData(treeData || []);

            // 2. Fetch Earnings
            const { data: earnData, error: earnError } = await supabase
                .rpc('get_network_earnings_summary', { target_user_id: userId });

            if (earnError) throw earnError;
            
            if (earnData && earnData.length > 0) {
                setEarnings({
                    total: earnData[0].total_earnings,
                    direct: earnData[0].direct_earnings,
                    residual: earnData[0].residual_earnings,
                    pvp: earnData[0].pvp_earnings,
                    lastDate: earnData[0].last_earning_date
                });
            }

        } catch (error) {
            console.error('Error fetching team data:', error);
            setLoadError(error?.message || 'Falha ao carregar sua rede.');
        } finally {
            setLoading(false);
        }
    };

    // Group users by level
    const usersByLevel = (networkData || []).reduce((acc, user) => {
        if (!acc[user.level]) acc[user.level] = [];
        acc[user.level].push(user);
        return acc;
    }, {});

    const statusCounts = (networkData || []).reduce(
        (acc, u) => {
            const s = String(u.status || '').toLowerCase();
            acc.all += 1;
            if (s === 'active') acc.active += 1;
            else if (s === 'inactive') acc.inactive += 1;
            else if (s === 'sponsored') acc.sponsored += 1;
            else if (s === 'blocked') acc.blocked += 1;
            else acc.other += 1;
            return acc;
        },
        { all: 0, active: 0, inactive: 0, sponsored: 0, blocked: 0, other: 0 }
    );

    const levels = [1, 2, 3, 4, 5, 6, 7];

    const getStatusLabel = (status) => {
        if (status === 'active') return <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">ATIVO</span>;
        if (status === 'sponsored') return <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">PATROCINADO</span>;
        if (status === 'inactive') return <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full">INATIVO</span>;
        if (status === 'blocked') return <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full">BLOQUEADO</span>;
        return <span className="bg-gray-900/30 text-gray-400 px-2 py-0.5 rounded-full">INATIVO</span>;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader size={32} className="animate-spin mb-4" />
                <p>{t('common.loading') || 'Loading...'}</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn pb-24 px-4">
            {pvpVolumeTarget && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-gray-900 border-gray-700 p-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-bold text-base">Volume PvP (7 gerações)</h3>
                                <p className="text-xs text-gray-400">{pvpVolumeTarget.username}</p>
                            </div>
                            <button
                                onClick={() => { setPvpVolumeTarget(null); setPvpVolumeRows([]); setPvpPersonalStats(null); }}
                                className="text-gray-400 hover:text-white transition"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4">
                            {pvpVolumeLoading ? (
                                <div className="text-center text-gray-400 text-sm py-6">Carregando...</div>
                            ) : (
                                <>
                                    {pvpPersonalStats?.ok && (
                                        <div className="mb-4 bg-black/40 border border-gray-800 rounded-lg p-3">
                                            <div className="text-xs font-bold text-white mb-2">{t('team.pvpOwnVolume')}</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-gray-900/40 border border-gray-800 rounded p-2">
                                                    <div className="text-[10px] text-gray-500 uppercase">{t('team.pvpBets')}</div>
                                                    <div className="text-xs font-mono font-bold text-pink-400">{Number(pvpPersonalStats.bets_mph || 0).toFixed(2)} MPH</div>
                                                    <div className="text-[10px] text-gray-500">{Number(pvpPersonalStats.bets_points || 0).toFixed(2)} {t('team.points')}</div>
                                                </div>
                                                <div className="bg-gray-900/40 border border-gray-800 rounded p-2">
                                                    <div className="text-[10px] text-gray-500 uppercase">{t('team.pvpFeePaid')}</div>
                                                    <div className="text-xs font-mono font-bold text-yellow-300">{Number(pvpPersonalStats.fee_paid_mph || 0).toFixed(2)} MPH</div>
                                                    <div className="text-[10px] text-gray-500">{Number(pvpPersonalStats.fee_paid_points || 0).toFixed(2)} {t('team.points')}</div>
                                                </div>
                                                <div className="bg-gray-900/40 border border-gray-800 rounded p-2 col-span-2">
                                                    <div className="text-[10px] text-gray-500 uppercase">{t('team.pvpProfit')}</div>
                                                    <div className={`text-xs font-mono font-bold ${Number(pvpPersonalStats.profit_mph || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {Number(pvpPersonalStats.profit_mph || 0) >= 0 ? '+' : ''}{Number(pvpPersonalStats.profit_mph || 0).toFixed(2)} MPH
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">
                                                        {Number(pvpPersonalStats.profit_points || 0) >= 0 ? '+' : ''}{Number(pvpPersonalStats.profit_points || 0).toFixed(2)} {t('team.points')}
                                                        {' • '}
                                                        {t('team.pvpWdl')} {Number(pvpPersonalStats.wins || 0)}-{Number(pvpPersonalStats.draws || 0)}-{Number(pvpPersonalStats.losses || 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
                                            const row = (pvpVolumeRows || []).find((r) => Number(r.level) === lvl);
                                            const members = Number(row?.members || 0);
                                            const vol = Number(row?.volume_mph || 0);
                                            return (
                                                <div key={lvl} className="bg-black/40 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                                                    <div className="text-xs text-gray-300 font-bold">Nível {lvl}</div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-gray-500">{members} membros</div>
                                                        <div className="text-xs font-mono font-bold text-pink-400">{vol.toFixed(2)} MPH</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 bg-gray-800/30 border border-gray-700 rounded-lg p-3 flex items-center justify-between">
                                        <div className="text-[10px] text-gray-500 uppercase">Total (1–7)</div>
                                        <div className="text-sm font-bold text-white font-mono">
                                            {(pvpVolumeRows || []).reduce((acc, r) => acc + Number(r?.volume_mph || 0), 0).toFixed(2)} MPH
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-6 mt-4">
                <button 
                    onClick={onBack}
                    className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition text-gray-400 hover:text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-white">{t('team.dashboardTitle')}</h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <Card className="bg-gradient-to-br from-purple-900/50 to-gray-900 border-purple-500/30">
                    <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-purple-300 font-bold uppercase tracking-wider">{t('team.totalEarnings')}</span>
                        <DollarSign size={16} className="text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                        $ {earnings.total.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                        {earnings.lastDate ? new Date(earnings.lastDate).toLocaleDateString() : '-'}
                    </div>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">{t('team.totalNetwork')}</span>
                        <Users size={16} className="text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {networkData.length}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                        {usersByLevel[1]?.length || 0} {t('team.directs')}
                    </div>
                </Card>
            </div>

            {loadError && (
                <div className="bg-red-900/20 border border-red-900/40 text-red-300 text-xs p-3 rounded-xl mb-6">
                    {loadError}
                </div>
            )}

            <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                    { k: 'all', label: 'Todos', count: statusCounts.all },
                    { k: 'active', label: 'Ativos', count: statusCounts.active },
                    { k: 'inactive', label: 'Inativos', count: statusCounts.inactive },
                    { k: 'sponsored', label: 'Patrocinados', count: statusCounts.sponsored },
                ].map((it) => (
                    <button
                        key={it.k}
                        onClick={() => setStatusFilter(it.k)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                            statusFilter === it.k
                                ? 'bg-purple-900/40 border-purple-500/40 text-white'
                                : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span>{it.label}</span>
                            <span className="text-[10px] text-gray-300">{it.count}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Earnings Breakdown */}
            <h3 className="text-sm font-bold text-gray-400 mb-3 px-1">{t('team.breakdown')}</h3>
            <div className="grid grid-cols-3 gap-2 mb-8">
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex flex-col items-center text-center">
                    <Trophy size={20} className="text-yellow-500 mb-2" />
                    <span className="text-[10px] text-gray-500 uppercase mb-1">{t('team.direct')}</span>
                    <span className="text-sm font-bold text-white">$ {earnings.direct.toFixed(2)}</span>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex flex-col items-center text-center">
                    <Activity size={20} className="text-green-500 mb-2" />
                    <span className="text-[10px] text-gray-500 uppercase mb-1">{t('team.residual')}</span>
                    <span className="text-sm font-bold text-white">$ {earnings.residual.toFixed(2)}</span>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex flex-col items-center text-center">
                    <TrendingUp size={20} className="text-pink-500 mb-2" />
                    <span className="text-[10px] text-gray-500 uppercase mb-1">{t('team.pvpFee')}</span>
                    <span className="text-sm font-bold text-white">$ {earnings.pvp.toFixed(2)}</span>
                </div>
            </div>

            {/* Network Tree */}
            <h3 className="text-sm font-bold text-gray-400 mb-3 px-1">{t('team.myNetwork')}</h3>
            <div className="space-y-3">
                {levels.map(level => {
                    const users = (usersByLevel[level] || []).filter((u) => {
                        if (statusFilter === 'all') return true;
                        return String(u.status || '').toLowerCase() === statusFilter;
                    });
                    const isExpanded = expandedLevel === level;
                    
                    // Definição de Comissões por Tipo
                    // Planos: 10%, 3%, 2%, 1%, 1%, 1%, 1%
                    // PVP: 30%, 20%, 10%, 5%, 5%, 5%, 5% (da parte da rede)
                    const planPct = level === 1 ? '10%' : level === 2 ? '3%' : level === 3 ? '2%' : '1%';
                    const pvpPct = level === 1 ? '30%' : level === 2 ? '20%' : level === 3 ? '10%' : '5%';

                    return (
                        <div key={level} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                            <button 
                                onClick={() => setExpandedLevel(isExpanded ? null : level)}
                                className={`w-full flex items-center justify-between p-4 transition-colors ${isExpanded ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${users.length > 0 ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'bg-gray-800 text-gray-500'}`}>
                                        {level}º
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white">{t('team.level')} {level}</div>
                                        <div className="text-[10px] text-gray-400 flex gap-2">
                                            <span>{t('team.plans')}: <span className="text-green-400">{planPct}</span></span>
                                            <span className="text-gray-600">|</span>
                                            <span>{t('team.pvp')}: <span className="text-pink-400">{pvpPct}</span></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-500">{users.length} {t('team.members')}</span>
                                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-800 bg-black/20">
                                    {users.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-600 italic">
                                            {t('team.noMembers')}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-800/50">
                                            {users.map(user => (
                                                <div key={user.user_id} className="p-3 flex items-center justify-between hover:bg-white/5 transition">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                                                            <User size={14} className="text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-white">{user.username}</div>
                                                            <div className="text-[10px] text-gray-500">
                                                                {t('team.since')} {new Date(user.joined_at).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-bold inline-block mb-1">
                                                            {getStatusLabel(user.status)}
                                                        </div>
                                                        <div className="flex justify-end gap-1 mb-1">
                                                            {user.is_eligible_plans && (
                                                                <span className="text-[9px] px-1 rounded border border-green-500/40 text-green-400 bg-green-900/10">
                                                                    PLANO
                                                                </span>
                                                            )}
                                                            {user.is_eligible_pvp && (
                                                                <span className="text-[9px] px-1 rounded border border-pink-500/40 text-pink-400 bg-pink-900/10">
                                                                    PVP
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">
                                                            Vol: ${user.personal_volume || 0}
                                                        </div>
                                                        <button
                                                            onClick={() => setPvpVolumeTarget({ user_id: user.user_id, username: user.username })}
                                                            className="mt-1 text-[10px] text-pink-400 hover:text-pink-300 transition underline"
                                                        >
                                                            Ver PvP 7G
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
