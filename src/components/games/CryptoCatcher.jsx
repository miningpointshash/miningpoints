import React, { useState, useRef, useEffect } from 'react';
import { Clock, Volume2, VolumeX, Coins, Trophy, AlertTriangle, Heart } from 'lucide-react';
import { SoundManager } from '../../utils/soundManager';
import { Button } from '../ui/Button';

export const CryptoCatcherGame = ({ onGameOver, onExit }) => {
    const canvasRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState(120);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [audioEnabled, setAudioEnabled] = useState(true);
    const requestRef = useRef();
    
    // Game State Ref
    const gameData = useRef({
        basket: { x: 150, y: 0, w: 52, h: 40, color: '#9333ea' },
        items: [],
        frameCount: 0,
        score: 0,
        active: false,
        lastSpawn: 0
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth;
            const parentH = canvas.parentElement.clientHeight;
            canvas.height = Math.max(320, Math.floor(parentH * 0.7));
            gameData.current.basket.y = canvas.height - 50;
            gameData.current.basket.x = (canvas.width - gameData.current.basket.w) / 2;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            SoundManager.stopMusic();
        };
    }, []);

    const toggleAudio = () => {
        setAudioEnabled(!audioEnabled);
        if (!audioEnabled) SoundManager.startMusic();
        else SoundManager.stopMusic();
    };

    // --- GAME LOOP ---
    const animate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = gameData.current;

        if (!state.active) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid Effect
        ctx.strokeStyle = '#9333ea11';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<canvas.width; i+=40) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
        for(let i=0; i<canvas.height; i+=40) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
        ctx.stroke();

        // --- DRAW BASKET ---
        const b = state.basket;
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = b.color;
        // Simple Basket Shape
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + b.w, b.y);
        ctx.lineTo(b.x + b.w - 10, b.y + b.h);
        ctx.lineTo(b.x + 10, b.y + b.h);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Basket Rim Detail
        ctx.fillStyle = '#ffffff33';
        ctx.fillRect(b.x, b.y, b.w, 5);

        // --- SPAWN ITEMS ---
        const spawnRate = Math.max(15, 45 - Math.floor((120 - timeLeft) / 3));
        
        if (state.frameCount - state.lastSpawn > spawnRate) {
            const rand = Math.random();
            let type = 'rock';
            if (rand < 0.35) type = 'btc';
            else if (rand < 0.6) type = 'usd';
            else if (rand < 0.95) type = 'bomb';
            
            state.items.push({
                x: Math.random() * (canvas.width - 30) + 15,
                y: -30,
                type,
                speed: 3.5 + Math.random() * 3 + ((120 - timeLeft) / 40),
                r: 15,
                angle: 0
            });
            state.lastSpawn = state.frameCount;
        }

        // --- UPDATE & DRAW ITEMS ---
        for (let i = state.items.length - 1; i >= 0; i--) {
            const item = state.items[i];
            item.y += item.speed;
            item.angle += 0.05;

            // Draw Item
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate(item.angle);
            
            if (item.type === 'btc') {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.font = 'bold 16px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('₿', 0, 1);
            } else if (item.type === 'usd') {
                ctx.fillStyle = '#39ff14';
                ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.font = 'bold 16px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('$', 0, 1);
            } else if (item.type === 'bomb') {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!', 0, 1);
            } else { // rock
                ctx.fillStyle = '#6b7280';
                ctx.beginPath(); ctx.moveTo(-10,-10); ctx.lineTo(10,-5); ctx.lineTo(5,10); ctx.lineTo(-8,8); ctx.closePath(); ctx.fill();
            }
            ctx.restore();

            // COLLISION DETECTION
            // Simple AABB vs Circle approximation
            const hitBasket = 
                item.y + item.r >= b.y && 
                item.y - item.r <= b.y + b.h &&
                item.x + item.r >= b.x && 
                item.x - item.r <= b.x + b.w;

            if (hitBasket) {
                if (item.type === 'btc') {
                    state.score += 5;
                    if(audioEnabled) SoundManager.playCoin();
                } else if (item.type === 'usd') {
                    state.score += 5;
                    if(audioEnabled) SoundManager.playCoin();
                } else if (item.type === 'bomb') {
                    handleLifeLost();
                } else {
                    state.score = Math.max(0, state.score - 10);
                    if(audioEnabled) SoundManager.playTone(100, 'sawtooth', 0.1);
                }
                setScore(state.score);
                state.items.splice(i, 1);
                continue;
            }

            // Remove if off screen
            if (item.y > canvas.height) {
                state.items.splice(i, 1);
            }
        }

        state.frameCount++;
        requestRef.current = requestAnimationFrame(animate);
    };

    const handleLifeLost = () => {
        if(audioEnabled) SoundManager.playTone(150, 'sawtooth', 0.3); // Hit sound
        setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
                endGame();
            }
            return newLives;
        });
    };

    const startGame = () => {
        SoundManager.init();
        if (audioEnabled) SoundManager.startMusic();
        
        setGameState('playing');
        setLives(3);
        setScore(0);
        setTimeLeft(120);
        gameData.current.active = true;
        gameData.current.score = 0;
        gameData.current.items = [];
        requestRef.current = requestAnimationFrame(animate);
    };

    const endGame = () => {
        gameData.current.active = false;
        cancelAnimationFrame(requestRef.current);
        setGameState('gameover');
        SoundManager.stopMusic();
        if (audioEnabled) SoundManager.playGameOver();
        onGameOver(gameData.current.score);
    };

    // Controls
    const handleMove = (clientX) => {
        if (gameState !== 'playing') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        
        // Center basket on mouse/touch
        let newX = x - gameData.current.basket.w / 2;
        
        // Boundaries
        newX = Math.max(0, Math.min(newX, canvas.width - gameData.current.basket.w));
        
        gameData.current.basket.x = newX;
    };

    // Timer
    useEffect(() => {
        let interval;
        if (gameState === 'playing' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, timeLeft]);

    // Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState !== 'playing') return;
            const speed = 20;
            if (e.key === 'ArrowLeft') {
                gameData.current.basket.x = Math.max(0, gameData.current.basket.x - speed);
            } else if (e.key === 'ArrowRight') {
                const max = canvasRef.current.width - gameData.current.basket.w;
                gameData.current.basket.x = Math.min(max, gameData.current.basket.x + speed);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg bg-[#111111] border border-[#ff00ff] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(255,0,255,0.3)]">
                
                {/* HUD */}
                <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
                    <div className="flex gap-2">
                        <div className="bg-black/50 px-3 py-1 rounded-full border border-green-500 text-green-400 font-mono font-bold flex items-center gap-2 text-xs">
                            <Clock size={14}/> {timeLeft}s
                        </div>
                        <div className="bg-black/50 px-3 py-1 rounded-full border border-red-500 text-red-400 font-mono font-bold flex items-center gap-1 text-xs">
                            <Heart size={14} fill="currentColor"/> {lives}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={toggleAudio} className="pointer-events-auto bg-black/50 p-2 rounded-full border border-purple-500 text-purple-400">
                            {audioEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                        </button>
                        <div className="bg-black/50 px-4 py-2 rounded-full border border-yellow-500 text-yellow-400 font-mono font-bold flex items-center gap-2">
                            <Trophy size={16}/> {score}
                        </div>
                    </div>
                </div>

                {/* GAME CANVAS */}
                <div 
                    className="w-full h-[40vh] max-h-[384px] min-h-[320px] relative cursor-pointer touch-none" 
                    onMouseMove={(e) => handleMove(e.clientX)}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX)}
                >
                    <canvas ref={canvasRef} className="w-full h-full block bg-[#0a0a0a]" />
                    
                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-center p-6">
                            <div className="w-16 h-16 bg-purple-900/50 rounded-full flex items-center justify-center mb-4 border border-purple-500 shadow-[0_0_20px_#a855f7]">
                                <Coins size={32} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[#ff00ff] mb-2 font-mono uppercase tracking-widest">Crypto Catcher</h2>
                            <p className="text-gray-300 mb-6 text-xs max-w-[200px]">
                                Mova o cesto para pegar <span className="text-yellow-400 font-bold">₿</span> e <span className="text-green-400 font-bold">$</span>.<br/>
                                Evite as <span className="text-red-500 font-bold">bombas (!)</span>. 3 erros = Game Over.
                            </p>
                            <Button onClick={startGame} className="animate-pulse shadow-[0_0_20px_#39ff14] border-[#39ff14] text-[#39ff14]">START GAME</Button>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm text-center p-6 animate-fadeIn">
                            <h2 className="text-3xl font-bold text-red-500 mb-2 font-mono">GAME OVER</h2>
                            <div className="flex flex-col gap-2 mb-6">
                                <span className="text-gray-400 text-sm">Pontuação Final: <b className="text-white">{score}</b></span>
                                <span className="text-green-400 text-lg font-bold border border-green-500 px-4 py-2 rounded bg-green-900/20">
                                    +{(score / 100).toFixed(2)} MPH
                                </span>
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={startGame} variant="outline">Jogar Novamente</Button>
                                <Button onClick={() => onExit(score)} variant="secondary">Sair</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-gray-500 text-xs mt-4 animate-pulse">Arraste para mover o cesto</p>
        </div>
    );
};
