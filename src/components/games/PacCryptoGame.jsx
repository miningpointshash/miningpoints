import React, { useState, useRef, useEffect, useContext } from 'react';
import { Clock, Volume2, VolumeX, Trophy } from 'lucide-react';
import { SoundManager } from '../../utils/soundManager';
import { Button } from '../ui/Button';
import { AppContext } from '../../context/AppContext';

export const PacCryptoGame = ({ onGameOver, onExit }) => {
    const { t } = useContext(AppContext);
    const canvasRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [gameOverReason, setGameOverReason] = useState(null);
    const [difficultyLevel, setDifficultyLevel] = useState(1);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const requestRef = useRef();
    const timeLeftRef = useRef(60);
    const touchStartRef = useRef(null);

    // Maze Definition: 0 = wall, 1 = dot, 2 = power pill, 3 = empty path
    // Simplified MVP maze: 15 cols x 15 rows
    const mazePattern = [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],
        [0,2,0,0,1,0,1,0,1,0,1,0,0,2,0],
        [0,1,1,1,1,0,1,1,1,0,1,1,1,1,0],
        [0,1,0,0,1,0,0,0,0,0,1,0,0,1,0],
        [0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],
        [0,0,0,0,1,0,3,3,3,0,1,0,0,0,0],
        [3,3,3,3,1,0,3,0,3,0,1,3,3,3,3],
        [0,0,0,0,1,0,3,3,3,0,1,0,0,0,0],
        [0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],
        [0,1,0,0,1,0,0,0,0,0,1,0,0,1,0],
        [0,1,1,0,1,1,1,0,1,1,1,0,1,1,0],
        [0,2,1,1,1,0,1,1,1,0,1,1,1,2,0],
        [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    const cellSize = 20; // Base size, scales to fit
    const cols = 15;
    const rows = 15;

    const gameData = useRef({
        active: false,
        score: 0,
        player: { x: 7, y: 11, dx: 0, dy: 0, nextDx: 0, nextDy: 0, radius: 0.4, mouthAngle: 0, mouthDir: 1 },
        ghosts: [
            { x: 6, y: 7, dx: 1, dy: 0, color: '#ef4444', wait: 0 },
            { x: 7, y: 7, dx: -1, dy: 0, color: '#3b82f6', wait: 30 },
            { x: 8, y: 7, dx: 0, dy: -1, color: '#f97316', wait: 60 }
        ],
        maze: [],
        frameCount: 0,
        powerMode: 0,
        moveEvery: 8,
        powerSteps: 24,
        level: 1
    });

    const initMaze = () => {
        gameData.current.maze = mazePattern.map(row => [...row]);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            const size = Math.min(parent.clientWidth, parent.clientHeight, 400);
            canvas.width = size;
            canvas.height = size;
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

    // Physics / Collision
    const canMove = (x, y, dx, dy) => {
        const nx = Math.round(x + dx);
        const ny = Math.round(y + dy);
        
        // Tunnel wrap
        if (nx < 0 || nx >= cols) return true;
        if (ny < 0 || ny >= rows) return false; // No vertical wrap
        
        return gameData.current.maze[ny][nx] !== 0;
    };

    const animate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = gameData.current;

        if (!state.active) return;

        const cw = canvas.width;
        const ch = canvas.height;
        const cs = cw / cols;

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, cw, ch);

        if (state.frameCount % (state.moveEvery || 8) === 0) {
            const p = state.player;
            state.playerPrevX = p.x;
            state.playerPrevY = p.y;
            
            // Try next queued direction
            if (p.nextDx !== 0 || p.nextDy !== 0) {
                if (canMove(p.x, p.y, p.nextDx, p.nextDy)) {
                    p.dx = p.nextDx;
                    p.dy = p.nextDy;
                    p.nextDx = 0;
                    p.nextDy = 0;
                }
            }
            
            // Move current direction
            if (canMove(p.x, p.y, p.dx, p.dy)) {
                p.x += p.dx;
                p.y += p.dy;
                
                // Wrap horizontal
                if (p.x < 0) p.x = cols - 1;
                if (p.x >= cols) p.x = 0;
            } else {
                // Hit wall
                p.dx = 0;
                p.dy = 0;
            }

            // Collect dot
            const cell = state.maze[p.y][p.x];
            if (cell === 1) {
                state.maze[p.y][p.x] = 3;
                state.score += 2;
                if(audioEnabled && state.score % 10 === 0) SoundManager.playCoin();
                setScore(Math.min(500, state.score));
            } else if (cell === 2) {
                state.maze[p.y][p.x] = 3;
                state.score += 10;
                state.powerMode = Number(state.powerSteps || 12);
                if(audioEnabled) SoundManager.playCoin();
                setScore(Math.min(500, state.score));
            }

            // Update Ghosts
            state.ghosts.forEach(g => {
                g.prevX = g.x;
                g.prevY = g.y;
                if (g.wait > 0) {
                    g.wait--;
                    return;
                }
                
                const possible = [
                    {dx: 0, dy: -1}, {dx: 0, dy: 1},
                    {dx: -1, dy: 0}, {dx: 1, dy: 0}
                ].filter(dir => 
                    canMove(g.x, g.y, dir.dx, dir.dy) && 
                    !(dir.dx === -g.dx && dir.dy === -g.dy) // don't reverse unless stuck
                );

                if (possible.length > 0) {
                    const lvl = Number(state.level || 1);
                    const preferChase = Math.random() < 0.12 + (lvl - 1) * 0.05;
                    const move = preferChase
                        ? possible.reduce((best, dir) => {
                            const bx = g.x + best.dx;
                            const by = g.y + best.dy;
                            const dx1 = g.x + dir.dx;
                            const dy1 = g.y + dir.dy;
                            const bdist = Math.abs(bx - p.x) + Math.abs(by - p.y);
                            const ddist = Math.abs(dx1 - p.x) + Math.abs(dy1 - p.y);
                            return ddist < bdist ? dir : best;
                        }, possible[0])
                        : possible[Math.floor(Math.random() * possible.length)];
                    g.dx = move.dx;
                    g.dy = move.dy;
                } else {
                    g.dx = -g.dx;
                    g.dy = -g.dy;
                }

                g.x += g.dx;
                g.y += g.dy;
                if (g.x < 0) g.x = cols - 1;
                if (g.x >= cols) g.x = 0;
            });
            
            if (state.powerMode > 0) state.powerMode--;

            const elapsed = 60 - Number(timeLeftRef.current || 0);
            if (elapsed >= 25 && state.ghosts.length < 4) {
                state.ghosts.push({ x: 7, y: 7, dx: 0, dy: 1, color: '#22c55e', wait: 90 });
            }
            if (elapsed >= 45 && state.ghosts.length < 5) {
                state.ghosts.push({ x: 7, y: 7, dx: 1, dy: 0, color: '#e879f9', wait: 120 });
            }

            let remaining = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const v = state.maze[r][c];
                    if (v === 1 || v === 2) remaining++;
                }
            }
            if (remaining === 0) {
                state.maze = mazePattern.map(row => [...row]);
            }
        }

        // Check Collisions
        state.ghosts.forEach(g => {
            const sameCell = g.x === state.player.x && g.y === state.player.y;
            const cross =
                Number.isFinite(g.prevX) &&
                Number.isFinite(g.prevY) &&
                g.prevX === state.player.x &&
                g.prevY === state.player.y &&
                g.x === state.playerPrevX &&
                g.y === state.playerPrevY;

            if (sameCell || cross) {
                if (state.powerMode > 0) {
                    // Eat ghost
                    g.x = 7; g.y = 7; g.wait = 60;
                    state.score += 20;
                    setScore(Math.min(500, state.score));
                } else {
                    // Die
                    endGame('virus');
                }
            }
        });

        // Draw Maze
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#a855f7';
        
        for (let r=0; r<rows; r++) {
            for (let c=0; c<cols; c++) {
                const val = state.maze[r][c];
                const cx = c * cs;
                const cy = r * cs;
                
                if (val === 0) {
                    ctx.strokeRect(cx+2, cy+2, cs-4, cs-4);
                } else if (val === 1) {
                    ctx.fillStyle = '#39ff14';
                    ctx.beginPath(); ctx.arc(cx+cs/2, cy+cs/2, 2, 0, Math.PI*2); ctx.fill();
                } else if (val === 2) {
                    ctx.fillStyle = '#ff00ff';
                    ctx.beginPath(); ctx.arc(cx+cs/2, cy+cs/2, 5 + Math.sin(state.frameCount*0.1)*2, 0, Math.PI*2); ctx.fill();
                }
            }
        }
        ctx.shadowBlur = 0;

        // Draw Player
        state.player.mouthAngle += 0.1 * state.player.mouthDir;
        if (state.player.mouthAngle > 0.5 || state.player.mouthAngle < 0) state.player.mouthDir *= -1;
        
        ctx.save();
        ctx.translate(state.player.x * cs + cs/2, state.player.y * cs + cs/2);
        
        let rot = 0;
        if (state.player.dx === 1) rot = 0;
        if (state.player.dx === -1) rot = Math.PI;
        if (state.player.dy === 1) rot = Math.PI/2;
        if (state.player.dy === -1) rot = -Math.PI/2;
        ctx.rotate(rot);

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, cs*0.4, state.player.mouthAngle, Math.PI*2 - state.player.mouthAngle);
        ctx.lineTo(0,0);
        ctx.fill();
        ctx.restore();

        // Draw Ghosts
        state.ghosts.forEach(g => {
            const gx = g.x * cs + cs/2;
            const gy = g.y * cs + cs/2;
            
            ctx.fillStyle = state.powerMode > 0 ? (state.frameCount%10<5 ? '#1d4ed8' : '#ffffff') : g.color;
            ctx.beginPath();
            ctx.arc(gx, gy, cs*0.4, Math.PI, 0);
            ctx.lineTo(gx + cs*0.4, gy + cs*0.4);
            ctx.lineTo(gx - cs*0.4, gy + cs*0.4);
            ctx.fill();
            
            // Eyes
            if (state.powerMode === 0) {
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(gx - 3, gy - 2, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(gx + 3, gy - 2, 2, 0, Math.PI*2); ctx.fill();
            }
        });

        state.frameCount++;
        requestRef.current = requestAnimationFrame(animate);
    };

    const startGame = () => {
        SoundManager.init();
        if (audioEnabled) SoundManager.startMusic();
        
        setGameState('playing');
        setScore(0);
        setTimeLeft(60);
        timeLeftRef.current = 60;
        setGameOverReason(null);
        setDifficultyLevel(1);
        
        initMaze();
        gameData.current.active = true;
        gameData.current.score = 0;
        gameData.current.player = { x: 7, y: 11, dx: 0, dy: 0, nextDx: 0, nextDy: 0, radius: 0.4, mouthAngle: 0, mouthDir: 1 };
        gameData.current.ghosts = [
            { x: 6, y: 7, dx: 1, dy: 0, color: '#ef4444', wait: 0 },
            { x: 7, y: 7, dx: -1, dy: 0, color: '#3b82f6', wait: 30 },
            { x: 8, y: 7, dx: 0, dy: -1, color: '#f97316', wait: 60 }
        ];
        gameData.current.powerMode = 0;
        gameData.current.frameCount = 0;
        gameData.current.moveEvery = 8;
        gameData.current.powerSteps = 24;
        
        requestRef.current = requestAnimationFrame(animate);
    };

    const endGame = (reason) => {
        gameData.current.active = false;
        cancelAnimationFrame(requestRef.current);
        setGameState('gameover');
        setGameOverReason(reason || null);
        SoundManager.stopMusic();
        if (audioEnabled) SoundManager.playGameOver();
        onGameOver(gameData.current.score);
    };

    // Timer
    useEffect(() => {
        timeLeftRef.current = timeLeft;
        const elapsed = 60 - Number(timeLeft || 0);
        let lvl = 1 + Math.floor(elapsed / 10);
        lvl = Math.max(1, Math.min(6, lvl));
        setDifficultyLevel(lvl);
        gameData.current.level = lvl;
        gameData.current.moveEvery = Math.max(6, 11 - lvl);
        gameData.current.powerSteps = Math.max(10, 26 - lvl * 2);

        let interval;
        if (gameState === 'playing' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endGame('time');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, timeLeft]);

    // Keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState !== 'playing') return;
            const p = gameData.current.player;
            if (e.key === 'ArrowUp' || e.key === 'w') { p.nextDx = 0; p.nextDy = -1; e.preventDefault(); }
            if (e.key === 'ArrowDown' || e.key === 's') { p.nextDx = 0; p.nextDy = 1; e.preventDefault(); }
            if (e.key === 'ArrowLeft' || e.key === 'a') { p.nextDx = -1; p.nextDy = 0; e.preventDefault(); }
            if (e.key === 'ArrowRight' || e.key === 'd') { p.nextDx = 1; p.nextDy = 0; e.preventDefault(); }
        };
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    // Swipe / Touch Controls
    const handleTouchStart = (e) => {
        if (gameState !== 'playing') return;
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleTouchMove = (e) => {
        if (gameState !== 'playing' || !touchStartRef.current) return;
        e.preventDefault(); // Prevent scrolling
        
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        
        // Require minimum swipe distance
        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            const p = gameData.current.player;
            if (Math.abs(dx) > Math.abs(dy)) {
                p.nextDx = dx > 0 ? 1 : -1;
                p.nextDy = 0;
            } else {
                p.nextDx = 0;
                p.nextDy = dy > 0 ? 1 : -1;
            }
            touchStartRef.current = { x: touch.clientX, y: touch.clientY }; // Reset start for continuous swipe
        }
    };

    const handleTouchEnd = () => {
        touchStartRef.current = null;
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" />
            
            <div className="relative w-full max-w-md bg-[#111111] border border-purple-500 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.3)] flex flex-col">
                
                {/* HUD */}
                <div className="flex justify-between items-center p-4 bg-black/50 border-b border-purple-900/50">
                    <div className="bg-black/50 px-3 py-1 rounded-full border border-green-500 text-green-400 font-mono font-bold flex items-center gap-2 text-xs">
                        <Clock size={14}/> {timeLeft}s
                    </div>

                    <div className="bg-black/50 px-3 py-1 rounded-full border border-purple-700 text-purple-300 font-mono font-bold text-xs">
                        {t('arcade.level')} {difficultyLevel}
                    </div>
                    
                    <button onClick={toggleAudio} className="bg-black/50 p-2 rounded-full border border-purple-500 text-purple-400">
                        {audioEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                    </button>
                    
                    <div className="bg-black/50 px-4 py-1 rounded-full border border-yellow-500 text-yellow-400 font-mono font-bold flex items-center gap-2 text-sm">
                        <Trophy size={14}/> {score}/500{score >= 500 ? ` • ${t('arcade.maxReward')}` : ''}
                    </div>
                </div>

                {/* GAME CANVAS */}
                <div 
                    className="relative w-full aspect-square bg-[#0a0a0a] flex-1 touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
                    
                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-center p-6">
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500 mb-2 font-mono uppercase">{t('arcade.pacTitle')}</h2>
                            <p className="text-gray-300 mb-6 text-xs max-w-[250px] whitespace-pre-line">
                                {t('arcade.pacHowTo')}
                            </p>
                            <Button onClick={startGame} className="animate-pulse bg-purple-600 hover:bg-purple-500 text-white">{t('arcade.pacStart')}</Button>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm text-center p-6 animate-fadeIn">
                            <h2 className="text-3xl font-bold text-red-500 mb-2 font-mono">{t('arcade.gameOver')}</h2>
                            <div className="flex flex-col gap-2 mb-6">
                                <span className="text-gray-400 text-sm">{t('arcade.finalScore')}: <b className="text-white">{score}</b></span>
                                <span className="text-gray-500 text-xs">
                                    {t('arcade.endedBy')}: <b className="text-gray-200">
                                        {gameOverReason === 'time' ? t('arcade.endedByTime') : gameOverReason === 'virus' ? t('arcade.endedByVirus') : gameOverReason === 'max' ? t('arcade.endedByMax') : t('arcade.endedByUnknown')}
                                    </b>
                                </span>
                                <span className="text-green-400 text-xl font-bold border border-green-500 px-4 py-2 rounded bg-green-900/20">
                                    +{(score / 100).toFixed(2)} MPH
                                </span>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-[200px]">
                                <Button onClick={startGame} variant="outline" className="w-full">{t('arcade.playAgain')}</Button>
                                <Button onClick={() => onExit(score)} variant="secondary" className="w-full">{t('arcade.exitAndSave')}</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-gray-500 text-xs mt-4 animate-pulse text-center whitespace-pre-line">
                {t('arcade.pacControls')}
            </p>
        </div>
    );
};
