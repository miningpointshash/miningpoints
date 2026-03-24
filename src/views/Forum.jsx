import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { ChevronLeft, MessageSquare, ThumbsUp, ThumbsDown, MessageCircle, Send, Swords, Search, User, AlertTriangle, X } from 'lucide-react';

export const ForumView = ({ navigate }) => {
    const { state, t, addNotification, setState } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('topics'); // 'topics', 'messages'
    const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'detail', 'chat', 'challenge'
    
    // Reports
    const [reportModal, setReportModal] = useState({ isOpen: false, type: '', itemId: '', reportedUserId: '' });
    const [reportReason, setReportReason] = useState('Spam');

    
    const getAvatarSrc = (value) => {
        const raw = String(value || '').trim();
        if (!raw || raw === 'default') return '/assets/persona/mp_p6.svg';
        if (/^https?:\/\//i.test(raw)) return raw;
        return `/assets/persona/${raw}.svg`;
    };
    
    // Topics
    const [topics, setTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [comments, setComments] = useState([]);
    const [likedTopicMap, setLikedTopicMap] = useState({});
    const [unreadBySender, setUnreadBySender] = useState({});
    const [unreadTotal, setUnreadTotal] = useState(0);
    
    // Forms
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newComment, setNewComment] = useState('');

    // Messages
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newChatMessage, setNewChatMessage] = useState('');
    const contactsRef = useRef([]);
    const [isSendingChallenge, setIsSendingChallenge] = useState(false);
    const [duelRoomStatusById, setDuelRoomStatusById] = useState({});

    // Challenge
    const [betAmount, setBetAmount] = useState(100);
    const [duelGameType, setDuelGameType] = useState('twelve_doors');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'topics' && viewMode === 'list') {
            fetchTopics();
        } else if (activeTab === 'messages' && viewMode === 'list') {
            fetchContacts();
            fetchUnreadCounts();
        }
    }, [activeTab, viewMode]);

    useEffect(() => {
        if (viewMode === 'detail' && selectedTopic) {
            fetchComments(selectedTopic.id);
        } else if (viewMode === 'chat' && selectedContact) {
            fetchChatMessages(selectedContact.id);
            
            // Subscribe to new messages
            const channel = supabase.channel(`chat_${selectedContact.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'forum_messages',
                    filter: `sender_id=eq.${selectedContact.id}`
                }, payload => {
                    if (payload.new.receiver_id === state.user.id) {
                        setChatMessages(prev => [...prev, payload.new]);
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [viewMode, selectedTopic, selectedContact]);

    const ADMIN_ROLES = ['admin_master', 'admin_finance'];
    const isAuditor = ADMIN_ROLES.includes(state?.user?.role);
    const HIDE_ADMIN = !isAuditor;

    const extractUuid = (value) => {
        const s = String(value || '').trim();
        const m = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        return m ? m[0] : '';
    };

    const saveActivePvpRoomId = (roomId) => {
        const uid = state?.user?.id || 'anon';
        const clean = extractUuid(roomId);
        if (!clean) return;
        try { localStorage.setItem(`mining_points_active_pvp_room_${uid}`, clean); } catch {}
    };

    const buildDuelLink = (roomId, password, autoJoin = true) => {
        const url = new URL(window.location.href);
        url.pathname = '/';
        url.searchParams.set('view', 'arcade');
        url.searchParams.set('room', roomId);
        if (password) url.searchParams.set('pwd', password);
        if (autoJoin) url.searchParams.set('auto', '1');
        url.searchParams.delete('auth');
        return url.toString();
    };

    const openArcadeRoom = (roomId, password, autoJoin) => {
        const url = new URL(window.location.href);
        url.pathname = '/';
        url.searchParams.set('view', 'arcade');
        url.searchParams.set('room', roomId);
        if (password) url.searchParams.set('pwd', password);
        else url.searchParams.delete('pwd');
        if (autoJoin) url.searchParams.set('auto', '1');
        else url.searchParams.delete('auto');
        url.searchParams.delete('auth');
        history.replaceState(null, '', url.toString());
        navigate('arcade');
    };

    useEffect(() => {
        contactsRef.current = contacts || [];
    }, [contacts]);

    useEffect(() => {
        const myId = state?.user?.id;
        if (!myId) return;

        const channel = supabase
            .channel(`forum_inbox_${myId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'forum_messages',
                filter: `receiver_id=eq.${myId}`
            }, async (payload) => {
                const msg = payload?.new;
                if (!msg?.id || !msg?.sender_id) return;

                const senderId = msg.sender_id;
                const inChat = viewMode === 'chat' && selectedContact?.id === senderId;

                if (inChat) {
                    setChatMessages(prev => {
                        const exists = (prev || []).some(m => m.id === msg.id);
                        if (exists) return prev;
                        return [...(prev || []), msg];
                    });
                    await supabase.from('forum_messages')
                        .update({ is_read: true })
                        .eq('id', msg.id);
                    return;
                }

                setUnreadBySender(prev => ({ ...prev, [senderId]: Number(prev?.[senderId] || 0) + 1 }));
                setUnreadTotal(prev => Number(prev || 0) + 1);

                if (msg.is_duel_invite) {
                    let senderName = '';
                    const existing = (contactsRef.current || []).find(c => c.id === senderId);
                    if (existing?.username) senderName = existing.username;

                    if (!senderName) {
                        const { data: p } = await supabase
                            .from('profiles')
                            .select('id,username,avatar_url,role')
                            .eq('id', senderId)
                            .maybeSingle();
                        if (p?.role && HIDE_ADMIN && ADMIN_ROLES.includes(p.role)) return;
                        if (p?.username) senderName = p.username;
                        if (p?.id) {
                            setContacts(prev => {
                                const next = (prev || []).filter(x => x.id !== p.id);
                                return [p, ...next];
                            });
                        }
                    }

                    addNotification(`${t('forum.duelInviteFrom', 'Convite de duelo de')} ${senderName || t('forum.userGeneric', 'usuário')}!`, 'game');
                } else {
                    const existing = (contactsRef.current || []).find(c => c.id === senderId);
                    if (!existing?.id) {
                        const { data: p } = await supabase
                            .from('profiles')
                            .select('id,username,avatar_url,role')
                            .eq('id', senderId)
                            .maybeSingle();
                        if (p?.role && HIDE_ADMIN && ADMIN_ROLES.includes(p.role)) return;
                        if (p?.id) {
                            setContacts(prev => {
                                const next = (prev || []).filter(x => x.id !== p.id);
                                return [p, ...next];
                            });
                        }
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [state?.user?.id, viewMode, selectedContact?.id, HIDE_ADMIN]);

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('forum_topics')
                .select(`
                    *,
                    profiles:user_id (username, avatar_url, role),
                    forum_comments(count)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            const rows = data || [];
            // Exibir conteúdos de admin para todos; esconder somente contatos
            setTopics(rows);
            await fetchMyTopicLikes(rows.map(r => r.id).filter(Boolean));
        } catch (err) {
            console.error(err);
            addNotification(t('forum.loadTopicsError', 'Erro ao carregar tópicos'), 'danger');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyTopicLikes = async (topicIds) => {
        const uid = state?.user?.id;
        if (!uid || !Array.isArray(topicIds) || topicIds.length === 0) {
            setLikedTopicMap({});
            return;
        }
        try {
            const { data, error } = await supabase
                .from('forum_topic_likes')
                .select('topic_id')
                .eq('user_id', uid)
                .in('topic_id', topicIds);
            if (error) throw error;
            const next = (data || []).reduce((acc, r) => {
                if (r?.topic_id) acc[r.topic_id] = true;
                return acc;
            }, {});
            setLikedTopicMap(next);
        } catch (err) {
            console.error(err);
            setLikedTopicMap({});
        }
    };

    const toggleTopicLike = async (topicId) => {
        const uid = state?.user?.id;
        if (!uid || !topicId) return;
        try {
            const { data, error } = await supabase.rpc('toggle_forum_topic_like', { p_topic_id: topicId });
            if (error) throw error;
            if (!data?.ok) throw new Error('Falha ao registrar like');

            const likes = Number(data.likes || 0);
            const liked = Boolean(data.liked);

            setLikedTopicMap(prev => ({ ...prev, [topicId]: liked }));
            setTopics(prev => (prev || []).map(t => t.id === topicId ? { ...t, likes } : t));
            setSelectedTopic(prev => (prev?.id === topicId ? { ...prev, likes } : prev));
        } catch (err) {
            console.error(err);
            addNotification(t('forum.likeError', 'Erro ao registrar like'), 'danger');
        }
    };

    const fetchUnreadCounts = async () => {
        const myId = state?.user?.id;
        if (!myId) return;
        try {
            const { data, error } = await supabase
                .from('forum_messages')
                .select('sender_id')
                .eq('receiver_id', myId)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            const map = (data || []).reduce((acc, r) => {
                if (!r?.sender_id) return acc;
                acc[r.sender_id] = Number(acc[r.sender_id] || 0) + 1;
                return acc;
            }, {});
            setUnreadBySender(map);
            setUnreadTotal(Object.values(map).reduce((acc, n) => acc + Number(n || 0), 0));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchComments = async (topicId) => {
        try {
            const { data, error } = await supabase
                .from('forum_comments')
                .select(`*, profiles:user_id (username, avatar_url, role)`)
                .eq('topic_id', topicId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            const rows = data || [];
            // Exibir conteúdos de admin para todos; esconder somente contatos
            setComments(rows);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateTopic = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        try {
            const { error } = await supabase.from('forum_topics').insert([{
                user_id: state.user.id,
                title: newTitle,
                content: newContent
            }]);
            if (error) throw error;
            setNewTitle('');
            setNewContent('');
            setViewMode('list');
            addNotification(t('forum.topicCreated', 'Tópico criado!'), 'success');
        } catch (err) {
            addNotification(t('forum.createTopicError', 'Erro ao criar tópico'), 'danger');
        }
    };

    const handleCreateComment = async () => {
        if (!newComment.trim() || !selectedTopic) return;
        try {
            const { data, error } = await supabase.from('forum_comments').insert([{
                topic_id: selectedTopic.id,
                user_id: state.user.id,
                content: newComment
            }]).select('*, profiles:user_id(username, avatar_url)').single();
            if (error) throw error;
            setComments(prev => [...prev, data]);
            setNewComment('');
        } catch (err) {
            addNotification(t('forum.sendError', 'Erro ao enviar'), 'danger');
        }
    };

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const myId = state.user.id;
            // 1) Buscar participantes recentes de conversas (garante que o destinatário veja os desafios recebidos)
            const { data: recentMsgs, error: msgErr } = await supabase
                .from('forum_messages')
                .select('sender_id, receiver_id, created_at')
                .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
                .order('created_at', { ascending: false })
                .limit(100);
            if (msgErr) throw msgErr;

            const idSet = new Set();
            (recentMsgs || []).forEach(m => {
                if (m.sender_id && m.sender_id !== myId) idSet.add(m.sender_id);
                if (m.receiver_id && m.receiver_id !== myId) idSet.add(m.receiver_id);
            });

            let ids = Array.from(idSet);

            // Fallback: sem conversas ainda, lista geral (limitada)
            if (ids.length === 0) {
                let q = supabase
                    .from('profiles')
                    .select('id')
                    .neq('id', myId)
                    .limit(50);
                if (HIDE_ADMIN) q = q.neq('role', 'admin_master').neq('role', 'admin_finance');
                const { data: fallback, error: fbErr } = await q;
                if (!fbErr && Array.isArray(fallback)) {
                    ids = fallback.map(p => p.id);
                }
            }

            if (ids.length === 0) {
                setContacts([]);
                return;
            }

            let profQuery = supabase
                .from('profiles')
                .select('id, username, avatar_url, role')
                .in('id', ids);
            if (HIDE_ADMIN) profQuery = profQuery.neq('role', 'admin_master').neq('role', 'admin_finance');

            const { data: profiles, error: profErr } = await profQuery;
            if (profErr) throw profErr;

            // Ordenar conforme ordem de atividade recente
            const orderMap = ids.reduce((acc, id, i) => { acc[id] = i; return acc; }, {});
            const rows = (profiles || []).sort((a, b) => (orderMap[a.id] ?? 9999) - (orderMap[b.id] ?? 9999));
            setContacts(rows);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatMessages = async (contactId) => {
        try {
            const { data, error } = await supabase
                .from('forum_messages')
                .select('*')
                .or(`and(sender_id.eq.${state.user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${state.user.id})`)
                .order('created_at', { ascending: true });
            if (error) throw error;
            const rows = data || [];
            setChatMessages(rows);
            await primeDuelRoomStatusCache(rows);
            
            // Mark as read
            await supabase.from('forum_messages')
                .update({ is_read: true })
                .eq('sender_id', contactId)
                .eq('receiver_id', state.user.id)
                .eq('is_read', false);
            await fetchUnreadCounts();
                
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = async () => {
        if (!newChatMessage.trim() || !selectedContact) return;
        try {
            const msg = {
                sender_id: state.user.id,
                receiver_id: selectedContact.id,
                content: newChatMessage,
                is_duel_invite: false
            };
            const { data, error } = await supabase.from('forum_messages').insert([msg]).select().single();
            if (error) throw error;
            setChatMessages(prev => [...prev, data]);
            setNewChatMessage('');
        } catch (err) {
            addNotification(t('forum.sendError', 'Erro ao enviar'), 'danger');
        }
    };

    const handleSendChallenge = async () => {
        if (!selectedContact) return;
        if (isSendingChallenge) return;
        if (state.wallet.mph < betAmount) {
            addNotification(t('arcade.insufficientFunds', 'Saldo insuficiente'), 'danger');
            return;
        }

        setIsSendingChallenge(true);
        try {
            const password = String(Math.floor(100000 + Math.random() * 900000));

            const { data: rpcData, error: rpcError } = await supabase.rpc('create_pvp_room', {
                p_game_type: duelGameType,
                p_bet_amount_mph: betAmount,
                p_creator_avatar: state.user.avatar_url || 'mp_p1',
                p_is_private: true,
                p_password: password
            });

            if (rpcError) throw rpcError;
            if (!rpcData?.ok) throw new Error(rpcData?.error || 'Erro ao criar sala');

            const roomId = rpcData.room_id;
            const duelTag = `[Duelo #${String(roomId).slice(0,8)}]`;
            const duelGameLabel = duelGameType === 'hash_harvest' ? 'Hash Harvest' : '12 Doors';
            setDuelRoomStatusById(prev => ({ ...prev, [roomId]: 'open' }));
            if (rpcData?.balance_mph !== undefined) {
                setState(prev => ({
                    ...prev,
                    wallet: {
                        ...prev.wallet,
                        mph: Number(rpcData.balance_mph || prev.wallet.mph || 0)
                    }
                }));
            }

            const msg = {
                sender_id: state.user.id,
                receiver_id: selectedContact.id,
                content: `${t('forum.challengeMessage', 'Te desafiou para um duelo de')} ${betAmount} MPH ${t('forum.challengeMessageGameConnector', 'no')} ${duelGameLabel}! ${duelTag}`,
                is_duel_invite: true,
                duel_room_id: roomId,
                duel_password: password,
                duel_bet_amount_mph: betAmount,
                duel_game_type: duelGameType
            };
            const { data, error } = await supabase.from('forum_messages').insert([msg]).select().single();
            if (error) throw error;
            
            setChatMessages(prev => [...prev, data]);
            setViewMode('chat');
            saveActivePvpRoomId(roomId);
            addNotification(t('forum.challengeSent', 'Desafio enviado!'), 'success');
        } catch (err) {
            console.error(err);
            addNotification(`${t('forum.challengeSendError', 'Erro ao desafiar')}: ${err.message}`, 'danger');
        } finally {
            setIsSendingChallenge(false);
        }
    };

    const handleAcceptDuel = async (roomId, password) => {
        openArcadeRoom(roomId, password || '', true);
    };

    const primeDuelRoomStatusCache = async (messages) => {
        const myId = state?.user?.id;
        if (!myId) return;
        const ids = (messages || [])
            .filter(m => m?.is_duel_invite && m?.sender_id === myId && m?.duel_room_id)
            .map(m => m.duel_room_id);
        const unique = Array.from(new Set(ids.map(x => String(x)))).filter(Boolean);
        const missing = unique.filter(id => duelRoomStatusById?.[id] === undefined);
        if (missing.length === 0) return;

        try {
            const { data, error } = await supabase
                .from('pvp_rooms')
                .select('id,status')
                .in('id', missing);
            if (error) throw error;
            const next = (data || []).reduce((acc, r) => {
                if (r?.id) acc[String(r.id)] = r.status;
                return acc;
            }, {});
            setDuelRoomStatusById(prev => ({ ...prev, ...next }));
        } catch (e) {
            console.error(e);
        }
    };

    const handleReport = async () => {
        if (!reportModal.itemId || !reportReason) return;
        try {
            if (String(reportModal.reportedUserId || '') === String(state?.user?.id || '')) {
                addNotification(t('forum.reportSelfError', 'Você não pode denunciar seu próprio conteúdo.'), 'danger');
                return;
            }
            const { error } = await supabase.from('forum_reports').insert([{
                reporter_id: state.user.id,
                reported_user_id: reportModal.reportedUserId,
                item_type: reportModal.type,
                item_id: reportModal.itemId,
                reason: reportReason
            }]);
            if (error) throw error;
            addNotification(t('forum.reportSent', 'Denúncia enviada com sucesso.'), 'success');
            setReportModal({ isOpen: false, type: '', itemId: '', reportedUserId: '' });
        } catch (err) {
            console.error(err);
            if (err?.code === '42501') {
                addNotification(t('forum.reportPermissionError', 'Permissão negada para registrar denúncia. Verifique as políticas RLS do Supabase.'), 'danger');
                return;
            }
            addNotification(t('forum.reportError', 'Erro ao enviar denúncia.'), 'danger');
        }
    };

    const formatTimeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor(diff / (1000 * 60));
        if (days > 0) return `${days}${t('forum.timeDaysAgo', 'd atrás')}`;
        if (hours > 0) return `${hours}${t('forum.timeHoursAgo', 'h atrás')}`;
        return `${mins}${t('forum.timeMinsAgo', 'm atrás')}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white pb-24">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {viewMode !== 'list' && (
                        <button onClick={() => setViewMode('list')} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                            <ChevronLeft size={18} />
                        </button>
                    )}
                    <h1 className="text-lg font-bold">
                        {viewMode === 'list' && t('forum.communityForum', 'Fórum da Comunidade')}
                        {viewMode === 'create' && t('forum.createTopic', 'Criar Tópico')}
                        {viewMode === 'detail' && t('forum.comments', 'Comentários')}
                        {viewMode === 'chat' && `${t('forum.chatWith', 'Conversar com')} ${selectedContact?.username}`}
                        {viewMode === 'challenge' && t('forum.challengeTitle', 'Desafiar para Duelo')}
                    </h1>
                </div>
            </div>

            {/* Tabs */}
            {viewMode === 'list' && (
                <div className="flex border-b border-gray-800 bg-gray-900">
                    <button 
                        onClick={() => setActiveTab('topics')} 
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'topics' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400'}`}
                    >
                        {t('forum.topics', 'Tópicos')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('messages')} 
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'messages' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400'}`}
                    >
                        <span className="inline-flex items-center justify-center gap-2">
                            <span>{t('forum.messages', 'Mensagens')}</span>
                            {unreadTotal > 0 && (
                                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                    {unreadTotal > 99 ? '99+' : unreadTotal}
                                </span>
                            )}
                        </span>
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                
                {/* --- TOPICS LIST --- */}
                {viewMode === 'list' && activeTab === 'topics' && (
                    <div className="space-y-4">
                        <button 
                            onClick={() => setViewMode('create')}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
                        >
                            {t('forum.newTopic', '+ Novo Tópico')}
                        </button>
                        
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
                        ) : topics.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">{t('forum.noTopics', 'Nenhum tópico encontrado.')}</div>
                        ) : (
                            topics.map(topic => (
                                <div key={topic.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors" onClick={() => { setSelectedTopic(topic); setViewMode('detail'); }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                                                <img src={getAvatarSrc(topic.profiles?.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold flex items-center gap-2">
                                                    {topic.profiles?.username}
                                                    {['admin_master','admin_finance'].includes(topic?.profiles?.role) && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 bg-red-900/20 uppercase tracking-wide">ADMIN</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500">{formatTimeAgo(topic.created_at)}</div>
                                            </div>
                                        </div>
                                        {topic.user_id !== state.user.id && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedContact({ id: topic.user_id, username: topic.profiles?.username, avatar_url: topic.profiles?.avatar_url });
                                                    setViewMode('challenge');
                                                }}
                                                className="flex items-center gap-1 border border-red-900/50 bg-red-900/20 text-red-400 px-2 py-1 rounded text-xs hover:bg-red-900/40"
                                            >
                                                <Swords size={12} /> {t('forum.duel', 'DUELO')}
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-white mb-1">{topic.title}</h3>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{topic.content}</p>
                                    <div className="flex items-center gap-4 text-gray-500 text-xs">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleTopicLike(topic.id); }}
                                            className={`flex items-center gap-1 transition-colors ${likedTopicMap?.[topic.id] ? 'text-green-400' : 'text-gray-500 hover:text-green-400'}`}
                                            title={t('forum.like', 'Curtir')}
                                        >
                                            <ThumbsUp size={14} /> {topic.likes}
                                        </button>
                                        <span className="flex items-center gap-1"><MessageCircle size={14} /> {topic.forum_comments?.[0]?.count || 0}</span>
                                        {topic.user_id !== state.user.id && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReportModal({ isOpen: true, type: 'topic', itemId: topic.id, reportedUserId: topic.user_id });
                                                }}
                                                className="ml-auto text-red-500/50 hover:text-red-500 transition-colors"
                                                title={t('forum.reportTopic', 'Denunciar Tópico')}
                                            >
                                                <AlertTriangle size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- MESSAGES (CONTACTS) LIST --- */}
                {viewMode === 'list' && activeTab === 'messages' && (
                    <div className="space-y-2">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
                        ) : contacts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">{t('forum.noMessages', 'Nenhum usuário encontrado.')}</div>
                        ) : (
                            contacts.map(contact => (
                                <div 
                                    key={contact.id} 
                                    onClick={() => { setSelectedContact(contact); setViewMode('chat'); }}
                                    className="flex items-center justify-between bg-gray-900 p-3 rounded-xl border border-gray-800 hover:bg-gray-800 cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                                            <img src={getAvatarSrc(contact.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="font-bold">{contact.username}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {Number(unreadBySender?.[contact.id] || 0) > 0 && (
                                            <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                                {Number(unreadBySender?.[contact.id] || 0) > 99 ? '99+' : Number(unreadBySender?.[contact.id] || 0)}
                                            </span>
                                        )}
                                        <MessageSquare size={16} className="text-gray-500" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- CREATE TOPIC --- */}
                {viewMode === 'create' && (
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder={t('forum.topicTitle', 'Título do tópico...')} 
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none"
                        />
                        <textarea 
                            placeholder={t('forum.topicContent', 'Partilha a tua estratégia ou dúvida...')}
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            rows={8}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setViewMode('list')} className="flex-1 py-3 bg-gray-800 rounded-xl font-bold hover:bg-gray-700">
                                {t('forum.cancel', 'Cancelar')}
                            </button>
                            <button onClick={handleCreateTopic} className="flex-1 py-3 bg-purple-600 rounded-xl font-bold hover:bg-purple-500">
                                {t('forum.publish', 'PUBLICAR')}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- TOPIC DETAIL --- */}
                {viewMode === 'detail' && selectedTopic && (
                    <div className="space-y-6">
                        {/* Original Post */}
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                                    <img src={getAvatarSrc(selectedTopic.profiles?.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                                        {selectedTopic.title}
                                    </h2>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        <User size={10} /> {selectedTopic.profiles?.username}
                                        {['admin_master','admin_finance'].includes(selectedTopic?.profiles?.role) && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 bg-red-900/20 uppercase tracking-wide">ADMIN</span>
                                        )}
                                        <span>• {formatTimeAgo(selectedTopic.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-300 whitespace-pre-wrap text-sm">{selectedTopic.content}</p>
                            <div className="flex items-center gap-4 text-gray-500 text-xs mt-4 pt-4 border-t border-gray-800">
                                <button
                                    onClick={() => toggleTopicLike(selectedTopic.id)}
                                    className={`flex items-center gap-1 transition-colors ${likedTopicMap?.[selectedTopic.id] ? 'text-green-400' : 'text-gray-500 hover:text-green-400'}`}
                                    title={t('forum.like', 'Curtir')}
                                >
                                    <ThumbsUp size={14} /> {selectedTopic.likes} {t('forum.likes', 'Curtidas')}
                                </button>
                                <span className="flex items-center gap-1"><MessageCircle size={14} /> {comments.length} {t('forum.comments', 'Comentários')}</span>
                            </div>
                        </div>

                        {/* Comments */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">{t('forum.replies', 'RESPOSTAS')}</h3>
                            <div className="space-y-3">
                                {comments.map(c => (
                                    <div key={c.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-800 overflow-hidden">
                                                    <img src={getAvatarSrc(c.profiles?.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-sm font-bold flex items-center gap-2">
                                                    {c.profiles?.username}
                                                    {['admin_master','admin_finance'].includes(c?.profiles?.role) && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 bg-red-900/20 uppercase tracking-wide">ADMIN</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500">{formatTimeAgo(c.created_at)}</span>
                                                {c.user_id !== state.user.id && (
                                                    <button 
                                                        onClick={() => setReportModal({ isOpen: true, type: 'comment', itemId: c.id, reportedUserId: c.user_id })}
                                                        className="text-red-500/50 hover:text-red-500 transition-colors"
                                                        title={t('forum.reportComment', 'Denunciar Comentário')}
                                                    >
                                                        <AlertTriangle size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-300">{c.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CHAT --- */}
                {viewMode === 'chat' && selectedContact && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                            {chatMessages.map(msg => {
                                const isMe = msg.sender_id === state.user.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl ${isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                                            <p className="text-sm">{msg.content}</p>
                                            {msg.is_duel_invite && (
                                                <div className="mt-2 space-y-2">
                                                    {!isMe && (
                                                        <button 
                                                            onClick={() => handleAcceptDuel(msg.duel_room_id, msg.duel_password)}
                                                            className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1"
                                                        >
                                                            <Swords size={12} /> {t('forum.acceptDuel', 'Aceitar Duelo')}
                                                        </button>
                                                    )}
                                                    {!isMe && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await supabase.from('forum_messages').insert([{
                                                                        sender_id: state.user.id,
                                                                        receiver_id: selectedContact.id,
                                                                        content: `${state.user.username} recusou o duelo.`,
                                                                        is_duel_invite: false,
                                                                        duel_room_id: msg.duel_room_id || null
                                                                    }]);
                                                                    addNotification(t('forum.challengeRejected', 'Desafio rejeitado.'), 'info');
                                                                } catch {}
                                                            }}
                                                            className="w-full bg-black/40 border border-gray-700 hover:border-gray-500 text-gray-300 text-xs font-bold py-2 rounded"
                                                        >
                                                            {t('forum.rejectChallenge', 'REJEITAR DESAFIO')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            const link = buildDuelLink(msg.duel_room_id, msg.duel_password, true);
                                                            navigator.clipboard.writeText(link);
                                                            addNotification(t('forum.linkCopied', 'Link copiado!'), 'success');
                                                        }}
                                                        className="w-full bg-black/40 border border-gray-700 hover:border-gray-500 text-gray-200 text-xs font-bold py-2 rounded flex items-center justify-center gap-1"
                                                    >
                                                        {isMe ? t('forum.copyDuelLink', 'COPIAR LINK DO DUELO') : t('forum.copyLink', 'COPIAR LINK')}
                                                    </button>
                                                    {isMe && (
                                                        <button
                                                            onClick={() => openArcadeRoom(msg.duel_room_id, msg.duel_password, false)}
                                                            className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1"
                                                        >
                                                            {t('forum.openRoomWait', 'ABRIR SALA (AGUARDAR)')}
                                                        </button>
                                                    )}
                                                    {isMe && duelRoomStatusById?.[String(msg.duel_room_id)] === 'open' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm(t('forum.confirmCancelChallenge', 'Cancelar este desafio e reembolsar a aposta?'))) return;
                                                                try {
                                                                    const { data, error } = await supabase.rpc('cancel_pvp_room', { p_room_id: msg.duel_room_id });
                                                                    if (error) throw error;
                                                                    if (data?.balance_mph !== undefined) {
                                                                        setState(prev => ({
                                                                            ...prev,
                                                                            wallet: {
                                                                                ...prev.wallet,
                                                                                mph: Number(data.balance_mph || prev.wallet.mph || 0)
                                                                            }
                                                                        }));
                                                                    }
                                                                    setDuelRoomStatusById(prev => ({ ...prev, [String(msg.duel_room_id)]: 'cancelled' }));
                                                                    await supabase.from('forum_messages').insert([{
                                                                        sender_id: state.user.id,
                                                                        receiver_id: selectedContact.id,
                                                                        content: `${state.user.username} cancelou o duelo e foi reembolsado. [Duelo #${String(msg.duel_room_id).slice(0, 8)}]`,
                                                                        is_duel_invite: false,
                                                                        duel_room_id: msg.duel_room_id || null
                                                                    }]);
                                                                    addNotification(t('forum.challengeCancelledRefunded', 'Desafio cancelado e reembolsado.'), 'success');
                                                                } catch (e) {
                                                                    console.error(e);
                                                                    addNotification(t('forum.challengeCancelFailed', 'Não foi possível cancelar (talvez já tenha sido aceito/encerrado).'), 'danger');
                                                                }
                                                            }}
                                                            className="w-full bg-red-900/30 border border-red-700/50 hover:border-red-500 text-red-300 text-xs font-bold py-2 rounded"
                                                        >
                                                            {t('forum.cancelChallengeRefund', 'CANCELAR DESAFIO (REEMBOLSAR)')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {!msg.is_duel_invite && msg.duel_room_id && (
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        onClick={() => openArcadeRoom(msg.duel_room_id, msg.duel_password || '', Boolean(msg.duel_password))}
                                                        className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded"
                                                        title={t('forum.openDuelTitle', 'Abrir duelo')}
                                                    >
                                                        {t('forum.openDuel', 'ABRIR DUELO')}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const link = buildDuelLink(msg.duel_room_id, msg.duel_password || '', Boolean(msg.duel_password));
                                                            navigator.clipboard.writeText(link);
                                                            addNotification(t('forum.duelLinkCopied', 'Link do duelo copiado!'), 'success');
                                                        }}
                                                        className="flex-1 bg-black/40 border border-gray-700 hover:border-gray-500 text-gray-200 text-xs font-bold py-2 rounded"
                                                        title={t('forum.copyDuelLinkTitle', 'Copiar link do duelo')}
                                                    >
                                                        {t('forum.copyLink', 'COPIAR LINK')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1">{formatTimeAgo(msg.created_at)}</span>
                                        {!isMe && (
                                            <button 
                                                onClick={() => setReportModal({ isOpen: true, type: 'message', itemId: msg.id, reportedUserId: msg.sender_id })}
                                                className="text-red-500/30 hover:text-red-500 mt-1"
                                                title={t('forum.reportMessage', 'Denunciar Mensagem')}
                                            >
                                                <AlertTriangle size={10} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- CHALLENGE MODAL --- */}
                {viewMode === 'challenge' && selectedContact && (
                    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden mx-auto mb-4 border-2 border-red-500">
                            <img src={getAvatarSrc(selectedContact.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">{t('forum.challengeUserPrefix', 'Desafiar')} {selectedContact.username}</h2>
                        <p className="text-sm text-gray-400 mb-4">{t('forum.challengeDesc', 'Escolha o jogo e o valor da aposta. A senha é automática para garantir que só o convidado entre.')}</p>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => setDuelGameType('twelve_doors')}
                                className={`p-3 rounded-xl border font-bold text-sm transition-all ${duelGameType === 'twelve_doors' ? 'bg-purple-900/50 border-purple-500 text-white' : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                            >
                                {t('forum.gameTwelveDoors', '12 Doors')}
                            </button>
                            <button
                                onClick={() => setDuelGameType('hash_harvest')}
                                className={`p-3 rounded-xl border font-bold text-sm transition-all ${duelGameType === 'hash_harvest' ? 'bg-purple-900/50 border-purple-500 text-white' : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                            >
                                {t('forum.gameHashHarvest', 'Hash Harvest')}
                            </button>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-400 mb-2">{t('forum.betAmount', 'Aposta (MPH)')}</label>
                            <input 
                                type="number" 
                                value={betAmount} 
                                onChange={e => setBetAmount(Number(e.target.value))}
                                className="w-full bg-black border border-gray-700 rounded-xl p-3 text-center text-xl font-bold text-[#39FF14] outline-none focus:border-purple-500"
                            />
                            <div className="text-xs text-gray-500 mt-2">{t('forum.currentBalance', 'Saldo Atual')}: {state.wallet.mph} MPH</div>
                        </div>

                        <button 
                            onClick={handleSendChallenge}
                            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            disabled={isSendingChallenge}
                        >
                            <Swords size={18} /> {t('forum.sendChallenge', 'Enviar Desafio')}
                        </button>
                    </div>
                )}
            </div>

            {/* Report Modal */}
            {reportModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                        <button 
                            onClick={() => setReportModal({ isOpen: false, type: '', itemId: '', reportedUserId: '' })}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
                            <AlertTriangle size={20} /> {t('forum.reportContentTitle', 'Denunciar Conteúdo')}
                        </h2>
                        <p className="text-sm text-gray-300 mb-4">
                            {t('forum.reportContentDesc', 'Por favor, selecione o motivo da denúncia. Nossa equipe irá analisar e tomar as medidas necessárias.')}
                        </p>
                        <select 
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white mb-6 focus:border-red-500 outline-none"
                        >
                            <option value="Spam">{t('forum.reportReasonSpam', 'Spam ou Propaganda')}</option>
                            <option value="Ofensa">{t('forum.reportReasonAbuse', 'Ofensa ou Assédio')}</option>
                            <option value="Conteúdo Inadequado">{t('forum.reportReasonInappropriate', 'Conteúdo Inadequado')}</option>
                            <option value="Fraude/Golpe">{t('forum.reportReasonFraud', 'Tentativa de Fraude/Golpe')}</option>
                            <option value="Outro">{t('forum.reportReasonOther', 'Outro motivo')}</option>
                        </select>
                        <button 
                            onClick={handleReport}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                        >
                            {t('forum.sendReport', 'ENVIAR DENÚNCIA')}
                        </button>
                    </div>
                </div>
            )}

            {/* Fixed Bottom Input for Chat/Detail */}
            {(viewMode === 'detail' || viewMode === 'chat') && (
                <div className="fixed bottom-[70px] left-1/2 transform -translate-x-1/2 w-full max-w-lg bg-gray-900 border-t border-gray-800 p-3 flex items-center gap-2 z-20">
                    <input 
                        type="text" 
                        value={viewMode === 'detail' ? newComment : newChatMessage}
                        onChange={e => viewMode === 'detail' ? setNewComment(e.target.value) : setNewChatMessage(e.target.value)}
                        placeholder={viewMode === 'detail' ? t('forum.writeComment', 'Escreve um comentário...') : t('forum.typeMessage', 'Digite uma mensagem...')}
                        className="flex-1 bg-black border border-gray-700 rounded-full px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                        onKeyPress={e => e.key === 'Enter' && (viewMode === 'detail' ? handleCreateComment() : handleSendMessage())}
                    />
                    <button 
                        onClick={viewMode === 'detail' ? handleCreateComment : handleSendMessage}
                        className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-500"
                    >
                        <Send size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};
