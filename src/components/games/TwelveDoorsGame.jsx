import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SoundManager } from '../../utils/soundManager';
import { Trophy, AlertTriangle, User, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const TwelveDoorsGame = ({ onGameOver, betAmount, playerChar, botChar, botName, isMuted, roomId, selfId, creatorId, challengerId, creatorAvatar, challengerAvatar, creatorName, challengerName }) => {
    const [doors, setDoors] = useState(Array.from({ length: 12 }, () => ({ status: 'closed', owner: null })));
    const [prizeDoor, setPrizeDoor] = useState(null);
    const [turn, setTurn] = useState('player');
    const [gameState, setGameState] = useState('start');
    const [message, setMessage] = useState('Sua vez! Escolha uma porta.');
    const [winner, setWinner] = useState(null);
    const [roomState, setRoomState] = useState(null);
    const [roomStateReady, setRoomStateReady] = useState(false);
    const reportedRef = useRef(false);

    const videoRef = useRef(null);
    const isMultiplayer = Boolean(roomId && selfId && creatorId && challengerId);
    const selfRole = isMultiplayer ? (selfId === creatorId ? 'creator' : 'challenger') : null;

    // Init game
    useEffect(() => {
        if (isMultiplayer) return;
        // Randomly select prize door (0-11)
        const prize = Math.floor(Math.random() * 12);
        setPrizeDoor(prize);
        setGameState('playing');
        
        // Play start sound
        if (!isMuted) SoundManager.playSfx('click');
    }, [isMuted, isMultiplayer]);

    useEffect(() => {
        if (!isMultiplayer) return;
        reportedRef.current = false;
        let alive = true;

        const ensureState = async () => {
            setRoomStateReady(false);
            try {
                const { data, error } = await supabase.rpc('init_twelve_doors_room', { p_room_id: roomId });
                if (!alive) return;
                if (error) return;
                if (data?.state) {
                    setRoomState(data.state);
                    setRoomStateReady(true);
                    return;
                }
            } catch {}
        };

        ensureState();

        const channel = supabase
            .channel(`pvp_room_state_${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'pvp_room_game_states', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const next = payload?.new?.state;
                    if (!next) return;
                    setRoomState(next);
                    setRoomStateReady(true);
                }
            )
            .subscribe();

        const poll = setInterval(async () => {
            if (!alive) return;
            const { data: row } = await supabase
                .from('pvp_room_game_states')
                .select('state')
                .eq('room_id', roomId)
                .maybeSingle();
            if (row?.state) {
                setRoomState(row.state);
                setRoomStateReady(true);
            }
        }, 900);

        return () => {
            alive = false;
            try { clearInterval(poll); } catch {}
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [isMultiplayer, roomId, selfId, creatorId]);

    useEffect(() => {
        if (!isMultiplayer) return;
        if (!roomStateReady || !roomState) return;

        const rsDoors = Array.isArray(roomState.doors) ? roomState.doors : [];
        setDoors(rsDoors.length === 12 ? rsDoors : Array.from({ length: 12 }, () => ({ status: 'closed', owner: null })));
        setPrizeDoor(Number.isInteger(roomState.prize_door) ? roomState.prize_door : null);

        const turnUserId = roomState.turn_user_id;
        const isMyTurn = turnUserId === selfId;
        setTurn(isMyTurn ? 'player' : 'bot');

        if (roomState.status === 'finished') {
            const w = roomState.winner_role === selfRole ? 'player' : 'bot';
            setWinner(w);
            setGameState('animation');
            setMessage(w === 'player' ? 'VOCÊ ENCONTROU!' : 'OPONENTE ENCONTROU!');
            return;
        }

        setGameState('playing');
        if (isMyTurn) {
            if (roomState?.last_event?.type === 'miss' && roomState?.last_event?.by && roomState.last_event.by !== selfRole) {
                setMessage('Oponente errou! Sua vez.');
            } else {
                setMessage('Sua vez! Escolha uma porta.');
            }
        } else {
            if (roomState?.last_event?.type === 'miss' && roomState?.last_event?.by === selfRole) {
                setMessage('Nada aqui... Vez do oponente.');
            } else {
                setMessage('Aguarde...');
            }
        }
    }, [isMultiplayer, roomStateReady, roomState, selfId, selfRole]);

    useEffect(() => {
        if (!isMultiplayer) return;
        if (!roomStateReady || !roomState) return;
        if (roomState.status !== 'finished') return;
        if (reportedRef.current) return;

        reportedRef.current = true;
        const selfScore = roomState.winner_role === selfRole ? 1 : 0;
        onGameOver({ player: selfScore, bot: selfScore ? 0 : 1 });
    }, [isMultiplayer, roomStateReady, roomState, selfRole, onGameOver]);

    // Bot Turn Logic
    useEffect(() => {
        if (isMultiplayer) return;
        if (turn === 'bot' && gameState === 'playing') {
            const botThinkingTime = 1000 + Math.random() * 1000; // 1-2s delay
            setMessage(`${botName || 'Oponente'} está escolhendo...`);
            
            const timer = setTimeout(() => {
                handleBotMove();
            }, botThinkingTime);
            
            return () => clearTimeout(timer);
        }
    }, [turn, gameState]);

    const handleBotMove = () => {
        // Bot picks a random closed door
        const availableDoors = doors
            .map((door, index) => ({ ...door, index }))
            .filter(door => door.status === 'closed');
        
        if (availableDoors.length === 0) return;

        // Smart Bot Logic? No, pure luck as requested ("sistema escolhe de forma aleatoria")
        // But wait, the system chose the prize door. The bot just needs to guess.
        
        // Simple AI: Random choice
        const choice = availableDoors[Math.floor(Math.random() * availableDoors.length)];
        
        processMove(choice.index, 'bot');
    };

    const handlePlayerClick = (index) => {
        if (isMultiplayer) {
            if (!roomStateReady || !roomState) return;
            if (roomState.status !== 'playing') return;
            if (roomState.turn_user_id !== selfId) return;
            if (!isMuted) SoundManager.playSfx('click');
            supabase
                .rpc('play_twelve_doors_move', { p_room_id: roomId, p_door_index: index })
                .then(({ data }) => {
                    if (data?.state) {
                        setRoomState(data.state);
                        setRoomStateReady(true);
                    }
                });
            return;
        }

        if (gameState !== 'playing' || turn !== 'player') return;
        if (doors[index].status !== 'closed') return;

        if (!isMuted) SoundManager.playSfx('click');
        processMove(index, 'player');
    };

    const processMove = (index, who) => {
        // Open the door
        const newDoors = [...doors];
        newDoors[index] = { status: 'open', owner: who };
        setDoors(newDoors);

        // Check if prize found
        if (index === prizeDoor) {
            handleWin(who);
        } else {
            // Next turn
            if (who === 'player') {
                setTurn('bot');
                setMessage('Nada aqui... Vez do oponente.');
            } else {
                setTurn('player');
                setMessage('Oponente errou! Sua vez.');
            }
        }
    };

    const handleWin = (who) => {
        setWinner(who);
        setGameState('animation');
        setMessage(who === 'player' ? 'VOCÊ ENCONTROU!' : 'OPONENTE ENCONTROU!');
        
        if (who === 'player') {
            if (!isMuted) SoundManager.playSfx('victory');
            // Play video will be handled by render
        } else {
            if (!isMuted) SoundManager.playSfx('defeat');
            // Delay for bot win to show result
            setTimeout(() => {
                finishGame(who);
            }, 2000);
        }
    };

    const finishGame = (winnerWho) => {
        const score = {
            player: winnerWho === 'player' ? 1 : 0,
            bot: winnerWho === 'bot' ? 1 : 0
        };
        onGameOver(score);
    };

    // Video end handler
    const handleVideoEnd = () => {
        if (isMultiplayer) return;
        finishGame('player');
    };

    const leftName = isMultiplayer ? (challengerName || 'Desafiante') : 'Você';
    const rightName = isMultiplayer ? (creatorName || 'Criador') : (botName || 'Oponente');
    const leftAvatar = isMultiplayer ? (challengerAvatar || playerChar) : playerChar;
    const rightAvatar = isMultiplayer ? (creatorAvatar || botChar) : (botChar || 'mp_p6');
    const turnUserId = isMultiplayer ? roomState?.turn_user_id : null;
    const leftTurn = isMultiplayer ? turnUserId === challengerId : turn === 'player';
    const rightTurn = isMultiplayer ? turnUserId === creatorId : turn === 'bot';
    const leftIsYou = isMultiplayer ? selfId === challengerId : true;
    const rightIsYou = isMultiplayer ? selfId === creatorId : false;

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            
            {/* Header / HUD */}
            <div className="w-full flex justify-between items-center mb-6 bg-gray-900/80 p-4 rounded-xl border border-gray-700 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-lg border-2 ${leftTurn ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'border-gray-700'}`}>
                        <img src={`/assets/persona/${leftAvatar}.svg`} alt="Left" className="w-12 h-12" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">{leftIsYou ? 'Você' : leftName}</p>
                        <p className={`font-bold ${leftTurn ? 'text-green-400' : 'text-gray-500'}`}>
                            {leftTurn ? 'SUA VEZ' : 'Aguarde...'}
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                        {betAmount * 2 * 0.85} MPH
                    </h2>
                    <p className="text-[10px] text-gray-500">PRÊMIO ESTIMADO</p>
                </div>

                <div className="flex items-center gap-3 text-right">
                    <div>
                        <p className="text-xs text-gray-400">{rightIsYou ? 'Você' : rightName}</p>
                        <p className={`font-bold ${rightTurn ? 'text-red-400' : 'text-gray-500'}`}>
                            {rightTurn ? 'JOGANDO' : 'Aguarde...'}
                        </p>
                    </div>
                    <div className={`p-1 rounded-lg border-2 ${rightTurn ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-gray-700'}`}>
                        <img src={`/assets/persona/${rightAvatar}.svg`} alt="Right" className="w-12 h-12" />
                    </div>
                </div>
            </div>

            {/* Game Message */}
            <div className="mb-6 text-center">
                <p className="text-white text-lg font-mono animate-pulse">{message}</p>
            </div>

            {/* Doors Grid */}
            {gameState !== 'animation' && (
                <div className="grid grid-cols-4 gap-4 w-full max-w-md">
                    {doors.map((door, index) => (
                        <button
                            key={index}
                            onClick={() => handlePlayerClick(index)}
                            disabled={door.status === 'open' || turn !== 'player' || gameState !== 'playing' || (isMultiplayer && !roomStateReady)}
                            className={`
                                relative aspect-[3/4] rounded-t-full border-b-4 transition-all duration-300 transform
                                ${door.status === 'open' 
                                    ? 'bg-gray-800 border-gray-700' 
                                    : 'bg-gradient-to-b from-red-700 to-red-900 border-red-950 hover:brightness-110 active:scale-95 shadow-lg'
                                }
                                ${turn === 'player' && door.status === 'closed' && (!isMultiplayer || roomStateReady) ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'}
                            `}
                        >
                            {door.status === 'closed' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-yellow-600 absolute right-3 top-1/2 shadow-sm"></div>
                                    <span className="text-red-950/30 font-bold text-2xl">{index + 1}</span>
                                </div>
                            )}

                            {door.status === 'open' && (
                                <div className="absolute inset-0 flex items-center justify-center animate-fadeIn">
                                    {index === prizeDoor ? (
                                        <div className="text-center">
                                            {/* Small icon for static reveal before animation if bot wins */}
                                            {winner === 'bot' && <span className="text-4xl">🤖</span>}
                                        </div>
                                    ) : (
                                        <div className="text-gray-600">
                                            {door.owner === 'player' || door.owner === selfRole ? <User size={24} /> : <HelpCircle size={24} />}
                                            <p className="text-[10px] mt-1">Vazio</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Winning Animation (Full Screen Overlay) */}
            {gameState === 'animation' && winner === 'player' && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    <video 
                        ref={videoRef}
                        src="/assets/vmp/mp_aceno.mp4" 
                        autoPlay 
                        className="w-full h-full object-cover"
                        onEnded={handleVideoEnd}
                    />
                    <div className="absolute bottom-10 left-0 right-0 text-center">
                        <h1 className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-bounce">
                            VOCÊ GANHOU!
                        </h1>
                        <p className="text-2xl text-yellow-400 font-mono mt-4">
                            +{ (betAmount * 2 * 0.85).toFixed(2) } MPH
                        </p>
                    </div>
                </div>
            )}
            
            {/* Bot Win Animation (Simple) */}
            {gameState === 'animation' && winner === 'bot' && (
                 <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
                    <AlertTriangle size={80} className="text-red-500 mb-6 animate-pulse" />
                    <h1 className="text-4xl font-bold text-white mb-2">DERROTA</h1>
                    <p className="text-gray-400">O oponente encontrou o prêmio.</p>
                 </div>
            )}

        </div>
    );
};
