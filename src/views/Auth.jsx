import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, Loader, AlertCircle, Users, Globe, ChevronDown, ArrowLeft } from 'lucide-react';
import { THEME } from '../utils/theme';
import { AVAILABLE_LANGUAGES } from '../locales';
import { clearReferralUsername, getReferralUsername } from '../utils/referral';

export const AuthView = ({ initialMode = 'login', onBack }) => {
    const { setState, addNotification, changeLanguage, t, state } = useContext(AppContext);
    const [mode, setMode] = useState(initialMode); // 'login', 'register', 'forgot'
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLangMenuOpen, setLangMenuOpen] = useState(false);
    
    // Form Data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState(''); // Novo campo Nome Completo
    const [sponsor, setSponsor] = useState(''); // Novo campo Patrocinador
    const [isSponsorLocked, setSponsorLocked] = useState(false); // Trava se vier da URL
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [error, setError] = useState(null);

    const currentLang = AVAILABLE_LANGUAGES.find(l => l.code === state.user.language) || AVAILABLE_LANGUAGES[2]; // Default PT-BR

    // Capturar Referência da URL (?ref=username)
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const stored = getReferralUsername();
        const effectiveRef = ref || stored;
        if (effectiveRef) {
            setSponsor(effectiveRef);
            setSponsorLocked(true);
            setMode('register'); // Força modo cadastro se tiver ref
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
                // O AppContext vai detectar a mudança de sessão automaticamente
            } 
            else if (mode === 'register') {
                // 1. Validar Patrocinador
                let sponsorId = '50f6f604-2cbf-4ae8-99f8-50b06ad30f5f'; // Default: FinanceiroAdmin

                if (sponsor) {
                    const { data: sponsorData, error: sponsorError } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('username', sponsor)
                        .single();
                    
                    if (sponsorError || !sponsorData) {
                        throw new Error(t('auth.sponsorNotFound'));
                    }
                    sponsorId = sponsorData.id;
                }

                // 2. Criar usuário no Auth
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/?welcome=1&auth=login`,
                        data: {
                            username: username, // Username obrigatório
                            full_name: fullName, // Nome completo
                            sponsor_id: sponsorId // Passando ID do patrocinador no metadata para o Trigger capturar
                        }
                    }
                });

                if (signUpError) throw signUpError;

                // 3. Atualizar perfil com Patrocinador e Username
                if (data.user) {
                    await supabase.from('profiles').update({ 
                        username: username,
                        full_name: fullName,
                        sponsor_id: sponsorId
                    }).eq('id', data.user.id);
                }

                setRegisterSuccess(true);
                clearReferralUsername();
            }
            else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                
                if (error) throw error;
                addNotification(t('auth.recoverySent'), 'success');
                setMode('login');
            }
        } catch (err) {
            console.error(err);
            setError(err.message === 'Invalid login credentials' ? t('auth.loginError') : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 rounded-full blur-[120px]"></div>
            </div>

            {/* Back Button */}
            {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-gray-900/80 backdrop-blur border border-gray-700 px-3 py-2 rounded-full text-white hover:border-purple-500 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="text-xs font-bold uppercase hidden sm:inline">Voltar</span>
                </button>
            )}

            {/* Language Selector (Top Right) */}
            <div className="absolute top-4 right-4 z-50">
                <button 
                    onClick={() => setLangMenuOpen(!isLangMenuOpen)} 
                    className="flex items-center gap-2 bg-gray-900/80 backdrop-blur border border-gray-700 px-3 py-2 rounded-full text-white hover:border-purple-500 transition-colors"
                >
                    <span className="text-lg">{currentLang.flag}</span>
                    <span className="text-xs font-bold uppercase">{currentLang.code.split('-')[0]}</span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isLangMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-[#111111] border border-gray-800 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
                        {AVAILABLE_LANGUAGES.map(lang => (
                            <button 
                                key={lang.code} 
                                onClick={() => { changeLanguage(lang.code); setLangMenuOpen(false); }} 
                                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 border-b border-gray-800 last:border-0 hover:bg-gray-800 ${state.user.language === lang.code ? 'text-purple-400 font-bold' : 'text-gray-400'}`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span>{lang.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-full max-w-md z-10">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img src="/assets/logo/logo_01.png" alt="Mining Points" className="h-6 w-auto object-contain drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]" />
                </div>

                {/* Card */}
                <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 shadow-2xl relative">
                    {/* Top Glow Line */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>

                    {registerSuccess ? (
                        <div className="text-center py-8 animate-fadeIn">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                <Mail size={40} className="text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">{t('auth.checkEmailTitle')}</h2>
                            <p className="text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
                                {t('auth.checkEmailText')}
                            </p>
                            <button 
                                onClick={() => { setRegisterSuccess(false); setMode('login'); }}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-green-900/30 transition-all active:scale-95"
                            >
                                {t('auth.backToLogin')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-white text-center mb-1">
                                {mode === 'login' ? t('auth.loginTitle') : mode === 'register' ? t('auth.registerTitle') : t('auth.forgotTitle')}
                            </h2>
                            <p className="text-center text-pink-500 text-sm mb-8 font-medium">
                                {mode === 'login' ? t('auth.loginSubtitle') : mode === 'register' ? t('auth.registerSubtitle') : t('auth.forgotSubtitle')}
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username Field (Register Only) */}
                        {mode === 'register' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{t('auth.fullNameLabel')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User size={18} className="text-purple-500" />
                                        </div>
                                        <input 
                                            type="text" 
                                            required 
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder={t('auth.fullNamePlaceholder')}
                                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{t('auth.usernameLabel')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User size={18} className="text-purple-500" />
                                        </div>
                                        <input 
                                            type="text" 
                                            required 
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder={t('auth.usernamePlaceholder')}
                                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{t('auth.sponsorLabel')} {isSponsorLocked ? `(${t('auth.sponsorLocked')})` : ''}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Users size={18} className={isSponsorLocked ? "text-green-500" : "text-purple-500"} />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={sponsor}
                                            onChange={(e) => setSponsor(e.target.value)}
                                            placeholder={t('auth.sponsorPlaceholder')}
                                            readOnly={isSponsorLocked}
                                            className={`w-full bg-[#0a0a0a] border ${isSponsorLocked ? 'border-green-500/50 text-green-400' : 'border-gray-700 text-white'} rounded-lg py-3 pl-10 pr-4 placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all`}
                                        />
                                        {isSponsorLocked && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <Lock size={14} className="text-green-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Email Field */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{t('auth.emailLabel')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-purple-500" />
                                </div>
                                <input 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('auth.emailPlaceholder')}
                                    className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        {mode !== 'forgot' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{t('auth.passwordLabel')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-purple-500" />
                                    </div>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t('auth.passwordPlaceholder')}
                                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 pl-10 pr-12 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {mode === 'login' && (
                                    <div className="flex justify-end mt-2">
                                        <button 
                                            type="button" 
                                            onClick={() => { setMode('forgot'); setError(null); }}
                                            className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
                                        >
                                            {t('auth.forgotPasswordLink')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 flex items-start gap-2 text-red-400 text-sm animate-fadeIn">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-purple-900/30 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader size={20} className="animate-spin" /> : (
                                mode === 'login' ? t('auth.loginButton') : mode === 'register' ? t('auth.registerButton') : t('auth.sendLinkButton')
                            )}
                        </button>
                    </form>

                    {/* Toggle Mode */}
                    <div className="mt-8 text-center">
                        {mode === 'login' ? (
                            <p className="text-gray-400 text-sm">
                                {t('auth.noAccount')}{' '}
                                <button onClick={() => { setMode('register'); setError(null); }} className="text-pink-500 font-bold hover:underline">
                                    {t('auth.registerLink')}
                                </button>
                            </p>
                        ) : mode === 'register' ? (
                            <p className="text-gray-400 text-sm">
                                {t('auth.haveAccount')}{' '}
                                <button onClick={() => { setMode('login'); setError(null); }} className="text-pink-500 font-bold hover:underline">
                                    {t('auth.loginLink')}
                                </button>
                            </p>
                        ) : (
                            <p className="text-gray-400 text-sm">
                                {t('auth.rememberPassword')}{' '}
                                <button onClick={() => { setMode('login'); setError(null); }} className="text-pink-500 font-bold hover:underline">
                                    {t('auth.backToLogin')}
                                </button>
                            </p>
                        )}
                    </div>
                    </>
                )}
                </div>
            </div>
        </div>
    );
};
