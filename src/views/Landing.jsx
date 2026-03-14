import React, { useContext, useState } from 'react';
import { 
  Globe, Zap, Server, Cpu, Twitter, Instagram, Send, MessageCircle, 
  Wallet, Shield, Gamepad2, Swords, Coins, Heart, Trophy, Users, ArrowRight, ChevronDown
} from 'lucide-react';
import { AvatarCarousel } from '../components/landing/AvatarCarousel';
import { AVAILABLE_LANGUAGES } from '../locales';
import { AppContext } from '../context/AppContext';

export function LandingView({ onNavigate }) {
  const [isLangMenuOpen, setLangMenuOpen] = useState(false);

  const { state, changeLanguage, t } = useContext(AppContext);
  const currentLang = state.user.language || 'pt-BR';
  const activeLang = AVAILABLE_LANGUAGES.find(l => l.code === currentLang) || AVAILABLE_LANGUAGES[2];

  // Array de avatares para o carrossel da galeria
  const avatars = [
    { src: '/assets/persona/mp_p1.svg', name: 'Neon Puncher', role: 'Brawler' },
    { src: '/assets/persona/mp_p2.svg', name: 'Pink Flash', role: 'Speedster' },
    { src: '/assets/persona/mp_p3.svg', name: 'Iron Beard', role: 'Tank' },
    { src: '/assets/persona/mp_p4.svg', name: 'Cyber Cowboy', role: 'Sharpshooter' },
    { src: '/assets/persona/mp_p5.svg', name: 'Mecha Scrapper', role: 'Engineer' },
    { src: '/assets/persona/mp_p6.svg', name: 'Dread Byte', role: 'Specialist' },
  ];

  return (
    <div className="min-h-screen bg-[#07050a] text-white font-sans overflow-x-hidden selection:bg-pink-500/30">
      
      {/* Estilos Globais e Animações */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          transform: perspective(500px) rotateX(60deg);
          transform-origin: bottom;
        }
        
        /* Ocultar barra de rolagem nativa no carrossel para um look mais limpo */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Efeitos de Fundo Ambientais */}
      <div className="fixed bottom-0 left-0 w-full h-1/2 bg-grid-pattern opacity-40 pointer-events-none z-0"></div>
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pink-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[-10%] w-[40%] h-[60%] bg-[#39FF14]/5 blur-[150px] rounded-full pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col min-h-screen">
        
        {/* ================= HEADER ================= */}
        <header className="flex items-center justify-between py-6 sm:py-8">
          <img 
            src="/assets/landing/logo_landing.png" 
            alt="Mining Points" 
            className="h-10 sm:h-12 lg:h-14 w-auto object-contain drop-shadow-lg"
            onError={(e) => { 
              e.target.onerror = null; 
              e.target.src = "https://placehold.co/200x60/transparent/white?text=MINING+POINTS"; 
            }}
          />
          <div className="flex items-center gap-3 sm:gap-8 text-sm sm:text-base font-medium">
            <div className="relative">
                <button 
                    onClick={() => setLangMenuOpen(!isLangMenuOpen)}
                    className="flex items-center gap-1 sm:gap-2 hover:text-pink-400 transition-colors"
                >
                  <Globe size={18} />
                  <span className="hidden sm:inline uppercase">{activeLang.code.split('-')[0]}</span>
                  <ChevronDown size={14} className={`hidden sm:block transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-[#111111] border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                        {AVAILABLE_LANGUAGES.map(lang => (
                            <button 
                                key={lang.code} 
                                onClick={() => { changeLanguage(lang.code); setLangMenuOpen(false); }} 
                                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 border-b border-gray-800 last:border-0 hover:bg-gray-800 ${currentLang === lang.code ? 'text-purple-400 font-bold' : 'text-gray-400'}`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span>{lang.name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <button 
              onClick={() => onNavigate('login')} 
              className="hover:text-[#39FF14] transition-colors"
            >
              {t('landing.header.login')}
            </button>
            <button 
              onClick={() => onNavigate('register')}
              className="bg-gradient-to-r from-[#D91A5A] to-[#E6155E] hover:from-[#E6155E] hover:to-[#ff1a6b] px-4 sm:px-6 py-2 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(230,21,94,0.4)] text-xs sm:text-sm"
            >
              {t('landing.header.register')}
            </button>
          </div>
        </header>

        {/* ================= HERO SECTION ================= */}
        <main className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-8 py-12 lg:py-4">
          <div className="w-full lg:w-1/2 flex flex-col items-start gap-6 lg:gap-8 z-10 text-center lg:text-left">
            
            <div className="inline-flex items-center gap-2 border border-[#39FF14]/30 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium tracking-wide bg-[#39FF14]/10 backdrop-blur-sm self-center lg:self-start text-[#39FF14]">
              <Zap size={16} className="fill-[#39FF14]" />
              {t('landing.hero.badge')}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
              {t('landing.hero.titleLine1')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E7E] to-[#E6155E]">
                {t('landing.hero.titleHighlight')}
              </span>
            </h1>

            <p className="text-gray-300 text-base sm:text-lg max-w-2xl leading-relaxed">
              {t('landing.hero.subtitle1')} <b>MPH</b> {t('landing.hero.subtitle2')}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2">
              <button 
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto bg-gradient-to-r from-[#D91A5A] to-[#E6155E] hover:scale-105 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-transform shadow-[0_0_20px_rgba(230,21,94,0.4)] text-lg"
              >
                <Gamepad2 size={24} />
                {t('landing.hero.cta')}
              </button>
              
              <div className="flex items-center gap-3 text-sm text-gray-400 font-medium px-4 py-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
                <Coins size={20} className="text-yellow-400" />
                <span>{t('landing.hero.rate')}</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex justify-center relative mt-12 lg:mt-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-tr from-pink-600/30 to-yellow-500/20 blur-[100px] rounded-full z-0"></div>
            <img 
              src="/assets/landing/hero_robot.png" 
              alt={t('landing.hero.mascotAlt')}
              className="relative z-10 w-full max-w-[300px] sm:max-w-[400px] lg:max-w-[500px] object-contain animate-float drop-shadow-2xl"
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = "https://placehold.co/500x600/1a1a2e/e6155e?text=Mascote"; 
              }}
            />
          </div>
        </main>

        {/* ================= INFRAESTRUTURA INICIAL ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-12 z-10 relative">
          <div className="bg-[#100c16]/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center hover:bg-[#100c16] hover:border-cyan-500/60 transition-all group">
            <div className="mb-4 text-cyan-400 group-hover:scale-110 transition-transform"><Server size={40} strokeWidth={1.5} /></div>
            <h3 className="text-xl font-bold mb-2">{t('landing.infra.availabilityTitle')}</h3>
            <p className="text-sm text-gray-400">{t('landing.infra.availabilityDesc')}</p>
          </div>
          <div className="bg-[#100c16]/80 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center hover:bg-[#100c16] hover:border-yellow-500/60 transition-all group">
            <div className="mb-4 text-yellow-400 group-hover:scale-110 transition-transform"><Cpu size={40} strokeWidth={1.5} /></div>
            <h3 className="text-xl font-bold mb-2">{t('landing.infra.gpuTitle')}</h3>
            <p className="text-sm text-gray-400">{t('landing.infra.gpuDesc')}</p>
          </div>
          <div className="bg-[#100c16]/80 backdrop-blur-md border border-pink-500/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center hover:bg-[#100c16] hover:border-pink-500/60 transition-all group sm:col-span-2 lg:col-span-1">
            <div className="mb-4 text-pink-400 group-hover:scale-110 transition-transform"><Globe size={40} strokeWidth={1.5} /></div>
            <h3 className="text-xl font-bold mb-2">{t('landing.infra.networkTitle')}</h3>
            <p className="text-sm text-gray-400">{t('landing.infra.networkDesc')}</p>
          </div>
        </div>

        {/* ================= MODOS DE JOGO ================= */}
        <div className="py-16 z-10 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">{t('landing.modes.title')}</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t('landing.modes.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* F2P */}
            <div className="bg-[#0b0914]/80 backdrop-blur-md border-2 border-[#39FF14]/30 rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden group hover:border-[#39FF14]/60 transition-all hover:shadow-[0_0_40px_rgba(57,255,20,0.1)]">
              <div className="absolute top-0 right-0 bg-[#39FF14] text-black text-xs font-bold px-4 py-1.5 rounded-bl-2xl z-10">{t('landing.modes.f2p.badge')}</div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-[#39FF14]/10 rounded-2xl"><Gamepad2 size={32} className="text-[#39FF14]" /></div>
                <div>
                  <h3 className="text-2xl font-bold">{t('landing.modes.f2p.title')}</h3>
                  <p className="text-[#39FF14] font-medium text-sm">{t('landing.modes.f2p.subtitle')}</p>
                </div>
              </div>
              <p className="text-gray-300 mb-8 leading-relaxed">
                {t('landing.modes.f2p.desc')}
              </p>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition cursor-pointer">
                  <div>
                    <h4 className="font-bold text-white text-lg">{t('landing.modes.f2p.game1Title')}</h4>
                    <p className="text-xs text-gray-400">{t('landing.modes.f2p.game1Desc')}</p>
                  </div>
                  <ArrowRight size={20} className="text-[#39FF14]" />
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition cursor-pointer">
                  <div>
                    <h4 className="font-bold text-white text-lg">{t('landing.modes.f2p.game2Title')}</h4>
                    <p className="text-xs text-gray-400">{t('landing.modes.f2p.game2Desc')}</p>
                  </div>
                  <ArrowRight size={20} className="text-[#39FF14]" />
                </div>
              </div>
            </div>

            {/* PVP BET */}
            <div className="bg-[#0b0914]/80 backdrop-blur-md border-2 border-[#ff2a5f]/30 rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden group hover:border-[#ff2a5f]/60 transition-all hover:shadow-[0_0_40px_rgba(255,42,95,0.15)]">
               <div className="absolute top-0 right-0 bg-gradient-to-r from-[#D91A5A] to-[#E6155E] text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl z-10 flex items-center gap-1">
                 <Swords size={14} /> {t('landing.modes.pvp.badge')}
               </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-[#ff2a5f]/10 rounded-2xl relative">
                   <div className="absolute inset-0 bg-[#ff2a5f] blur-md opacity-20 animate-pulse rounded-2xl"></div>
                  <Swords size={32} className="text-[#ff2a5f] relative z-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{t('landing.modes.pvp.title')}</h3>
                  <p className="text-[#ff2a5f] font-medium text-sm">{t('landing.modes.pvp.subtitle')}</p>
                </div>
              </div>
              <p className="text-gray-300 mb-8 leading-relaxed">
                {t('landing.modes.pvp.desc')}
              </p>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition cursor-pointer">
                  <div>
                    <h4 className="font-bold text-white text-lg">{t('landing.modes.pvp.game1Title')}</h4>
                    <p className="text-xs text-gray-400">{t('landing.modes.pvp.game1Desc')}</p>
                  </div>
                  <ArrowRight size={20} className="text-[#ff2a5f]" />
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition cursor-pointer">
                  <div>
                    <h4 className="font-bold text-white text-lg">{t('landing.modes.pvp.game2Title')}</h4>
                    <p className="text-xs text-gray-400">{t('landing.modes.pvp.game2Desc')}</p>
                  </div>
                  <ArrowRight size={20} className="text-[#ff2a5f]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SUSTENTABILIDADE & IMPACTO SOCIAL ================= */}
        <div className="py-16 relative z-10">
           <div className="bg-gradient-to-br from-[#130f1e] to-[#0b0914] border border-[#9333ea]/30 rounded-3xl p-6 sm:p-8 lg:p-12 shadow-[0_0_50px_rgba(147,51,234,0.1)] overflow-hidden relative">
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#9333ea]/10 blur-[100px] rounded-full"></div>
              
              <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
                <div className="lg:w-1/2">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-6">{t('landing.impact.title1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#e61587]">{t('landing.impact.titleHighlight')}</span></h2>
                  <p className="text-gray-300 text-lg leading-relaxed mb-6">
                    {t('landing.impact.desc1')} <b>15%</b> {t('landing.impact.desc2')}
                  </p>
                  <div className="bg-[#9333ea]/10 border border-[#9333ea]/20 rounded-xl p-5 inline-flex flex-col gap-2">
                     <span className="text-sm text-gray-400 font-medium">{t('landing.impact.commitmentTitle')}</span>
                     <div className="flex items-center gap-3">
                       <Heart size={24} className="text-pink-500 fill-pink-500 flex-shrink-0" />
                       <span className="font-bold text-white text-sm sm:text-base">{t('landing.impact.donationPrefix')} <a href="https://instagram.com/jardimdasborboletas_" target="_blank" rel="noreferrer" className="text-pink-400 underline decoration-pink-400/30 hover:text-pink-300">@jardimdasborboletas_</a></span>
                     </div>
                     <p className="text-xs text-gray-400 mt-1 sm:ml-9">{t('landing.impact.donationSub')}</p>
                  </div>
                </div>

                <div className="lg:w-1/2 w-full">
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-6 w-full">
                    <h4 className="text-center font-bold text-sm text-gray-400 tracking-wider mb-6">{t('landing.impact.exampleTitle')}</h4>
                    
                    <div className="flex justify-between items-center mb-8 relative gap-2">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -z-10 -translate-y-1/2"></div>
                      <div className="flex flex-col items-center bg-[#130f1e] px-2 rounded-lg z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-400 font-bold mb-2 text-sm sm:text-base">P1</div>
                        <span className="text-[10px] sm:text-xs font-bold">100 MPH</span>
                      </div>
                      <div className="flex flex-col items-center bg-[#130f1e] px-2 sm:px-4 rounded-lg z-10">
                        <span className="text-[#39FF14] font-black text-lg sm:text-xl sm:text-2xl mb-1">{t('landing.impact.totalLabel')}</span>
                        <span className="bg-[#39FF14]/20 text-[#39FF14] px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs sm:text-sm font-bold border border-[#39FF14]/30 whitespace-nowrap">200 MPH</span>
                      </div>
                      <div className="flex flex-col items-center bg-[#130f1e] px-2 rounded-lg z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 font-bold mb-2 text-sm sm:text-base">P2</div>
                        <span className="text-[10px] sm:text-xs font-bold">100 MPH</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#39FF14]/10 border border-[#39FF14]/20 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                        <Trophy size={20} className="text-[#39FF14] mb-2" />
                        <span className="text-2xl font-black text-[#39FF14]">170 MPH</span>
                        <span className="text-xs font-bold text-gray-400 mt-1 uppercase">{t('landing.impact.winnerLabel')}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center gap-2">
                        <span className="text-sm font-bold text-white text-center mb-1 border-b border-white/10 pb-2">{t('landing.impact.feeTitle')}</span>
                        <div className="flex justify-between text-xs text-gray-400"><span className="flex items-center gap-1"><Server size={12}/> {t('landing.impact.feeSystem')}</span> <b className="text-white">10</b></div>
                        <div className="flex justify-between text-xs text-gray-400"><span className="flex items-center gap-1"><Users size={12}/> {t('landing.impact.feeTeam')}</span> <b className="text-white">10</b></div>
                        <div className="flex justify-between text-xs text-gray-400"><span className="flex items-center gap-1"><Heart size={12} className="text-pink-500"/> {t('landing.impact.feeTournaments')}</span> <b className="text-white">10</b></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>

        <AvatarCarousel
          avatars={avatars}
          title={t('landing.carousel.title')}
          subtitle={t('landing.carousel.subtitle')}
          backHint={t('landing.carousel.backHint')}
        />

        {/* ================= POR QUE ESCOLHER A MINING POINTS? ================= */}
        <div className="py-16 z-10 relative">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              {t('landing.why.title')}
            </h2>
            <p className="text-[#E6155E] text-base sm:text-lg font-medium max-w-3xl mx-auto px-4">
              {t('landing.why.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0b0914] border border-white/5 rounded-2xl p-8 flex flex-col hover:border-[#39FF14]/50 hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-[#ff2a5f]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Cpu className="text-[#ff2a5f]" size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('landing.why.card1Title')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t('landing.why.card1Desc')}</p>
            </div>
            
            <div className="bg-[#0b0914] border border-white/5 rounded-2xl p-8 flex flex-col hover:border-[#39FF14]/50 hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-[#e61587]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Wallet className="text-[#e61587]" size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('landing.why.card2Title')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t('landing.why.card2Desc')}</p>
            </div>
            
            <div className="bg-[#0b0914] border border-white/5 rounded-2xl p-8 flex flex-col hover:border-[#39FF14]/50 hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-[#9333ea]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="text-[#9333ea]" size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('landing.why.card3Title')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t('landing.why.card3Desc')}</p>
            </div>
          </div>
        </div>

        {/* ================= FOOTER FINAL ================= */}
        <footer className="w-full py-8 mt-auto border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img 
              src="/assets/landing/logo_landing.png" 
              alt="Mining Points Logo" 
              className="h-10 sm:h-12 object-contain"
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = "https://placehold.co/150x50/transparent/white?text=LOGO"; 
              }}
            />
            <div className="flex flex-col text-xs sm:text-sm text-gray-400 ml-2">
              <span className="font-bold text-white tracking-wide">MINING POINTS</span>
              <span>{t('landing.footer.rights')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="#" className="p-2.5 rounded-full border border-white/10 hover:border-pink-500 hover:text-pink-500 transition-all text-gray-400 hover:bg-pink-500/10">
              <Twitter size={18} strokeWidth={1.5} />
            </a>
            <a href="https://www.instagram.com/miningpoints?igsh=MTA2amlwd3luZWs2Mw%3D%3D&utm_source=qr" className="p-2.5 rounded-full border border-white/10 hover:border-pink-500 hover:text-pink-500 transition-all text-gray-400 hover:bg-pink-500/10">
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a href="https://t.me/miningpointoficial" className="p-2.5 rounded-full border border-white/10 hover:border-[#39FF14] hover:text-[#39FF14] transition-all text-gray-400 hover:bg-[#39FF14]/10">
              <Send size={18} strokeWidth={1.5} />
            </a>
            <a href="https://chat.whatsapp.com/FpEdxnOyDL7E7U9yvYNXtw?mode=gi_t" className="p-2.5 rounded-full border border-white/10 hover:border-[#39FF14] hover:text-[#39FF14] transition-all text-gray-400 hover:bg-[#39FF14]/10">
              <MessageCircle size={18} strokeWidth={1.5} />
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}
