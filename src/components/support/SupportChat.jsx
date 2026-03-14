import React, { useState, useEffect, useRef, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, User, Headphones, Clock, CheckCircle } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

export const SupportChat = () => {
    const { state, t } = useContext(AppContext);
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Scroll para o fim
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Inicialização: Buscar ou Criar Ticket
    useEffect(() => {
        const initChat = async () => {
            try {
                setLoading(true);
                const userId = state.user.id;

                // 1. Buscar ticket aberto
                let { data: tickets, error } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .eq('user_id', userId)
                    .in('status', ['open', 'in_progress'])
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) throw error;

                let currentTicket = tickets && tickets.length > 0 ? tickets[0] : null;

                // 2. Se não existir, criar um novo
                if (!currentTicket) {
                    const { data: newTicket, error: createError } = await supabase
                        .from('support_tickets')
                        .insert([{ user_id: userId, status: 'open' }])
                        .select()
                        .single();
                    
                    if (createError) throw createError;
                    currentTicket = newTicket;
                }

                setTicket(currentTicket);
                await fetchMessages(currentTicket.id);

            } catch (error) {
                console.error("Erro ao iniciar chat:", error);
            } finally {
                setLoading(false);
            }
        };

        initChat();
    }, [state.user.id]);

    // Polling para mensagens
    useEffect(() => {
        if (!ticket) return;

        const interval = setInterval(() => {
            fetchMessages(ticket.id);
        }, 5000);

        return () => clearInterval(interval);
    }, [ticket]);

    const fetchMessages = async (ticketId) => {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !ticket) return;

        setSending(true);
        try {
            const { error } = await supabase
                .from('support_messages')
                .insert([{
                    ticket_id: ticket.id,
                    sender_id: state.user.id,
                    message: newMessage.trim(),
                    is_admin: false
                }]);

            if (error) throw error;

            setNewMessage('');
            await fetchMessages(ticket.id);
        } catch (error) {
            console.error("Erro ao enviar:", error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[60vh] bg-gray-900 rounded-xl border border-gray-800 overflow-hidden relative">
            {/* Header */}
            <div className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            <Headphones size={16} className="text-white"/>
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-gray-800 ${ticket?.status === 'in_progress' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white">{t('menu.onlineSupportTitle')}</h4>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            {ticket?.status === 'in_progress' ? (
                                <span className="text-green-400 flex items-center gap-1"><User size={10}/> Atendente na sala</span>
                            ) : (
                                <span className="text-yellow-400 flex items-center gap-1"><Clock size={10}/> Aguardando atendente...</span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-900/50">
                {loading ? (
                    <div className="text-center text-gray-500 text-xs mt-10">Conectando...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs mt-10">
                        <p>{t('menu.welcomeSupport')}</p>
                        <p className="mt-2">Como podemos ajudar hoje?</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] p-3 rounded-xl text-xs ${
                                msg.is_admin 
                                    ? 'bg-gray-800 text-gray-200 rounded-tl-none' 
                                    : 'bg-purple-900/50 text-white border border-purple-500/30 rounded-tr-none'
                            }`}>
                                <p>{msg.message}</p>
                                <span className="text-[9px] text-gray-500 block mt-1 text-right opacity-70">
                                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="bg-gray-800 p-3 border-t border-gray-700 flex gap-2">
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('menu.typeMessagePlaceholder')} 
                    className="flex-1 bg-black/50 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                    disabled={loading || sending}
                />
                <button 
                    type="submit" 
                    disabled={loading || sending || !newMessage.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
};
