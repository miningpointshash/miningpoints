import React, { useState, useContext, useEffect } from 'react';
import { 
  Bell, Globe, User, LogOut, Check, Home, Gamepad2, Zap, Wallet, Menu as MenuIcon, X, AlertTriangle
} from 'lucide-react';
import { THEME } from './utils/theme';
import { AVAILABLE_LANGUAGES } from './locales';
import { AppContext, AppProvider } from './context/AppContext';
import { supabase, checkSupabaseConnection } from './lib/supabase';
import { NotificationsPanel } from './components/NotificationsPanel';
import { HomeView } from './views/Home';
import { LandingView } from './views/Landing';

// --- ERROR BOUNDARY ---
import { InvestView } from './views/Invest';
import { WalletView } from './views/Wallet';
import { ArcadeView } from './views/Arcade';
import { MenuView } from './views/Menu';
import { AdminView } from './views/Admin';
import { AuthView } from './views/Auth'; // Importa Auth
import { EmailWelcomeView } from './views/EmailWelcome';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Algo deu errado!</h1>
          <p className="text-gray-400 mb-6">Ocorreu um erro inesperado na aplicação.</p>
          <pre className="bg-gray-900 p-4 rounded text-xs text-left overflow-auto max-w-full mb-6 border border-red-900/50 text-red-300">
            {this.state.error && this.state.error.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.removeItem('mining_points_mvp_v1'); window.location.reload(); }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Reiniciar Aplicação (Reset)
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

// --- LAYOUT PRINCIPAL ---

const Layout = () => {
  console.log("Layout rendering");
  const [view, setView] = useState(() => {
      // Permite iniciar em uma view específica via URL (ex: ?view=admin)
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'home';
  }); 
  const { state, popup, changeLanguage, t, addNotification } = useContext(AppContext);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isLanguageOpen, setLanguageOpen] = useState(false);
  
  // Landing Page State
  const [showLanding, setShowLanding] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      return !params.get('auth');
  });
  const [authInitialMode, setAuthInitialMode] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('auth') === 'register' ? 'register' : 'login';
  });

  useEffect(() => {
    // Verifica conexão com Supabase ao iniciar
    const check = async () => {
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
            // Se falhar, tenta avisar (se o sistema de notificação estiver montado)
            console.warn("Falha na conexão Supabase. Verifique adblockers ou rede.");
            // addNotification pode não estar pronto se o componente não montou, mas useEffect roda após mount.
            // Porém, se isAuthenticated for false, renderizamos AuthView que tem seu próprio contexto.
        }
    };
    check();
  }, []);

  const params = new URLSearchParams(window.location.search);
  const isWelcome = params.get('welcome') === '1';

  if (isWelcome) {
      return (
        <EmailWelcomeView
          isAuthenticated={state.user.isAuthenticated}
          onGoLogin={() => {
            window.location.href = '/?auth=login';
          }}
          onGoHome={() => {
            window.location.href = '/?view=home';
          }}
        />
      );
  }

  // Se não estiver autenticado, mostra Login/Cadastro
  if (!state.user.isAuthenticated) {
      if (showLanding) {
        return <LandingView onNavigate={(mode) => { setAuthInitialMode(mode); setShowLanding(false); }} />;
      }
      
      return (
        <div className={`min-h-screen bg-black font-sans text-gray-200 overflow-x-hidden selection:bg-purple-500 selection:text-white pb-safe`}>
            <div className={`max-w-lg mx-auto min-h-screen ${THEME.bg} shadow-2xl relative border-x border-gray-900`}>
                <AuthView initialMode={authInitialMode} onBack={() => setShowLanding(true)} />
            </div>
        </div>
      );
  }

  return (
    <div className={`min-h-screen bg-black font-sans text-gray-200 overflow-x-hidden selection:bg-purple-500 selection:text-white pb-safe`}>
      <div className={`max-w-lg mx-auto min-h-screen ${THEME.bg} shadow-2xl relative border-x border-gray-900`}>
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center h-4">
            <img src="/assets/logo/logo_01.png" alt="Mining Points" className="h-full w-auto object-contain" />
        </div>
        <div className="flex items-center gap-3">
             <button onClick={() => setNotificationsOpen(true)} className="relative hover:text-purple-400 transition-colors">
                <Bell size={20} className={state.notifications.some(n => !n.read) ? "text-white" : "text-gray-400"} />
                {state.notifications.some(n => !n.read) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-black"></span>}
            </button>
            <div className="relative">
                <button onClick={() => setLanguageOpen(!isLanguageOpen)} className="relative hover:text-green-400 transition-colors">
                    <Globe size={20} className="text-gray-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                </button>
                {isLanguageOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#111111] border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                        {AVAILABLE_LANGUAGES.map(lang => (
                            <button key={lang.code} onClick={() => { changeLanguage(lang.code); setLanguageOpen(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between border-b border-gray-800 last:border-0 hover:bg-gray-800 ${state.user.language === lang.code ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                                <span className="flex items-center gap-2"><span>{lang.flag}</span><span>{lang.name}</span></span>
                                {state.user.language === lang.code && <Check size={14}/>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="relative">
                <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center gap-2 bg-gray-900 px-2 py-1 rounded-full border border-gray-700 hover:border-purple-500 transition-colors">
                    <div className="w-6 h-6 bg-gray-700 rounded-full overflow-hidden"><User size={24} className="text-gray-400 p-1"/></div>
                    <span className="text-xs font-bold truncate max-w-[60px]">{state.user.username}</span>
                </button>
                {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#111111] border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                        <button onClick={() => { setView('menu:config'); setProfileOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-2 border-b border-gray-800"><User size={16} className="text-purple-400" /> {t('menu.myAccount')}</button>
                        <button 
                            onClick={async () => { 
                                if(window.confirm(t('menu.logoutConfirm'))) { 
                                    await supabase.auth.signOut();
                                    localStorage.removeItem('mining_points_mvp_v1'); 
                                    window.location.href = '/'; 
                                }
                            }} 
                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                        >
                            <LogOut size={16} /> {t('menu.logout')}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </header>
      <main className="pt-2">
        {view === 'home' && <HomeView navigate={setView} />}
        {view === 'invest' && <InvestView navigate={setView} />}
        {view === 'wallet' && <WalletView navigate={setView} />}
        {view === 'arcade' && <ArcadeView navigate={setView} />}
        {/* Proteção da Rota Admin */}
        {view === 'admin' && (state.user.role === 'admin_master' || state.user.role === 'admin_finance' || state.user.role === 'admin_partner') && <AdminView navigate={setView} />}
        {view.startsWith('menu') && <MenuView navigate={setView} initialTab={view.split(':')[1] || 'menu'} />}
      </main>
      {isNotificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} />}
      {popup && (
        <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-bounceIn ${popup.type === 'danger' ? 'bg-red-600 text-white' : popup.type === 'success' || popup.type === 'profit' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white border border-gray-600'}`}>
            {popup.type === 'success' || popup.type === 'profit' ? <Check size={16}/> : popup.type === 'danger' ? <X size={16}/> : <Bell size={16}/>}
            <span className="text-sm font-bold">{popup.msg}</span>
        </div>
      )}
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-lg bg-[#111111] border-t border-gray-800 backdrop-blur pb-safe z-40">
        <div className="flex justify-around items-center h-16 relative">
            <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 w-1/5 ${view === 'home' ? 'text-purple-500' : 'text-gray-500'}`}><Home size={20} /><span className="text-[10px]">{t('nav.home')}</span></button>
            <button onClick={() => setView('arcade')} className={`flex flex-col items-center gap-1 w-1/5 ${view === 'arcade' ? 'text-[#39ff14]' : 'text-gray-500'}`}><Gamepad2 size={20} /><span className="text-[10px]">{t('nav.arcade')}</span></button>
            <div className="relative -top-6"><button onClick={() => setView('invest')} className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-[#111111] shadow-[0_0_15px_#9333ea] transition-transform active:scale-95 ${view === 'invest' ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'}`}><Zap size={24} fill="currentColor" /></button></div>
            <button onClick={() => setView('wallet')} className={`flex flex-col items-center gap-1 w-1/5 ${view === 'wallet' ? 'text-purple-500' : 'text-gray-500'}`}><Wallet size={20} /><span className="text-[10px]">{t('nav.wallet')}</span></button>
            <button onClick={() => setView('menu')} className={`flex flex-col items-center gap-1 w-1/5 ${view.startsWith('menu') ? 'text-purple-500' : 'text-gray-500'}`}><MenuIcon size={20} /><span className="text-[10px]">{t('nav.menu')}</span></button>
        </div>
      </nav>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
      </div>
    </div>
  );
};

export default function App() { return <ErrorBoundary><AppProvider><Layout /></AppProvider></ErrorBoundary>; }
