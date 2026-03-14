import React, { useState, useRef, useEffect } from 'react';
import { Clock, Volume2, VolumeX, Coins } from 'lucide-react';
import { SoundManager } from '../../utils/soundManager';
import { Button } from '../ui/Button';

export const CyberRunnerGame = ({ onGameOver, onExit }) => {
    const canvasRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState(120);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [audioEnabled, setAudioEnabled] = useState(true);
    const requestRef = useRef();
    const playerRef = useRef(null); // Ref para o elemento DOM do jogador (GIF)
    
    // Game Physics & State Refs (to avoid closure staleness)
    const gameData = useRef({
        player: { x: 50, y: 0, w: 60, h: 60, dy: 0, grounded: false, color: '#39ff14' },
        obstacles: [],
        coins: [],
        traps: [], // Moedas vermelhas falsas (!)
        gravity: 0.6,
        jumpPower: -12,
        speed: 5,
        frameCount: 0,
        score: 0,
        active: false
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Responsive Canvas
        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth;
            const parentH = canvas.parentElement.clientHeight;
            canvas.height = parentH; // Usar altura total do pai para resolução 1:1 e evitar distorção/flutuação do GIF
            gameData.current.player.y = canvas.height - 100; // Reset player pos
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            SoundManager.stopMusic();
        };
    }, []);

    // Toggle Audio
    const toggleAudio = () => {
        setAudioEnabled(!audioEnabled);
        if (!audioEnabled) SoundManager.startMusic();
        else SoundManager.stopMusic();
    };

    // Game Loop
    const animate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = gameData.current;

        if (!state.active) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Aceleração Dinâmica baseada no tempo
        // 120s = 5 speed, 0s = 9 speed
        const difficulty = (120 - timeLeft) / 120; // 0 a 1
        state.speed = 5 + (difficulty * 4); 

        // Draw Background (Cyber Grid Effect)
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Grid Lines (Perspective)
        ctx.strokeStyle = '#9333ea33';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<canvas.width; i+=40) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i - (state.frameCount % 40), canvas.height);
        }
        for(let i=0; i<canvas.height; i+=40) {
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
        }
        ctx.stroke();

        // --- PHYSICS ---
        // Gravity
        state.player.dy += state.gravity;
        state.player.y += state.player.dy;

        // Ground Collision
        // Lógica de física padrão e robusta: O pé da hitbox toca exatamente a linha do chão.
        const groundLevel = canvas.height - 40; 
        
        if (state.player.y + state.player.h > groundLevel) {
            state.player.y = groundLevel - state.player.h; // Colisão exata
            state.player.dy = 0;
            state.player.grounded = true;
        } else {
            state.player.grounded = false;
        }

        // --- SPAWN LOGIC (Com Prevenção de Sobreposição) ---
        
        // Spawn Obstacles (Increase frequency slightly)
        // 90 frames at start, down to 60 frames near end
        const obstacleFreq = Math.floor(90 - (difficulty * 30));
        
        if (state.frameCount % obstacleFreq === 0) {
            state.obstacles.push({
                x: canvas.width,
                y: groundLevel - 40,
                w: 20,
                h: 40,
                color: '#ff00ff' // Neon Pink
            });
        }

        // Spawn Coins/Traps (Separate Timer)
        if (state.frameCount % 50 === 0) {
            // Check Collision with last spawned obstacle to ensure we don't spawn INSIDE it
            const lastObs = state.obstacles[state.obstacles.length - 1];
            const safeZone = 60; // minimum pixel distance from an obstacle center
            
            let canSpawn = true;
            if (lastObs && Math.abs(lastObs.x - canvas.width) < safeZone) {
                canSpawn = false; 
            }

            if (canSpawn) {
                // Trap Chance increases as time runs out (5% -> 25%)
                const trapChance = 0.05 + (difficulty * 0.20);
                
                if (Math.random() < trapChance) {
                    state.traps.push({
                        x: canvas.width,
                        y: groundLevel - 80 - (Math.random() * 50), // um pouco mais alto para pular
                        r: 10,
                        color: '#ff0000',
                        collected: false
                    });
                } else {
                    state.coins.push({
                        x: canvas.width,
                        y: groundLevel - 80 - (Math.random() * 50),
                        r: 8,
                        collected: false
                    });
                }
            }
        }

        // --- UPDATE & DRAW ENTITIES ---
        
        // Player (Agora via DOM Overlay)
        // ctx.shadowBlur = 15;
        // ctx.shadowColor = state.player.color;
        // ctx.fillStyle = state.player.color;
        // ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
        // ctx.shadowBlur = 0;

        // Atualizar posição do GIF
        // Com a resolução do canvas corrigida para 1:1 com o DOM, o offset visual deve ser mínimo.
        const visualOffsetY = 4; 
        
        if (playerRef.current) {
            playerRef.current.style.transform = `translate(${state.player.x}px, ${state.player.y + visualOffsetY}px)`;
            playerRef.current.style.width = `${state.player.w}px`;
            playerRef.current.style.height = `${state.player.h}px`;
            playerRef.current.style.display = 'block';
        }

        // Obstacles
        state.obstacles.forEach((obs, index) => {
            obs.x -= state.speed;
            
            // Draw
            ctx.shadowBlur = 10;
            ctx.shadowColor = obs.color;
            ctx.fillStyle = obs.color;
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            ctx.shadowBlur = 0;

            // Collision Check (Player vs Obstacle)
            if (
                state.player.x < obs.x + obs.w &&
                state.player.x + state.player.w > obs.x &&
                state.player.y < obs.y + obs.h &&
                state.player.y + state.player.h > obs.y
            ) {
                endGame();
            }

            // Remove off-screen
            if (obs.x + obs.w < 0) state.obstacles.splice(index, 1);
        });

        // Traps (Red Coins with !)
        state.traps.forEach((trap, index) => {
            if (trap.collected) return;
            trap.x -= state.speed;

            // Draw Red Coin
            ctx.beginPath();
            ctx.arc(trap.x, trap.y, trap.r, 0, Math.PI * 2);
            ctx.fillStyle = trap.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            ctx.fill();
            ctx.closePath();
            
            // Draw Exclamation Mark
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', trap.x, trap.y);
            ctx.shadowBlur = 0;

            // Collision Check (Deadly Trap) - Circle Check
            const dx = state.player.x + state.player.w/2 - trap.x;
            const dy = state.player.y + state.player.h/2 - trap.y;
            const distance = Math.sqrt(dx*dx + dy*dy);

            if (distance < trap.r + state.player.w/2) {
                endGame();
            }

            if (trap.x < 0) state.traps.splice(index, 1);
        });

        // Coins
        state.coins.forEach((coin, index) => {
            if (coin.collected) return;
            coin.x -= state.speed;

            // Draw
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFD700';
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();

            // Collision Check (Player vs Coin)
            const dx = state.player.x + state.player.w/2 - coin.x;
            const dy = state.player.y + state.player.h/2 - coin.y;
            const distance = Math.sqrt(dx*dx + dy*dy);

            if (distance < coin.r + state.player.w/2) {
                coin.collected = true;
                state.score += 1;
                setScore(state.score);
                if (audioEnabled) SoundManager.playCoin();
                state.coins.splice(index, 1);
            }

            if (coin.x < 0) state.coins.splice(index, 1);
        });

        // Ground Line
        ctx.fillStyle = '#39ff14';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#39ff14';
        ctx.fillRect(0, groundLevel, canvas.width, 2);
        ctx.shadowBlur = 0;

        state.frameCount++;
        requestRef.current = requestAnimationFrame(animate);
    };

    const startGame = () => {
        SoundManager.init(); // User interaction required
        if (audioEnabled) SoundManager.startMusic();
        
        setGameState('playing');
        gameData.current = {
            player: { x: 50, y: 0, w: 60, h: 60, dy: 0, grounded: false, color: '#39ff14' },
            obstacles: [],
            coins: [],
            traps: [],
            gravity: 0.6,
            jumpPower: -12,
            speed: 5,
            frameCount: 0,
            score: 0,
            active: true
        };
        setScore(0);
        setTimeLeft(120);
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

    const handleJump = () => {
        if (gameData.current.player.grounded && gameState === 'playing') {
            gameData.current.player.dy = gameData.current.jumpPower;
            gameData.current.player.grounded = false;
            if (audioEnabled) SoundManager.playJump();
        }
    };

    // Timer Logic
    useEffect(() => {
        let interval;
        if (gameState === 'playing' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
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

    // Input Listeners
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') handleJump();
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
                    <div className="bg-black/50 px-4 py-2 rounded-full border border-green-500 text-green-400 font-mono font-bold flex items-center gap-2">
                        <Clock size={16}/> {timeLeft}s
                    </div>
                    <div className="flex gap-2">
                        <button onClick={toggleAudio} className="pointer-events-auto bg-black/50 p-2 rounded-full border border-purple-500 text-purple-400">
                            {audioEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                        </button>
                        <div className="bg-black/50 px-4 py-2 rounded-full border border-yellow-500 text-yellow-400 font-mono font-bold flex items-center gap-2">
                            <Coins size={16}/> {score}
                        </div>
                    </div>
                </div>

                <div 
                    className="w-full h-[70vh] max-h-[640px] min-h-[420px] relative cursor-pointer overflow-hidden" 
                    onClick={handleJump} 
                    onTouchStart={handleJump}
                >
                    <canvas ref={canvasRef} className="w-full h-full block bg-[#0a0a0a]" />

                    {/* Player GIF Overlay */}
                    <img 
                        ref={playerRef}
                        src="/assets/mp/mp_loop.gif" 
                        alt="Player"
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{ display: 'none', width: '60px', height: '60px', objectFit: 'contain' }} 
                    />
                    
                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-center p-6">
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[#ff00ff] mb-4 font-mono uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">Cyber Runner</h2>
                            <p className="text-gray-300 mb-6 text-sm">Cuidado com as moedas vermelhas (<span className="text-red-500 font-bold">!</span>).<br/>Toque na tela ou use ESPAÇO para pular.</p>
                            <Button onClick={startGame} className="animate-pulse shadow-[0_0_20px_#39ff14] border-[#39ff14] text-[#39ff14]">INICIAR MISSÃO</Button>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm text-center p-6 animate-fadeIn">
                            <h2 className="text-3xl font-bold text-red-500 mb-2 font-mono">GAME OVER</h2>
                            <div className="flex flex-col gap-2 mb-6">
                                <span className="text-gray-400 text-sm">Moedas Coletadas: <b className="text-white">{score}</b></span>
                                <span className="text-green-400 text-lg font-bold border border-green-500 px-4 py-2 rounded bg-green-900/20">
                                    +{(score / 10).toFixed(1)} MPH
                                </span>
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={startGame} variant="outline">Tentar Novamente</Button>
                                <Button onClick={() => onExit(score)} variant="secondary">Sair e Salvar</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Mobile Controls Hint */}
            <p className="text-gray-500 text-xs mt-4 animate-pulse">Toque para pular</p>
        </div>
    );
};
