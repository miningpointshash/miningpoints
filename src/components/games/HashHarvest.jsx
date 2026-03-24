import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Cpu, Zap, Battery, Shield, Trophy, Timer } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SoundManager } from '../../utils/soundManager';
import { supabase } from '../../lib/supabase';

const GRID_SIZE = 6;
const GAME_DURATION = 60; // segundos

// Itens com pontuação
const ITEMS = [
    { id: 'cpu', icon: Cpu, color: 'text-blue-400', points: 10 },
    { id: 'gpu', icon: Zap, color: 'text-yellow-400', points: 20 },
    { id: 'battery', icon: Battery, color: 'text-green-400', points: 5 },
    { id: 'shield', icon: Shield, color: 'text-purple-400', points: 15 }
];

const ITEM_BY_ID = ITEMS.reduce((acc, it) => {
    acc[it.id] = it;
    return acc;
}, {});

export const HashHarvestGame = React.memo(({ onGameOver, betAmount, playerChar, botChar = 'mp_p2', botName, isMuted = false, difficulty = 'medium', roomId, selfId, creatorId, challengerId, creatorAvatar, challengerAvatar, creatorName, challengerName }) => {
    const [gameState, setGameState] = useState('playing'); 
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [score, setScore] = useState({ player: 0, bot: 0 });
    const [grid, setGrid] = useState([]);
    
    // Hit effects
    const [hitTarget, setHitTarget] = useState(null); // 'player' or 'bot'
    
    // Refs para estado mutável acessível no loop sem re-renderizar/reiniciar efeitos
    const gameStateRef = useRef('playing');
    const playerPosRef = useRef({ x: 0, y: 0 });
    const botPosRef = useRef({ x: GRID_SIZE - 1, y: GRID_SIZE - 1 });
    const gridRef = useRef([]);
    const isMultiplayer = Boolean(roomId && selfId && creatorId && challengerId);
    const reportedRef = useRef(false);
    const remoteStateRef = useRef(null);

    // Configuração de IA baseada na dificuldade
    const aiConfig = useRef({
        moveSpeed: 800, // ms
        searchRadius: 2,
        errorRate: 0.2, // 20% de chance de movimento aleatório
        predictive: false
    });

    useEffect(() => {
        if (isMultiplayer) return;
        switch(difficulty) {
            case 'extreme_hard':
                // Nível Ultra: mais rápido que extreme e com perseguição agressiva
                aiConfig.current = { moveSpeed: 200, searchRadius: GRID_SIZE, errorRate: 0, predictive: true };
                break;
            case 'extreme':
                // Nível Deus: Muito rápido, busca total, zero erro, prioriza roubar itens
                aiConfig.current = { moveSpeed: 300, searchRadius: GRID_SIZE, errorRate: 0, predictive: true };
                break;
            default: // hard
                // Mais agressivo: raio de busca total, quase sem erros, rápido
                aiConfig.current = { moveSpeed: 450, searchRadius: GRID_SIZE, errorRate: 0.02, predictive: true };
        }
    }, [difficulty]);

    // Estados visuais para renderização (sincronizados com refs)
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [playerFlip, setPlayerFlip] = useState(false); // false = direita (padrão), true = esquerda
    const [botPos, setBotPos] = useState({ x: GRID_SIZE - 1, y: GRID_SIZE - 1 });
    const [botFlip, setBotFlip] = useState(true); // bot começa na direita olhando pra esquerda

    const playPunchSound = () => {
        if (isMuted) return;
        SoundManager.playSfx('punch');
    };

    const triggerHitEffect = (target) => {
        setHitTarget(target);
        setTimeout(() => setHitTarget(null), 300);
    };

    const applyRemoteSnapshot = (state) => {
        if (!state || typeof state !== 'object') return;
        remoteStateRef.current = state;

        const positions = state.positions || {};
        const scores = state.scores || {};
        const flips = state.flips || {};

        const challengerPos = positions.challenger || {};
        const creatorPos = positions.creator || {};

        const cPos = { x: Number(challengerPos.x || 0), y: Number(challengerPos.y || 0) };
        const rPos = { x: Number(creatorPos.x || (GRID_SIZE - 1)), y: Number(creatorPos.y || (GRID_SIZE - 1)) };

        playerPosRef.current = cPos;
        botPosRef.current = rPos;
        setPlayerPos(cPos);
        setBotPos(rPos);

        setPlayerFlip(Boolean(flips.challenger));
        setBotFlip(Boolean(flips.creator));

        setScore({
            player: Number(scores.challenger || 0),
            bot: Number(scores.creator || 0)
        });

        const rawGrid = state.grid;
        const renderGrid = Array.isArray(rawGrid)
            ? rawGrid.map((row) => Array.isArray(row)
                ? row.map((cell) => {
                    if (!cell || typeof cell !== 'object') return null;
                    const def = ITEM_BY_ID[cell.id];
                    if (!def) return null;
                    return { ...def, uid: cell.uid || `${cell.id}-${Math.random()}` };
                })
                : Array(GRID_SIZE).fill(null))
            : Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

        setGrid(renderGrid);
        gridRef.current = renderGrid;

        if (state.status === 'finished') {
            gameStateRef.current = 'finished';
            setGameState('finished');
        } else {
            gameStateRef.current = 'playing';
            setGameState('playing');
        }

        const ev = state.last_event || null;
        if (ev?.type === 'hit' && ev?.by) {
            const target = ev.by === 'creator' ? 'player' : 'bot';
            triggerHitEffect(target);
        }
    };

    const checkCollection = (x, y, who) => {
        const currentGrid = gridRef.current;
        if (currentGrid[y] && currentGrid[y][x]) {
            const item = currentGrid[y][x];
            setScore(s => ({ ...s, [who]: s[who] + item.points }));
            
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = null;
            gridRef.current = newGrid;
            setGrid(newGrid);
        }
    };

    // Inicializa Grid e Estado
    useEffect(() => {
        if (isMultiplayer) return;
        const initialGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        // Force spawn 8 items initially to ensure grid is not empty
        for(let i=0; i<8; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 20) {
                const x = Math.floor(Math.random() * GRID_SIZE);
                const y = Math.floor(Math.random() * GRID_SIZE);
                if (!initialGrid[y][x]) {
                    const itemType = ITEMS[Math.floor(Math.random() * ITEMS.length)];
                    initialGrid[y][x] = { ...itemType, uid: Date.now() + Math.random() + i };
                    placed = true;
                }
                attempts++;
            }
        }
        
        setGrid(initialGrid);
        gridRef.current = initialGrid;
        gameStateRef.current = 'playing';

        // START GAME LOOP only after initialization
        const loop = setInterval(() => {
            if (gameStateRef.current !== 'playing') return;

            // 1. Timer
            setTimeLeft(prev => {
                if (prev <= 1) {
                    gameStateRef.current = 'finished';
                    setGameState('finished');
                    return 0;
                }
                return prev - 1;
            });

        }, 1000);

        const botLoop = setInterval(() => {
            if (gameStateRef.current !== 'playing') return;
            moveBot();
        }, aiConfig.current.moveSpeed);

        const spawnLoop = setInterval(() => {
            if (gameStateRef.current !== 'playing') return;
            // Safety check: ensure gridRef.current is valid array
            if (!gridRef.current || !gridRef.current.length) return;

            const newGrid = gridRef.current.map(row => [...row]);
            spawnItem(newGrid);
            setGrid(newGrid);
            gridRef.current = newGrid;
        }, 2000);

        return () => {
            clearInterval(loop);
            clearInterval(botLoop);
            clearInterval(spawnLoop);
        };
    }, []);

    // Remove separate loops from previous implementation to avoid race conditions
    // ...

    // End Game Check
    useEffect(() => {
        if (gameState === 'finished') {
            setTimeout(() => {
                onGameOver(score);
            }, 1500);
        }
    }, [gameState]);

    useEffect(() => {
        if (!isMultiplayer) return;
        reportedRef.current = false;
        gameStateRef.current = 'playing';
        setGameState('playing');
        setGrid([]);
        setScore({ player: 0, bot: 0 });
        setHitTarget(null);

        let alive = true;

        const fetchState = async () => {
            const { data: row } = await supabase
                .from('pvp_room_game_states')
                .select('state')
                .eq('room_id', roomId)
                .maybeSingle();
            if (!alive) return;
            if (row?.state) applyRemoteSnapshot(row.state);
        };

        const init = async () => {
            try {
                const { data } = await supabase.rpc('init_hash_harvest_room', { p_room_id: roomId });
                if (!alive) return;
                if (data?.state) applyRemoteSnapshot(data.state);
                await fetchState();
            } catch {}
        };

        init();

        const channel = supabase
            .channel(`pvp_room_hash_${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'pvp_room_game_states', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const next = payload?.new?.state;
                    if (next) applyRemoteSnapshot(next);
                }
            )
            .subscribe();

        const poll = setInterval(fetchState, 800);

        const timer = setInterval(() => {
            const st = remoteStateRef.current;
            if (!st) return;
            const start = st.start_at ? new Date(st.start_at).getTime() : null;
            const dur = Number(st.duration || GAME_DURATION);
            if (!start) return;
            const elapsed = Math.floor((Date.now() - start) / 1000);
            const left = Math.max(0, dur - elapsed);
            setTimeLeft(left);
            if (left === 0 && gameStateRef.current === 'playing') {
                gameStateRef.current = 'finished';
                setGameState('finished');
            }
        }, 250);

        return () => {
            alive = false;
            try { clearInterval(poll); } catch {}
            try { clearInterval(timer); } catch {}
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [isMultiplayer, roomId]);

    useEffect(() => {
        if (!isMultiplayer) return;
        if (gameState !== 'finished') return;
        if (reportedRef.current) return;
        const st = remoteStateRef.current;
        if (!st?.scores) return;
        reportedRef.current = true;

        const myScore = selfId === creatorId ? Number(st.scores.creator || 0) : Number(st.scores.challenger || 0);
        const otherScore = selfId === creatorId ? Number(st.scores.challenger || 0) : Number(st.scores.creator || 0);
        onGameOver({ player: myScore, bot: otherScore });
    }, [isMultiplayer, gameState, selfId, creatorId, challengerId, onGameOver]);

    const spawnItem = (currentGrid) => {
        if (!currentGrid) return;
        let attempts = 0;
        while (attempts < 10) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);
            
            const pPos = playerPosRef.current;
            const bPos = botPosRef.current;

            // Safe access check
            if (currentGrid[y] && !currentGrid[y][x] && !(x === pPos.x && y === pPos.y) && !(x === bPos.x && y === bPos.y)) {
                const itemType = ITEMS[Math.floor(Math.random() * ITEMS.length)];
                currentGrid[y][x] = { ...itemType, uid: Date.now() + Math.random() };
                break;
            }
            attempts++;
        }
    };

    const moveBot = () => {
        const currentBotPos = botPosRef.current;
        const currentGrid = gridRef.current;
        const playerPos = playerPosRef.current;
        
        let target = null;
        let maxScore = -Infinity; // Mudança para pontuação absoluta
        
        // IA Aprimorada: Escaneia TODO o grid (dependendo da dificuldade)
        const radius = aiConfig.current.searchRadius;

        // IA: 1. Chance de erro (Movimento aleatório)
        if (Math.random() < aiConfig.current.errorRate) {
            const moves = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
            const move = moves[Math.floor(Math.random() * moves.length)];
            const nextX = Math.max(0, Math.min(GRID_SIZE-1, currentBotPos.x + move.x));
            const nextY = Math.max(0, Math.min(GRID_SIZE-1, currentBotPos.y + move.y));
            executeBotMove(nextX, nextY);
            return;
        }

        // IA: 2. Busca o MELHOR alvo
        for(let y = 0; y < GRID_SIZE; y++) {
            for(let x = 0; x < GRID_SIZE; x++) {
                // Filtro de Raio de Visão
                if (Math.abs(x - currentBotPos.x) > radius || Math.abs(y - currentBotPos.y) > radius) continue;

                if (currentGrid[y] && currentGrid[y][x]) {
                    const item = currentGrid[y][x];
                    let score = item.points; 
                    
                    const dist = Math.abs(x - currentBotPos.x) + Math.abs(y - currentBotPos.y);
                    
                    // IA Competitiva: 
                    // - Prioriza itens de alto valor
                    // - Desvaloriza itens muito longe
                    // - Prioriza itens perto do jogador (para roubar)
                    
                    let utility = score / (dist + 0.5); // +0.5 para evitar divisão por zero

                    if (aiConfig.current.predictive) {
                        // Se item é valioso (GPU/Shield), aumenta muito o peso
                        if (item.id === 'gpu' || item.id === 'shield') utility *= 2.5;

                        // Se item está perto do jogador, tenta pegar antes dele (Roubo)
                        const distToPlayer = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
                        if (distToPlayer <= 2) utility *= 1.5;
                    }

                    if (utility > maxScore) {
                        maxScore = utility;
                        target = { x, y };
                    }
                }
            }
        }
        
        // IA Agressiva (PvP): Se não tem itens bons, caça o jogador para atrapalhar
        if (!target && aiConfig.current.predictive) {
             const distToPlayer = Math.abs(playerPos.x - currentBotPos.x) + Math.abs(playerPos.y - currentBotPos.y);
             // Só persegue se estiver relativamente perto
             if (distToPlayer <= 3) {
                 target = playerPos; 
             }
        }

        let nextX = currentBotPos.x;
        let nextY = currentBotPos.y;

        if (target) {
            // Pathfinding Simples (Greedy)
            // Tenta reduzir a maior diferença primeiro
            const dx = target.x - currentBotPos.x;
            const dy = target.y - currentBotPos.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Move horizontalmente
                if (dx > 0) { nextX++; setBotFlip(false); } else { nextX--; setBotFlip(true); }
            } else {
                // Move verticalmente
                if (dy > 0) nextY++; else nextY--;
            }
        } else {
            // Roam (Patrulha em direção ao centro se estiver perdido)
            const centerX = GRID_SIZE / 2;
            const centerY = GRID_SIZE / 2;
            if (currentBotPos.x < centerX) nextX++; else nextX--;
            if (Math.random() > 0.5) { // Adiciona variação
                 if (currentBotPos.y < centerY) nextY++; else nextY--;
            }
            
            // Clamp
            nextX = Math.max(0, Math.min(GRID_SIZE-1, nextX));
            nextY = Math.max(0, Math.min(GRID_SIZE-1, nextY));
        }
        
        executeBotMove(nextX, nextY);
    };

    const executeBotMove = (nextX, nextY) => {
        const currentBotPos = botPosRef.current;
        const playerPos = playerPosRef.current;
        
        // COLLISION WITH PLAYER
        if (nextX === playerPos.x && nextY === playerPos.y) {
            playPunchSound();
            triggerHitEffect('player');
            
            const dx = nextX - currentBotPos.x;
            const dy = nextY - currentBotPos.y;
            const knockbackX = playerPos.x + dx;
            const knockbackY = playerPos.y + dy;
            
            // Push Player if valid
            if (knockbackX >= 0 && knockbackX < GRID_SIZE && knockbackY >= 0 && knockbackY < GRID_SIZE) {
                // Move Player
                playerPosRef.current = { x: knockbackX, y: knockbackY };
                setPlayerPos({ x: knockbackX, y: knockbackY });
                checkCollection(knockbackX, knockbackY, 'player'); // Player collects item if pushed into it

                // Move Bot
                botPosRef.current = { x: nextX, y: nextY };
                setBotPos({ x: nextX, y: nextY });
                checkCollection(nextX, nextY, 'bot');
            } else {
                // Blocked by wall - Bot stays, Player gets hit but doesn't move
            }
        } else {
            // Normal Move
            botPosRef.current = { x: nextX, y: nextY };
            setBotPos({ x: nextX, y: nextY });
            checkCollection(nextX, nextY, 'bot');
        }
    };

    const handlePlayerMove = (dx, dy) => {
        if (isMultiplayer) {
            if (gameStateRef.current !== 'playing') return;
            if (timeLeft <= 0) return;
            supabase
                .rpc('move_hash_harvest_room', { p_room_id: roomId, p_dx: dx, p_dy: dy })
                .then(({ data }) => {
                    const next = data?.state;
                    if (next) applyRemoteSnapshot(next);
                });
            return;
        }

        if (gameStateRef.current !== 'playing') return;
        
        const currentPos = playerPosRef.current;
        const targetX = currentPos.x + dx;
        const targetY = currentPos.y + dy;
        
        // Bounds Check
        if (targetX < 0 || targetX >= GRID_SIZE || targetY < 0 || targetY >= GRID_SIZE) return;
        
        // Atualiza direção do sprite
        if (dx > 0) setPlayerFlip(false);
        if (dx < 0) setPlayerFlip(true);

        // COLLISION WITH BOT
        const botPos = botPosRef.current;
        if (targetX === botPos.x && targetY === botPos.y) {
            playPunchSound();
            triggerHitEffect('bot');
            
            const knockbackX = botPos.x + dx;
            const knockbackY = botPos.y + dy;
            
            // Push Bot if valid
            if (knockbackX >= 0 && knockbackX < GRID_SIZE && knockbackY >= 0 && knockbackY < GRID_SIZE) {
                // Move Bot
                botPosRef.current = { x: knockbackX, y: knockbackY };
                setBotPos({ x: knockbackX, y: knockbackY });
                checkCollection(knockbackX, knockbackY, 'bot'); // Bot collects item if pushed into it

                // Move Player
                playerPosRef.current = { x: targetX, y: targetY };
                setPlayerPos({ x: targetX, y: targetY });
                checkCollection(targetX, targetY, 'player');
            } else {
                // Blocked by wall
                // Player stays, Bot gets hit but doesn't move
            }
            return;
        }

        // Normal Move
        playerPosRef.current = { x: targetX, y: targetY };
        setPlayerPos({ x: targetX, y: targetY });
        checkCollection(targetX, targetY, 'player');
    };

    // Cálculos de posição CSS para movimento suave
    const getPosStyle = (pos) => ({
        left: `${(pos.x / GRID_SIZE) * 100}%`,
        top: `${(pos.y / GRID_SIZE) * 100}%`,
        width: `${100 / GRID_SIZE}%`,
        height: `${100 / GRID_SIZE}%`,
    });

    // Adiciona controles de teclado
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameStateRef.current !== 'playing') return;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    handlePlayerMove(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    handlePlayerMove(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    handlePlayerMove(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    handlePlayerMove(1, 0);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const leftName = isMultiplayer ? (challengerName || 'Desafiante') : 'VOCÊ';
    const rightName = isMultiplayer ? (creatorName || 'Criador') : String(botName || 'RIVAL');
    const leftAvatar = isMultiplayer ? (challengerAvatar || playerChar) : playerChar;
    const rightAvatar = isMultiplayer ? (creatorAvatar || botChar) : botChar;
    const leftScore = isMultiplayer ? score.player : score.player;
    const rightScore = isMultiplayer ? score.bot : score.bot;
    const leftIsYou = isMultiplayer ? selfId === challengerId : true;
    const rightIsYou = isMultiplayer ? selfId === creatorId : false;

    return (
        <div className="flex flex-col items-center justify-between h-full w-full max-w-md mx-auto relative">
            
            {/* HUD */}
            <div className="w-full flex justify-between items-center mb-4 px-2">
                <Card className="p-2 w-24 text-center border-green-500 bg-green-900/20">
                    <p className="text-[10px] text-green-400 font-bold uppercase">{leftIsYou ? 'VOCÊ' : leftName}</p>
                    <p className="text-xl font-black text-white">{leftScore}</p>
                </Card>

                <div className="flex flex-col items-center">
                    <div className="bg-gray-800 px-4 py-1 rounded-full border border-purple-500 flex items-center gap-2 mb-1">
                        <Timer size={14} className="text-purple-400" />
                        <span className="text-xl font-mono font-bold text-white">{timeLeft}s</span>
                    </div>
                    <span className="text-[10px] text-gray-500">APOSTA: {betAmount} MPH</span>
                </div>

                <Card className="p-2 w-24 text-center border-red-500 bg-red-900/20">
                    <p className="text-[10px] text-red-400 font-bold uppercase">{rightIsYou ? 'VOCÊ' : rightName}</p>
                    <p className="text-xl font-black text-white">{rightScore}</p>
                </Card>
            </div>

            {/* AREA DO JOGO */}
            <div className="w-full aspect-square relative bg-gray-900 border-2 border-gray-700 rounded-lg overflow-hidden">
                
                {/* GRID (Fundo e Itens) */}
                <div 
                    className="absolute inset-0"
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, 
                        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                    }}
                >
                    {grid && grid.length > 0 && grid.map((row, y) => (
                        row.map((item, x) => (
                            <div key={`${x}-${y}`} className="border border-gray-800/30 flex items-center justify-center">
                                {item && item.icon && (
                                    <item.icon size={24} className={`${item.color} animate-pulse drop-shadow-lg`} />
                                )}
                            </div>
                        ))
                    ))}
                </div>

                {/* JOGADORES (Camada Superior - Movimento Suave) */}
                
                {/* Player */}
                <div 
                    className="absolute transition-all duration-200 ease-out flex items-center justify-center z-10"
                    style={getPosStyle(playerPos)}
                >
                    <img 
                        src={`/assets/persona/${leftAvatar}.svg`} 
                        alt="P1" 
                        className={`w-4/5 h-4/5 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] transition-transform duration-200 ${playerFlip ? '-scale-x-100' : 'scale-x-100'} ${hitTarget === 'player' ? 'brightness-200 saturate-200 animate-pulse' : ''}`} 
                    />
                    {hitTarget === 'player' && (
                        <span className="absolute -top-6 text-yellow-400 font-black text-2xl animate-bounce drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-50">POW!</span>
                    )}
                </div>

                {/* Bot */}
                <div 
                    className="absolute transition-all duration-200 ease-out flex items-center justify-center z-10"
                    style={getPosStyle(botPos)}
                >
                    <img 
                        src={`/assets/persona/${rightAvatar}.svg`} 
                        alt="Bot" 
                        className={`w-4/5 h-4/5 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] ${isMultiplayer ? '' : 'grayscale'} transition-transform duration-200 ${botFlip ? '-scale-x-100' : 'scale-x-100'} ${hitTarget === 'bot' ? 'brightness-200 saturate-200 animate-pulse' : ''}`} 
                    />
                    {hitTarget === 'bot' && (
                        <span className="absolute -top-6 text-red-500 font-black text-2xl animate-bounce drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-50">SMASH!</span>
                    )}
                </div>

                {/* Tela de Fim de Jogo */}
                {gameState === 'finished' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                        <Trophy size={48} className="text-yellow-400 mb-4 animate-bounce" />
                        <h2 className="text-2xl font-bold text-white mb-2">FIM DE JOGO!</h2>
                        <p className="text-gray-300 mb-4">Calculando resultados...</p>
                    </div>
                )}
            </div>

            {/* CONTROLES */}
            <div className="grid grid-cols-3 gap-2 mt-4 w-full max-w-[200px]">
                <div></div>
                <Button onClick={() => handlePlayerMove(0, -1)} className="h-14 flex items-center justify-center bg-gray-800 active:bg-purple-600 active:scale-95 transition-all"><ArrowUp size={28}/></Button>
                <div></div>
                <Button onClick={() => handlePlayerMove(-1, 0)} className="h-14 flex items-center justify-center bg-gray-800 active:bg-purple-600 active:scale-95 transition-all"><ArrowLeft size={28}/></Button>
                <Button onClick={() => handlePlayerMove(0, 1)} className="h-14 flex items-center justify-center bg-gray-800 active:bg-purple-600 active:scale-95 transition-all"><ArrowDown size={28}/></Button>
                <Button onClick={() => handlePlayerMove(1, 0)} className="h-14 flex items-center justify-center bg-gray-800 active:bg-purple-600 active:scale-95 transition-all"><ArrowRight size={28}/></Button>
            </div>
        </div>
    );
});
