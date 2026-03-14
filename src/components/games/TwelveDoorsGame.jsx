import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SoundManager } from '../../utils/soundManager';
import { Trophy, AlertTriangle, User, HelpCircle } from 'lucide-react';

export const TwelveDoorsGame = ({ onGameOver, betAmount, playerChar, botChar, isMuted }) => {
    const [doors, setDoors] = useState(Array(12).fill({ status: 'closed', owner: null })); // status: closed, open. owner: player, bot, null
    const [prizeDoor, setPrizeDoor] = useState(null);
    const [turn, setTurn] = useState('player'); // player, bot
    const [gameState, setGameState] = useState('start'); // start, playing, animation, result
    const [message, setMessage] = useState('Sua vez! Escolha uma porta.');
    const [winner, setWinner] = useState(null); // 'player' or 'bot'

    const videoRef = useRef(null);

    // Init game
    useEffect(() => {
        // Randomly select prize door (0-11)
        const prize = Math.floor(Math.random() * 12);
        setPrizeDoor(prize);
        setGameState('playing');
        
        // Play start sound
        if (!isMuted) SoundManager.playSfx('click');
    }, []);

    // Bot Turn Logic
    useEffect(() => {
        if (turn === 'bot' && gameState === 'playing') {
            const botThinkingTime = 1000 + Math.random() * 1000; // 1-2s delay
            setMessage(`${botChar || 'Oponente'} está escolhendo...`);
            
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
        finishGame('player');
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            
            {/* Header / HUD */}
            <div className="w-full flex justify-between items-center mb-6 bg-gray-900/80 p-4 rounded-xl border border-gray-700 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-lg border-2 ${turn === 'player' ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'border-gray-700'}`}>
                        <img src={`/assets/persona/${playerChar}.svg`} alt="You" className="w-12 h-12" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Você</p>
                        <p className={`font-bold ${turn === 'player' ? 'text-green-400' : 'text-gray-500'}`}>
                            {turn === 'player' ? 'SUA VEZ' : 'Aguarde...'}
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                        {betAmount * 2 * 0.9} MPH
                    </h2>
                    <p className="text-[10px] text-gray-500">PRÊMIO ESTIMADO</p>
                </div>

                <div className="flex items-center gap-3 text-right">
                    <div>
                        <p className="text-xs text-gray-400">{botChar || 'Oponente'}</p>
                        <p className={`font-bold ${turn === 'bot' ? 'text-red-400' : 'text-gray-500'}`}>
                            {turn === 'bot' ? 'JOGANDO' : 'Aguarde...'}
                        </p>
                    </div>
                    <div className={`p-1 rounded-lg border-2 ${turn === 'bot' ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-gray-700'}`}>
                        <img src={`/assets/persona/${botChar || 'mp_p6'}.svg`} alt="Bot" className="w-12 h-12" />
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
                            disabled={door.status === 'open' || turn !== 'player' || gameState !== 'playing'}
                            className={`
                                relative aspect-[3/4] rounded-t-full border-b-4 transition-all duration-300 transform
                                ${door.status === 'open' 
                                    ? 'bg-gray-800 border-gray-700' 
                                    : 'bg-gradient-to-b from-red-700 to-red-900 border-red-950 hover:brightness-110 active:scale-95 shadow-lg'
                                }
                                ${turn === 'player' && door.status === 'closed' ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'}
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
                                            {door.owner === 'player' ? <User size={24} /> : <HelpCircle size={24} />}
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
                            +{ (betAmount * 2 * 0.9).toFixed(2) } MPH
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
