import React, { createContext, useState, useEffect } from 'react';
import { AVAILABLE_LANGUAGES, LOCALES } from '../locales';
import { supabase } from '../lib/supabase';

export const AppContext = createContext();

const MINING_META_KEY = 'mining_points_mvp_v1_mining_meta';

const INITIAL_STATE = {
  user: {
    username: "investor_01",
    email: "investor@email.com",
    avatar: "default",
    joinedAt: new Date().toISOString(),
    team: 0,
    language: "pt-BR", // Default
    dailyCredits: 3, // Créditos diários
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
    totalEarnings: 0,
    withdrawn: 0
  },
  plans: [], 
  notifications: [],
  miningHistory: [],
  gameHistory: [], // Histórico de partidas
  rankings: {
    monthly: { pool: 12500, users: [
      { id: 1, name: 'CryptoKing', score: 15400, avatar: 'mp_p3' },
      { id: 2, name: 'MinerX', score: 12300, avatar: 'mp_p4' },
      { id: 3, name: 'BitHunter', score: 9800, avatar: 'mp_p2' },
      { id: 4, name: 'SatoshiFan', score: 8500, avatar: 'mp_p5' },
      { id: 5, name: 'BlockMaster', score: 7200, avatar: 'mp_p6' },
    ] },
    biweekly: { pool: 4200, users: [
      { id: 1, name: 'SpeedRacer', score: 5400, avatar: 'mp_p7' },
      { id: 2, name: 'CryptoKing', score: 4800, avatar: 'mp_p3' },
      { id: 3, name: 'LuckyStrike', score: 3200, avatar: 'mp_p1' },
    ] }
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
    { id: 'bot_01', name: 'CyberNinja', avatar: 'mp_p2', mph: 5000, active: true },
    { id: 'bot_02', name: 'CryptoKing', avatar: 'mp_p3', mph: 8200, active: true },
    { id: 'bot_03', name: 'MinerX', avatar: 'mp_p4', mph: 3100, active: true },
    { id: 'bot_04', name: 'SatoshiFan', avatar: 'mp_p5', mph: 12000, active: true },
    { id: 'bot_05', name: 'BlockMaster', avatar: 'mp_p6', mph: 4500, active: true },
    { id: 'bot_06', name: 'SpeedRacer', avatar: 'mp_p7', mph: 6700, active: true },
    { id: 'bot_07', name: 'LuckyStrike', avatar: 'mp_p1', mph: 2800, active: true },
    { id: 'bot_08', name: 'HashHunter', avatar: 'mp_p8', mph: 9300, active: true },
    { id: 'bot_09', name: 'PixelMiner', avatar: 'mp_p2', mph: 5600, active: true },
    { id: 'bot_10', name: 'ChainBreaker', avatar: 'mp_p3', mph: 7100, active: true },
    { id: 'bot_11', name: 'TokenMaster', avatar: 'mp_p4', mph: 15000, active: true },
    { id: 'bot_12', name: 'GridRunner', avatar: 'mp_p5', mph: 4200, active: true },
  ],
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
    const saved = localStorage.getItem('mining_points_mvp_v1');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setState(prev => ({
                ...INITIAL_STATE,
                ...parsed,
                // Garantir merge defensivo
                rankings: parsed.rankings || INITIAL_STATE.rankings,
                tournaments: parsed.tournaments || INITIAL_STATE.tournaments,
                ong: parsed.ong || INITIAL_STATE.ong,
                bots: parsed.bots || INITIAL_STATE.bots,
                gameStats: parsed.gameStats || INITIAL_STATE.gameStats,
            }));
        } catch {
            localStorage.removeItem('mining_points_mvp_v1');
        }
    }
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

            // Busca perfil e carteira em paralelo
            let [profileRes, walletRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('wallets').select('*').eq('user_id', userId).single()
            ]);

            let profile = profileRes.data;
            let wallet = walletRes.data;

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
                        isAuthenticated: true // Flag para controle de rota
                    },
                    wallet: {
                        ...prev.wallet,
                        mph: wallet ? (wallet.balance_mph || 0) : prev.wallet.mph,
                        usd: wallet ? (wallet.balance_usd || 0) : prev.wallet.usd,
                        balance_usd: wallet ? (wallet.balance_usd || 0) : 0, 
                        balance_frozen_usd: wallet ? (wallet.balance_frozen_usd || 0) : 0,
                        deposited: wallet ? (wallet.total_deposited_usd || 0) : prev.wallet.deposited,
                        withdrawn: wallet ? (wallet.total_withdrawn_usd || 0) : prev.wallet.withdrawn
                    }
                }));
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

  // Persistência
  useEffect(() => {
    localStorage.setItem('mining_points_mvp_v1', JSON.stringify(state));
  }, [state]);

  const addNotification = (msg, type = 'info') => {
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

  const processMiningPayout = () => {
    if (state.plans.length === 0) return;

    let cycleProfit = 0;
    const newHistoryEntry = {
      id: Date.now(),
      time: new Date().toISOString(),
      details: []
    };

    const updatedPlans = state.plans.map(plan => {
      if (!plan.active) return plan;
      
      const dailyRate = plan.type === 'standard' ? 0.01 : 0.013;
      const baseCycleReturn = (plan.amount * dailyRate) / 96; 
      
      const variation = (Math.random() * 0.25) - 0.10;
      const actualReturn = baseCycleReturn * (1 + variation);
      
      cycleProfit += actualReturn;
      
      newHistoryEntry.details.push({
        planId: plan.id,
        profit: actualReturn,
        hash: `HASH-${Math.floor(Math.random()*9999)}`,
        status: actualReturn > 0 ? 'profit' : 'loss' 
      });

      return plan;
    });

    if (cycleProfit > 0) {
      addNotification(`Rendimento Hash: +$${cycleProfit.toFixed(4)} creditado.`, 'profit');
      
      if (Math.random() > 0.8) { 
          const teamBonus = cycleProfit * 0.05;
          addNotification(`Bônus de Equipe: +$${teamBonus.toFixed(4)} recebido.`, 'team');
          cycleProfit += teamBonus;
      }

      setState(prev => ({
        ...prev,
        wallet: {
          ...prev.wallet,
          usd: prev.wallet.usd + cycleProfit,
          totalEarnings: prev.wallet.totalEarnings + cycleProfit
        },
        miningHistory: [newHistoryEntry, ...prev.miningHistory].slice(0, 50)
      }));
    }
  };

  const syncMiningFromMeta = () => {
    try {
      const raw = localStorage.getItem(MINING_META_KEY);
      if (!raw) {
        const initialMeta = { timer: 900, lastUpdate: new Date().toISOString() };
        localStorage.setItem(MINING_META_KEY, JSON.stringify(initialMeta));
        setMiningTimer(900);
        return;
      }

      const meta = JSON.parse(raw);
      if (!meta || typeof meta.timer !== 'number' || !meta.lastUpdate) {
        throw new Error('invalid meta');
      }

      const last = new Date(meta.lastUpdate).getTime();
      const now = Date.now();
      if (Number.isNaN(last)) throw new Error('invalid date');

      const delta = Math.max(0, Math.floor((now - last) / 1000));
      let timer = meta.timer;
      let cyclesToRun = 0;

      if (delta >= timer) {
        const timeAfterFirst = delta - timer;
        cyclesToRun = 1 + Math.floor(timeAfterFirst / 900);
        const remainingAfterLast = timeAfterFirst % 900;
        timer = 900 - remainingAfterLast;
      } else {
        timer = timer - delta;
      }

      timer = Math.max(1, Math.min(900, timer));

      if (cyclesToRun > 0 && state.plans.some(p => p.active)) {
        for (let i = 0; i < cyclesToRun; i++) {
          processMiningPayout();
        }
      }

      setMiningTimer(timer);
      localStorage.setItem(
        MINING_META_KEY,
        JSON.stringify({ timer, lastUpdate: new Date().toISOString() })
      );
    } catch {
      const resetMeta = { timer: 900, lastUpdate: new Date().toISOString() };
      localStorage.setItem(MINING_META_KEY, JSON.stringify(resetMeta));
      setMiningTimer(900);
    }
  };

  useEffect(() => {
    if (state.notifications.length === 0) {
        addNotification("Bem-vindo ao MiningPoints! Se precisar de ajuda, acesse o Suporte.", "support");
    }
  }, []);

  useEffect(() => {
    syncMiningFromMeta();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncMiningFromMeta();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === MINING_META_KEY) {
        syncMiningFromMeta();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const timerId = setInterval(() => {
      setMiningTimer(prev => {
        let next = prev;

        if (prev <= 1) {
          processMiningPayout();
          next = 900;
        } else {
          next = prev - 1;
        }

        localStorage.setItem(
          MINING_META_KEY,
          JSON.stringify({ timer: next, lastUpdate: new Date().toISOString() })
        );

        const elapsedInCycle = 900 - next;
        const cycleDuration = 60; // 5s + 5s + 50s
        const phase = elapsedInCycle % cycleDuration;
        
        if (phase < 5) setMiningStatus('searching');
        else if (phase < 10) setMiningStatus('analyzing');
        else setMiningStatus('executing');

        return next;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

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
        [currency]: prev.wallet[currency] + amount,
        deposited: type === 'deposit' ? prev.wallet.deposited + amount : prev.wallet.deposited,
        withdrawn: type === 'withdraw' ? prev.wallet.withdrawn + Math.abs(amount) : prev.wallet.withdrawn
      }
    }));
  };

  const consumeDailyCredit = () => {
      if (state.user.dailyCredits > 0) {
          setState(prev => ({
              ...prev,
              user: {
                  ...prev.user,
                  dailyCredits: prev.user.dailyCredits - 1
              }
          }));
          return true;
      }
      return false;
  };

  const buyCredits = (amount, cost) => {
      if (state.wallet.mph >= cost) {
          setState(prev => ({
              ...prev,
              user: { ...prev.user, dailyCredits: prev.user.dailyCredits + amount },
              wallet: { ...prev.wallet, mph: prev.wallet.mph - cost }
          }));
          addNotification(`${amount} Créditos comprados com sucesso!`, 'success');
          return true;
      } else {
          addNotification('MPH insuficiente para comprar créditos.', 'danger');
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

  const getNextBotDifficulty = () => {
    // Ciclo Agressivo: Hard -> Extreme -> Hard -> Extreme
    const matches = state.gameStats?.totalMatches || 0;
    return matches % 2 === 0 ? 'hard' : 'extreme';
  };

  const updateBot = (botId, updates) => {
    setState(prev => ({
      ...prev,
      bots: prev.bots.map(b => b.id === botId ? { ...b, ...updates } : b)
    }));
  };

  const processPvpDistribution = (betAmount) => {
    // 10% de cada lado = 20% da aposta total de um jogador (considerando que são 2 jogadores apostando o mesmo valor)
    // Total Retido = (betAmount * 2) * 0.10  <-- CORREÇÃO: Usuário disse "10% de cada jogador".
    // Jogador 1: 100 -> 10 taxa.
    // Jogador 2: 100 -> 10 taxa.
    // Total Taxa: 20.
    
    const totalFee = betAmount * 0.2; // 10% de cada um dos 2 jogadores = 20% de UMA aposta base
    const prizeDistributionPool = totalFee * 0.5; // 50% para distribuição (Rankings, Torneios, ONG)
    // Os outros 50% são da Empresa (não precisamos trackear no state explicitamente por enquanto, ou podemos criar um campo 'companyTreasury')

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
    const availableUsd = isSponsoredAccount ? (state.wallet.balance_frozen_usd || 0) : (state.wallet.balance_usd || state.wallet.usd || 0);

    if (availableUsd < amount) {
      addNotification("Saldo insuficiente para contratação.", "danger");
      return false;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Usuário não autenticado");

        const userId = session.user.id;

        const now = new Date();
        const durationDays = planType === 'premium' ? 365 : 180;
        const dailyRoiPercent = planType === 'premium' ? 1.3 : 1.0;
        const totalReturnMultiplier = planType === 'premium' ? 4.75 : 1.8;
        const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // 2. Insere o Plano no Banco de Dados (campos obrigatórios)
        const { error: planError } = await supabase.from('plans').insert([{
            user_id: userId,
            type: planType,
            amount_invested: amount,
            daily_roi_percent: dailyRoiPercent,
            total_return_limit: parseFloat((amount * totalReturnMultiplier).toFixed(2)),
            end_date: endDate.toISOString(),
            status: 'active'
        }]);

        if (planError) throw planError;

        // 3. Deduz o saldo da carteira (wallet) no banco de dados
        // Primeiro busca o saldo atual para não ter erro de concorrência
        const { data: walletData } = await supabase
            .from('wallets')
            .select('balance_usd, balance_frozen_usd')
            .eq('user_id', userId)
            .single();

        const currentUsd = walletData?.balance_usd || 0;
        const currentFrozenUsd = walletData?.balance_frozen_usd || 0;

        const walletUpdate = isSponsoredAccount
            ? { balance_frozen_usd: currentFrozenUsd - amount }
            : { balance_usd: currentUsd - amount };

        const { error: walletError } = await supabase
            .from('wallets')
            .update(walletUpdate)
            .eq('user_id', userId);
            
        if (walletError) throw walletError;

        // 4. Patrocínio: não gera bônus de rede.
        // (Bônus de rede só deve existir para depósitos reais / após ativação de conta)
        // Nenhuma ação adicional aqui.

        // 5. Atualiza o Estado Local
        const newPlan = {
          id: Date.now(), // Temporário até recarregar
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
              usd: isSponsoredAccount ? (prev.wallet.usd || 0) : (prev.wallet.balance_usd ?? prev.wallet.usd) - amount,
              balance_usd: isSponsoredAccount ? (prev.wallet.balance_usd ?? 0) : (prev.wallet.balance_usd ?? prev.wallet.usd) - amount,
              balance_frozen_usd: isSponsoredAccount ? (prev.wallet.balance_frozen_usd || 0) - amount : (prev.wallet.balance_frozen_usd || 0)
          },
          plans: [...prev.plans, newPlan],
          // Se estava inativo e não é patrocinado, fica ativo
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
