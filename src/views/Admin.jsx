import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { 
    Users, Shield, DollarSign, Activity, Edit2, Search, Filter, 
    Check, X, AlertTriangle, Zap, Lock, Unlock, RefreshCw, User,
    Settings, CreditCard, Bitcoin, Save, Eye, EyeOff, Network, ChevronDown, ChevronUp, Trophy, TrendingUp, MessageSquare, Mail, Copy
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import SupportAdmin from '../components/admin/SupportAdmin';
import WithdrawalManager from '../components/admin/WithdrawalManager';
import ForumReportsAdmin from '../components/admin/ForumReportsAdmin';
import { AdminAuditLogList } from '../components/admin/AdminAuditLogList';

// Componente para visualizar a rede de um usuário (Adaptado do TeamDashboard)
const NetworkViewer = ({ userId, username, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [networkData, setNetworkData] = useState([]);
    const [expandedLevel, setExpandedLevel] = useState(1);
    const [earnings, setEarnings] = useState({ total: 0, direct: 0, residual: 0, pvp: 0 });
    const [pvpTxLoading, setPvpTxLoading] = useState(false);
    const [pvpTxRows, setPvpTxRows] = useState([]);
    const [pvpLevelFilter, setPvpLevelFilter] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Buscar Árvore de Rede
                const { data: treeData, error: treeError } = await supabase
                    .rpc('get_user_network', { search_user_id: userId });
                
                if (treeError) throw treeError;
                setNetworkData(treeData || []);

                // 2. Buscar Ganhos de Rede
                const { data: earnData, error: earnError } = await supabase
                    .rpc('get_network_earnings_summary', { target_user_id: userId });

                if (earnError) throw earnError;

                if (earnData && earnData.length > 0) {
                    setEarnings({
                        total: earnData[0].total_earnings || 0,
                        direct: earnData[0].direct_earnings || 0,
                        residual: earnData[0].residual_earnings || 0,
                        pvp: earnData[0].pvp_earnings || 0
                    });
                }

                setPvpTxLoading(true);
                const { data: txData, error: txError } = await supabase
                    .from('transactions')
                    .select('id,amount,currency,status,description,origin_user_id,commission_level,created_at')
                    .eq('user_id', userId)
                    .eq('type', 'unilevel_bonus')
                    .eq('currency', 'MPH')
                    .eq('status', 'completed')
                    .ilike('description', '%pvp%')
                    .order('created_at', { ascending: false })
                    .limit(80);

                if (txError) throw txError;

                const originIds = Array.from(
                    new Set((txData || []).map((r) => r.origin_user_id).filter(Boolean))
                );

                let originMap = {};
                if (originIds.length > 0) {
                    const { data: originProfiles, error: originError } = await supabase
                        .from('profiles')
                        .select('id,username,email')
                        .in('id', originIds);
                    if (!originError && Array.isArray(originProfiles)) {
                        originMap = originProfiles.reduce((acc, p) => {
                            acc[p.id] = p;
                            return acc;
                        }, {});
                    }
                }

                const rows = (txData || []).map((r) => ({
                    ...r,
                    origin: r.origin_user_id ? originMap[r.origin_user_id] : null
                }));
                setPvpTxRows(rows);
            } catch (error) {
                console.error("Erro ao carregar rede:", error);
            } finally {
                setLoading(false);
                setPvpTxLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    // Agrupar usuários por nível
    const usersByLevel = (networkData || []).reduce((acc, user) => {
        if (!acc[user.level]) acc[user.level] = [];
        acc[user.level].push(user);
        return acc;
    }, {});

    const levels = [1, 2, 3, 4, 5, 6, 7];

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl h-[85vh] bg-gray-900 border-gray-700 p-0 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-xl text-white flex items-center gap-2">
                            <Network size={24} className="text-blue-500" />
                            Rede de: {username}
                        </h3>
                        <p className="text-xs text-gray-500">Total na Rede: {networkData.length} membros</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={onClose}><X size={24} /></Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Carregando dados da rede...</div>
                    ) : (
                        <>
                            {/* Resumo de Ganhos */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Card className="bg-gray-800 border-gray-700 p-3 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">Total Ganho</p>
                                    <p className="text-lg font-bold text-green-400">${earnings.total.toFixed(2)}</p>
                                </Card>
                                <Card className="bg-gray-800 border-gray-700 p-3 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">Indicação</p>
                                    <p className="text-lg font-bold text-yellow-400">${earnings.direct.toFixed(2)}</p>
                                </Card>
                                <Card className="bg-gray-800 border-gray-700 p-3 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">Residual</p>
                                    <p className="text-lg font-bold text-blue-400">${earnings.residual.toFixed(2)}</p>
                                </Card>
                                <Card className="bg-gray-800 border-gray-700 p-3 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">PVP</p>
                                    <p className="text-lg font-bold text-pink-400">${earnings.pvp.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-500">{(Number(earnings.pvp || 0) * 100).toFixed(2)} MPH</p>
                                </Card>
                            </div>

                            <Card className="bg-gray-800/40 border-gray-700 p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="text-sm font-bold text-white">Ganhos PvP (linha a linha)</div>
                                    <select
                                        value={pvpLevelFilter}
                                        onChange={(e) => setPvpLevelFilter(e.target.value)}
                                        className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
                                    >
                                        <option value="all">Todos níveis</option>
                                        {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                                            <option key={lvl} value={String(lvl)}>Nível {lvl}</option>
                                        ))}
                                    </select>
                                </div>
                                {pvpTxLoading ? (
                                    <div className="text-center text-gray-500 text-sm py-6">Carregando PvP...</div>
                                ) : (
                                    <div className="space-y-2">
                                        {(pvpTxRows || [])
                                            .filter((r) => pvpLevelFilter === 'all' || String(r.commission_level) === String(pvpLevelFilter))
                                            .slice(0, 50)
                                            .map((r) => {
                                                const mph = Number(r.amount || 0);
                                                const points = mph / 100;
                                                const originLabel = r.origin?.username || (r.origin?.email || (r.origin_user_id ? String(r.origin_user_id).slice(0, 8) : '—'));
                                                const lvl = Number(r.commission_level || 0);
                                                return (
                                                    <div key={r.id} className="bg-black/40 border border-gray-800 rounded-lg p-3 flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-xs text-gray-300 font-bold truncate">Origem: {originLabel}</div>
                                                            <div className="text-[10px] text-gray-500">
                                                                Nível: <span className="text-gray-300 font-mono">{lvl || '-'}</span>
                                                                {' • '}
                                                                {new Date(r.created_at).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-mono font-bold text-pink-400">+{mph.toFixed(2)} MPH</div>
                                                            <div className="text-[10px] text-gray-500">$ {points.toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        {(!pvpTxRows || pvpTxRows.length === 0) && (
                                            <div className="text-center text-gray-500 text-sm py-6">Nenhum ganho PvP encontrado.</div>
                                        )}
                                    </div>
                                )}
                            </Card>

                            {/* Árvore de Rede */}
                            <div className="space-y-2">
                                {levels.map(level => {
                                    const users = usersByLevel[level] || [];
                                    const isExpanded = expandedLevel === level;
                                    
                                    // Percentuais (Apenas visualização)
                                    const planPct = level === 1 ? '10%' : level === 2 ? '3%' : level === 3 ? '2%' : '1%';
                                    const pvpPct = level === 1 ? '30%' : level === 2 ? '20%' : level === 3 ? '10%' : '5%';

                                    return (
                                        <div key={level} className="bg-black/40 rounded border border-gray-800 overflow-hidden">
                                            <button 
                                                onClick={() => setExpandedLevel(isExpanded ? null : level)}
                                                className={`w-full flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-gray-800' : 'hover:bg-gray-800/30'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/20">
                                                        {level}º
                                                    </span>
                                                    <div className="text-left">
                                                        <span className="text-sm font-bold text-gray-300 block">Nível {level}</span>
                                                        <span className="text-[10px] text-gray-500">Comissão: {planPct} | PVP: {pvpPct}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{users.length} membros</span>
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t border-gray-800 bg-black/60 p-2">
                                                    {users.length === 0 ? (
                                                        <p className="text-xs text-gray-600 text-center py-2">Nenhum indicado neste nível.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {users.map(u => (
                                                                <div key={u.user_id} className="flex justify-between items-center bg-white/5 p-2 rounded hover:bg-white/10 transition">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-white flex items-center gap-2">
                                                                            {u.username}
                                                                            <span className={`text-[9px] px-1 rounded border ${
                                                                                u.status === 'active' ? 'border-green-500 text-green-400' : 
                                                                                u.status === 'sponsored' ? 'border-blue-500 text-blue-400' :
                                                                                'border-red-500 text-red-400'
                                                                            }`}>
                                                                                {u.status === 'active' ? 'ATIVO' : u.status === 'sponsored' ? 'PATROCINADO' : 'INATIVO'}
                                                                            </span>
                                                                            {u.is_eligible_plans && (
                                                                                <span className="text-[9px] px-1 rounded border border-green-500/40 text-green-400 bg-green-900/10">
                                                                                    PLANO
                                                                                </span>
                                                                            )}
                                                                            {u.is_eligible_pvp && (
                                                                                <span className="text-[9px] px-1 rounded border border-pink-500/40 text-pink-400 bg-pink-900/10">
                                                                                    PVP
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-500">Entrou em: {new Date(u.joined_at).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[10px] text-gray-400">Vol: <span className="text-white">${u.personal_volume || 0}</span></p>
                                                                        <p className="text-[10px] text-gray-400">Linhas: <span className="text-white">{u.active_lines || 0}</span></p>
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
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
};

// Subcomponentes para listas financeiras (Para não poluir o AdminView principal)
const FinancialPlansList = ({ userId }) => {
    const [plans, setPlans] = useState([]);
    
    useEffect(() => {
        const fetchPlans = async () => {
            const { data } = await supabase.from('plans').select('*').eq('user_id', userId).order('start_date', { ascending: false });
            setPlans(data || []);
        };
        fetchPlans();
    }, [userId]);

    if (plans.length === 0) return <p className="text-gray-500 text-sm">Nenhum plano ativo.</p>;

    return (
        <div className="space-y-2">
            {plans.map(plan => (
                <div key={plan.id} className="flex justify-between items-center bg-gray-800 p-3 rounded text-sm">
                    <div>
                        <span className="font-bold text-white uppercase">{plan.type}</span>
                        <span className="text-gray-400 ml-2 text-xs">Investido: ${plan.amount_invested}</span>
                    </div>
                    <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${plan.status === 'active' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                            {plan.status === 'active' ? 'ATIVO' : 'FINALIZADO'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const FinancialHistoryList = ({ userId }) => {
    const [transactions, setTransactions] = useState([]);
    
    useEffect(() => {
        const fetchTx = async () => {
            const { data } = await supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
            setTransactions(data || []);
        };
        fetchTx();
    }, [userId]);

    if (transactions.length === 0) return <p className="text-gray-500 text-sm">Nenhuma transação encontrada.</p>;

    return (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center bg-gray-800/50 p-2 rounded text-xs border-l-2 border-gray-700 hover:bg-gray-800 transition-colors">
                    <div>
                        <p className="text-white font-bold capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-gray-500">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                        <p className={`font-mono font-bold ${
                            ['deposit', 'game_win', 'unilevel_bonus', 'daily_roi'].includes(tx.type) ? 'text-green-400' : 'text-red-400'
                        }`}>
                            {['deposit', 'game_win', 'unilevel_bonus', 'daily_roi'].includes(tx.type) ? '+' : '-'}{tx.amount} {tx.currency}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">{tx.status}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const PvpVolumeViewer = ({ userId, username, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [personalStats, setPersonalStats] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_pvp_downline_volume_by_level', {
                    p_root_user_id: userId,
                    p_max_level: 7
                });
                if (error) throw error;
                setRows(Array.isArray(data) ? data : []);

                const { data: personal, error: personalError } = await supabase.rpc('get_pvp_personal_volume_stats', {
                    p_target_user_id: userId
                });
                if (!personalError && personal?.ok) setPersonalStats(personal);
                else setPersonalStats(null);
            } catch (e) {
                console.error('Erro ao buscar volume PvP:', e);
                setRows([]);
                setPersonalStats(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    const total = (rows || []).reduce((acc, r) => acc + Number(r?.volume_mph || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-700 p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-pink-400" />
                            Volume PvP (7 gerações)
                        </h3>
                        <p className="text-xs text-gray-400">{username}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={onClose}><X size={20} /></Button>
                </div>
                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Carregando...</div>
                    ) : (
                        <>
                            {personalStats?.ok && (
                                <div className="mb-4 bg-black/40 border border-gray-800 rounded-lg p-3">
                                    <div className="text-xs font-bold text-white mb-2">Volume PvP (próprio)</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-gray-900/40 border border-gray-800 rounded p-2">
                                            <div className="text-[10px] text-gray-500 uppercase">Apostas</div>
                                            <div className="text-xs font-mono font-bold text-pink-400">{Number(personalStats.bets_mph || 0).toFixed(2)} MPH</div>
                                            <div className="text-[10px] text-gray-500">{Number(personalStats.bets_points || 0).toFixed(2)} pts</div>
                                        </div>
                                        <div className="bg-gray-900/40 border border-gray-800 rounded p-2">
                                            <div className="text-[10px] text-gray-500 uppercase">Taxa paga</div>
                                            <div className="text-xs font-mono font-bold text-yellow-300">{Number(personalStats.fee_paid_mph || 0).toFixed(2)} MPH</div>
                                            <div className="text-[10px] text-gray-500">{Number(personalStats.fee_paid_points || 0).toFixed(2)} pts</div>
                                        </div>
                                        <div className="bg-gray-900/40 border border-gray-800 rounded p-2 col-span-2">
                                            <div className="text-[10px] text-gray-500 uppercase">Resultado</div>
                                            <div className={`text-xs font-mono font-bold ${Number(personalStats.profit_mph || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {Number(personalStats.profit_mph || 0) >= 0 ? '+' : ''}{Number(personalStats.profit_mph || 0).toFixed(2)} MPH
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                {Number(personalStats.profit_points || 0) >= 0 ? '+' : ''}{Number(personalStats.profit_points || 0).toFixed(2)} pts
                                                {' • '}
                                                W-D-L {Number(personalStats.wins || 0)}-{Number(personalStats.draws || 0)}-{Number(personalStats.losses || 0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
                                    const row = (rows || []).find((r) => Number(r.level) === lvl);
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
                                <div className="text-sm font-bold text-white font-mono">{total.toFixed(2)} MPH</div>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
};

export const AdminView = ({ navigate }) => {
    const { state, setState, addNotification, updateBot } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'users', 'bots', 'settings'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tournamentAdmin, setTournamentAdmin] = useState({ loading: false, pool: 0, list: [] });
    const [tournamentSplit, setTournamentSplit] = useState({ count: 2, entryFee: 500, status: 'open', namePrefix: 'Torneio', color: 'yellow' });
    const [tournamentCreate, setTournamentCreate] = useState({ name: 'Torneio', entryFee: 500, prizePool: 1000, status: 'open', color: 'yellow' });
    const [legacyMining, setLegacyMining] = useState({ amountUsd: '', planType: 'standard', note: '' });
    const [isLegacyMiningApplying, setIsLegacyMiningApplying] = useState(false);
    const [legacyMph, setLegacyMph] = useState({ amountMph: '', note: '' });
    const [isLegacyMphApplying, setIsLegacyMphApplying] = useState(false);

    const isFinanceAdmin = ['admin_master', 'admin_finance'].includes(state.user.role);
    const isSupportRole = ['support_1', 'support_2'].includes(state.user.role);
    const canAccessSupport = isFinanceAdmin || isSupportRole;
    
    // Configurações de Pagamento
    const [paymentConfig, setPaymentConfig] = useState({
        pix: { id: null, active: true, client_id: '', client_secret: '', visible: false },
        crypto: { 
            id: null, 
            active: true, 
            api_key: '', 
            public_key: '', 
            visible: false,
            // Controle de Moedas Ativas
            coins: {
                'usdt_bep20': true,
                'usdt_trc20': true,
                'usdt_polygon': true,
                'usdt_arbitrum': true,
                'usdc_bep20': true,
                'usdc_arbitrum': true,
                'btc': true,
                'eth': true,
                'xrp': true
            }
        }
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [editUser, setEditUser] = useState(null); // Usuário sendo editado
    const [botRecharge, setBotRecharge] = useState(null); // Bot sendo recarregado
    const [expandedBotId, setExpandedBotId] = useState(null);
    const [viewFinancials, setViewFinancials] = useState(null); // Visualizar detalhes financeiros
    const [viewNetwork, setViewNetwork] = useState(null); // Visualizar rede do usuário
    const [viewPvpVolume, setViewPvpVolume] = useState(null);

    const saveHashHarvestPeakSettings = async (next) => {
        try {
            const payload = {
                p_enabled: Boolean(next?.hhPeakEnabled),
                p_start_hour: Number(next?.hhPeakStartHour ?? 18),
                p_end_hour: Number(next?.hhPeakEndHour ?? 23),
                p_timezone: String(next?.hhPeakTimezone ?? 'America/Sao_Paulo')
            };
            const { data, error } = await supabase.rpc('admin_set_hash_harvest_peak_settings', payload);
            if (error) throw error;
            if (!data?.ok) throw new Error('Falha ao salvar agenda');
            setState(prev => ({
                ...prev,
                botSettings: {
                    ...(prev.botSettings || {}),
                    hhPeakEnabled: Boolean(data.hhPeakEnabled),
                    hhPeakStartHour: Number(data.hhPeakStartHour),
                    hhPeakEndHour: Number(data.hhPeakEndHour),
                    hhPeakTimezone: String(data.hhPeakTimezone || 'America/Sao_Paulo')
                }
            }));
            addNotification('Agenda do Hash Harvest atualizada.', 'success');
        } catch (e) {
            addNotification(e?.message || 'Erro ao salvar agenda do Hash Harvest.', 'danger');
        }
    };

    const normalizeUsername = (value) => {
        const raw = String(value || '');
        const noDiacritics = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const noSpaces = noDiacritics.replace(/\s+/g, '');
        const allowedOnly = noSpaces.replace(/[^A-Za-z0-9_]/g, '');
        return allowedOnly.slice(0, 32);
    };

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalMphInPlay: 0,
        treasuryMph: 0,
        botsActive: 0,
        totalInvestedUsd: 0,
        totalWithdrawnUsd: 0,
        networkEarningsUsd: 0,
        totalSponsoredUsd: 0
    });

    // Carregar estatísticas do Supabase
    const fetchStats = async () => {
        try {
            // Total Usuários
            const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            
            // Total MPH em Jogo
            const { data: matches } = await supabase.from('arcade_matches').select('bet_amount_mph');
            const totalMph = matches?.reduce((acc, curr) => acc + (curr.bet_amount_mph || 0), 0) || 0;

            // Tesouraria
            const { data: fees } = await supabase.from('arcade_matches').select('fee_collected_mph');
            const treasury = fees?.reduce((acc, curr) => acc + (curr.fee_collected_mph || 0), 0) || 0;

            // Estatísticas Financeiras Globais (USD)
            // Total Investido (Planos)
            const { data: plans } = await supabase.from('plans').select('amount_invested');
            const totalInvested = plans?.reduce((acc, curr) => acc + (curr.amount_invested || 0), 0) || 0;

            // Total Saques
            const { data: withdrawals } = await supabase.from('transactions')
                .select('amount')
                .eq('type', 'withdrawal')
                .eq('status', 'completed');
            const totalWithdrawn = withdrawals?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

            // Ganhos de Rede (Comissões)
            const { data: commissions } = await supabase.from('transactions')
                .select('amount')
                .in('type', ['unilevel_bonus', 'career_bonus']);
            const totalCommissions = commissions?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

            // Total Patrocinado
            const { data: sponsored } = await supabase.from('profiles')
                .select('sponsored_amount')
                .eq('account_status', 'sponsored');
            const totalSponsored = sponsored?.reduce((acc, curr) => acc + (curr.sponsored_amount || 0), 0) || 0;

            setStats({
                totalUsers: count || 0,
                totalMphInPlay: totalMph,
                treasuryMph: treasury,
                botsActive: state.bots.filter(b => b.active).length,
                totalInvestedUsd: totalInvested,
                totalWithdrawnUsd: totalWithdrawn,
                networkEarningsUsd: totalCommissions,
                totalSponsoredUsd: totalSponsored
            });
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const fetchTournamentAdmin = async () => {
        setTournamentAdmin(prev => ({ ...prev, loading: true }));
        try {
            const { data, error } = await supabase.rpc('get_arcade_meta_snapshot');
            if (error) throw error;
            setTournamentAdmin({
                loading: false,
                pool: Number(data?.tournaments?.pool || 0),
                list: Array.isArray(data?.tournaments?.list) ? data.tournaments.list : []
            });
        } catch (err) {
            console.error('Erro ao carregar torneios:', err);
            setTournamentAdmin(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        if (!['admin_master', 'admin_finance'].includes(state.user.role)) return;
        if (activeTab !== 'tournaments') return;
        fetchTournamentAdmin();
    }, [activeTab, state.user.role]);

    // Carregar usuários do Supabase
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    wallets ( balance_usd, balance_mph, balance_frozen_usd, total_deposited_usd, total_withdrawn_usd, total_earnings_usd )
                `)
                .order('created_at', { ascending: false });

            if (pError) throw pError;

            const rows = profiles || [];
            const sponsorIds = Array.from(
                new Set(rows.map((p) => p.sponsor_id).filter(Boolean))
            );

            const sponsorMap = new Map();
            for (let i = 0; i < sponsorIds.length; i += 100) {
                const chunk = sponsorIds.slice(i, i + 100);
                const { data: sponsors, error: sError } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', chunk);

                if (sError) throw sError;
                (sponsors || []).forEach((s) => sponsorMap.set(s.id, s.username));
            }

            const enriched = rows.map((p) => ({
                ...p,
                sponsor: p.sponsor_id ? { username: sponsorMap.get(p.sponsor_id) || null } : null,
            }));

            setUsers(enriched);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            addNotification('Erro ao carregar lista de usuários.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const applyLegacyMining = async (targetUser) => {
        if (!targetUser?.id) return;
        if (isLegacyMiningApplying) return;
        const amount = Number(legacyMining.amountUsd || 0);
        if (!amount || amount <= 0) {
            addNotification('Informe um valor USD válido.', 'danger');
            return;
        }

        setIsLegacyMiningApplying(true);
        try {
            const { data, error } = await supabase.rpc('admin_migrate_legacy_mining', {
                p_user_id: targetUser.id,
                p_plan_type: legacyMining.planType,
                p_amount_usd: amount,
                p_note: legacyMining.note || null
            });
            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'Falha na migração.');
            addNotification('Saldo migrado para mineração com sucesso.', 'success');
            setLegacyMining({ amountUsd: '', planType: 'standard', note: '' });
            fetchUsers();
        } catch (err) {
            console.error('Erro ao migrar saldo legacy:', err);
            addNotification(err?.message || 'Erro ao migrar saldo.', 'danger');
        } finally {
            setIsLegacyMiningApplying(false);
        }
    };

    const applyLegacyMph = async (targetUser) => {
        if (!targetUser?.id) return;
        if (isLegacyMphApplying) return;
        const amount = Number(legacyMph.amountMph || 0);
        if (!amount || amount <= 0) {
            addNotification('Informe um valor MPH válido.', 'danger');
            return;
        }

        setIsLegacyMphApplying(true);
        try {
            const { data, error } = await supabase.rpc('admin_migrate_legacy_mph', {
                p_user_id: targetUser.id,
                p_amount_mph: amount,
                p_note: legacyMph.note || null
            });
            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'Falha na migração.');
            addNotification('Saldo MPH migrado para a carteira com sucesso.', 'success');
            setLegacyMph({ amountMph: '', note: '' });
            fetchUsers();
        } catch (err) {
            console.error('Erro ao migrar saldo legacy MPH:', err);
            addNotification(err?.message || 'Erro ao migrar saldo MPH.', 'danger');
        } finally {
            setIsLegacyMphApplying(false);
        }
    };

    // Carregar configurações de pagamento
    const fetchPaymentSettings = async () => {
        if (!['admin_master', 'admin_finance'].includes(state.user.role)) return;
        
        try {
            const { data, error } = await supabase.from('payment_settings').select('*');
            
            if (error) {
                // Se a tabela não existir (erro 404/PGRST204), usamos defaults para o MVP não quebrar
                console.warn("Tabela de configurações não encontrada, usando valores locais.");
                return; 
            }

            if (data && data.length > 0) {
                const pixSettings = data.find(s => s.provider === 'pix_efi');
                const cryptoSettings = data.find(s => s.provider === 'nowpayments');

                setPaymentConfig(prev => ({
                    ...prev,
                    pix: {
                        ...prev.pix,
                        id: pixSettings?.id,
                        active: pixSettings?.is_active || false,
                        client_id: pixSettings?.credentials?.client_id || '', // Company ID
                        client_secret: pixSettings?.credentials?.client_secret || ''
                    },
                    crypto: {
                        ...prev.crypto,
                        id: cryptoSettings?.id,
                        active: cryptoSettings?.is_active || false,
                        api_key: cryptoSettings?.credentials?.api_key || '',
                        public_key: cryptoSettings?.credentials?.public_key || ''
                    }
                }));
            }
        } catch (err) {
            console.error("Erro ao carregar configs:", err);
        }
    };

    useEffect(() => {
        fetchStats();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'settings') fetchPaymentSettings();
    }, [activeTab]);

    const handleSaveSettings = async (provider) => {
        try {
            const config = provider === 'pix' ? paymentConfig.pix : paymentConfig.crypto;
            const payload = {
                provider: provider === 'pix' ? 'pix_efi' : 'nowpayments',
                is_active: config.active,
                credentials: provider === 'pix' 
                    ? { client_id: config.client_id, client_secret: config.client_secret }
                    : { api_key: config.api_key, public_key: config.public_key, coins: config.coins },
                updated_at: new Date().toISOString(),
                updated_by: state.user.id
            };

            // Upsert: Atualiza se existir, cria se não
            const { error } = await supabase
                .from('payment_settings')
                .upsert(payload, { onConflict: 'provider' });

            if (error) throw error;

            addNotification(`Configurações de ${provider === 'pix' ? 'PIX' : 'Cripto'} salvas!`, 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            addNotification('Erro ao salvar configurações. Verifique permissões.', 'danger');
        }
    };

    // Ações de Usuário
    const handleUpdateUser = async (userId, updates) => {
        try {
            let rpcSuccess = false;
            const before = users.find(u => u.id === userId) || null;

            // Lógica de Patrocínio: Creditar Carteira se não houver saldo
            if (updates.account_status === 'sponsored' && updates.sponsored_amount > 0) {
                 // Tenta via RPC (Recomendado para garantir atomicidade e permissões)
                 const { error: rpcError } = await supabase.rpc('admin_sponsor_user', {
                     target_user_id: userId,
                     sponsorship_amount: updates.sponsored_amount,
                     sponsorship_multiplier: updates.sponsored_multiplier || 2,
                     admin_id: state.user.id
                 });
                 
                 if (!rpcError) {
                     rpcSuccess = true;
                     // Remove campos já atualizados pela RPC para evitar redundância/erros
                     delete updates.account_status;
                     delete updates.sponsored_amount;
                     delete updates.sponsored_multiplier;
                     
                     // Registrar Log (se a RPC não registrar, mas ela registra)
                 } else {
                     console.warn("RPC admin_sponsor_user falhou ou não existe. Tentando método legado...", rpcError);
                     // Fallback: Tenta atualizar carteira manualmente (sujeito a RLS)
                     const { data: wallet } = await supabase.from('wallets').select('balance_usd').eq('user_id', userId).single();
                     if (!wallet) {
                         await supabase.from('wallets').insert([{ user_id: userId, balance_usd: updates.sponsored_amount }]);
                     } else {
                         // Garante que o saldo seja pelo menos o valor do patrocínio
                         if (wallet.balance_usd < updates.sponsored_amount) {
                             await supabase.from('wallets').update({ balance_usd: updates.sponsored_amount }).eq('user_id', userId);
                         }
                     }
                 }
            }

            // Processar Saque Automático Separadamente (Via RPC para Auditoria)
            if ('automatic_withdrawal' in updates) {
                const { error: rpcError } = await supabase.rpc('toggle_automatic_withdrawal', {
                    target_user_id: userId,
                    is_enabled: updates.automatic_withdrawal
                });
                if (rpcError) throw rpcError;
                
                // Remove do objeto updates para não tentar atualizar via 'profiles' update se a RPC já fez
                delete updates.automatic_withdrawal;
            }

            // Se sobrar updates, faz update normal
            if (Object.keys(updates).length > 0) {
                const { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', userId);
                if (error) throw error;
            }

                const after = { ...(before || {}), ...updates };
                const details = {
                    before: before ? {
                        account_status: before.account_status,
                        role: before.role,
                        sponsor_id: before.sponsor_id,
                        sponsored_amount: before.sponsored_amount,
                        sponsored_multiplier: before.sponsored_multiplier
                    } : null,
                    after: {
                        account_status: after.account_status,
                        role: after.role,
                        sponsor_id: after.sponsor_id,
                        sponsored_amount: after.sponsored_amount,
                        sponsored_multiplier: after.sponsored_multiplier
                    },
                    updates,
                    timestamp: new Date().toISOString()
                };

                const { error: logError } = await supabase.from('admin_logs').insert([{
                    admin_id: state.user.id,
                    target_user_id: userId,
                    action_type: 'update_user',
                    details
                }]);
                if (logError) console.warn('Falha ao registrar log admin:', logError);

            addNotification('Usuário atualizado com sucesso!', 'success');
            
            // Atualização Local Imediata (Otimista/Real)
            setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, ...updates } : u
            ));

            setEditUser(null);
            // fetchUsers(); // Opcional, mas mantido para garantir sincronia eventual
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            addNotification(error?.message || 'Falha ao atualizar usuário.', 'danger');
        }
    };

    const handleUpdateSponsor = async (userId, newSponsorUsername) => {
        if (!newSponsorUsername) return;
        if (!window.confirm(`Deseja alterar o patrocinador deste usuário para ${newSponsorUsername}?`)) return;

        try {
            // 1. Buscar ID do novo patrocinador
            const { data: sponsorData, error: sponsorError } = await supabase
                .from('profiles')
                .select('id, username')
                .eq('username', newSponsorUsername)
                .single();

            if (sponsorError || !sponsorData) {
                addNotification('Patrocinador não encontrado.', 'danger');
                return;
            }

            if (sponsorData.id === userId) {
                addNotification('O usuário não pode ser seu próprio patrocinador.', 'danger');
                return;
            }

            // 2. Atualizar Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ sponsor_id: sponsorData.id })
                .eq('id', userId);

            if (updateError) throw updateError;

            // 3. Log Admin
            await supabase.from('admin_logs').insert([{
                admin_id: state.user.id,
                target_user_id: userId,
                action_type: 'change_sponsor',
                details: {
                    old_sponsor_id: editUser.sponsor_id,
                    new_sponsor_id: sponsorData.id,
                    new_sponsor_username: sponsorData.username,
                    timestamp: new Date().toISOString()
                }
            }]);

            addNotification(`Patrocinador alterado para ${sponsorData.username}!`, 'success');
            
            // Atualizar UI Local
            setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, sponsor_id: sponsorData.id } : u
            ));
            setEditUser(prev => ({ ...prev, sponsor_id: sponsorData.id })); // Atualiza modal também se precisar

        } catch (error) {
            console.error('Erro ao alterar patrocinador:', error);
            addNotification('Erro ao alterar patrocinador.', 'danger');
        }
    };

    const handleUpdateUsername = async (userId, newUsername) => {
        try {
            const normalized = normalizeUsername(String(newUsername || '').trim());
            if (!normalized) return;

            if (!/^[A-Za-z0-9_]{3,32}$/.test(normalized)) {
                addNotification('Username inválido. Use apenas letras, números e underline (3 a 32).', 'danger');
                return;
            }

            const { data: existing, error: existingError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', normalized)
                .limit(1);

            if (existingError) throw existingError;
            const takenByOther = Array.isArray(existing) && existing.length > 0 && existing[0]?.id && existing[0].id !== userId;
            if (takenByOther) {
                addNotification('Este username já está em uso.', 'danger');
                return;
            }

            if (!window.confirm(`Deseja alterar o username para "${normalized}"?`)) return;

            let finalUsername = normalized;

            try {
                const { data, error } = await supabase.rpc('admin_update_username', {
                    target_user_id: userId,
                    new_username: normalized
                });

                if (error) throw error;
                finalUsername = data?.new_username || normalized;
            } catch (rpcErr) {
                const msg = String(rpcErr?.message || '').toLowerCase();
                const isMissingFn =
                    msg.includes('could not find the function') ||
                    msg.includes('schema cache') ||
                    msg.includes('pgrst202');

                if (!isMissingFn) throw rpcErr;

                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

                const { data, error } = await supabase.functions.invoke('admin-update-username', {
                    body: { target_user_id: userId, new_username: normalized },
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'x-user-jwt': accessToken,
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });

                if (error) throw error;
                if (!data?.ok) throw new Error(data?.error || 'Erro ao atualizar username.');
                finalUsername = data?.new_username || normalized;
            }

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, username: finalUsername } : u));
            setEditUser(prev => prev ? { ...prev, username: finalUsername } : prev);
            setViewFinancials(prev => prev && prev.id === userId ? { ...prev, username: finalUsername } : prev);
            setViewNetwork(prev => prev && prev.id === userId ? { ...prev, username: finalUsername } : prev);
            addNotification('Username atualizado com sucesso!', 'success');
        } catch (e) {
            console.error('Erro ao atualizar username:', e);
            addNotification(e?.message || 'Erro ao atualizar username.', 'danger');
        }
    };

    const handleBotRecharge = async (e) => {
        e.preventDefault();
        const amount = parseFloat(e.target.amount.value);
        const origin = e.target.origin.value;
        
        if (!botRecharge || isNaN(amount) || amount <= 0) return;

        try {
            // Atualiza Saldo do Bot (Local State por enquanto, já que bots são mockados no AppContext)
            // Se bots fossem tabela real, seria um update no Supabase
            updateBot(botRecharge.id, { mph: botRecharge.mph + amount });

            // Registrar Transação de Sistema (Para Auditoria Financeira)
            // Usaremos um user_id especial ou NULL para bots, dependendo da estrutura
            // Como transactions requer user_id, vamos assumir que bots não geram transações de usuário,
            // mas podemos criar um log na tabela 'admin_logs'
            await supabase.from('admin_logs').insert([{
                admin_id: state.user.id, // Quem fez a recarga
                action_type: 'bot_recharge',
                details: {
                    bot_id: botRecharge.id,
                    bot_name: botRecharge.name,
                    amount_mph: amount,
                    amount_usd: amount / 100, // Taxa fixa $1 = 100 MPH
                    origin: origin, // 'treasury', 'external_deposit', 'bonus'
                    timestamp: new Date().toISOString()
                }
            }]);

            addNotification(`Bot ${botRecharge.name} recarregado com ${amount} MPH!`, 'success');
            setBotRecharge(null);
        } catch (error) {
            console.error("Erro na recarga do bot:", error);
            addNotification("Erro ao recarregar bot.", "danger");
        }
    };

    const handleResetPassword = async (email) => {
        if (!window.confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password',
            });

            if (error) throw error;
            addNotification('E-mail de redefinição de senha enviado!', 'success');
        } catch (error) {
            console.error('Erro ao enviar reset de senha:', error);
            addNotification('Erro ao enviar e-mail. Verifique se o limite foi excedido.', 'danger');
        }
    };

    // Renderização dos Tabs
    const renderDashboard = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="text-blue-400" size={20} />
                        <h3 className="text-sm text-gray-400">Total Usuários</h3>
                    </div>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="text-green-400" size={20} />
                        <h3 className="text-sm text-gray-400">Bots Ativos</h3>
                    </div>
                    <p className="text-2xl font-bold">{stats.botsActive} / {state.bots.length}</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="text-yellow-400" size={20} />
                        <h3 className="text-sm text-gray-400">Vol. em Jogo</h3>
                    </div>
                    <p className="text-xl font-bold font-mono">{stats.totalMphInPlay.toLocaleString()} MPH</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="text-purple-400" size={20} />
                        <h3 className="text-sm text-gray-400">Tesouraria</h3>
                    </div>
                    <p className="text-xl font-bold font-mono text-purple-400">{stats.treasuryMph.toLocaleString()} MPH</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="text-green-400" size={20} />
                        <h3 className="text-sm text-gray-400">Total Investido</h3>
                    </div>
                    <p className="text-xl font-bold font-mono text-green-400">${stats.totalInvestedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="text-red-400" size={20} />
                        <h3 className="text-sm text-gray-400">Total Saques</h3>
                    </div>
                    <p className="text-xl font-bold font-mono text-red-400">${stats.totalWithdrawnUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="text-blue-400" size={20} />
                        <h3 className="text-sm text-gray-400">Ganhos de Rede</h3>
                    </div>
                    <p className="text-xl font-bold font-mono text-blue-400">${stats.networkEarningsUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="text-blue-400" size={20} />
                        <h3 className="text-sm text-gray-400">Total Patrocinado</h3>
                    </div>
                    <p className="text-xl font-bold font-mono text-blue-400">${stats.totalSponsoredUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
            </div>
            
            <div className="mt-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield size={18} /> Acesso Rápido</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setActiveTab('users')} variant="outline" className="justify-start">Gestão de Usuários</Button>
                    <Button onClick={() => setActiveTab('bots')} variant="outline" className="justify-start">Configurar Bots</Button>
                </div>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-blue-500" /> Gestão de Usuários
                </h3>
                <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">Total: {users.length}</span>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuário..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-purple-500 outline-none"
                    />
                </div>
                <Button onClick={fetchUsers} size="icon" variant="ghost"><RefreshCw size={18} /></Button>
            </div>

            <div className="space-y-3 pb-20">
                {users.filter((u) => {
                    const q = String(searchTerm || '').trim().toLowerCase();
                    if (!q) return true;
                    const username = String(u.username || '').toLowerCase();
                    const email = String(u.email || '').toLowerCase();
                    return username.includes(q) || email.includes(q);
                }).map(user => (
                    <Card key={user.id} className="bg-gray-900/50 border-gray-800 p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-white flex items-center gap-2">
                                    {user.username}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                        user.account_status === 'active' ? 'bg-green-900/30 border-green-500/50 text-green-400' :
                                        user.account_status === 'blocked' ? 'bg-red-900/30 border-red-500/50 text-red-400' :
                                        user.account_status === 'inactive' ? 'bg-gray-900/30 border-gray-500/50 text-gray-400' :
                                        'bg-blue-900/30 border-blue-500/50 text-blue-400'
                                    }`}>
                                        {user.account_status === 'active'
                                            ? 'VERDE'
                                            : user.account_status === 'blocked'
                                            ? 'BLOQUEADO'
                                            : user.account_status === 'inactive'
                                            ? 'INATIVO'
                                            : `PATROCINADO (meta ${(user.sponsored_multiplier || 3) * 100}%)`}
                                    </span>
                                </h4>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setEditUser(user)}><Edit2 size={14} /></Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div className="bg-black/30 p-2 rounded border border-gray-800">
                                <span className="text-gray-500 block">Saldo MPH</span>
                                <span className="font-mono text-purple-400 font-bold">{user.wallets?.balance_mph || 0}</span>
                            </div>
                            <div className="bg-black/30 p-2 rounded border border-gray-800">
                                <span className="text-gray-500 block">Saldo USD</span>
                                <span className="font-mono text-green-400 font-bold">${user.wallets?.balance_usd || 0}</span>
                            </div>
                            {user.account_status === 'sponsored' && (
                                <div className="col-span-2 bg-blue-900/20 p-2 rounded border border-blue-900/50 mt-1">
                                    <span className="text-blue-300 block text-[10px] uppercase font-bold flex items-center gap-1">
                                        <DollarSign size={10} /> Saldo Patrocinado
                                    </span>
                                    <span className="font-mono text-blue-400 font-bold text-sm">
                                        ${user.sponsored_amount || 0}
                                    </span>
                                    <span className="text-[9px] text-gray-500 ml-2">
                                        (Meta: ${(user.sponsored_amount || 0) * (user.sponsored_multiplier || 2)})
                                    </span>
                                </div>
                            )}
                            {/* Visualização de Depósitos Reais para Auditoria */}
                            <div className="col-span-2 bg-gray-800/30 p-2 rounded border border-gray-700/50 mt-1 flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 uppercase">Total Depositado (API)</span>
                                <span className="font-mono text-white font-bold text-xs">
                                    ${user.wallets?.total_deposited_usd || 0}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {state.user.role !== 'admin_partner' && (
                                user.account_status === 'blocked' ? (
                                    <Button 
                                        size="xs" 
                                        className="flex-1 bg-green-900/50 text-green-400 hover:bg-green-900 border border-green-900" 
                                        onClick={() => handleUpdateUser(user.id, { account_status: 'active' })}
                                        title="Clique para desbloquear o acesso"
                                    >
                                        <Unlock size={14} className="mr-1" /> DESBLOQUEAR
                                    </Button>
                                ) : (
                                    <Button 
                                        size="xs" 
                                        className="flex-1 bg-red-900/50 text-red-400 hover:bg-red-900 border border-red-900" 
                                        onClick={() => handleUpdateUser(user.id, { account_status: 'blocked' })}
                                        title="Clique para bloquear o acesso"
                                    >
                                        <Lock size={14} className="mr-1" /> BLOQUEAR
                                    </Button>
                                )
                            )}
                            <Button size="xs" className="flex-1 bg-blue-900/50 text-blue-400 hover:bg-blue-900" onClick={() => setViewFinancials(user)}>
                                <Activity size={12} className="mr-1" /> Detalhes
                            </Button>
                            <Button size="xs" className="flex-1 bg-purple-900/50 text-purple-400 hover:bg-purple-900" onClick={() => setViewNetwork(user)}>
                                <Network size={12} className="mr-1" /> Rede
                            </Button>
                            <Button size="xs" className="flex-1 bg-pink-900/30 text-pink-400 hover:bg-pink-900/40" onClick={() => setViewPvpVolume(user)}>
                                <TrendingUp size={12} className="mr-1" /> PvP Vol
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Modal de Rede */}
            {viewNetwork && (
                <NetworkViewer 
                    userId={viewNetwork.id} 
                    username={viewNetwork.username} 
                    onClose={() => setViewNetwork(null)} 
                />
            )}

            {viewPvpVolume && (
                <PvpVolumeViewer
                    userId={viewPvpVolume.id}
                    username={viewPvpVolume.username}
                    onClose={() => setViewPvpVolume(null)}
                />
            )}

            {/* Modal de Detalhes Financeiros */}
            {viewFinancials && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-4xl h-[90vh] bg-gray-900 border-gray-700 p-0 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                            <div>
                                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                                    <User size={24} className="text-purple-500" />
                                    {viewFinancials.username}
                                </h3>
                                <p className="text-sm text-gray-500">{viewFinancials.email}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Patrocinador: <span className="text-purple-300 font-bold">{viewFinancials.sponsor?.username || 'Nenhum'}</span>
                                </p>
                                <div className="mt-2 flex items-center gap-2 bg-black/40 border border-gray-800 rounded p-2">
                                    <span className="text-[10px] text-gray-500 uppercase whitespace-nowrap">Link de convite</span>
                                    <code className="text-[10px] text-green-400 flex-1 truncate">
                                        {`${window.location.origin}/ref/${viewFinancials.username}`}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/ref/${viewFinancials.username}`);
                                            addNotification('Link copiado!', 'success');
                                        }}
                                        className="text-gray-400 hover:text-white transition"
                                        title="Copiar link"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                                {viewFinancials.account_status === 'sponsored' && (
                                    <div className="mt-2 flex items-center justify-between gap-3 bg-blue-900/10 border border-blue-900/40 rounded p-2">
                                        <span className="text-[10px] text-blue-300 uppercase font-bold">Meta atual (rede)</span>
                                        <span className="text-[10px] font-mono text-blue-200">
                                            ${Number(viewFinancials.network_volume || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${(
                                                Number(viewFinancials.sponsored_amount || 0) * Number(viewFinancials.sponsored_multiplier || 3)
                                            ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => setViewFinancials(null)}><X size={24} /></Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Resumo da Carteira */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-black/40 border-gray-800 p-4">
                                    <p className="text-gray-500 text-xs uppercase">Saldo USD</p>
                                    <p className="text-xl md:text-2xl font-bold text-green-400">${viewFinancials.wallets?.balance_usd || 0}</p>
                                </Card>
                                <Card className="bg-black/40 border-gray-800 p-4">
                                    <p className="text-gray-500 text-xs uppercase">Saldo MPH</p>
                                    <p className="text-xl md:text-2xl font-bold text-purple-400">{viewFinancials.wallets?.balance_mph || 0}</p>
                                </Card>
                                <Card className="bg-black/40 border-gray-800 p-4">
                                    <p className="text-gray-500 text-xs uppercase">Total Ganho</p>
                                    <p className="text-xl md:text-2xl font-bold text-yellow-400">${viewFinancials.wallets?.total_earnings_usd || 0}</p>
                                </Card>
                                <Card className="bg-black/40 border-gray-800 p-4">
                                    <p className="text-gray-500 text-xs uppercase">Total Sacado</p>
                                    <p className="text-xl md:text-2xl font-bold text-red-400">${viewFinancials.wallets?.total_withdrawn_usd || 0}</p>
                                </Card>
                            </div>

                            {/* Planos Ativos */}
                            <div>
                                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> Planos de Mineração</h4>
                                <FinancialPlansList userId={viewFinancials.id} />
                            </div>

                            {/* Histórico de Transações */}
                            <div>
                                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><RefreshCw size={18} className="text-blue-500" /> Histórico Financeiro</h4>
                                <FinancialHistoryList userId={viewFinancials.id} />
                            </div>

                            <AdminAuditLogList targetUserId={viewFinancials.id} />
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal de Edição Rápida */}
            {editUser && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <Card className="w-full max-w-sm bg-gray-900 border-gray-700 p-6 my-6 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">Editar: {editUser.username}</h3>
                            <Button size="icon" variant="ghost" onClick={() => setEditUser(null)}><X size={20} /></Button>
                        </div>
                        
                        {state.user.role === 'admin_partner' ? (
                            <div className="text-center py-6 text-gray-400">
                                <AlertTriangle className="mx-auto mb-2 text-yellow-500" size={32} />
                                <p>Modo de Visualização Apenas.</p>
                                <p className="text-xs mt-2">Sócios não podem alterar saldos ou status.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Status da Conta</label>
                                    <select 
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white"
                                        value={editUser.account_status}
                                        onChange={(e) => setEditUser({...editUser, account_status: e.target.value})}
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                        <option value="sponsored">Patrocinado</option>
                                        <option value="blocked">Bloqueado</option>
                                    </select>
                                    
                                    {editUser.account_status === 'sponsored' && (
                                        <div className="mt-2 p-2 bg-blue-900/20 border border-blue-900/50 rounded space-y-2">
                                            <div>
                                                <label className="text-xs text-blue-300 mb-1 block font-bold flex items-center gap-1">
                                                    <DollarSign size={12} /> Valor do Patrocínio (USD)
                                                </label>
                                                <input 
                                                    type="number"
                                                    value={editUser.sponsored_amount || 0}
                                                    onChange={(e) => setEditUser({...editUser, sponsored_amount: parseFloat(e.target.value)})}
                                                    className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-blue-300 mb-1 block font-bold">Meta de Ganho (Liberação de Saque)</label>
                                                <select 
                                                    className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white"
                                                    value={editUser.sponsored_multiplier || 2}
                                                    onChange={(e) => setEditUser({...editUser, sponsored_multiplier: parseInt(e.target.value)})}
                                                >
                                                    <option value={2}>200% do Valor</option>
                                                    <option value={3}>300% do Valor</option>
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                Meta atual: <span className="text-green-400 font-bold">${(editUser.sponsored_amount || 0) * (editUser.sponsored_multiplier || 2)}</span>
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-2">
                                        <label className="text-xs text-gray-400 mb-1 block font-bold">Alterar Username (sem espaços)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="novo_username"
                                                id="newUsernameInput"
                                                defaultValue={editUser.username || ''}
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                                                onChange={(e) => {
                                                    e.target.value = normalizeUsername(e.target.value);
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                className="bg-purple-600 hover:bg-purple-700"
                                                onClick={() => {
                                                    const input = document.getElementById('newUsernameInput');
                                                    handleUpdateUsername(editUser.id, input.value);
                                                }}
                                            >
                                                <Save size={14} />
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Permitido: letras/números/underline (3–32). Sem espaços.
                                        </p>
                                    </div>

                                    <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                checked={editUser.automatic_withdrawal || false}
                                                onChange={(e) => setEditUser({...editUser, automatic_withdrawal: e.target.checked})}
                                                className="w-4 h-4 accent-green-500"
                                            />
                                            <span className="text-sm text-white font-bold">Saque Automático (Auditado)</span>
                                        </label>
                                        <p className="text-[10px] text-gray-400 mt-1 pl-6">
                                            Habilita saques instantâneos sem aprovação manual. Use com cautela.
                                        </p>
                                    </div>
                                    <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-2">
                                        <label className="text-xs text-gray-400 mb-1 block font-bold flex items-center gap-1">
                                            <Users size={12} /> Alterar Patrocinador
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                placeholder="Username do novo patrocinador"
                                                id="newSponsorInput"
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                                            />
                                            <Button 
                                                size="sm"
                                                className="bg-purple-600 hover:bg-purple-700"
                                                onClick={() => {
                                                    const input = document.getElementById('newSponsorInput');
                                                    handleUpdateSponsor(editUser.id, input.value);
                                                }}
                                            >
                                                <Save size={14} />
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            ID Atual: <span className="font-mono text-xs">{editUser.sponsor_id || 'Nenhum'}</span>
                                        </p>
                                    </div>

                                    {['admin_master', 'admin_finance'].includes(state.user.role) && (
                                        <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-2">
                                            <label className="text-xs text-gray-400 mb-2 block font-bold flex items-center gap-1">
                                                <Zap size={12} /> Migração de Saldo (Plataforma Anterior) → Mineração
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white"
                                                    value={legacyMining.planType}
                                                    onChange={(e) => setLegacyMining(prev => ({ ...prev, planType: e.target.value }))}
                                                >
                                                    <option value="standard">STANDARD (180%)</option>
                                                    <option value="premium">PREMIUM (475%)</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={legacyMining.amountUsd}
                                                    onChange={(e) => setLegacyMining(prev => ({ ...prev, amountUsd: e.target.value }))}
                                                    className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-yellow-500 outline-none"
                                                    placeholder="Valor USD"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={legacyMining.note}
                                                onChange={(e) => setLegacyMining(prev => ({ ...prev, note: e.target.value }))}
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white mt-2 focus:border-purple-500 outline-none"
                                                placeholder="Observação (opcional)"
                                            />
                                            <Button
                                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold mt-3"
                                                disabled={isLegacyMiningApplying}
                                                onClick={() => applyLegacyMining(editUser)}
                                            >
                                                Aplicar na Mineração (gera logs)
                                            </Button>
                                            <p className="text-[10px] text-gray-500 mt-2">
                                                Cria um plano ativo, registra transação e auditoria admin. Não entra como patrocínio.
                                            </p>
                                        </div>
                                    )}

                                    {['admin_master', 'admin_finance'].includes(state.user.role) && (
                                        <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-2">
                                            <label className="text-xs text-gray-400 mb-2 block font-bold flex items-center gap-1">
                                                <Trophy size={12} /> Migração de Saldo MPH (Plataforma Anterior) → Carteira MPH
                                            </label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={legacyMph.amountMph}
                                                onChange={(e) => setLegacyMph(prev => ({ ...prev, amountMph: e.target.value }))}
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-yellow-500 outline-none"
                                                placeholder="Valor MPH"
                                            />
                                            <input
                                                type="text"
                                                value={legacyMph.note}
                                                onChange={(e) => setLegacyMph(prev => ({ ...prev, note: e.target.value }))}
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white mt-2 focus:border-purple-500 outline-none"
                                                placeholder="Observação (opcional)"
                                            />
                                            <Button
                                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold mt-3"
                                                disabled={isLegacyMphApplying}
                                                onClick={() => applyLegacyMph(editUser)}
                                            >
                                                Aplicar na Carteira MPH (gera logs)
                                            </Button>
                                            <p className="text-[10px] text-gray-500 mt-2">
                                                Credita balance_mph, registra transação e auditoria admin. Não entra como patrocínio.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <Button 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold mt-2"
                                    onClick={() => handleUpdateUser(editUser.id, { 
                                        account_status: editUser.account_status,
                                        sponsored_amount: editUser.account_status === 'sponsored' ? editUser.sponsored_amount : 0,
                                        sponsored_multiplier: editUser.account_status === 'sponsored' ? (editUser.sponsored_multiplier || 2) : 2,
                                        automatic_withdrawal: editUser.automatic_withdrawal
                                    })}
                                >
                                    Salvar Alterações
                                </Button>

                                <div className="pt-4 border-t border-gray-800 mt-4">
                                    <p className="text-xs text-gray-500 mb-2 font-bold uppercase flex items-center gap-1"><Shield size={10} /> Segurança da Conta</p>
                                    <Button 
                                        className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs py-2"
                                        onClick={() => handleResetPassword(editUser.email)}
                                    >
                                        <Mail size={14} className="mr-2" /> Enviar Redefinição de Senha
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );

    const renderSettings = () => (
        <div className="space-y-6 pb-20">
            <div className="bg-blue-900/20 border border-blue-900/50 p-4 rounded-lg flex gap-3 items-start">
                <Shield className="text-blue-400 mt-1" size={20} />
                <div>
                    <h4 className="font-bold text-blue-100">Integrações de Pagamento</h4>
                    <p className="text-xs text-blue-300 mt-1">
                        Acesso restrito a <b>Admin Geral</b> e <b>Financeiro</b>. Ative/desative provedores e atualize credenciais quando necessário. As credenciais ficam protegidas por permissões (RLS) e não são exibidas por padrão.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PIX Config */}
                <Card className="bg-gray-900 border-gray-800 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CreditCard size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6 gap-3">
                            <h3 className="min-w-0 font-bold text-[15px] sm:text-xl text-white flex items-center gap-2 whitespace-nowrap">
                                <span className="bg-green-500/20 text-green-400 p-2 rounded-lg flex-shrink-0"><CreditCard size={20} /></span>
                                <span className="truncate">PIX (Efí)</span>
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs font-bold ${paymentConfig.pix.active ? 'text-green-400' : 'text-gray-500'}`}>
                                    {paymentConfig.pix.active ? 'Ativo' : 'Inativo'}
                                </span>
                                <button 
                                    onClick={() => setPaymentConfig(prev => ({ ...prev, pix: { ...prev.pix, active: !prev.pix.active } }))}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${paymentConfig.pix.active ? 'bg-green-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${paymentConfig.pix.active ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-xs text-gray-400 bg-black/20 border border-white/5 rounded-lg p-3">
                                Use esta integração para <span className="text-white font-bold">depósitos e saques via PIX</span>. Desative para pausar o método sem perder as credenciais.
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block font-bold">COMPANY ID</label>
                                <input 
                                    type="text" 
                                    value={paymentConfig.pix.client_id}
                                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, pix: { ...prev.pix, client_id: e.target.value } }))}
                                    className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-green-500 outline-none font-mono"
                                    placeholder="Cole o Company ID"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block font-bold">SECRET KEY</label>
                                <div className="relative">
                                    <input 
                                        type={paymentConfig.pix.visible ? "text" : "password"} 
                                        value={paymentConfig.pix.client_secret}
                                        onChange={(e) => setPaymentConfig(prev => ({ ...prev, pix: { ...prev.pix, client_secret: e.target.value } }))}
                                        className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-green-500 outline-none font-mono pr-10"
                                        placeholder="Cole a Secret Key"
                                    />
                                    <button 
                                        onClick={() => setPaymentConfig(prev => ({ ...prev, pix: { ...prev.pix, visible: !prev.pix.visible } }))}
                                        className="absolute right-3 top-3 text-gray-500 hover:text-white"
                                    >
                                        {paymentConfig.pix.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={() => handleSaveSettings('pix')}
                                className="w-full bg-green-600 hover:bg-green-700 text-white mt-2 whitespace-nowrap"
                            >
                                <Save size={16} className="mr-2 flex-shrink-0" /> SALVAR PIX
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Crypto Config */}
                <Card className="bg-gray-900 border-gray-800 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Bitcoin size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6 gap-3">
                            <h3 className="min-w-0 font-bold text-[15px] sm:text-xl text-white flex items-center gap-2 whitespace-nowrap tracking-tight">
                                <span className="bg-yellow-500/20 text-yellow-400 p-2 rounded-lg flex-shrink-0"><Bitcoin size={20} /></span>
                                <span className="truncate">Cripto (NowPayments)</span>
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs font-bold ${paymentConfig.crypto.active ? 'text-green-400' : 'text-gray-500'}`}>
                                    {paymentConfig.crypto.active ? 'Ativo' : 'Inativo'}
                                </span>
                                <button 
                                    onClick={() => setPaymentConfig(prev => ({ ...prev, crypto: { ...prev.crypto, active: !prev.crypto.active } }))}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${paymentConfig.crypto.active ? 'bg-green-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${paymentConfig.crypto.active ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-xs text-gray-400 bg-black/20 border border-white/5 rounded-lg p-3">
                                Integração para <span className="text-white font-bold">pagamentos em cripto</span>. Gerencie as moedas aceitas abaixo.
                            </div>
                            
                            {/* Seletor de Moedas */}
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-black/30 rounded border border-gray-800">
                                {Object.keys(paymentConfig.crypto.coins).map(coinKey => (
                                    <label key={coinKey} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <input 
                                            type="checkbox"
                                            checked={paymentConfig.crypto.coins[coinKey]}
                                            onChange={(e) => setPaymentConfig(prev => ({
                                                ...prev,
                                                crypto: {
                                                    ...prev.crypto,
                                                    coins: { ...prev.crypto.coins, [coinKey]: e.target.checked }
                                                }
                                            }))}
                                            className="accent-yellow-500"
                                        />
                                        <span className="uppercase">{coinKey.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block font-bold">API KEY</label>
                                <div className="relative">
                                    <input 
                                        type={paymentConfig.crypto.visible ? "text" : "password"} 
                                        value={paymentConfig.crypto.api_key}
                                        onChange={(e) => setPaymentConfig(prev => ({ ...prev, crypto: { ...prev.crypto, api_key: e.target.value } }))}
                                        className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-yellow-500 outline-none font-mono pr-10"
                                        placeholder="Cole a API Key"
                                    />
                                    <button 
                                        onClick={() => setPaymentConfig(prev => ({ ...prev, crypto: { ...prev.crypto, visible: !prev.crypto.visible } }))}
                                        className="absolute right-3 top-3 text-gray-500 hover:text-white"
                                    >
                                        {paymentConfig.crypto.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block font-bold">PUBLIC KEY (Opcional)</label>
                                <input 
                                    type="text" 
                                    value={paymentConfig.crypto.public_key || ''}
                                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, crypto: { ...prev.crypto, public_key: e.target.value } }))}
                                    className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-yellow-500 outline-none font-mono"
                                    placeholder="Cole a Public Key"
                                />
                            </div>
                            
                            <Button 
                                onClick={() => handleSaveSettings('crypto')}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold mt-2 whitespace-nowrap"
                            >
                                <Save size={16} className="mr-2 flex-shrink-0" /> SALVAR CRIPTO
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderBots = () => (
        <div className="space-y-4 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">Gerenciar Bots</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-md font-medium">Total: {state.bots.length}</span>
                </div>
                
                <div className="flex flex-col gap-3 bg-gray-900/40 p-3 rounded-xl border border-gray-800/60 w-full lg:w-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0">Aplicar a todos:</span>
                        <div className="flex gap-1">
                            <Button
                                size="xs"
                                variant="outline"
                                className="w-16 h-8 rounded-lg justify-center"
                                onClick={() => { state.bots.forEach(b => updateBot(b.id, { max_bet_mph: 100 })); addNotification('Limite de todos: 100 MPH', 'success'); }}
                            >100</Button>
                            <Button
                                size="xs"
                                variant="outline"
                                className="w-16 h-8 rounded-lg justify-center"
                                onClick={() => { state.bots.forEach(b => updateBot(b.id, { max_bet_mph: 500 })); addNotification('Limite de todos: 500 MPH', 'success'); }}
                            >500</Button>
                            <Button
                                size="xs"
                                variant="outline"
                                className="w-16 h-8 rounded-lg justify-center"
                                onClick={() => { state.bots.forEach(b => updateBot(b.id, { max_bet_mph: 1000 })); addNotification('Limite de todos: 1000 MPH', 'success'); }}
                            >1000</Button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-nowrap">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0">Hash Harvest:</span>
                        <div className="flex gap-1 flex-nowrap overflow-x-auto">
                            <Button
                                size="xs"
                                variant="outline"
                                className="w-24 h-8 rounded-lg justify-center"
                                onClick={() => { state.bots.forEach(b => updateBot(b.id, { hash_harvest_difficulty: 'hard' })); addNotification('HH de todos: Hard', 'success'); }}
                            >Hard</Button>
                            <Button
                                size="xs"
                                variant="outline"
                                className="w-24 h-8 rounded-lg justify-center"
                                onClick={() => { state.bots.forEach(b => updateBot(b.id, { hash_harvest_difficulty: 'extreme_hard' })); addNotification('HH de todos: Extreme Hard', 'success'); }}
                            >Extreme Hard</Button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0">Agenda (HH):</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <label className="flex items-center gap-2 h-8 text-xs text-gray-300 bg-black/50 px-2 rounded-lg border border-gray-800 cursor-pointer hover:bg-gray-800">
                                <input
                                    type="checkbox"
                                    checked={Boolean(state.botSettings?.hhPeakEnabled)}
                                    className="rounded border-gray-600 bg-black"
                                    onChange={(e) => {
                                        saveHashHarvestPeakSettings({
                                            hhPeakEnabled: e.target.checked,
                                            hhPeakStartHour: state.botSettings?.hhPeakStartHour ?? 18,
                                            hhPeakEndHour: state.botSettings?.hhPeakEndHour ?? 23,
                                            hhPeakTimezone: state.botSettings?.hhPeakTimezone ?? 'America/Sao_Paulo'
                                        });
                                    }}
                                />
                                Pico
                            </label>
                            
                            <div className="flex items-center gap-1 h-8 bg-black/50 rounded-lg border border-gray-800 px-1">
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={Number(state.botSettings?.hhPeakStartHour ?? 18)}
                                    className="w-10 h-8 bg-transparent text-center text-xs text-white outline-none"
                                    onChange={(e) => setState(prev => ({ ...prev, botSettings: { ...(prev.botSettings || {}), hhPeakStartHour: Number(e.target.value || 0) } }))}
                                    onBlur={() => saveHashHarvestPeakSettings(state.botSettings)}
                                />
                                <span className="text-xs text-gray-500">-</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={Number(state.botSettings?.hhPeakEndHour ?? 23)}
                                    className="w-10 h-8 bg-transparent text-center text-xs text-white outline-none"
                                    onChange={(e) => setState(prev => ({ ...prev, botSettings: { ...(prev.botSettings || {}), hhPeakEndHour: Number(e.target.value || 0) } }))}
                                    onBlur={() => saveHashHarvestPeakSettings(state.botSettings)}
                                />
                            </div>

                            <select
                                value={String(state.botSettings?.hhPeakTimezone || 'America/Sao_Paulo')}
                                className="h-8 bg-black/50 border border-gray-800 rounded-lg px-2 text-xs text-white outline-none"
                                onChange={(e) => { const tz = e.target.value; setState(prev => ({ ...prev, botSettings: { ...(prev.botSettings || {}), hhPeakTimezone: tz } })); saveHashHarvestPeakSettings({ ...state.botSettings, hhPeakTimezone: tz }); }}
                            >
                                <option value="America/Sao_Paulo">SP</option>
                                <option value="UTC">UTC</option>
                            </select>
                            
                            <div className="flex gap-1">
                                <Button size="xs" variant="outline" className="h-8 rounded-lg" onClick={() => saveHashHarvestPeakSettings({ hhPeakEnabled: true, hhPeakStartHour: 18, hhPeakEndHour: 23, hhPeakTimezone: state.botSettings?.hhPeakTimezone ?? 'America/Sao_Paulo' })}>18-23</Button>
                                <Button size="xs" variant="outline" className="h-8 rounded-lg" onClick={() => saveHashHarvestPeakSettings({ hhPeakEnabled: false, hhPeakStartHour: state.botSettings?.hhPeakStartHour ?? 18, hhPeakEndHour: state.botSettings?.hhPeakEndHour ?? 23, hhPeakTimezone: state.botSettings?.hhPeakTimezone ?? 'America/Sao_Paulo' })}>OFF</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {state.bots.map(bot => (
                <Card key={bot.id} className="bg-gray-900/50 border-gray-800 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border-2 ${bot.active ? 'border-green-500' : 'border-red-500'}`}>
                                <span className="font-bold text-xs">{bot.avatar.replace('mp_p', 'B')}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-white leading-tight truncate">{bot.name}</p>
                                <p className="text-xs font-mono text-purple-400 leading-tight">{bot.mph.toLocaleString()} MPH</p>
                                <div className="mt-1">
                                    <span className="inline-flex w-fit text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/40 text-yellow-300 bg-yellow-900/10">
                                        Limite atual: {Number(bot.max_bet_mph ?? 100)} MPH
                                    </span>
                                </div>
                                {expandedBotId === bot.id && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {(Array.isArray(bot.nicknames) && bot.nicknames.length > 0 ? bot.nicknames : [bot.name]).map((n) => (
                                            <span key={n} className="text-[10px] px-2 py-0.5 rounded-full border border-pink-500/40 text-pink-300 bg-pink-900/10">
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col w-full md:w-auto gap-3">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                <Button 
                                    size="xs" 
                                    variant={bot.active ? "default" : "outline"}
                                    className={`${bot.active ? "bg-green-600 hover:bg-green-700" : "border-red-500 text-red-500"} h-8 rounded-lg`}
                                    onClick={() => updateBot(bot.id, { active: !bot.active })}
                                >
                                    {bot.active ? 'Ativo' : 'Inativo'}
                                </Button>
                                <Button 
                                    size="xs" 
                                    variant="ghost" 
                                    className="h-8 rounded-lg"
                                    onClick={() => setBotRecharge(bot)}
                                >
                                    <Edit2 size={12} /> Saldo
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                    <label className="text-[10px] text-gray-400">Limite</label>
                                    <input 
                                        type="number"
                                        min={10}
                                        defaultValue={Number(bot.max_bet_mph ?? 100)}
                                        className="w-20 h-8 bg-black border border-gray-700 rounded-lg px-2 text-[10px] text-white"
                                        onBlur={(e) => {
                                            const v = Number(e.target.value || 0);
                                            if (!v || v < 10) return addNotification('Mínimo: 10 MPH', 'danger');
                                            updateBot(bot.id, { max_bet_mph: v });
                                            addNotification(`Limite atualizado: ${v} MPH`, 'success');
                                        }}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button size="xs" variant="outline" className="w-14 h-8 rounded-lg justify-center" onClick={() => { updateBot(bot.id, { max_bet_mph: 100 }); addNotification('Limite: 100 MPH', 'success'); }}>100</Button>
                                        <Button size="xs" variant="outline" className="w-14 h-8 rounded-lg justify-center" onClick={() => { updateBot(bot.id, { max_bet_mph: 500 }); addNotification('Limite: 500 MPH', 'success'); }}>500</Button>
                                        <Button size="xs" variant="outline" className="w-14 h-8 rounded-lg justify-center" onClick={() => { updateBot(bot.id, { max_bet_mph: 1000 }); addNotification('Limite: 1000 MPH', 'success'); }}>1000</Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
                                    <span className="text-[10px] text-gray-400">Hash Harvest</span>
                                    <Button size="xs" className="w-24 h-8 rounded-lg justify-center" variant={String(bot.hash_harvest_difficulty || 'hard') === 'hard' ? 'default' : 'outline'} onClick={() => { updateBot(bot.id, { hash_harvest_difficulty: 'hard' }); addNotification('HH: Hard', 'success'); }}>Hard</Button>
                                    <Button size="xs" className="w-24 h-8 rounded-lg justify-center" variant={String(bot.hash_harvest_difficulty || 'hard') === 'extreme_hard' ? 'default' : 'outline'} onClick={() => { updateBot(bot.id, { hash_harvest_difficulty: 'extreme_hard' }); addNotification('HH: Extreme Hard', 'success'); }}>Extreme Hard</Button>
                                </div>
                            </div>
                            <Button
                                size="xs"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                onClick={() => setExpandedBotId(prev => (prev === bot.id ? null : bot.id))}
                            >
                                {expandedBotId === bot.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Nicknames
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}

            {/* Modal de Recarga de Bots */}
            {botRecharge && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm bg-gray-900 border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-white">Recarregar: {botRecharge.name}</h3>
                            <Button size="icon" variant="ghost" onClick={() => setBotRecharge(null)}><X size={20} /></Button>
                        </div>
                        
                        <form onSubmit={handleBotRecharge} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Quantidade (MPH)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="amount"
                                        placeholder="Ex: 1000" 
                                        min="1"
                                        required
                                        className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-purple-500 outline-none"
                                    />
                                    <span className="absolute right-3 top-3 text-purple-500 font-bold text-sm">MPH</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">Equivalente a: <span className="text-green-400">$1 = 100 MPH</span></p>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Origem dos Fundos</label>
                                <select name="origin" className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none">
                                    <option value="external_deposit">Depósito Externo (USD/PIX)</option>
                                    <option value="treasury">Tesouraria do Sistema</option>
                                    <option value="bonus">Bônus Promocional</option>
                                </select>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-900/50 p-3 rounded text-xs text-blue-300">
                                <p className="flex gap-2"><Shield size={14} /> Esta ação será registrada nos logs de auditoria.</p>
                            </div>

                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3">
                                Confirmar Recarga
                            </Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );

    const renderTournaments = () => (
        <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2"><Trophy size={18} /> Torneios</h3>
                <Button size="sm" variant="outline" onClick={fetchTournamentAdmin}><RefreshCw size={14} className="mr-1" /> Atualizar</Button>
            </div>

            <Card className="bg-gray-900/50 border-gray-800 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 uppercase">Fundo Acumulado</p>
                        <p className="text-2xl font-mono font-bold text-yellow-400">{Number(tournamentAdmin.pool || 0).toFixed(2)} MPH</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        <div>Total de torneios: {Array.isArray(tournamentAdmin.list) ? tournamentAdmin.list.length : 0}</div>
                    </div>
                </div>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 p-4">
                <h4 className="font-bold text-white mb-3">Dividir Fundo em 2–4 Torneios</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <select
                        value={tournamentSplit.count}
                        onChange={(e) => setTournamentSplit(prev => ({ ...prev, count: Number(e.target.value) }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                    >
                        <option value={2}>2 torneios</option>
                        <option value={3}>3 torneios</option>
                        <option value={4}>4 torneios</option>
                    </select>
                    <input
                        type="number"
                        min="1"
                        value={tournamentSplit.entryFee}
                        onChange={(e) => setTournamentSplit(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                        placeholder="Entrada (MPH)"
                    />
                    <input
                        value={tournamentSplit.namePrefix}
                        onChange={(e) => setTournamentSplit(prev => ({ ...prev, namePrefix: e.target.value }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                        placeholder="Prefixo do nome"
                    />
                    <select
                        value={tournamentSplit.status}
                        onChange={(e) => setTournamentSplit(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                    >
                        <option value="open">OPEN</option>
                        <option value="upcoming">UPCOMING</option>
                        <option value="live">LIVE</option>
                    </select>
                    <select
                        value={tournamentSplit.color}
                        onChange={(e) => setTournamentSplit(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                    >
                        <option value="yellow">Amarelo</option>
                        <option value="green">Verde</option>
                        <option value="blue">Azul</option>
                        <option value="purple">Roxo</option>
                        <option value="red">Vermelho</option>
                    </select>
                </div>
                <div className="mt-3">
                    <Button
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3"
                        onClick={async () => {
                            try {
                                const { data, error } = await supabase.rpc('admin_split_tournaments_pool', {
                                    p_count: tournamentSplit.count,
                                    p_entry_fee_mph: tournamentSplit.entryFee,
                                    p_status: tournamentSplit.status,
                                    p_name_prefix: tournamentSplit.namePrefix,
                                    p_color_theme: tournamentSplit.color
                                });
                                if (error) throw error;
                                if (!data?.ok) throw new Error(data?.error || 'Falha ao dividir fundo');
                                addNotification('Torneios criados com sucesso.', 'success');
                                fetchTournamentAdmin();
                            } catch (err) {
                                console.error('Erro ao dividir fundo:', err);
                                addNotification(err?.message || 'Erro ao dividir fundo.', 'danger');
                            }
                        }}
                        disabled={tournamentAdmin.loading}
                    >
                        Criar e Dividir Fundo
                    </Button>
                </div>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 p-4">
                <h4 className="font-bold text-white mb-3">Criar Torneio Único (retira do fundo acumulado)</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                        value={tournamentCreate.name}
                        onChange={(e) => setTournamentCreate(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none md:col-span-2"
                        placeholder="Nome"
                    />
                    <input
                        type="number"
                        min="1"
                        value={tournamentCreate.entryFee}
                        onChange={(e) => setTournamentCreate(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                        placeholder="Entrada (MPH)"
                    />
                    <input
                        type="number"
                        min="1"
                        value={tournamentCreate.prizePool}
                        onChange={(e) => setTournamentCreate(prev => ({ ...prev, prizePool: Number(e.target.value) }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                        placeholder="Prêmio (MPH)"
                    />
                    <select
                        value={tournamentCreate.color}
                        onChange={(e) => setTournamentCreate(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                    >
                        <option value="yellow">Amarelo</option>
                        <option value="green">Verde</option>
                        <option value="blue">Azul</option>
                        <option value="purple">Roxo</option>
                        <option value="red">Vermelho</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <select
                        value={tournamentCreate.status}
                        onChange={(e) => setTournamentCreate(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm outline-none"
                    >
                        <option value="open">OPEN</option>
                        <option value="upcoming">UPCOMING</option>
                        <option value="live">LIVE</option>
                    </select>
                    <Button
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3"
                        onClick={async () => {
                            try {
                                const { data, error } = await supabase.rpc('admin_create_tournament_from_pool', {
                                    p_name: tournamentCreate.name,
                                    p_entry_fee_mph: tournamentCreate.entryFee,
                                    p_prize_pool_mph: tournamentCreate.prizePool,
                                    p_status: tournamentCreate.status,
                                    p_color_theme: tournamentCreate.color
                                });
                                if (error) throw error;
                                if (!data?.ok) throw new Error(data?.error || 'Falha ao criar torneio');
                                addNotification('Torneio criado com sucesso.', 'success');
                                fetchTournamentAdmin();
                            } catch (err) {
                                console.error('Erro ao criar torneio:', err);
                                addNotification(err?.message || 'Erro ao criar torneio.', 'danger');
                            }
                        }}
                        disabled={tournamentAdmin.loading}
                    >
                        Criar Torneio
                    </Button>
                </div>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 p-4">
                <h4 className="font-bold text-white mb-3">Torneios Cadastrados</h4>
                {tournamentAdmin.loading ? (
                    <div className="text-center text-gray-400 text-sm py-6">Carregando...</div>
                ) : (
                    <div className="space-y-2">
                        {(tournamentAdmin.list || []).map((t) => (
                            <div key={t.id} className="bg-black/40 border border-gray-800 rounded-lg p-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-bold text-white">{t.name}</div>
                                    <div className="text-[10px] text-gray-500">
                                        Status: <span className="text-gray-300 font-mono">{String(t.status || '').toUpperCase()}</span>
                                        {' • '}
                                        Entrada: <span className="text-yellow-300 font-mono">{Number(t.entryFee || 0).toFixed(0)} MPH</span>
                                        {' • '}
                                        Prêmio: <span className="text-green-400 font-mono">{Number(t.prizePool || 0).toFixed(0)} MPH</span>
                                        {' • '}
                                        Participantes: <span className="text-purple-300 font-mono">{Number(t.participants || 0)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={t.status || 'open'}
                                        onChange={async (e) => {
                                            try {
                                                const { error } = await supabase
                                                    .from('tournaments')
                                                    .update({ status: e.target.value })
                                                    .eq('id', t.id);
                                                if (error) throw error;
                                                addNotification('Status atualizado.', 'success');
                                                fetchTournamentAdmin();
                                            } catch (err) {
                                                console.error('Erro ao atualizar status:', err);
                                                addNotification(err?.message || 'Erro ao atualizar status.', 'danger');
                                            }
                                        }}
                                        className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
                                    >
                                        <option value="open">OPEN</option>
                                        <option value="upcoming">UPCOMING</option>
                                        <option value="live">LIVE</option>
                                        <option value="closed">CLOSED</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                        {(tournamentAdmin.list || []).length === 0 && (
                            <div className="text-center text-gray-500 text-sm py-6">Nenhum torneio cadastrado.</div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-gray-200 pb-20">
            {/* Header Admin */}
            <div className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="text-red-500" /> Painel Admin
                </h2>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate('menu')}>Voltar</Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300"
                        onClick={async () => {
                            if(window.confirm('Deseja realmente sair?')) {
                                await supabase.auth.signOut();
                                localStorage.removeItem('mining_points_mvp_v1');
                                window.location.href = '/';
                            }
                        }}
                    >
                        Sair
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-4 gap-2 overflow-x-auto">
                <Button 
                    variant={activeTab === 'dashboard' ? 'default' : 'outline'} 
                    onClick={() => setActiveTab('dashboard')}
                    size="sm"
                >
                    Dashboard
                </Button>
                {isFinanceAdmin && (
                    <>
                        <Button 
                            variant={activeTab === 'withdrawals' ? 'default' : 'outline'} 
                            onClick={() => setActiveTab('withdrawals')}
                            size="sm"
                            className={activeTab === 'withdrawals' ? 'bg-green-600' : ''}
                        >
                             <DollarSign size={16} className="mr-1" /> Saques
                        </Button>
                        <Button 
                            variant={activeTab === 'tournaments' ? 'default' : 'outline'} 
                            onClick={() => setActiveTab('tournaments')}
                            size="sm"
                            className={activeTab === 'tournaments' ? 'bg-yellow-600 text-black' : ''}
                        >
                             <Trophy size={16} className="mr-1" /> Torneios
                        </Button>
                        <Button 
                            variant={activeTab === 'settings' ? 'default' : 'outline'} 
                            onClick={() => setActiveTab('settings')}
                            size="sm"
                            className={activeTab === 'settings' ? 'bg-purple-600' : ''}
                        >
                             <Settings size={16} className="mr-1" /> Pagamentos
                        </Button>
                    </>
                )}
                {canAccessSupport && (
                    <Button 
                        variant={activeTab === 'support' ? 'default' : 'outline'} 
                        onClick={() => setActiveTab('support')}
                        size="sm"
                        className={activeTab === 'support' ? 'bg-blue-600' : ''}
                    >
                         <MessageSquare size={16} className="mr-1" /> Atendimento
                    </Button>
                )}
                {isFinanceAdmin && (
                    <Button 
                        variant={activeTab === 'reports' ? 'default' : 'outline'} 
                        onClick={() => setActiveTab('reports')}
                        size="sm"
                        className={activeTab === 'reports' ? 'bg-red-600' : ''}
                    >
                         <AlertTriangle size={16} className="mr-1" /> Fórum Denúncias
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="px-4">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'users' && renderUsers()}
                {activeTab === 'bots' && renderBots()}
                {activeTab === 'tournaments' && renderTournaments()}
                {activeTab === 'settings' && renderSettings()}
                {activeTab === 'reports' && <ForumReportsAdmin />}
                {activeTab === 'withdrawals' && <WithdrawalManager currentAdmin={state.user} />}
                {activeTab === 'support' && canAccessSupport && <SupportAdmin currentAdmin={state.user} />}
            </div>
        </div>
    );
};
