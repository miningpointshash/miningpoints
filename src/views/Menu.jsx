import React, { useContext, useState, useEffect } from 'react';
import { 
    Users, MessageSquare, Settings, Globe, LogOut, ChevronRight, Copy, Check, 
    Bot, Headphones, User, Clock, ExternalLink, Mail, Camera, Edit3, Key, 
    Wallet, AlertTriangle, Save, Shield, X, Download, Share2
} from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { AVAILABLE_LANGUAGES } from '../locales';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TeamDashboard } from './TeamDashboard';
import { SupportChat } from '../components/support/SupportChat';

export const MenuView = ({ navigate, initialTab = 'menu' }) => {
    const { state, setState, addNotification, changeLanguage, t, resetAppData } = useContext(AppContext);
    const [subTab, setSubTab] = useState(initialTab);
    const [newUsername, setNewUsername] = useState('');
    const [usernameToken, setUsernameToken] = useState('');
    const [loginPwd, setLoginPwd] = useState('');
    const [financialPwd, setFinancialPwd] = useState('');
    const [wallets, setWallets] = useState(state.user.wallets);
    const [walletToken, setWalletToken] = useState('');
    const [supportMode, setSupportMode] = useState('main');
    const [sponsorName, setSponsorName] = useState('Carregando...');
    const [isWalletTokenSending, setIsWalletTokenSending] = useState(false);
    const [isWalletSaving, setIsWalletSaving] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [isAvatarSaving, setIsAvatarSaving] = useState(false);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [materialsLangOverride, setMaterialsLangOverride] = useState(state.user.language);

    const getAvatarSrc = (value) => {
        const raw = String(value || '').trim();
        if (!raw || raw === 'default') return '/assets/persona/mp_p6.svg';
        if (/^https?:\/\//i.test(raw)) return raw;
        return `/assets/persona/${raw}.svg`;
    };

    const availablePersonas = ['mp_p1', 'mp_p2', 'mp_p3', 'mp_p4', 'mp_p5', 'mp_p6', 'mp_p7', 'mp_p8'];
    const isAdmin = ['admin_master', 'admin_finance', 'admin_partner'].includes(state.user.role);

    useEffect(() => {
        setSubTab(initialTab);
    }, [initialTab]);

    // Fetch sponsor username on mount
    useEffect(() => {
        const fetchSponsor = async () => {
            if (state.user.sponsor_id) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', state.user.sponsor_id)
                        .single();
                    
                    if (data && data.username) {
                        setSponsorName(data.username);
                    }
                } catch (err) {
                    console.error("Erro ao buscar patrocinador:", err);
                }
            }
        };
        fetchSponsor();
    }, [state.user.sponsor_id]);

    const updateUserField = (field, value) => {
        setState(prev => ({ ...prev, user: { ...prev.user, [field]: value } }));
    };

    const saveAvatarPersona = async (personaKey) => {
        if (isAvatarSaving) return;
        setIsAvatarSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: personaKey })
                .eq('id', state.user.id);
            if (error) throw error;
            updateUserField('avatar_url', personaKey);
            addNotification('Avatar atualizado!', 'success');
            setShowAvatarModal(false);
        } catch (err) {
            console.error('Erro ao atualizar avatar:', err);
            addNotification(err?.message || 'Erro ao atualizar avatar.', 'danger');
        } finally {
            setIsAvatarSaving(false);
        }
    };

    const uploadAvatarFile = async (file) => {
        if (!file) return;
        if (isAvatarUploading) return;
        setIsAvatarUploading(true);
        try {
            const userId = state.user.id;
            const ext = (file.name.split('.').pop() || 'png').toLowerCase();
            const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'png';
            const path = `${userId}/${Date.now()}.${safeExt}`;

            const { error: uploadError } = await supabase
                .storage
                .from('avatars')
                .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(path);
            const publicUrl = data?.publicUrl;
            if (!publicUrl) throw new Error('Falha ao obter URL do avatar.');

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);
            if (profileError) throw profileError;

            updateUserField('avatar_url', publicUrl);
            addNotification('Foto de perfil atualizada!', 'success');
            setShowAvatarModal(false);
        } catch (err) {
            console.error('Erro ao enviar avatar:', err);
            addNotification(err?.message || 'Erro ao enviar avatar.', 'danger');
        } finally {
            setIsAvatarUploading(false);
        }
    };

    const handleRequestWalletToken = async () => {
        if (isWalletTokenSending) return;
        setIsWalletTokenSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                addNotification('Sessão expirada. Faça login novamente.', 'danger');
                return;
            }

            const { data, error } = await supabase.functions.invoke('wallet-token-request', {
                body: {},
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'x-user-jwt': accessToken,
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });

            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'Falha ao solicitar token.');
            addNotification('Token enviado para o seu e-mail.', 'success');
        } catch (err) {
            console.error('Erro ao solicitar token de carteira:', err);
            const msg =
                err?.context?.body?.error ||
                err?.context?.body?.message ||
                err?.message ||
                'Erro ao solicitar token.';
            addNotification(String(msg), 'danger');
        } finally {
            setIsWalletTokenSending(false);
        }
    };

    const handleSaveWallets = async () => {
        if (isWalletSaving) return;
        if (!walletToken) {
            alert('Por segurança, insira o token enviado ao seu e-mail.');
            return;
        }

        setIsWalletSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                addNotification('Sessão expirada. Faça login novamente.', 'danger');
                return;
            }

            const { data, error } = await supabase.functions.invoke('wallet-wallets-update', {
                body: { token: walletToken, wallets },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'x-user-jwt': accessToken,
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });

            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'Falha ao salvar carteiras.');

            updateUserField('wallets', data.wallets || wallets);
            addNotification('Carteiras atualizadas com sucesso!', 'success');
            setWalletToken('');
        } catch (err) {
            console.error('Erro ao salvar carteiras:', err);
            const msg =
                err?.context?.body?.error ||
                err?.context?.body?.message ||
                err?.message ||
                'Erro ao salvar carteiras.';
            addNotification(String(msg), 'danger');
        } finally {
            setIsWalletSaving(false);
        }
    };

    const handleSaveUsername = () => {
        if (!usernameToken || !newUsername) { alert('Preencha o novo username e o token.'); return; }
        updateUserField('username', newUsername);
        addNotification('Username alterado com sucesso!', 'success');
        setNewUsername(''); setUsernameToken('');
    };

    const handleUpdateLoginPassword = async () => {
        if (!loginPwd || loginPwd.length < 6) {
            addNotification('A senha deve ter no mínimo 6 caracteres.', 'danger');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: loginPwd });
            if (error) throw error;
            
            addNotification(t('menu.loginPwdSuccess') || 'Senha atualizada!', 'success');
            setLoginPwd('');
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            addNotification('Erro ao atualizar senha: ' + error.message, 'danger');
        }
    };

    const handleSaveFinancialPwd = () => {
        if (!financialPwd) return;
        updateUserField('financialPassword', financialPwd);
        addNotification('Senha financeira definida!', 'success');
        setFinancialPwd('');
    };

    if (subTab === 'team') {
        return <TeamDashboard onBack={() => setSubTab('menu')} />;
    }

    if (subTab === 'language') {
        return (
            <div className="px-4 pb-24 animate-fadeIn">
                <Button onClick={() => setSubTab('menu')} variant="secondary" className="mb-4 text-xs py-2 flex items-center gap-2"><ChevronRight className="rotate-180" size={16}/> {t('menu.back')}</Button>
                <h2 className="text-xl font-bold text-white mb-6">{t('menu.language')}</h2>
                <div className="space-y-2">{AVAILABLE_LANGUAGES.map((lang) => (<button key={lang.code} onClick={() => changeLanguage(lang.code)} className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${state.user.language === lang.code ? 'bg-purple-900/30 border-purple-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}><span className="flex items-center gap-3"><span className="text-2xl">{lang.flag}</span><span className="font-bold text-sm">{lang.name}</span></span>{state.user.language === lang.code && <Check size={18} className="text-purple-400" />}</button>))}</div>
            </div>
        );
    }

    if (subTab === 'support') {
        return (
            <div className="px-4 pb-24 animate-fadeIn">
                <Button onClick={() => { if(supportMode === 'main') setSubTab('menu'); else setSupportMode('main'); }} variant="secondary" className="mb-4 text-xs py-2 flex items-center gap-2"><ChevronRight className="rotate-180" size={16}/> {supportMode === 'main' ? t('menu.title') : t('menu.helpCenterTitle')}</Button>
                {supportMode === 'main' && (<div className="space-y-6"><h2 className="text-xl font-bold text-white mb-4">{t('menu.helpCenterTitle')}</h2><button onClick={() => setSupportMode('ai')} className="w-full bg-gradient-to-r from-blue-900 to-blue-800 p-6 rounded-xl border border-blue-500 flex flex-col items-center gap-3 active:scale-95 transition"><Bot size={48} className="text-blue-300"/><div className="text-center"><h3 className="text-white font-bold text-lg">{t('menu.supportAI')}</h3><p className="text-blue-200 text-xs mt-1">{t('menu.automaticSupportDesc')}</p></div></button><button onClick={() => setSupportMode('chat')} className="w-full bg-gradient-to-r from-purple-900 to-purple-800 p-6 rounded-xl border border-purple-500 flex flex-col items-center gap-3 active:scale-95 transition"><Headphones size={48} className="text-purple-300"/><div className="text-center"><h3 className="text-white font-bold text-lg">{t('menu.talkToAgentTitle')}</h3><p className="text-purple-200 text-xs mt-1">{t('menu.talkToAgentDesc')}</p></div></button></div>)}
                {supportMode === 'ai' && (<div className="space-y-4"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Bot size={20}/> {t('menu.faqTitle')}</h2>{[{ q: t('menu.howToDepositQ'), a: t('menu.howToDepositA') },{ q: t('menu.howWithdrawalsWorkQ'), a: t('menu.howWithdrawalsWorkA') },{ q: t('menu.standardPlanReturnQ'), a: t('menu.standardPlanReturnA') },{ q: t('menu.premiumPlanDetailsQ'), a: t('menu.premiumPlanDetailsA') },].map((item, idx) => (<details key={idx} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 group"><summary className="p-4 cursor-pointer font-bold text-sm text-gray-200 flex justify-between items-center group-open:text-purple-400">{item.q}<ChevronRight size={16} className="group-open:rotate-90 transition"/></summary><div className="p-4 pt-0 text-xs text-gray-400 leading-relaxed border-t border-gray-800 mt-2">{item.a}</div></details>))}</div>)}
                {supportMode === 'chat' && <SupportChat />}
            </div>
        );
    }

    if (subTab === 'config') {
        return (
            <div className="px-4 pb-24 animate-fadeIn">
                 <Button onClick={() => setSubTab('menu')} variant="secondary" className="mb-4 text-xs py-2 flex items-center gap-2"><ChevronRight className="rotate-180" size={16}/> {t('menu.back')}</Button>
                 <h2 className="text-xl font-bold text-white mb-6">{t('menu.settings')}</h2>
                 <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
                        <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                            <div className="w-16 h-16 bg-gray-700 rounded-full overflow-hidden border-2 border-purple-500">
                                <img src={getAvatarSrc(state.user.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <Camera size={20} className="text-white"/>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">{state.user.username}</h3>
                            <p className="text-gray-400 text-xs flex items-center gap-1 mb-1"><Mail size={12}/> {state.user.email}</p>
                            <p className="text-purple-400 text-xs font-bold flex items-center gap-1 bg-purple-900/20 px-2 py-1 rounded w-fit">
                                <Users size={12}/> {t('menu.yourSponsor')}: {sponsorName}
                            </p>
                        </div>
                    </div>
                    {showAvatarModal && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                            <Card className="w-full max-w-md bg-gray-900 border-gray-700 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-white">Foto de Perfil</h3>
                                    <Button size="icon" variant="ghost" onClick={() => setShowAvatarModal(false)}><X size={18} /></Button>
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded p-3 mb-4">
                                    <div className="text-xs text-gray-400 mb-2">Escolha um personagem</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {availablePersonas.map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => saveAvatarPersona(p)}
                                                disabled={isAvatarSaving || isAvatarUploading}
                                                className={`bg-gray-800/40 border rounded p-2 transition ${
                                                    String(state.user.avatar_url || '') === p ? 'border-green-500/60' : 'border-gray-700'
                                                }`}
                                            >
                                                <img src={`/assets/persona/${p}.svg`} alt={p} className="w-10 h-10 mx-auto" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded p-3">
                                    <div className="text-xs text-gray-400 mb-2">Ou envie uma foto do seu aparelho</div>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => uploadAvatarFile(e.target.files?.[0])}
                                        disabled={isAvatarSaving || isAvatarUploading}
                                        className="w-full text-xs text-gray-300"
                                    />
                                    <div className="text-[10px] text-gray-500 mt-2">PNG/JPG/WebP. Recomendado: imagem quadrada.</div>
                                </div>
                            </Card>
                        </div>
                    )}
                    <Card><h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Edit3 size={16} className="text-purple-400"/> {t('menu.changeUsername')}</h4><div className="space-y-2"><input type="text" placeholder={t('menu.newUsername')} className="w-full bg-black border border-gray-700 rounded p-2 text-xs text-white" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}/><div className="flex gap-2"><input type="text" placeholder={t('menu.tokenPlaceholder')} className="flex-1 bg-black border border-gray-700 rounded p-2 text-xs text-white" value={usernameToken} onChange={(e) => setUsernameToken(e.target.value)}/><button onClick={() => addNotification(`${t('menu.tokenSent')} ${state.user.email}`, 'success')} className="bg-gray-800 text-xs px-3 rounded text-gray-300 whitespace-nowrap">{t('menu.requestToken')}</button></div><Button onClick={handleSaveUsername} className="w-full text-xs py-2 mt-2">{t('menu.updateUsername')}</Button></div></Card>
                    <Card>
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Key size={16} className="text-blue-400"/> {t('menu.changeLoginPwd')}
                        </h4>
                        <input 
                            type="password" 
                            placeholder={t('menu.newLoginPwd')} 
                            className="w-full bg-black border border-gray-700 rounded p-2 text-xs text-white mb-2" 
                            value={loginPwd} 
                            onChange={(e) => setLoginPwd(e.target.value)}
                        />
                        <Button onClick={handleUpdateLoginPassword} className="w-full text-xs py-2 bg-blue-600 hover:bg-blue-700">
                            {t('menu.updateLoginPwd')}
                        </Button>
                    </Card>
                    <Card><h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Key size={16} className="text-yellow-400"/> {t('menu.financialPwd')}</h4><input type="password" placeholder={t('menu.newFinancialPwd')} className="w-full bg-black border border-gray-700 rounded p-2 text-xs text-white mb-2" value={financialPwd} onChange={(e) => setFinancialPwd(e.target.value)}/><Button onClick={handleSaveFinancialPwd} className="w-full text-xs py-2">{t('menu.setPwd')}</Button></Card>
                    <Card className="border-green-900"><h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Wallet size={16} className="text-green-400"/> {t('menu.withdrawalWallets')}</h4><div className="space-y-3">{[{ k: 'usdt_bep20', l: 'USDT (BEP-20)' },{ k: 'usdt_polygon', l: 'USDT (Polygon)' },{ k: 'usdt_trc20', l: 'USDT (TRC-20)' },{ k: 'usdt_arbitrum', l: 'USDT (Arbitrum)' },{ k: 'usdc_arbitrum', l: 'USDC (Arbitrum)' },{ k: 'pix', l: 'Chave PIX' }].map((w) => (<div key={w.k}><label className="text-[10px] text-gray-500 uppercase">{w.l}</label><input type="text" placeholder={`Endereço ${w.l}`} className="w-full bg-black border border-gray-700 rounded p-2 text-xs text-white focus:border-green-500 transition-colors" value={wallets[w.k]} onChange={(e) => setWallets({...wallets, [w.k]: e.target.value})}/></div>))}<div className="bg-yellow-900/20 p-3 rounded border border-yellow-900/50 mt-4"><div className="flex items-start gap-2 mb-2"><AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5"/><p className="text-[10px] text-yellow-200 leading-tight">{t('menu.walletSecurityWarning')}</p></div><div className="flex gap-2"><input type="text" placeholder={t('menu.securityToken')} className="flex-1 bg-black border border-yellow-700 rounded p-2 text-xs text-white" value={walletToken} onChange={(e) => setWalletToken(e.target.value)}/><button onClick={handleRequestWalletToken} disabled={isWalletTokenSending} className="bg-yellow-700 text-black font-bold text-xs px-3 rounded hover:bg-yellow-600 whitespace-nowrap disabled:opacity-60">{isWalletTokenSending ? t('menu.sending') : t('menu.request')}</button></div></div><Button onClick={handleSaveWallets} disabled={isWalletSaving} variant="success" className="w-full text-xs py-3 flex items-center justify-center gap-2"><Save size={16}/> {isWalletSaving ? t('menu.saving') : t('menu.saveWallets')}</Button></div></Card>
                 </div>
            </div>
        )
    }

    return (
        <div className="px-4 pb-24 animate-fadeIn">
            <h2 className="text-2xl font-bold text-white mb-6 mt-4">{t('menu.title')}</h2>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <p className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <ExternalLink size={12} className="text-purple-400"/> {t('menu.inviteLink')}
                </p>
                <div className="flex items-center gap-2 bg-black rounded p-2 border border-gray-700">
                    <code className="text-xs text-green-400 flex-1 truncate">
                        https://miningpoints.com/ref/{state.user.username}
                    </code>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(`https://miningpoints.com/ref/${state.user.username}`);
                            addNotification(t('menu.linkCopied'), 'success');
                        }}
                        className="text-gray-400 hover:text-white transition"
                    >
                        <Copy size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <button onClick={() => navigate('forum')} className="bg-gray-800 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition xl:hidden"><MessageSquare className="text-yellow-400" size={32} /><span className="text-white font-bold text-sm">{t('menu.forum')}</span></button>
                <button onClick={() => setSubTab('team')} className="bg-gray-800 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition xl:hidden"><Users className="text-purple-400" size={32} /><span className="text-white font-bold text-sm">{t('menu.team')}</span></button>
                <button onClick={() => setSubTab('support')} className="bg-gray-800 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition xl:hidden"><Bot className="text-blue-400" size={32} /><span className="text-white font-bold text-sm">{t('menu.supportAI')}</span></button>
                <button onClick={() => setSubTab('config')} className="bg-gray-800 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition"><Settings className="text-gray-400" size={32} /><span className="text-white font-bold text-sm">{t('menu.settings')}</span></button>
                <button onClick={() => setSubTab('language')} className="bg-gray-800 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition"><Globe className="text-green-400" size={32} /><span className="text-white font-bold text-sm">{t('menu.language')}</span></button>
            </div>

            {/* Container Material */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Download size={18} className="text-indigo-400" />
                    <h3 className="text-white font-bold text-sm">{t('menu.marketingMaterials')}</h3>
                </div>
                <p className="text-gray-400 text-xs mb-4">
                    {t('menu.marketingMaterialsDesc')}
                </p>
                <button 
                    onClick={() => {
                        setMaterialsLangOverride(state.user.language);
                        setShowMaterialsModal(true);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-center py-3 rounded-lg font-bold text-sm transition-colors"
                >
                    {t('menu.openMaterialsHub')}
                </button>
            </div>

            {/* Modal de Materiais */}
            {showMaterialsModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-gray-900 border-gray-700 p-5">
                        {isAdmin && (
                            <div className="mb-4">
                                <label className="text-[10px] text-gray-500 uppercase block mb-1">{t('menu.language')}</label>
                                <select
                                    value={materialsLangOverride}
                                    onChange={(e) => setMaterialsLangOverride(e.target.value)}
                                    className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                                >
                                    {AVAILABLE_LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name} ({lang.code})
                                        </option>
                                    ))}
                                </select>
                                <div className="mt-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-900/30 text-indigo-300 border border-indigo-700/50">
                                        Testando: {materialsLangOverride}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Download size={18} className="text-indigo-400" />
                                {t('menu.marketingMaterials')}
                            </h3>
                            <Button size="icon" variant="ghost" onClick={() => setShowMaterialsModal(false)}>
                                <X size={18} />
                            </Button>
                        </div>
                        
                        {(() => {
                            const activeLang = isAdmin ? materialsLangOverride : state.user.language;
                            const materials = state.marketingMaterials?.[activeLang];
                            const isEmpty = !materials || Object.values(materials).every(val => !val);

                            return (
                        <div className="space-y-3">
                            {materials?.pdf && (
                                <a 
                                    href={materials.pdf}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-400 text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-between transition-colors"
                                >
                                    <span>{t('menu.downloadPdf')}</span>
                                    <ExternalLink size={16} />
                                </a>
                            )}
                            
                            {materials?.banners && (
                                <a 
                                    href={materials.banners}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full bg-blue-900/20 border border-blue-900/50 hover:bg-blue-900/40 text-blue-400 text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-between transition-colors"
                                >
                                    <span>{t('menu.downloadBanners')}</span>
                                    <ExternalLink size={16} />
                                </a>
                            )}
                            
                            {materials?.video1 && (
                                <a 
                                    href={materials.video1}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full bg-purple-900/20 border border-purple-900/50 hover:bg-purple-900/40 text-purple-400 text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-between transition-colors"
                                >
                                    <span>{t('menu.downloadVideo1')}</span>
                                    <ExternalLink size={16} />
                                </a>
                            )}
                            
                            {materials?.video2 && (
                                <a 
                                    href={materials.video2}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full bg-purple-900/20 border border-purple-900/50 hover:bg-purple-900/40 text-purple-400 text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-between transition-colors"
                                >
                                    <span>{t('menu.downloadVideo2')}</span>
                                    <ExternalLink size={16} />
                                </a>
                            )}
                            
                            {materials?.video3 && (
                                <a 
                                    href={materials.video3}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full bg-purple-900/20 border border-purple-900/50 hover:bg-purple-900/40 text-purple-400 text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-between transition-colors"
                                >
                                    <span>{t('menu.downloadVideo3')}</span>
                                    <ExternalLink size={16} />
                                </a>
                            )}
                            
                            {isEmpty && (
                                <div className="text-center py-6 text-gray-500 text-sm bg-black/40 rounded-lg border border-gray-800">
                                    {t('menu.noMaterialsAvailable')}
                                </div>
                            )}
                        </div>
                            );
                        })()}
                    </Card>
                </div>
            )}

            {/* Acesso Admin (Apenas para Master, Finance e Sócios) */}
            {(state.user.role === 'admin_master' || state.user.role === 'admin_finance' || state.user.role === 'admin_partner') && (
                <div className="mb-6">
                    <Button onClick={() => navigate('admin')} className="w-full bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40">
                        <Shield size={16} className="mr-2" /> {state.user.role === 'admin_partner' ? t('menu.partnerPanel') : t('menu.adminPanel')}
                    </Button>
                </div>
            )}

            <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-white text-sm mb-3">{t('menu.langPrefs')}</h3>
                <div className="flex gap-2">
                    {[
                        { label: 'US', code: 'en' },
                        { label: 'BR', code: 'pt-BR' },
                        { label: 'ES', code: 'es' }
                    ].map(lang => {
                        const isActive = state.user.language === lang.code;
                        return (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`flex-1 py-2 rounded text-xs transition-all border 
                                    ${isActive 
                                        ? 'bg-green-900/40 border-green-400 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.9)]' 
                                        : 'bg-black border-gray-700 text-gray-400 hover:border-purple-500 hover:text-white'
                                    }`}
                            >
                                {lang.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <Button 
                onClick={async () => { 
                    if(window.confirm(t('menu.logoutConfirm'))) { 
                        await supabase.auth.signOut();
                        localStorage.removeItem('mining_points_mvp_v1'); 
                        window.location.href = '/'; // Redireciona para a raiz limpando estado
                    }
                }} 
                variant="secondary" 
                className="w-full mt-6 flex items-center justify-center gap-2 text-red-400 border-red-900 hover:bg-red-900/20"
            >
                <LogOut size={16}/> {t('menu.logout')}
            </Button>
        </div>
    );
};
