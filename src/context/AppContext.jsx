import React, { createContext, useState, useEffect } from 'react';
import { AVAILABLE_LANGUAGES, LOCALES } from '../locales';
import { supabase } from '../lib/supabase';

export const AppContext = createContext();

const MINING_META_KEY = 'mining_points_mvp_v1_mining_meta';

const BOT_CATALOG = [
  { id: 'bot_01', name: 'CyberNinja', avatar: 'mp_p2', mph: 5000, active: true, nicknames: ['CyberNinja', 'NeonNinja', 'ByteShinobi', 'GridNinja', 'PurpleKatana'] },
  { id: 'bot_02', name: 'CryptoKing', avatar: 'mp_p3', mph: 8200, active: true, nicknames: ['CryptoKing', 'BlockBaron', 'ChainKing', 'VaultEmperor', 'TokenMonarch'] },
  { id: 'bot_03', name: 'MinerX', avatar: 'mp_p4', mph: 3100, active: true, nicknames: ['MinerX', 'RigRunner', 'HashWorker', 'GPUProspector', 'BitDigger'] },
  { id: 'bot_04', name: 'SatoshiFan', avatar: 'mp_p5', mph: 12000, active: true, nicknames: ['SatoshiFan', 'GenesisBeliever', 'SatsHunter', 'WhitepaperKid', 'NodeWatcher'] },
  { id: 'bot_05', name: 'BlockMaster', avatar: 'mp_p6', mph: 4500, active: true, nicknames: ['BlockMaster', 'LedgerLord', 'ProofBoss', 'ConsensusAce', 'ChainMarshal'] },
  { id: 'bot_06', name: 'SpeedRacer', avatar: 'mp_p7', mph: 6700, active: true, nicknames: ['SpeedRacer', 'TurboRunner', 'NeonSprint', 'VelocityViper', 'FastLaneX'] },
  { id: 'bot_07', name: 'LuckyStrike', avatar: 'mp_p1', mph: 2800, active: true, nicknames: ['LuckyStrike', 'FortuneFlip', 'JackpotByte', 'RandomAce', 'GoldRush'] },
  { id: 'bot_08', name: 'HashHunter', avatar: 'mp_p8', mph: 9300, active: true, nicknames: ['HashHunter', 'NonceSeeker', 'HashStalker', 'MiningScout', 'ProofChaser'] },
  { id: 'bot_09', name: 'PixelMiner', avatar: 'mp_p2', mph: 5600, active: true, nicknames: ['PixelMiner', 'RetroHasher', '8BitDigger', 'ArcadeMiner', 'PixelProspector'] },
  { id: 'bot_10', name: 'ChainBreaker', avatar: 'mp_p3', mph: 7100, active: true, nicknames: ['ChainBreaker', 'ForkRunner', 'BlockBender', 'LinkShatter', 'ProtocolWrecker'] },
  { id: 'bot_11', name: 'TokenMaster', avatar: 'mp_p4', mph: 15000, active: true, nicknames: ['TokenMaster', 'SwapWizard', 'LiquidityMage', 'DexCommander', 'MarketMakerX'] },
  { id: 'bot_12', name: 'GridRunner', avatar: 'mp_p5', mph: 4200, active: true, nicknames: ['GridRunner', 'SynthRunner', 'NeonGrid', 'CircuitRunner', 'MatrixDash'] },
];

const normalizeBots = (bots) => {
  const saved = Array.isArray(bots) ? bots : [];
  const savedById = new Map(saved.map(b => [b?.id, b]));
  return BOT_CATALOG.map(tpl => {
    const b = savedById.get(tpl.id) || {};
    return {
      ...tpl,
      ...b,
      nicknames: Array.isArray(tpl.nicknames) ? tpl.nicknames : [tpl.name]
    };
  });
};

const INITIAL_STATE = {
  user: {
    username: "investor_01",
    email: "investor@email.com",
    avatar: "default",
    joinedAt: new Date().toISOString(),
    team: 0,
    language: "pt-BR", // Default
    dailyCredits: 3,
    dailyCreditsFreeRemaining: 3,
    dailyCreditsBonusRemaining: 0,
    dailyCreditsNextResetAt: null,
    financialPassword: "", 
    wallets: { 
        usdt_bep20: "",
        usdt_polygon: "",
        usdt_trc20: "",
        usdt_arbitrum: "",
        usdc_arbitrum: "",
        pix: ""
    }
  },
  wallet: {
    usd: 0,
    balance_usd: 0,
    balance_frozen_usd: 0,
    mph: 0,
    deposited: 0,
    teamEarningsUsd: 0,
    totalEarnings: 0,
    withdrawn: 0
  },
  plans: [], 
  notifications: [],
  miningHistory: [],
  gameHistory: [], // Histórico de partidas
  rankings: {
    monthly: {
      volume: { pool: 12500, users: [
        { id: 1, name: 'CryptoKing', score: 15400, avatar: 'mp_p3' },
        { id: 2, name: 'MinerX', score: 12300, avatar: 'mp_p4' },
        { id: 3, name: 'BitHunter', score: 9800, avatar: 'mp_p2' },
        { id: 4, name: 'SatoshiFan', score: 8500, avatar: 'mp_p5' },
        { id: 5, name: 'BlockMaster', score: 7200, avatar: 'mp_p6' },
      ], participants: 0, me: null },
      net: { pool: 12500, users: [], participants: 0, me: null }
    },
    biweekly: {
      volume: { pool: 4200, users: [
        { id: 1, name: 'SpeedRacer', score: 5400, avatar: 'mp_p7' },
        { id: 2, name: 'CryptoKing', score: 4800, avatar: 'mp_p3' },
        { id: 3, name: 'LuckyStrike', score: 3200, avatar: 'mp_p1' },
      ], participants: 0, me: null },
      net: { pool: 4200, users: [], participants: 0, me: null }
    }
  },
  tournaments: {
    pool: 15000,
    list: [
      { id: 'br', nameKey: 'tournament_br', status: 'open', entryFee: 500, prizePool: 5000, participants: 12, color: 'yellow' },
      { id: 'am', nameKey: 'tournament_am', status: 'upcoming', entryFee: 500, prizePool: 8000, participants: 0, color: 'green' },
      { id: 'ne', nameKey: 'tournament_ne', status: 'live', entryFee: 500, prizePool: 2000, participants: 28, color: 'blue' }
    ]
  },
  ong: {
    pool: 1200,
    totalDonated: 45000,
    nameKey: 'ongName'
  },
  bots: [
    ...BOT_CATALOG,
  ],
  botSettings: {
    hhPeakEnabled: false,
    hhPeakStartHour: 18,
    hhPeakEndHour: 23,
    hhPeakTimezone: "America/Sao_Paulo"
  },
  gameStats: {
    totalMatches: 0,
    wins: 0,
    losses: 0
  },
  lastLogin: new Date().toISOString()
};

export const AppProvider = ({ children }) => {
  console.log("AppProvider mounted");
  const [state, setState] = useState(INITIAL_STATE);

  // Carregar dados do LocalStorage (Fallback)
  useEffect(() => {
    const loadInitialData = async () => {
        // LocalStorage para estado básico
        const saved = localStorage.getItem('mining_points_mvp_v1');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setState(prev => ({
                    ...INITIAL_STATE,
                    ...parsed,
                    rankings: parsed.rankings || INITIAL_STATE.rankings,
                    tournaments: parsed.tournaments || INITIAL_STATE.tournaments,
                    ong: parsed.ong || INITIAL_STATE.ong,
                    bots: normalizeBots(parsed.bots || INITIAL_STATE.bots),
                    gameStats: parsed.gameStats || INITIAL_STATE.gameStats,
                }));
            } catch {
                localStorage.removeItem('mining_points_mvp_v1');
            }
        }
    };

    loadInitialData();
  }, []);

  // Sincronizar com Supabase ao iniciar
  useEffect(() => {
    const syncWithSupabase = async () => {
        try {
            // Verifica sessão atual
            const { data: { session } } = await supabase.auth.getSession();
            let userId = session?.user?.id;

            // REMOVIDO: Login anônimo automático. 
            // Agora esperamos o usuário fazer login via AuthView se não houver sessão.
            
            if (!userId) {
                // Se não tem usuário, não faz nada. O App.jsx vai redirecionar para AuthView.
                return;
            }

            // Busca perfil, carteira e planos em paralelo
            let [profileRes, walletRes, plansRes, txRes, roiRes, teamEarnRes, creditsRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('wallets').select('*').eq('user_id', userId).single(),
                supabase.from('plans').select('*').eq('user_id', userId),
                supabase
                    .from('transactions')
                    .select('id,type,amount,currency,status,description,created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(30),
                supabase
                    .from('transactions')
                    .select('id,amount,currency,status,created_at')
                    .eq('user_id', userId)
                    .eq('type', 'daily_roi')
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase.rpc('get_network_earnings_summary', { target_user_id: userId }),
                supabase.rpc('get_arcade_credits_state')
            ]);

            let profile = profileRes.data;
            let wallet = walletRes.data;
            let dbPlans = plansRes.data || [];
            const dbTxs = txRes.data || [];
            const dbRoiTxs = roiRes.data || [];

            const teamEarnData = teamEarnRes?.data;
            const teamEarningsUsd = Array.isArray(teamEarnData) && teamEarnData.length > 0
                ? Number(teamEarnData[0]?.total_earnings || 0)
                : 0;

            // Self-healing: Criar perfil se não existir (Correção para falta de Trigger)
            if (!profile && userId) {
                console.warn("Perfil não encontrado. Tentando criar automaticamente...");
                try {
                    const { user } = session;
                    const username = user.user_metadata?.username || user.email.split('@')[0];
                    
                    // Tenta criar o perfil
                    const { error: insertError } = await supabase.from('profiles').insert([{
                        id: userId,
                        username: username,
                        email: user.email,
                        full_name: user.user_metadata?.full_name,
                        avatar_url: 'mp_p6',
                        role: 'user',
                        account_status: 'active'
                    }]);

                    if (!insertError) {
                        // Busca novamente
                        const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
                        profile = newProfile;
                        
                        // Verifica/Cria Wallet
                        if (!wallet) {
                            const { error: walletError } = await supabase.from('wallets').insert([{ user_id: userId }]);
                            if (!walletError) {
                                const { data: newWallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
                                wallet = newWallet;
                            }
                        }
                    } else {
                        console.error("Erro ao criar perfil automático:", insertError);
                    }
                } catch (err) {
                    console.error("Falha no self-healing de perfil:", err);
                }
            }

            if (profile) {
                // Bloqueio de Segurança
                if (profile.account_status === 'blocked') {
                    await supabase.auth.signOut();
                    alert("ACESSO NEGADO: Sua conta está bloqueada administrativamente.");
                    window.location.reload();
                    return;
                }

                // Converter dbPlans para o formato esperado pelo frontend
                 const mappedPlans = dbPlans.map(p => ({
                     id: p.id,
                     type: p.type,
                     amount: parseFloat(p.amount_invested),
                     active: p.status === 'active',
                     startDate: p.start_date,
                     roi: 0
                 }));

                const mappedNotifications = dbTxs.map(tx => {
                    let notifType = 'info';
                    if (tx.type === 'daily_roi') notifType = 'profit';
                    else if (tx.type === 'plan_purchase') notifType = 'plan';
                    else if (tx.type === 'deposit') notifType = 'deposit';
                    else if (tx.type === 'withdrawal') notifType = 'withdraw';
                    else if (tx.type === 'unilevel_bonus' || tx.type === 'residual_bonus' || tx.type === 'career_bonus') notifType = 'team';
                    else if (tx.type === 'game_win' || tx.type === 'game_bet') notifType = 'game';

                    const amountStr = typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount;
                    return {
                        id: tx.id,
                        msg: `${tx.description || tx.type}: $${amountStr} ${tx.currency || 'USD'}`,
                        type: notifType,
                        read: false,
                        time: tx.created_at
                    };
                });

                const mappedMiningHistory = dbRoiTxs
                    .map(tx => ({
                        id: tx.id,
                        time: tx.created_at,
                        details: [{
                            profit: tx.amount,
                            hash: `BLOCK-${String(tx.id).slice(0, 6)}`,
                            status: 'profit'
                        }]
                    }))
                    ;

                setState(prev => ({
                    ...prev,
                    user: {
                        ...prev.user,
                        id: userId,
                        username: profile.username || prev.user.username,
                        email: profile.email || prev.user.email,
                        sponsor_id: profile.sponsor_id,
                        team: profile.team_volume_usd || 0,
                        role: profile.role || 'user',
                        account_status: profile.account_status, // Importante para controle
                        automatic_withdrawal: profile.automatic_withdrawal || false,
                        dailyCredits: creditsRes?.data?.ok
                            ? Number(creditsRes.data.total_remaining || 0)
                            : Number(prev.user.dailyCredits || 3),
                        dailyCreditsFreeRemaining: creditsRes?.data?.ok
                            ? Number(creditsRes.data.free_remaining || 0)
                            : Number(prev.user.dailyCreditsFreeRemaining ?? prev.user.dailyCredits ?? 3),
                        dailyCreditsBonusRemaining: creditsRes?.data?.ok
                            ? Number(creditsRes.data.bonus_remaining || 0)
                            : Number(prev.user.dailyCreditsBonusRemaining || 0),
                        dailyCreditsNextResetAt: creditsRes?.data?.ok
                            ? (creditsRes.data.next_reset_at || null)
                            : (prev.user.dailyCreditsNextResetAt || null),
                        wallets: {
                            ...(prev.user.wallets || {}),
                            usdt_bep20: profile.wallet_usdt_bep20 || '',
                            usdt_polygon: profile.wallet_usdt_polygon || '',
                            usdt_trc20: profile.wallet_usdt_trc20 || '',
                            usdt_arbitrum: profile.wallet_usdt_arbitrum || '',
                            usdc_arbitrum: profile.wallet_usdc_arbitrum || '',
                            pix: profile.pix_key || ''
                        },
                        isAuthenticated: true // Flag para controle de rota
                    },
                    wallet: {
                        ...prev.wallet,
                        mph: wallet ? (wallet.balance_mph || 0) : prev.wallet.mph,
                        usd: wallet ? (wallet.balance_usd || 0) : prev.wallet.usd,
                        balance_usd: wallet ? (wallet.balance_usd || 0) : 0, 
                        balance_frozen_usd: wallet ? (wallet.balance_frozen_usd || 0) : 0,
                        deposited: wallet ? (wallet.total_deposited_usd || 0) : prev.wallet.deposited,
                        withdrawn: wallet ? (wallet.total_withdrawn_usd || 0) : prev.wallet.withdrawn,
                        teamEarningsUsd,
                        totalEarnings: wallet ? (wallet.total_earnings_usd || 0) : prev.wallet.totalEarnings
                 },
                 plans: mappedPlans,
                 notifications: mappedNotifications,
                 miningHistory: mappedMiningHistory
             }));

                try {
                    const [{ data: meta }, { data: monthlyVol }, { data: biweeklyVol }, { data: monthlyNet }, { data: biweeklyNet }] = await Promise.all([
                        supabase.rpc('get_arcade_meta_snapshot'),
                        supabase.rpc('get_pvp_ranking_snapshot', { p_period: 'monthly', p_limit: 10, p_mode: 'volume' }),
                        supabase.rpc('get_pvp_ranking_snapshot', { p_period: 'biweekly', p_limit: 10, p_mode: 'volume' }),
                        supabase.rpc('get_pvp_ranking_snapshot', { p_period: 'monthly', p_limit: 10, p_mode: 'net' }),
                        supabase.rpc('get_pvp_ranking_snapshot', { p_period: 'biweekly', p_limit: 10, p_mode: 'net' })
                    ]);

                    if (meta?.ok || monthlyVol?.ok || biweeklyVol?.ok || monthlyNet?.ok || biweeklyNet?.ok) {
                        setState(prev => ({
                            ...prev,
                            rankings: {
                                monthly: {
                                    volume: {
                                        pool: Number(monthlyVol?.pool ?? meta?.rankings?.monthly_pool ?? prev.rankings.monthly.volume.pool ?? 0),
                                        participants: Number(monthlyVol?.participants ?? 0),
                                        users: Array.isArray(monthlyVol?.users) ? monthlyVol.users : prev.rankings.monthly.volume.users,
                                        me: monthlyVol?.me ?? prev.rankings.monthly.volume.me ?? null
                                    },
                                    net: {
                                        pool: Number(monthlyNet?.pool ?? meta?.rankings?.monthly_pool ?? prev.rankings.monthly.net.pool ?? 0),
                                        participants: Number(monthlyNet?.participants ?? 0),
                                        users: Array.isArray(monthlyNet?.users) ? monthlyNet.users : prev.rankings.monthly.net.users,
                                        me: monthlyNet?.me ?? prev.rankings.monthly.net.me ?? null
                                    }
                                },
                                biweekly: {
                                    volume: {
                                        pool: Number(biweeklyVol?.pool ?? meta?.rankings?.biweekly_pool ?? prev.rankings.biweekly.volume.pool ?? 0),
                                        participants: Number(biweeklyVol?.participants ?? 0),
                                        users: Array.isArray(biweeklyVol?.users) ? biweeklyVol.users : prev.rankings.biweekly.volume.users,
                                        me: biweeklyVol?.me ?? prev.rankings.biweekly.volume.me ?? null
                                    },
                                    net: {
                                        pool: Number(biweeklyNet?.pool ?? meta?.rankings?.biweekly_pool ?? prev.rankings.biweekly.net.pool ?? 0),
                                        participants: Number(biweeklyNet?.participants ?? 0),
                                        users: Array.isArray(biweeklyNet?.users) ? biweeklyNet.users : prev.rankings.biweekly.net.users,
                                        me: biweeklyNet?.me ?? prev.rankings.biweekly.net.me ?? null
                                    }
                                }
                            },
                            tournaments: {
                                pool: Number(meta?.tournaments?.pool ?? prev.tournaments.pool ?? 0),
                                list: Array.isArray(meta?.tournaments?.list) ? meta.tournaments.list : prev.tournaments.list
                            },
                            ong: {
                                ...prev.ong,
                                pool: Number(meta?.ong?.pool ?? prev.ong.pool ?? 0),
                                totalDonated: Number(meta?.ong?.totalDonated ?? prev.ong.totalDonated ?? 0)
                            },
                            botSettings: {
                                hhPeakEnabled: Boolean(meta?.bots?.hhPeakEnabled ?? prev.botSettings.hhPeakEnabled ?? false),
                                hhPeakStartHour: Number(meta?.bots?.hhPeakStartHour ?? prev.botSettings.hhPeakStartHour ?? 18),
                                hhPeakEndHour: Number(meta?.bots?.hhPeakEndHour ?? prev.botSettings.hhPeakEndHour ?? 23),
                                hhPeakTimezone: String(meta?.bots?.hhPeakTimezone ?? prev.botSettings.hhPeakTimezone ?? 'America/Sao_Paulo')
                            }
                        }));
                    }
                } catch (err) {
                    console.error('Erro ao carregar rankings/torneios/ONG:', err);
                }
                
                // Carregar estado dos Bots do Supabase (se existir)
                try {
                    const { data: botsRows } = await supabase
                        .from('system_bots')
                        .select('id, active, mph, nicknames, avatar, max_bet_mph, hash_harvest_difficulty');
                    if (Array.isArray(botsRows) && botsRows.length > 0) {
                        const map = new Map(botsRows.map(r => [r.id, r]));
                        setState(prev => ({
                            ...prev,
                            bots: prev.bots.map(tpl => {
                                const row = map.get(tpl.id);
                                if (!row) return tpl;
                                return {
                                    ...tpl,
                                    active: typeof row.active === 'boolean' ? row.active : tpl.active,
                                    mph: Number(row.mph ?? tpl.mph ?? 0),
                                    nicknames: Array.isArray(row.nicknames) ? row.nicknames : tpl.nicknames,
                                    avatar: row.avatar ?? tpl.avatar,
                                    max_bet_mph: Number(row.max_bet_mph ?? tpl.max_bet_mph ?? 100),
                                    hash_harvest_difficulty: row.hash_harvest_difficulty ?? tpl.hash_harvest_difficulty ?? 'hard'
                                };
                            })
                        }));
                    }
                } catch (e) {
                    console.error('Erro ao carregar bots do Supabase:', e);
                }
            }
        } catch (error) {
            console.error("Erro na sincronização Supabase:", error);
        }
    };

    // Escuta mudanças de estado de Auth (Login/Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            syncWithSupabase();
        } else if (event === 'SIGNED_OUT') {
            setState(INITIAL_STATE); // Limpa estado ao sair
            window.location.reload(); // Recarrega para garantir limpeza
        }
    });

    syncWithSupabase();

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);

  const [miningTimer, setMiningTimer] = useState(900); 
  const [miningStatus, setMiningStatus] = useState('searching'); 
  const [popup, setPopup] = useState(null);
  const [isProcessingCycle, setIsProcessingCycle] = useState(false);

  // Persistência
  useEffect(() => {
    localStorage.setItem('mining_points_mvp_v1', JSON.stringify(state));
  }, [state]);

  const addNotification = async (msg, type = 'info') => {
    const notif = { 
        id: Date.now(), 
        msg, 
        type, 
        read: false, 
        time: new Date().toISOString() 
    };
    
    setState(prev => ({ ...prev, notifications: [notif, ...prev.notifications] }));
    
    setPopup({ msg, type });
    setTimeout(() => setPopup(null), 3000);
  };

  // Processa o ciclo de mineração via RPC (Backend Sincronizado)
  const processGlobalCycle = async () => {
    if (isProcessingCycle) return;
    setIsProcessingCycle(true);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const beforeTotal = state.wallet.totalEarnings || 0;

        const { error: cycleError } = await supabase.rpc('process_mining_cycle');
        if (cycleError) throw cycleError;

        const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('balance_usd, balance_frozen_usd, total_deposited_usd, total_withdrawn_usd, total_earnings_usd')
            .eq('user_id', userId)
            .single();

        if (walletError) throw walletError;

        const newTotal = walletData?.total_earnings_usd || 0;
        const delta = Math.max(0, newTotal - beforeTotal);

        setState(prev => ({
            ...prev,
            wallet: {
                ...prev.wallet,
                usd: walletData?.balance_usd || 0,
                balance_usd: walletData?.balance_usd || 0,
                balance_frozen_usd: walletData?.balance_frozen_usd || 0,
                deposited: walletData?.total_deposited_usd || 0,
                withdrawn: walletData?.total_withdrawn_usd || 0,
                totalEarnings: newTotal
            },
            miningHistory: delta > 0 ? [
                {
                    id: Date.now(),
                    time: new Date().toISOString(),
                    details: [{
                        profit: delta,
                        hash: `BLOCK-${Math.floor(Date.now() / 900000)}`,
                        status: 'profit'
                    }]
                },
                ...prev.miningHistory
            ].slice(0, 50) : prev.miningHistory
        }));

        if (delta > 0) {
            addNotification(`Ciclo Finalizado: +$${delta.toFixed(4)} creditado.`, 'profit');
        } else {
            // Se delta é 0, verifica histórico recente no banco para não perder "visualização" se já foi pago
            const { data: recentTxs } = await supabase.from('transactions')
                .select('*')
                .eq('user_id', userId)
                .eq('type', 'daily_roi')
                .gt('created_at', new Date(Date.now() - 900000).toISOString()) // Últimos 15 min
                .limit(1);
            
            if (recentTxs && recentTxs.length > 0) {
                 // Já foi pago pelo job, apenas atualiza UI se necessário
            }
        }

    } catch (err) {
        console.error("Erro ao processar ciclo global:", err);
    } finally {
        setIsProcessingCycle(false);
    }
  };

  // Timer Global Sincronizado (Epoch Time)
  useEffect(() => {
    const syncTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        const cycleDuration = 900; // 15 minutos
        const elapsed = now % cycleDuration;
        const remaining = cycleDuration - elapsed;

        setMiningTimer(remaining);

        // Status Visual
        const phase = elapsed % 60; // Ciclo visual curto de 60s para animação
        if (phase < 5) setMiningStatus('searching');
        else if (phase < 10) setMiningStatus('analyzing');
        else setMiningStatus('executing');

        // Gatilho de Fim de Ciclo (Margem de 2s para garantir)
        if (remaining <= 2 && !isProcessingCycle) {
            processGlobalCycle();
        }
    };

    syncTimer(); // Executa imediatamente
    const interval = setInterval(syncTimer, 1000);

    return () => clearInterval(interval);
  }, [isProcessingCycle]); // Dependência para evitar loop se processamento demorar

  // Handlers de Visibilidade removidos pois o Timer agora é absoluto


  const markAllNotificationsRead = () => {
      setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }));
  };

  const clearNotifications = () => {
      if(window.confirm('Limpar todas as notificações?')) {
          setState(prev => ({ ...prev, notifications: [] }));
      }
  };

  const updateWallet = (amount, type, currency = 'usd') => {
    setState(prev => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        [currency]: (prev.wallet[currency] || 0) + amount,
        ...(currency === 'usd' ? { balance_usd: (prev.wallet.balance_usd || prev.wallet.usd || 0) + amount } : {}),
        deposited: type === 'deposit' ? prev.wallet.deposited + amount : prev.wallet.deposited,
        withdrawn: type === 'withdraw' ? prev.wallet.withdrawn + Math.abs(amount) : prev.wallet.withdrawn
      }
    }));
  };

  const syncArcadeCredits = async () => {
      try {
          const { data, error } = await supabase.rpc('get_arcade_credits_state');
          if (error) throw error;
          if (!data?.ok) return;

          const free = Number(data.free_remaining || 0);
          const bonus = Number(data.bonus_remaining || 0);
          const total = Number(data.total_remaining || (free + bonus));

          setState(prev => ({
              ...prev,
              user: {
                  ...prev.user,
                  dailyCredits: total,
                  dailyCreditsFreeRemaining: free,
                  dailyCreditsBonusRemaining: bonus,
                  dailyCreditsNextResetAt: data.next_reset_at || null
              }
          }));
      } catch (e) {
          console.error('Erro ao sincronizar créditos do Arcade:', e);
      }
  };

  const consumeDailyCredit = async () => {
      try {
          const { data, error } = await supabase.rpc('consume_arcade_credit');
          if (error) throw error;
          if (!data?.ok) return false;

          const free = Number(data.free_remaining || 0);
          const bonus = Number(data.bonus_remaining || 0);
          const total = Number(data.total_remaining || (free + bonus));

          setState(prev => ({
              ...prev,
              user: {
                  ...prev.user,
                  dailyCredits: total,
                  dailyCreditsFreeRemaining: free,
                  dailyCreditsBonusRemaining: bonus,
                  dailyCreditsNextResetAt: data.next_reset_at || prev.user.dailyCreditsNextResetAt || null
              }
          }));
          return true;
      } catch (e) {
          console.error('Erro ao consumir crédito do Arcade:', e);
          return false;
      }
  };

  const buyCredits = async (amount, cost) => {
      try {
          const { data, error } = await supabase.rpc('buy_arcade_credits', {
              p_amount: amount,
              p_cost_mph: cost
          });
          if (error) throw error;
          if (!data?.ok) {
              addNotification(data?.error || 'MPH insuficiente para comprar créditos.', 'danger');
              return false;
          }

          const free = Number(data.free_remaining || 0);
          const bonus = Number(data.bonus_remaining || 0);
          const total = Number(data.total_remaining || (free + bonus));
          const walletBalance = Number(data.wallet_balance_mph || 0);

          setState(prev => ({
              ...prev,
              user: {
                  ...prev.user,
                  dailyCredits: total,
                  dailyCreditsFreeRemaining: free,
                  dailyCreditsBonusRemaining: bonus,
                  dailyCreditsNextResetAt: data.next_reset_at || prev.user.dailyCreditsNextResetAt || null
              },
              wallet: {
                  ...prev.wallet,
                  mph: walletBalance
              }
          }));

          addNotification(`${amount} créditos comprados com sucesso!`, 'success');
          return true;
      } catch (e) {
          console.error('Erro ao comprar créditos do Arcade:', e);
          addNotification('Erro ao comprar créditos.', 'danger');
          return false;
      }
  };

  const addGameResult = async (gameName, historyAmount, walletAmount = null) => {
      const amountToAdd = walletAmount !== null ? walletAmount : historyAmount;
      
      const newEntry = {
          id: Date.now(),
          game: gameName,
          amount: historyAmount,
          time: new Date().toISOString()
      };
      
      // Atualiza estado local
      setState(prev => {
        const newStats = { ...prev.gameStats };
        newStats.totalMatches = (newStats.totalMatches || 0) + 1;
        if (historyAmount > 0) newStats.wins = (newStats.wins || 0) + 1;
        else newStats.losses = (newStats.losses || 0) + 1;

        return {
          ...prev,
          wallet: { ...prev.wallet, mph: prev.wallet.mph + amountToAdd },
          gameHistory: [newEntry, ...prev.gameHistory].slice(0, 20),
          gameStats: newStats
        };
      });

      // Persiste no Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            // Busca saldo atual do banco para garantir consistência
            const { data: walletData, error: walletError } = await supabase
                .from('wallets')
                .select('balance_mph')
                .eq('user_id', session.user.id)
                .single();

            if (!walletError && walletData) {
                 const currentMph = parseFloat(walletData.balance_mph || 0);
                 const newMph = currentMph + amountToAdd;

                 // Atualiza saldo
                 await supabase
                    .from('wallets')
                    .update({ balance_mph: newMph })
                    .eq('user_id', session.user.id);
            }

            // Salva histórico da partida (Opcional: refinar campos)
            /*
            await supabase.from('arcade_matches').insert([{
                player1_id: session.user.id,
                game_type: gameName,
                bet_amount_mph: Math.abs(historyAmount), 
                winner_id: historyAmount > 0 ? session.user.id : null,
                total_pot_mph: 0, 
                fee_collected_mph: 0,
                prize_distributed_mph: historyAmount > 0 ? historyAmount : 0
            }]);
            */
        }
      } catch (err) {
        console.error("Erro ao salvar jogo no Supabase:", err);
      }
  };

  const getHourInTimeZone = (timeZone) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hour12: false }).formatToParts(new Date());
      const h = parts.find(p => p.type === 'hour')?.value;
      const n = Number(h);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  };

  const isHourInWindow = (hour, startHour, endHour) => {
    const h = Number(hour);
    const s = Number(startHour);
    const e = Number(endHour);
    if (![h, s, e].every(Number.isFinite)) return false;
    if (s === e) return true;
    if (s < e) return h >= s && h < e;
    return h >= s || h < e;
  };

  const getNextBotDifficulty = (gameType, botId) => {
    if (gameType === 'hash_harvest') {
      const bot = (state.bots || []).find(b => b.id === botId);
      const mode = String(bot?.hash_harvest_difficulty || 'hard').toLowerCase();
      const peakEnabled = Boolean(state.botSettings?.hhPeakEnabled);
      const peakStart = Number(state.botSettings?.hhPeakStartHour ?? 18);
      const peakEnd = Number(state.botSettings?.hhPeakEndHour ?? 23);
      const tz = String(state.botSettings?.hhPeakTimezone ?? 'America/Sao_Paulo');

      if (mode === 'extreme_hard') {
        if (!peakEnabled) return 'extreme_hard';
        const hour = getHourInTimeZone(tz);
        return isHourInWindow(hour, peakStart, peakEnd) ? 'extreme_hard' : 'hard';
      }
      if (mode === 'extreme') {
        if (!peakEnabled) return 'extreme';
        const hour = getHourInTimeZone(tz);
        return isHourInWindow(hour, peakStart, peakEnd) ? 'extreme' : 'hard';
      }
      return 'hard';
    }
    const matches = state.gameStats?.totalMatches || 0;
    return matches % 2 === 0 ? 'medium' : 'hard';
  };

  const updateBot = (botId, updates) => {
    setState(prev => ({
      ...prev,
      bots: prev.bots.map(b => b.id === botId ? { ...b, ...updates } : b)
    }));
    try {
      const bot = state.bots.find(b => b.id === botId) || {};
      const payload = {
        id: botId,
        active: updates.active ?? bot.active ?? true,
        mph: updates.mph ?? bot.mph ?? 0,
        nicknames: Array.isArray(bot.nicknames) ? bot.nicknames : null,
        avatar: updates.avatar ?? bot.avatar ?? null,
        max_bet_mph: updates.max_bet_mph ?? bot.max_bet_mph ?? 100,
        hash_harvest_difficulty: updates.hash_harvest_difficulty ?? bot.hash_harvest_difficulty ?? 'hard'
      };
      supabase.from('system_bots').upsert([payload]).then(() => {}).catch(() => {});
    } catch {}
  };

  const processPvpDistribution = (betAmount) => {
    // 15% de cada lado = 30% da aposta total de um jogador (considerando que são 2 jogadores apostando o mesmo valor)
    // "O sistema fica com 15% de cada participante"
    
    const totalFee = betAmount * 0.30; // 15% de cada um dos 2 jogadores = 30% de UMA aposta base
    const prizeDistributionPool = totalFee * 0.5; // 50% para distribuição (Rankings, Torneios, ONG)
    // Os outros 50% são da Empresa

    const monthlyShare = prizeDistributionPool * 0.30;
    const biweeklyShare = prizeDistributionPool * 0.10;
    const tournamentShare = prizeDistributionPool * 0.50;
    const ongShare = prizeDistributionPool * 0.10;

    setState(prev => ({
        ...prev,
        rankings: {
            ...prev.rankings,
            monthly: { ...prev.rankings.monthly, pool: prev.rankings.monthly.pool + monthlyShare },
            biweekly: { ...prev.rankings.biweekly, pool: prev.rankings.biweekly.pool + biweeklyShare }
        },
        tournaments: {
            ...prev.tournaments,
            pool: prev.tournaments.pool + tournamentShare
        },
        ong: {
            ...prev.ong,
            pool: prev.ong.pool + ongShare
        }
    }));
  };

  const addPlan = async (planType, amount) => {
    const isSponsoredAccount = state.user.account_status === 'sponsored';
    const frozenBalance = state.wallet.balance_frozen_usd || 0;
    const realBalance = state.wallet.balance_usd || state.wallet.usd || 0;
    const totalAvailable = isSponsoredAccount ? (frozenBalance + realBalance) : realBalance;

    if (totalAvailable < amount) {
      addNotification("Saldo insuficiente para contratação.", "danger");
      return false;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Usuário não autenticado");

        const now = new Date();
        const { data: purchaseData, error: purchaseError } = await supabase.rpc('purchase_mining_plan', {
            p_plan_type: planType,
            p_amount: amount
        });

        if (purchaseError) throw purchaseError;

        const amountToDeductReal = Number(purchaseData?.deduct_real || 0);
        const amountToDeductFrozen = Number(purchaseData?.deduct_frozen || 0);
        const newPlanId = purchaseData?.plan_id || Date.now();
        const newPlan = {
          id: newPlanId,
          type: planType,
          amount: parseFloat(amount),
          active: true,
          startDate: now.toISOString(),
          roi: 0
        };

        setState(prev => ({
          ...prev,
          wallet: { 
              ...prev.wallet, 
              usd: (prev.wallet.usd || 0) - amountToDeductReal,
              balance_usd: (prev.wallet.balance_usd || 0) - amountToDeductReal,
              balance_frozen_usd: (prev.wallet.balance_frozen_usd || 0) - amountToDeductFrozen
          },
          plans: [...prev.plans, newPlan],
          user: {
              ...prev.user,
              account_status: (!isSponsoredAccount && prev.user.account_status === 'inactive') ? 'active' : prev.user.account_status
          }
        }));

        addNotification(`Contrato ${planType.toUpperCase()} ativado: -$${amount}`, "plan");
        return true;

    } catch (error) {
        console.error("Erro ao ativar plano:", error);
        addNotification(error?.message ? `Erro ao processar ativação do plano: ${error.message}` : "Erro ao processar ativação do plano.", "danger");
        return false;
    }
  };

  const resetAppData = () => {
    if (window.confirm('Tem certeza? Isso apagará TODO o progresso e saldo da aplicação.')) {
        localStorage.removeItem('mining_points_mvp_v1');
        localStorage.removeItem(MINING_META_KEY);
        setState(INITIAL_STATE);
        window.location.reload();
    }
  };

  const changeLanguage = (lang) => {
    setState(prev => ({ ...prev, user: { ...prev.user, language: lang } }));
    addNotification(`Idioma alterado para: ${AVAILABLE_LANGUAGES.find(l => l.code === lang)?.name}`, 'success');
  };

  const dict = LOCALES[state.user.language] || LOCALES['pt-BR'];
  const t = (path) => {
    try {
      return path.split('.').reduce((acc, k) => acc && acc[k], dict) || path;
    } catch {
      return path;
    }
  };

  return (
    <AppContext.Provider value={{ 
      state, setState, miningTimer, miningStatus, 
      addNotification, updateWallet, addPlan, changeLanguage, popup,
      markAllNotificationsRead, clearNotifications, addGameResult, processPvpDistribution, consumeDailyCredit, buyCredits, t, resetAppData, getNextBotDifficulty, updateBot
    }}>
      {children}
    </AppContext.Provider>
  );
};
