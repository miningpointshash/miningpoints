import React, { useContext, useState, useEffect } from 'react';
import { AlertTriangle, History, Swords, Trophy, Users, Check, X, Share2, Copy, Volume2, VolumeX, Lock } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { CyberRunnerGame } from '../components/games/CyberRunner';
import { CryptoCatcherGame } from '../components/games/CryptoCatcher';
import { HashHarvestGame } from '../components/games/HashHarvest';
import { TwelveDoorsGame } from '../components/games/TwelveDoorsGame';
import { SoundManager } from '../utils/soundManager';

import { PvpRankings } from '../components/arcade/PvpRankings';
import { PvpTournaments } from '../components/arcade/PvpTournaments';
import { OngSection } from '../components/arcade/OngSection';

export const ArcadeView = () => {
    const [tab, setTab] = useState('daily'); // 'daily', 'pvp'
    const [pvpView, setPvpView] = useState('lobby'); // 'lobby', 'rankings', 'tournaments'
    const [game, setGame] = useState(null); // 'runner', 'catcher'
    const [pvpState, setPvpState] = useState('lobby'); // 'lobby', 'waiting_room', 'playing', 'result'
    const [pvpConfig, setPvpConfig] = useState({ bet: 100, char: 'mp_p1', gameType: 'twelve_doors' }); // gameType: 'hash_harvest', 'twelve_doors'
    const [pvpResult, setPvpResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [waitingTimer, setWaitingTimer] = useState(0); // Timer for waiting room
    const [pendingRoomId, setPendingRoomId] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [isJoiningRoom, setIsJoiningRoom] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // Estado de Mute
    const [isSettling, setIsSettling] = useState(false);
    const [pvpHistory, setPvpHistory] = useState([]);
    const { state, setState, addNotification, addGameResult, processPvpDistribution, consumeDailyCredit, buyCredits, t, getNextBotDifficulty } = useContext(AppContext);

    const getPvpTimeoutKey = () => {
        const uid = state?.user?.id || 'anon';
        return `mining_points_pvp_timeout_${uid}`;
    };

    const readPvpTimeoutMeta = () => {
        try {
            const raw = localStorage.getItem(getPvpTimeoutKey());
            if (!raw) return { streak: 0, lastAt: 0 };
            const parsed = JSON.parse(raw);
            const streak = Number(parsed?.streak || 0);
            const lastAt = Number(parsed?.lastAt || 0);
            const now = Date.now();
            if (!Number.isFinite(lastAt) || now - lastAt > 30 * 60 * 1000) return { streak: 0, lastAt: 0 };
            return { streak: Math.max(0, Math.min(5, streak)), lastAt };
        } catch {
            return { streak: 0, lastAt: 0 };
        }
    };

    const writePvpTimeoutMeta = (streak) => {
        try {
            localStorage.setItem(getPvpTimeoutKey(), JSON.stringify({ streak, lastAt: Date.now() }));
        } catch {}
    };

    const clearPvpTimeoutMeta = () => {
        try { localStorage.removeItem(getPvpTimeoutKey()); } catch {}
    };
    
    // Verificação de segurança do estado
    if (!state || !state.user || !state.wallet) {
        return <div className="p-10 text-center text-gray-500 animate-pulse">Carregando dados do Arcade...</div>;
    }

    // Áudio BGM (Gerenciado pelo SoundManager)
    React.useEffect(() => {
        // Limpa áudio ao desmontar
        return () => {
            SoundManager.stopMusic();
        };
    }, []);

    const toggleMute = () => {
        setIsMuted(prev => {
            const newState = !prev;
            if (newState) {
                SoundManager.stopMusic();
            } else if (pvpState === 'playing') {
                SoundManager.startMusic();
            }
            return newState;
        });
    };

    const startBgm = () => {
        if (!isMuted) {
            SoundManager.startMusic();
        }
    };

    const stopBgm = () => {
        SoundManager.stopMusic();
    };

    const playResultSound = (outcome) => {
        if (isMuted) return;

        if (outcome === 'win') {
            SoundManager.playSfx('victory');
        } else if (outcome === 'loss') {
            SoundManager.playSfx('defeat');
        }
    };

    // Simulação simplificada de games para o MVP (Catcher continua simples)
    const finishCatcherGame = (score) => {
        const earnedMPH = Math.floor(score / 10);
        addGameResult('Crypto Catcher', earnedMPH);
        addNotification(`Arcade: +${earnedMPH} MPH ganhos!`, 'game');
        setGame(null);
    };

    const handlePlayRequest = async (gameType) => {
        const ok = await consumeDailyCredit();
        if (ok) {
            setGame(gameType);
        } else {
            setShowCreditModal(true);
        }
    };

    const closeRunner = (finalScore) => {
        const earnedMPH = finalScore / 10;
        if (earnedMPH > 0) {
            addGameResult('Cyber Runner', earnedMPH);
            addNotification(`Corrida finalizada: +${earnedMPH.toFixed(1)} MPH`, 'success');
        }
        setGame(null);
    };

    const closeCatcher = (finalScore) => {
        const earnedMPH = finalScore / 100; // Scoring ratio for Catcher
        if (earnedMPH > 0) {
            addGameResult('Crypto Catcher', earnedMPH);
            addNotification(`Catcher finalizado: +${earnedMPH.toFixed(2)} MPH`, 'success');
        }
        setGame(null);
    };

    // --- LÓGICA PVP ---

    const [openGames, setOpenGames] = useState([]);
    const [botGames, setBotGames] = useState([]);
    const botAliasIndexRef = React.useRef({});

    useEffect(() => {
        if (tab !== 'pvp') return;
        if (pvpState !== 'lobby') return;

        const buildBotGames = () => {
            const availableBots = (state.bots || []).filter(b => b.active);
            if (availableBots.length === 0) {
                setBotGames([]);
                return;
            }

            const shuffled = [...availableBots].sort(() => 0.5 - Math.random());
            const selectedBots = shuffled.slice(0, 3);

            const games = selectedBots.map((bot) => {
                const nicknames = Array.isArray(bot.nicknames) && bot.nicknames.length > 0 ? bot.nicknames : [bot.name];
                const currentIdx = Number(botAliasIndexRef.current[bot.id] || 0);
                const playerName = nicknames[currentIdx % nicknames.length] || bot.name;
                botAliasIndexRef.current[bot.id] = currentIdx + 1;

                return {
                    id: `bot_game_${bot.id}_${Date.now()}`,
                    player: playerName,
                    bet: [100, 500, 1000][Math.floor(Math.random() * 3)],
                    avatar: bot.avatar,
                    isBot: true,
                    botId: bot.id
                };
            });

            setBotGames(games);
        };

        buildBotGames();
        const interval = setInterval(buildBotGames, 20000);
        return () => clearInterval(interval);
    }, [state.bots, tab, pvpState]);

    const combinedOpenGames = React.useMemo(() => {
        return [...openGames, ...botGames];
    }, [openGames, botGames]);

    const buildRoomLink = (roomId) => {
        const url = new URL(window.location.href);
        url.pathname = '/';
        url.searchParams.set('view', 'arcade');
        url.searchParams.set('room', roomId);
        url.searchParams.delete('auth');
        return url.toString();
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        if (room) {
            setTab('pvp');
            setPvpView('lobby');
            setPendingRoomId(room);
            setShowJoinModal(true);
        }
    }, []);

    useEffect(() => {
        const userId = state.user.id;
        if (!userId) return;

        const fetchHistory = async () => {
            const { data } = await supabase
                .from('arcade_matches')
                .select('id, created_at, game_type, bet_amount_mph, winner_id, player1_id, player2_id, prize_distributed_mph')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(30);

            if (Array.isArray(data)) setPvpHistory(data);
        };

        fetchHistory();
    }, [state.user.id, pvpState]);

    const clearRoomFromUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        history.replaceState(null, '', url.toString());
    };

    const handleJoinRoom = async () => {
        if (!pendingRoomId) return;
        if (isJoiningRoom) return;

        setIsJoiningRoom(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

            const { data, error } = await supabase.functions.invoke('pvp-room-join', {
                body: {
                    room_id: pendingRoomId,
                    password: joinPassword || '',
                    opponent_avatar: pvpConfig.char
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'x-user-jwt': accessToken,
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });

            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'Falha ao entrar na sala.');

            setState(prev => ({
                ...prev,
                wallet: {
                    ...prev.wallet,
                    mph: Number(data.balance_mph || prev.wallet.mph || 0)
                }
            }));

            setPvpConfig(prev => ({
                ...prev,
                bet: Number(data.bet_amount_mph || prev.bet),
                gameType: data.game_type || prev.gameType,
                isPrivate: true,
                roomId: data.room_id,
                gameId: data.room_id
            }));

            setShowJoinModal(false);
            setJoinPassword('');
            clearRoomFromUrl();
            setPvpState('playing');
            startBgm();
            addNotification('Você entrou na sala privada.', 'success');
        } catch (err) {
            console.error('Erro ao entrar na sala:', err);
            const msg =
                err?.context?.body?.error ||
                err?.context?.body?.message ||
                err?.message ||
                'Erro ao entrar na sala.';
            addNotification(String(msg), 'danger');
        } finally {
            setIsJoiningRoom(false);
        }
    };

    const handleCreateGame = async () => {
        if (state.wallet.mph < pvpConfig.bet) {
            addNotification(t('arcade.insufficientFunds'), 'danger');
            return;
        }

        startBgm(); // Start BGM on user interaction

        if (pvpConfig.isPrivate) {
            setIsSearching(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

                const { data, error } = await supabase.functions.invoke('pvp-room-create', {
                    body: {
                        game_type: pvpConfig.gameType,
                        bet_amount_mph: pvpConfig.bet,
                        creator_avatar: pvpConfig.char,
                        is_private: true,
                        password: pvpConfig.roomPassword || ''
                    },
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'x-user-jwt': accessToken,
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });

                if (error) throw error;
                if (!data?.ok) throw new Error(data?.error || 'Falha ao criar sala privada.');

                const roomId = data.room_id;
                setState(prev => ({
                    ...prev,
                    wallet: { ...prev.wallet, mph: Number(data.balance_mph || prev.wallet.mph || 0) }
                }));

                setPvpConfig(prev => ({ ...prev, gameId: roomId, roomId, opponentAvatar: null }));
                setPvpState('waiting_room');
                setWaitingTimer(0);
                addNotification('Sala privada criada. Compartilhe o link com a senha.', 'success');
            } catch (err) {
                console.error('Erro ao criar sala privada:', err);
                const msg =
                    err?.context?.body?.error ||
                    err?.context?.body?.message ||
                    err?.message ||
                    'Erro ao criar sala privada.';
                addNotification(String(msg), 'danger');
                stopBgm();
            } finally {
                setIsSearching(false);
            }
            return;
        }

        // Adiciona ao Book (Simulação)
        const myGameId = `g_${Date.now()}`;
        const newGame = { 
            id: myGameId, 
            player: state.user.username || 'Player1', 
            bet: pvpConfig.bet, 
            avatar: pvpConfig.char 
        };
        
        setOpenGames(prev => [newGame, ...prev]);
        setPvpConfig(prev => ({ ...prev, gameId: myGameId })); // Salva ID para cancelar depois

        setPvpState('waiting_room');
        setWaitingTimer(15); // Reduzido para 15s para teste mais rápido
    };

    const handleCancelGame = async () => {
        if (window.confirm(t('arcade.cancelConfirm'))) {
            stopBgm(); // Stop BGM on cancel

            if (pvpConfig.isPrivate && pvpConfig.roomId) {
                try {
                    const { data, error } = await supabase.rpc('cancel_pvp_room', { p_room_id: pvpConfig.roomId });
                    if (error) throw error;
                    if (!data?.ok) throw new Error(data?.error || 'Falha ao cancelar sala.');

                    setState(prev => ({
                        ...prev,
                        wallet: { ...prev.wallet, mph: Number(data.balance_mph || prev.wallet.mph || 0) }
                    }));
                } catch (err) {
                    console.error('Erro ao cancelar sala:', err);
                    addNotification(err?.message || 'Erro ao cancelar sala.', 'danger');
                } finally {
                    setPvpState('lobby');
                }
                return;
            }

            // Remove do Book
            if (pvpConfig.gameId) {
                setOpenGames(prev => prev.filter(g => g.id !== pvpConfig.gameId));
            }
            clearPvpTimeoutMeta();
            setPvpState('lobby');
        }
    };

    // Timer da Sala de Espera
    React.useEffect(() => {
        let interval;
        if (pvpState === 'waiting_room' && !pvpConfig.isPrivate && waitingTimer > 0) {
            interval = setInterval(() => {
                setWaitingTimer(prev => prev - 1);
                
                // Simula entrada de oponente aleatoriamente (mais rápido agora)
                if (Math.random() > 0.8) { 
                    // Remove do book ao iniciar
                    if (pvpConfig.gameId) {
                        setOpenGames(prev => prev.filter(g => g.id !== pvpConfig.gameId));
                    }
                    clearPvpTimeoutMeta();
                    setPvpState('playing');
                }
            }, 1000);
        } else if (pvpState === 'waiting_room' && !pvpConfig.isPrivate && waitingTimer === 0) {
            // Timeout - Ninguém entrou
            if (pvpConfig.gameId) {
                setOpenGames(prev => prev.filter(g => g.id !== pvpConfig.gameId));
            }
            const meta = readPvpTimeoutMeta();
            const shouldCloseThisTime = meta.streak <= 0 && Math.random() < 0.5;

            if (shouldCloseThisTime) {
                writePvpTimeoutMeta(1);
                addNotification(t('arcade.noHumanFound'), 'info');
                setPvpState('lobby');
            } else {
                clearPvpTimeoutMeta();
                addNotification(t('arcade.autoStart'), 'info');
                setPvpState('playing');
            }
        }
        return () => clearInterval(interval);
    }, [pvpState, waitingTimer, pvpConfig.isPrivate]);

    useEffect(() => {
        if (pvpState !== 'waiting_room') return;
        if (!pvpConfig.isPrivate) return;
        if (!pvpConfig.roomId) return;
        if (!supabase?.channel) return;

        const channel = supabase
            .channel(`pvp_room_${pvpConfig.roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'pvp_rooms', filter: `id=eq.${pvpConfig.roomId}` },
                async (payload) => {
                    const updated = payload?.new || {};
                    if (updated?.status === 'matched' && updated?.opponent_id) {
                        setPvpConfig(prev => ({
                            ...prev,
                            opponentAvatar: updated?.opponent_avatar || prev.opponentAvatar,
                            opponentId: updated?.opponent_id
                        }));
                        setPvpState('playing');
                    }
                    if (updated?.status === 'cancelled') {
                        setPvpState('lobby');
                    }
                }
            )
            .subscribe();

        return () => {
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [pvpState, pvpConfig.isPrivate, pvpConfig.roomId]);

    useEffect(() => {
        if (pvpState !== 'result_waiting') return;
        if (!pvpConfig.roomId) return;
        if (!supabase?.channel) return;

        const roomId = pvpConfig.roomId;
        const channel = supabase
            .channel(`pvp_room_result_${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'pvp_rooms', filter: `id=eq.${roomId}` },
                async (payload) => {
                    const updated = payload?.new || {};
                    if (updated?.status !== 'completed') return;
                    try {
                        const { data: room } = await supabase
                            .from('pvp_rooms')
                            .select('creator_id, opponent_id, creator_score, opponent_score, winner_id, bet_amount_mph')
                            .eq('id', roomId)
                            .maybeSingle();

                        if (!room) return;

                        const bet = Number(room.bet_amount_mph || 0);
                        const selfIsCreator = state.user.id === room.creator_id;
                        const selfScore = Number(selfIsCreator ? room.creator_score : room.opponent_score || 0);
                        const otherScore = Number(selfIsCreator ? room.opponent_score : room.creator_score || 0);

                        let outcome = 'loss';
                        let prize = 0;
                        if (!room.winner_id) {
                            outcome = 'draw';
                            prize = bet * 0.85;
                        } else if (room.winner_id === state.user.id) {
                            outcome = 'win';
                            prize = bet * 2 * 0.85;
                        }

                        playResultSound(outcome);

                        const { data: walletRow } = await supabase
                            .from('wallets')
                            .select('balance_mph')
                            .eq('user_id', state.user.id)
                            .maybeSingle();

                        if (walletRow) {
                            setState(prev => ({
                                ...prev,
                                wallet: { ...prev.wallet, mph: Number(walletRow.balance_mph || 0) }
                            }));
                        }

                        setPvpResult({ outcome, prize, score: { player: selfScore, opponent: otherScore } });
                        setPvpState('result');
                    } catch (err) {
                        console.error('Erro ao obter resultado PvP:', err);
                    }
                }
            )
            .subscribe();

        return () => {
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [pvpState, pvpConfig.roomId, state.user.id]);

    const handleJoinGame = (gameId, betAmount) => {
        if (state.wallet.mph < betAmount) {
            addNotification(t('arcade.insufficientToJoin'), 'danger');
            return;
        }
        
        startBgm(); // Start BGM on user interaction

        // Encontra o jogo para pegar dados do bot (se for bot)
        const game = combinedOpenGames.find(g => g.id === gameId);

        // Configura para jogar contra esse "oponente"
        setPvpConfig(prev => ({ 
            ...prev, 
            bet: betAmount,
            opponentName: game?.player,
            opponentAvatar: game?.avatar,
            botId: game?.botId
        }));

        addNotification(t('arcade.challengeAccepted'), 'success');
        setTimeout(() => setPvpState('playing'), 1000);
    };

    const handlePvpGameOver = async (finalScore) => {
        stopBgm(); // Stop BGM on Game Over

        if (pvpConfig.roomId) {
            const playerScore = Number(finalScore?.player || 0);
            try {
                const { data, error } = await supabase.rpc('submit_pvp_score', {
                    p_room_id: pvpConfig.roomId,
                    p_score: playerScore
                });
                if (error) throw error;

                if (data?.status === 'waiting_opponent') {
                    setPvpResult({ outcome: 'pending', prize: 0, score: { player: playerScore } });
                    addNotification('Aguardando o oponente finalizar...', 'info');
                    setPvpState('result_waiting');
                    return;
                }

                const outcome = data?.outcome || 'draw';
                const prize = Number(data?.prize_mph || 0);
                playResultSound(outcome);

                setState(prev => ({
                    ...prev,
                    wallet: { ...prev.wallet, mph: Number(data?.balance_mph || prev.wallet.mph || 0) }
                }));

                setPvpResult({ outcome, prize, score: { player: playerScore } });
                setPvpState('result');
                return;
            } catch (err) {
                console.error('Erro ao finalizar PvP:', err);
                addNotification(err?.message || 'Erro ao finalizar partida.', 'danger');
                setPvpState('lobby');
                return;
            }
        }

        // Cálculo de resultado
        // Se Player > Bot: Ganha Aposta * 2 * 0.85 (15% taxa de cada = 30% total)
        // Se Empate: Devolve Aposta * 0.85 (Taxa da casa)
        // Se Perde: 0

        if (isSettling) return;
        setIsSettling(true);
        try {
            const { data, error } = await supabase.rpc('pvp_bot_match_settle', {
                p_game_type: pvpConfig.gameType,
                p_bet_amount_mph: pvpConfig.bet,
                p_player_score: Number(finalScore.player || 0),
                p_bot_score: Number(finalScore.bot || 0),
                p_player_avatar: pvpConfig.char
            });

            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'Falha ao processar resultado.');

            const outcome = data.outcome || 'loss';
            const prize = Number(data.prize_mph || 0);

            playResultSound(outcome);

            setState(prev => ({
                ...prev,
                wallet: { ...prev.wallet, mph: Number(data.balance_mph || prev.wallet.mph || 0) }
            }));

            setPvpResult({ outcome, prize, score: finalScore });
            setPvpState('result');
        } catch (err) {
            console.error('Erro ao processar PvP bot:', err);
            addNotification(err?.message || 'Erro ao processar resultado.', 'danger');
            setPvpState('lobby');
        } finally {
            setIsSettling(false);
        }
    };

    const handleShareLink = () => {
        const link = buildRoomLink(pvpConfig.roomId || pvpConfig.gameId || 'invite');
        navigator.clipboard.writeText(link);
        addNotification(t('arcade.linkCopied'), 'success');
    };

    return (
        <div className="px-4 pb-24 animate-fadeIn">
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur">
                    <Card className="max-w-sm w-full border-purple-500">
                        <h3 className="text-lg font-bold text-white mb-2">Entrar em sala privada</h3>
                        <p className="text-xs text-gray-400 mb-4">Informe a senha para entrar e iniciar a partida.</p>
                        <input
                            type="password"
                            placeholder="Senha da sala"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white mb-3 focus:border-purple-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={() => { setShowJoinModal(false); setJoinPassword(''); clearRoomFromUrl(); }}
                                variant="secondary"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleJoinRoom}
                                className="flex-1"
                                disabled={isJoiningRoom}
                            >
                                {isJoiningRoom ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
            
            {/* Cabeçalho Arcade */}
            <div className="text-center py-6">
                <h2 className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">{t('arcade.title')}</h2>
                <p className="text-gray-400 text-xs mt-2">{t('arcade.subtitle')}</p>
            </div>

            {/* Abas */}
            <div className="flex p-1 bg-gray-900 rounded-xl mb-6 border border-gray-800">
                <button 
                    onClick={() => setTab('daily')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab === 'daily' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    {t('arcade.dailyGames')}
                </button>
                <button 
                    onClick={() => setTab('pvp')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === 'pvp' ? 'bg-purple-600 text-white shadow' : 'text-purple-400 hover:text-purple-300'}`}
                >
                    <Swords size={14} /> {t('arcade.pvpArena')}
                </button>
            </div>
            {/* Botão de Mute Flutuante (Apenas para Daily Games) */}
            {tab === 'daily' && (
                <Button 
                    onClick={toggleMute}
                    className="absolute top-24 right-4 z-50 bg-black/50 hover:bg-black/70 p-2 rounded-full border border-gray-600"
                    size="sm"
                >
                    {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-green-400" />}
                </Button>
            )}

                {/* Conteúdo das Abas */}
            {tab === 'daily' && (
                <>

                    {/* Renderização Condicional do Jogo Real */}
                    {game === 'runner_wrapper' && (
                        <div className="fixed inset-0 z-50 bg-black flex flex-col">
                            <Button onClick={() => setGame(null)} className="absolute top-4 right-4 z-50 bg-red-600/80 p-2 rounded-full w-auto h-auto"><X size={20}/></Button>
                            <CyberRunnerGame 
                                onGameOver={(score) => {}} // Lógica interna cuida da exibição
                                onExit={(finalScore) => closeRunner(finalScore || 0)}
                            />
                        </div>
                    )}

                    {game === 'catcher' && (
                        <div className="fixed inset-0 z-50 bg-black flex flex-col">
                            <Button onClick={() => setGame(null)} className="absolute top-4 right-4 z-50 bg-red-600/80 p-2 rounded-full w-auto h-auto"><X size={20}/></Button>
                            <CryptoCatcherGame 
                                onGameOver={(score) => {}} 
                                onExit={(finalScore) => closeCatcher(finalScore || 0)}
                            />
                        </div>
                    )}

                    <div className="text-center mb-6 flex justify-center gap-3">
                        <div className="inline-block bg-gray-800 px-3 py-1 rounded-full text-xs border border-green-500 text-green-400">
                            {t('arcade.dailyCreditsLabel')} {Number(state.user.dailyCreditsFreeRemaining ?? state.user.dailyCredits ?? 0)}/3{Number(state.user.dailyCreditsBonusRemaining || 0) > 0 ? ` (+${Number(state.user.dailyCreditsBonusRemaining || 0)})` : ''}
                        </div>
                        <div className="inline-block bg-gray-800 px-3 py-1 rounded-full text-xs border border-purple-500 text-purple-400 font-mono">
                            {state.wallet.mph.toFixed(2)} MPH
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* JOGO 1: CYBER RUNNER */}
                        <Card className="relative overflow-hidden group p-0 border-[#ff00ff]" highlight>
                            <div className="h-32 bg-black relative">
                                <div className="absolute inset-0 bg-[url('https://img.freepik.com/free-vector/pixel-art-mystical-background_52683-87349.jpg')] bg-cover bg-center opacity-60"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                <div className="absolute bottom-2 left-4">
                                    <h3 className="text-xl font-bold text-white font-mono drop-shadow-md">{t('arcade.runnerTitle')}</h3>
                                    <p className="text-[10px] text-gray-300">{t('arcade.runnerDesc')}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-[#111111]">
                                <Button 
                                    onClick={() => handlePlayRequest('runner_wrapper')} 
                                    className="w-full text-xs py-3 font-mono bg-purple-700 hover:bg-purple-600 shadow-[0_0_10px_#a855f7]"
                                >
                                    {t('arcade.playNow')}
                                </Button>
                            </div>
                        </Card>

                        {/* JOGO 2: CRYPTO CATCHER */}
                        <Card className="relative overflow-hidden group p-0 border-purple-900">
                            <div className="h-32 bg-black relative">
                                <div className="absolute inset-0 bg-[url('https://img.freepik.com/free-vector/pixel-rain-abstract-background_23-2148364537.jpg')] bg-cover bg-center opacity-40"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                <div className="absolute bottom-2 left-4">
                                    <h3 className="text-xl font-bold text-white font-mono">{t('arcade.catcherTitle')}</h3>
                                    <p className="text-[10px] text-gray-300">{t('arcade.catcherDesc')}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-[#111111]">
                                <Button onClick={() => handlePlayRequest('catcher')} variant="outline" className="w-full text-xs py-3 font-mono">
                                    {t('arcade.playNow')}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {tab === 'pvp' && (
                <>
                    {/* Sub-navegação PvP */}
                    {pvpState === 'lobby' && (
                        <div className="flex justify-center gap-2 mb-4">
                            <button 
                                onClick={() => setPvpView('lobby')}
                                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${pvpView === 'lobby' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                            >
                                {t('arcade.lobby')}
                            </button>
                            <button 
                                onClick={() => setPvpView('rankings')}
                                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${pvpView === 'rankings' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                            >
                                {t('arcade.rankings')}
                            </button>
                            <button 
                                onClick={() => setPvpView('tournaments')}
                                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${pvpView === 'tournaments' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                            >
                                {t('arcade.tournaments')}
                            </button>
                        </div>
                    )}

                    {pvpState === 'lobby' && pvpView === 'lobby' && (
                        <PvpLobby 
                            pvpConfig={pvpConfig} 
                            setPvpConfig={setPvpConfig} 
                            onCreate={handleCreateGame} 
                            onJoin={handleJoinGame}
                            userBalance={state.wallet?.mph || 0}
                            isSearching={isSearching}
                            openGames={combinedOpenGames}
                            isMuted={isMuted}
                            toggleMute={toggleMute}
                            t={t}
                        />
                    )}

                    {pvpState === 'lobby' && pvpView === 'rankings' && (
                        <div className="animate-fadeIn pb-24">
                            <PvpRankings rankings={state.rankings} t={t} />
                            <OngSection ong={state.ong} t={t} />
                        </div>
                    )}

                    {pvpState === 'lobby' && pvpView === 'tournaments' && (
                        <div className="animate-fadeIn pb-24">
                            <PvpTournaments tournaments={state.tournaments} t={t} onJoin={(id) => addNotification(`Inscrição solicitada para torneio ${id}`, 'info')} />
                            <OngSection ong={state.ong} t={t} />
                        </div>
                    )}
                    
                    {pvpState === 'waiting_room' && (
                        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-fadeIn">
                            <div className="text-center w-full max-w-md">
                                <div className="mb-6 relative inline-block">
                                    <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl animate-pulse opacity-50"></div>
                                    <img src={`/assets/persona/${pvpConfig.char}.svg`} alt="You" className="w-32 h-32 relative z-10 drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">{t('arcade.waitingChallenger')}</h3>
                                <p className="text-gray-400 mb-6">{t('arcade.yourBet')} <span className="text-green-400 font-mono font-bold">{pvpConfig.bet} MPH</span></p>
                                
                                {pvpConfig.isPrivate && (
                                    <div className="bg-gray-800 p-4 rounded-xl mb-6 border border-gray-700">
                                        <p className="text-xs text-gray-400 mb-2">{t('arcade.shareLink')}</p>
                                        <div className="flex gap-2">
                                            <div className="bg-black/50 p-2 rounded text-xs text-gray-300 font-mono flex-1 truncate border border-gray-600">
                                                {buildRoomLink(pvpConfig.roomId || pvpConfig.gameId || '...')}
                                            </div>
                                            <Button onClick={handleShareLink} size="sm" className="bg-blue-600 px-3">
                                                <Copy size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {!pvpConfig.isPrivate && (
                                    <div className="text-4xl font-mono font-bold text-yellow-400 mb-8">
                                        00:{waitingTimer < 10 ? `0${waitingTimer}` : waitingTimer}
                                    </div>
                                )}

                                <p className="text-xs text-gray-500 mb-8 max-w-xs mx-auto">
                                    {pvpConfig.isPrivate ? 'Sala privada: somente convidados com link + senha.' : t('arcade.visibleInBook')}
                                </p>

                                <Button onClick={handleCancelGame} variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10 w-full">
                                    {t('arcade.cancelRefund')}
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {pvpState === 'playing' && (
                        <div className="fixed inset-0 z-50 bg-black flex flex-col p-4">
                            <Button onClick={() => { if(window.confirm(t('arcade.exitConfirm'))) setPvpState('lobby'); }} className="absolute top-4 right-4 z-50 bg-red-600/80 p-2 rounded-full w-auto h-auto"><X size={20}/></Button>
                            <div className="flex-1 flex items-center justify-center">
                                {pvpConfig.gameType === 'hash_harvest' ? (
                                    <HashHarvestGame 
                                        onGameOver={handlePvpGameOver}
                                        betAmount={pvpConfig.bet}
                                        playerChar={pvpConfig.char}
                                        botChar={pvpConfig.opponentAvatar || 'mp_p6'}
                                        difficulty={getNextBotDifficulty ? getNextBotDifficulty() : 'hard'}
                                        isMuted={isMuted}
                                    />
                                ) : (
                                    <TwelveDoorsGame 
                                        onGameOver={handlePvpGameOver}
                                        betAmount={pvpConfig.bet}
                                        playerChar={pvpConfig.char}
                                        botChar={pvpConfig.opponentAvatar || 'mp_p6'}
                                        difficulty={getNextBotDifficulty ? getNextBotDifficulty() : 'medium'}
                                        isMuted={isMuted}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {pvpState === 'result' && (
                        <PvpResult 
                            pvpResult={pvpResult} 
                            onLobby={() => setPvpState('lobby')} 
                            onRematch={handleCreateGame}
                            t={t}
                        />
                    )}

                    {pvpState === 'result_waiting' && (
                        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-fadeIn">
                            <div className="text-center w-full max-w-md">
                                <h3 className="text-2xl font-bold text-white mb-2">Aguardando oponente</h3>
                                <p className="text-gray-400 mb-6">Sua pontuação já foi enviada. Assim que o outro jogador finalizar, o resultado será liberado.</p>
                                <Button onClick={() => setPvpState('lobby')} variant="outline" className="w-full">
                                    Voltar ao lobby
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Créditos Insuficientes (Apenas para Daily) */}
            {showCreditModal && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur">
                    <Card className="max-w-xs w-full text-center border-red-500">
                        <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">{t('arcade.noCreditsTitle')}</h3>
                        <p className="text-gray-400 text-sm mb-6">{t('arcade.noCreditsText')}</p>
                        <div className="space-y-3">
                            <Button onClick={async () => { 
                                const ok = await buyCredits(5, 50);
                                if (ok) setShowCreditModal(false);
                            }} variant="success" className="w-full text-xs">
                                {t('arcade.buyCredits')}
                            </Button>
                            <Button onClick={() => setShowCreditModal(false)} variant="secondary" className="w-full text-xs">
                                {t('arcade.comeBack')}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* HISTÓRICO DE JOGADAS (Comum) */}
            <div className="mt-8">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <History size={16} className="text-gray-400"/> {t('arcade.historyTitle')}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {Array.isArray(pvpHistory) && pvpHistory.length > 0 ? (
                        pvpHistory.map((m) => {
                            const bet = Number(m.bet_amount_mph || 0);
                            const prize = Number(m.prize_distributed_mph || 0);
                            const isWin = m.winner_id && m.winner_id === state.user.id;
                            const isDraw = !m.winner_id && prize > 0;
                            const profit = isWin || isDraw ? (prize - bet) : -bet;
                            return (
                                <div key={m.id} className="bg-gray-900 p-3 rounded flex justify-between items-center text-xs border-l-2 border-purple-500">
                                    <div>
                                        <p className="font-bold text-white">PvP Arena</p>
                                        <p className="text-[10px] text-gray-500">{new Date(m.created_at).toLocaleString()}</p>
                                    </div>
                                    <span className={`font-bold font-mono ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {profit >= 0 ? '+' : ''}{profit.toFixed(2)} MPH
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-gray-600 text-xs text-center py-4 bg-gray-900/50 rounded border border-gray-800 border-dashed">
                            {t('arcade.historyEmpty')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const PvpLobby = ({ pvpConfig, setPvpConfig, onCreate, onJoin, userBalance, isSearching, openGames = [], t, isMuted, toggleMute }) => {
    const [customBet, setCustomBet] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [privatePassword, setPrivatePassword] = useState('');
    const [lobbyStats, setLobbyStats] = useState({ totalPaid: 0, onlineUsers: 0 });

    useEffect(() => {
        const fetchLobbyStats = async () => {
            const { data: totalPaid } = await supabase.rpc('get_arcade_total_paid');
            const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            setLobbyStats({
                totalPaid: Number(totalPaid || 0),
                onlineUsers: count || 0
            });
        };
        fetchLobbyStats();
    }, []);

    const playClick = () => {
        SoundManager.playSfx('click');
    };

    const handleCustomBetChange = (e) => {
        const val = e.target.value;
        setCustomBet(val);
        if (val && !isNaN(val)) {
            setPvpConfig({ ...pvpConfig, bet: parseFloat(val) });
        }
    };

    return (
    <div className="animate-fadeIn pb-24">
        {/* SESSÃO 1: CRIAR PARTIDA */}
        <Card className="mb-6 border-purple-500 bg-purple-900/10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Swords className="text-purple-400" /> {t('arcade.setupMatch')}
                </h3>
                <div className="flex items-center gap-4">
                    <Button 
                        onClick={toggleMute}
                        className="bg-black/50 hover:bg-black/70 p-2 rounded-full border border-gray-600"
                        size="sm"
                    >
                        {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-green-400" />}
                    </Button>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400">{t('arcade.yourBalance')}</p>
                        <p className={`font-mono font-bold ${userBalance < pvpConfig.bet ? 'text-red-400' : 'text-green-400'}`}>
                            {(userBalance || 0).toFixed(2)} MPH
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="mb-6">
                <label className="text-xs text-gray-400 block mb-2">{t('arcade.chooseGame') || 'Choose Game'}</label>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => { playClick(); setPvpConfig({...pvpConfig, gameType: 'twelve_doors'}); }}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${pvpConfig.gameType !== 'hash_harvest' ? 'bg-purple-900/50 border-purple-500 text-white shadow-[0_0_10px_#a855f7]' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                    >
                        <span className="text-xl mb-1">🚪</span>
                        <span className="text-xs font-bold">12 Doors</span>
                    </button>
                    <button 
                        onClick={() => { playClick(); setPvpConfig({...pvpConfig, gameType: 'hash_harvest'}); }}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${pvpConfig.gameType === 'hash_harvest' ? 'bg-purple-900/50 border-purple-500 text-white shadow-[0_0_10px_#a855f7]' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                    >
                        <span className="text-xl mb-1">⚔️</span>
                        <span className="text-xs font-bold">Hash Harvest</span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <label className="text-xs text-gray-400 block mb-2">{t('arcade.chooseChar')}</label>
                <div className="grid grid-cols-4 gap-3">
                    {['mp_p1', 'mp_p2', 'mp_p3', 'mp_p4', 'mp_p5', 'mp_p6', 'mp_p7', 'mp_p8'].map(char => (
                        <button 
                            key={char}
                            onClick={() => { playClick(); setPvpConfig({...pvpConfig, char}); }}
                            className={`relative w-full aspect-square rounded-xl border-2 flex items-center justify-center bg-black/40 transition-all ${pvpConfig.char === char ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] scale-105 z-10' : 'border-gray-700 opacity-60'}`}
                        >
                            <img src={`/assets/persona/${char}.svg`} alt={char} className="w-4/5 h-4/5 object-contain" />
                            {pvpConfig.char === char && <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-0.5"><Check size={12} className="text-black"/></div>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <label className="text-xs text-gray-400 block mb-2">{t('arcade.betAmount')}</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                    {[100, 500, 1000].map(amt => (
                        <button
                            key={amt}
                            onClick={() => { playClick(); setPvpConfig({...pvpConfig, bet: amt}); setCustomBet(''); }}
                            className={`py-3 rounded-lg border font-mono font-bold transition-all ${pvpConfig.bet === amt && !customBet ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-gray-900 text-gray-400 border-gray-700'}`}
                        >
                            {amt}
                        </button>
                    ))}
                </div>
                <div className="relative mb-2">
                    <input 
                        type="number" 
                        placeholder={t('arcade.otherAmount')}
                        value={customBet}
                        onChange={handleCustomBetChange}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none font-mono"
                    />
                    <span className="absolute right-3 top-3 text-gray-500 text-xs font-bold">MPH</span>
                </div>
                
                <div className="flex items-center gap-2 mb-4 bg-black/30 p-2 rounded border border-gray-800">
                    <input 
                        type="checkbox" 
                        id="privateRoom" 
                        checked={isPrivate} 
                        onChange={(e) => { 
                            const next = e.target.checked;
                            setIsPrivate(next); 
                            setPrivatePassword('');
                            setPvpConfig({...pvpConfig, isPrivate: next, roomPassword: ''}); 
                        }}
                        className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                    />
                    <label htmlFor="privateRoom" className="text-xs text-gray-300 select-none cursor-pointer flex-1">
                        {t('arcade.privateRoom')}
                    </label>
                    {isPrivate && <Lock size={14} className="text-yellow-500" />}
                </div>

                {isPrivate && (
                    <div className="mb-4">
                        <input
                            type="password"
                            placeholder="Senha da sala (4 a 32)"
                            value={privatePassword}
                            onChange={(e) => {
                                const v = e.target.value;
                                setPrivatePassword(v);
                                setPvpConfig({ ...pvpConfig, roomPassword: v });
                            }}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none font-mono"
                        />
                        <p className="text-[10px] text-gray-500 mt-2">
                            Compartilhe o link + senha com quem você quer jogar.
                        </p>
                    </div>
                )}

                <p className="text-[10px] text-gray-500 mt-2 text-center">
                    {t('arcade.systemFee').replace('170%', `${(pvpConfig.bet * 2 * 0.85).toFixed(0)} MPH (170%)`)}
                </p>
            </div>

            <Button 
                onClick={() => { playClick(); onCreate(); }}
                disabled={isSearching || pvpConfig.bet <= 0 || (isPrivate && privatePassword.trim().length < 4)}
                className={`w-full py-4 text-lg font-black bg-gradient-to-r from-purple-600 to-pink-600 border-0 shadow-lg hover:scale-[1.02] transition-transform ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isSearching ? t('arcade.creating') : t('arcade.createRoom')}
            </Button>
        </Card>

        {/* SESSÃO 2: BOOK DE OFERTAS (Batalhas Disponíveis) */}
        <div className="mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Users size={16} className="text-blue-400"/> {t('arcade.availableBattles')}
            </h3>
            
            <div className="space-y-3">
                {openGames.filter(g => !g.isPrivate).map(game => (
                    <div key={game.id} className="bg-gray-800 p-3 rounded-xl border border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black/50 rounded-lg p-1 border border-gray-600">
                                <img src={`/assets/persona/${game.avatar}.svg`} alt="p" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">{game.player}</p>
                                <p className="text-[10px] text-green-400 font-mono">{t('arcade.betLabel')} {game.bet} MPH</p>
                            </div>
                        </div>
                        <Button 
                            onClick={() => { playClick(); onJoin(game.id, game.bet); }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-500 text-xs px-4"
                            disabled={userBalance < game.bet}
                        >
                            {t('arcade.challenge')}
                        </Button>
                    </div>
                ))}
                
                {openGames.filter(g => !g.isPrivate).length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4 border border-dashed border-gray-700 rounded-lg">
                        {t('arcade.noBattles')}
                    </p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 text-center">
                <Trophy className="mx-auto text-yellow-500 mb-2" />
                <p className="text-xs text-gray-400">{t('arcade.totalPaid')}</p>
                <p className="text-lg font-bold text-white">{lobbyStats.totalPaid > 1000000 ? (lobbyStats.totalPaid / 1000000).toFixed(1) + 'M' : lobbyStats.totalPaid.toLocaleString()} MPH</p>
            </div>
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 text-center">
                <Users className="mx-auto text-blue-500 mb-2" />
                <p className="text-xs text-gray-400">{t('arcade.online')}</p>
                <p className="text-lg font-bold text-white">{lobbyStats.onlineUsers}</p>
            </div>
        </div>
    </div>
    );
};

const PvpResult = ({ pvpResult, onLobby, onRematch, t }) => {
    React.useEffect(() => {
        // Auto-scroll to top when result screen appears
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (
    <div className="animate-fadeIn text-center py-8">
        <div className="mb-6">
            {pvpResult.outcome === 'win' && <Trophy size={64} className="mx-auto text-yellow-400 animate-bounce" />}
            {pvpResult.outcome === 'loss' && <AlertTriangle size={64} className="mx-auto text-red-400" />}
            {pvpResult.outcome === 'draw' && <Users size={64} className="mx-auto text-gray-400" />}
        </div>
        
        <h2 className="text-3xl font-black text-white mb-2">
            {pvpResult.outcome === 'win' ? t('arcade.victory') : pvpResult.outcome === 'loss' ? t('arcade.defeat') : t('arcade.draw')}
        </h2>
        
        <p className="text-gray-400 mb-6">
            {pvpResult.outcome === 'win' ? t('arcade.victoryDesc') : t('arcade.tryAgain')}
        </p>

        <div className="bg-gray-900 rounded-xl p-4 mb-6 max-w-xs mx-auto border border-gray-800">
            <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-400">{t('arcade.finalScore')}</span>
                <span className="text-xs font-bold text-white">
                    {Number(pvpResult?.score?.player || 0)} x {Number(pvpResult?.score?.opponent ?? pvpResult?.score?.bot ?? 0)}
                </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                <span className="text-xs text-gray-400">{t('arcade.prizeReceived')}</span>
                <span className={`text-xl font-mono font-bold ${pvpResult.prize > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    +{pvpResult.prize.toFixed(0)} MPH
                </span>
            </div>
        </div>

        <div className="flex gap-3">
            <Button onClick={onLobby} variant="secondary" className="flex-1">{t('arcade.lobby')}</Button>
            <Button onClick={onRematch} className="flex-1">{t('arcade.rematch')}</Button>
        </div>
    </div>
    );
};
