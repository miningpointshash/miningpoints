// --- AUDIO ENGINE (HYBRID: WEB AUDIO API + FILES) ---
export const SoundManager = {
    ctx: null,
    musicOscillators: [],
    isPlayingMusic: false,
    musicTimeout: null,
    
    // Cache de Áudio
    audioCache: {},
    
    // Links de Fallback (Online) ou Locais
    // NOTA: Se o arquivo local falhar, tentará o sintético.
    assets: {
        bgm: '/assets/sounds/bgm.mp3', // Música de fundo
        victory: '/assets/sounds/victory.mp3', // Vitória
        defeat: '/assets/sounds/defeat.mp3', // Derrota
        punch: '/assets/sounds/punch.mp3', // Soco
        click: '/assets/sounds/click.mp3', // Clique
    },

    init: () => {
        if (!SoundManager.ctx) {
            SoundManager.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (SoundManager.ctx.state === 'suspended') {
            SoundManager.ctx.resume().catch(console.warn);
        }
    },

    // --- SINTETIZADOR (FALLBACK ROBUSTO) ---
    playTone: (freq, type, duration, vol = 0.1, timeOffset = 0) => {
        try {
            SoundManager.init();
            if (!SoundManager.ctx) return;
            const osc = SoundManager.ctx.createOscillator();
            const gain = SoundManager.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, SoundManager.ctx.currentTime + timeOffset);
            gain.gain.setValueAtTime(vol, SoundManager.ctx.currentTime + timeOffset);
            gain.gain.exponentialRampToValueAtTime(0.01, SoundManager.ctx.currentTime + timeOffset + duration);
            osc.connect(gain);
            gain.connect(SoundManager.ctx.destination);
            osc.start(SoundManager.ctx.currentTime + timeOffset);
            osc.stop(SoundManager.ctx.currentTime + timeOffset + duration);
        } catch (e) { console.error("Audio error", e); }
    },

    playJump: () => {
        SoundManager.playTone(150, 'square', 0.1, 0.05);
        setTimeout(() => SoundManager.playTone(300, 'square', 0.1, 0.05), 50);
    },

    playCoin: () => {
        SoundManager.playTone(1200, 'sine', 0.1, 0.05);
        setTimeout(() => SoundManager.playTone(1800, 'sine', 0.1, 0.05), 50);
    },

    playGameOver: () => {
        SoundManager.playSfx('defeat');
    },

    // Sintetizador de Derrota (Game Over)
    playSynthGameOver: () => {
        SoundManager.playTone(300, 'sawtooth', 0.3, 0.2, 0);
        SoundManager.playTone(250, 'sawtooth', 0.3, 0.2, 0.25);
        SoundManager.playTone(200, 'sawtooth', 0.3, 0.2, 0.5);
        SoundManager.playTone(150, 'sawtooth', 0.8, 0.2, 0.75); // Nota final longa e grave
    },

    // Sintetizador de Vitória (Fanfarra)
    playSynthVictory: () => {
        const now = 0;
        const vol = 0.15;
        // Triade Maior rápida
        SoundManager.playTone(523.25, 'square', 0.1, vol, 0);    // C5
        SoundManager.playTone(523.25, 'square', 0.1, vol, 0.15); // C5
        SoundManager.playTone(523.25, 'square', 0.1, vol, 0.30); // C5
        SoundManager.playTone(659.25, 'square', 0.6, vol, 0.45); // E5 (Longa)
        SoundManager.playTone(523.25, 'square', 0.2, vol, 0.90); // C5
        SoundManager.playTone(659.25, 'square', 0.8, vol, 1.10); // E5 (Final)
    },

    // Sintetizador de Soco (Ruído Branco filtrado ou Onda Quadrada baixa)
    playSynthPunch: () => {
        SoundManager.playTone(100, 'sawtooth', 0.1, 0.3); // Impacto grave
        SoundManager.playTone(50, 'square', 0.15, 0.3);   // Corpo do impacto
    },

    // Sintetizador de Música (Bassline)
    playSynthMusic: () => {
        if (!SoundManager.isPlayingMusic) return;
        
        // Bassline Cyberpunk
        const bassFreqs = [55, 55, 65, 55, 82, 73, 55, 49]; // A1 scale
        let noteIndex = 0;

        const playNote = () => {
            if (!SoundManager.isPlayingMusic) return;
            const osc = SoundManager.ctx.createOscillator();
            const gain = SoundManager.ctx.createGain();
            osc.type = 'sawtooth'; 
            osc.frequency.setValueAtTime(bassFreqs[noteIndex], SoundManager.ctx.currentTime);
            
            // Envelope percussivo para baixo
            gain.gain.setValueAtTime(0.05, SoundManager.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, SoundManager.ctx.currentTime + 0.15);
            
            // Filtro Lowpass para deixar mais "abafado"
            const filter = SoundManager.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(SoundManager.ctx.destination);
            
            osc.start();
            osc.stop(SoundManager.ctx.currentTime + 0.2);

            noteIndex = (noteIndex + 1) % bassFreqs.length;
            SoundManager.musicTimeout = setTimeout(playNote, 250); // 120 BPM
        };
        playNote();
    },

    // --- FUNÇÕES PÚBLICAS UNIFICADAS ---

    // Toca SFX (Tenta arquivo, se falhar, vai pro sintético)
    playSfx: (type) => {
        SoundManager.init();

        // 1. Tenta carregar do cache
        let audio = SoundManager.audioCache[type];

        if (!audio) {
            // Cria novo Audio
            const src = SoundManager.assets[type];
            if (!src) return; // Se não tem asset definido, ignora

            audio = new Audio(src);
            SoundManager.audioCache[type] = audio;

            // Se der erro no carregamento, marca como quebrado e usa sintético
            audio.onerror = () => {
                console.warn(`SoundManager: Failed to load ${type} (${src}). Using synth fallback.`);
                audio.isBroken = true;
                SoundManager._playSynthFallback(type);
            };
        }

        if (audio.isBroken) {
            SoundManager._playSynthFallback(type);
            return;
        }

        // Tenta tocar arquivo
        audio.currentTime = 0;
        audio.volume = (type === 'bgm' ? 0.3 : 0.5);
        audio.play().catch(e => {
            // Se erro for de interação (autoplay), não podemos fazer nada.
            // Se for erro de arquivo (404), vai cair no onerror acima na próxima ou agora.
            console.warn(`SoundManager: Play error for ${type}`, e);
            SoundManager._playSynthFallback(type);
        });
    },

    _playSynthFallback: (type) => {
        switch(type) {
            case 'victory': SoundManager.playSynthVictory(); break;
            case 'defeat': SoundManager.playSynthGameOver(); break;
            case 'punch': SoundManager.playSynthPunch(); break;
            case 'click': SoundManager.playTone(800, 'sine', 0.05, 0.1); break;
            case 'bgm': SoundManager.playSynthMusic(); break; // Para BGM é diferente (loop)
            default: break;
        }
    },

    // Música é especial (Loop)
    startMusic: () => {
        if (SoundManager.isPlayingMusic) return;
        SoundManager.init();
        SoundManager.isPlayingMusic = true;

        const type = 'bgm';
        let audio = SoundManager.audioCache[type];

        if (!audio) {
            const src = SoundManager.assets[type];
            audio = new Audio(src);
            audio.loop = true;
            audio.volume = 0.5;
            SoundManager.audioCache[type] = audio;

            audio.onerror = () => {
                console.warn(`SoundManager: BGM load failed. Using synth.`);
                audio.isBroken = true;
                SoundManager.playSynthMusic();
            };
        }

        if (audio.isBroken) {
            SoundManager.playSynthMusic();
            return;
        }

        audio.play().catch(e => {
            console.warn("SoundManager: BGM play failed, fallback to synth", e);
            SoundManager.playSynthMusic();
        });
    },

    stopMusic: () => {
        SoundManager.isPlayingMusic = false;
        
        // Para Sintético
        if (SoundManager.musicTimeout) clearTimeout(SoundManager.musicTimeout);

        // Para Arquivo
        const audio = SoundManager.audioCache['bgm'];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }
};
