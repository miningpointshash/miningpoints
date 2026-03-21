import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Send, User, X, Check, Clock, Search, MessageSquare, RefreshCw, Archive } from 'lucide-react';

const SupportAdmin = ({ currentAdmin }) => {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('open'); // open, in_progress, closed
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef(null);

    // Carregar Tickets
    const fetchTickets = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('support_tickets')
                .select(`
                    *,
                    profiles:user_id (username, email, avatar_url)
                `)
                .order('created_at', { ascending: true }); // FIFO: Mais antigos primeiro

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error("Erro ao buscar tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    // Carregar Mensagens do Ticket Selecionado
    const fetchMessages = async (ticketId) => {
        if (!ticketId) return;
        try {
            const { data, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            scrollToBottom();
        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
        }
    };

    // Enviar Mensagem
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicket) return;

        try {
            const { error } = await supabase
                .from('support_messages')
                .insert([
                    {
                        ticket_id: selectedTicket.id,
                        sender_id: currentAdmin.id,
                        message: newMessage,
                        is_admin: true
                    }
                ]);

            if (error) throw error;

            setNewMessage('');
            fetchMessages(selectedTicket.id);
            
            // Se o ticket estava 'open', muda para 'in_progress' automaticamente ao responder
            if (selectedTicket.status === 'open') {
                handleUpdateStatus(selectedTicket.id, 'in_progress');
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
        }
    };

    // Atualizar Status do Ticket
    const handleUpdateStatus = async (ticketId, newStatus) => {
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: newStatus })
                .eq('id', ticketId);

            if (error) throw error;

            // Atualiza lista local
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => ({ ...prev, status: newStatus }));
            }
            
            // Se fechou, limpa seleção ou volta pra lista
            if (newStatus === 'closed' && filterStatus !== 'closed') {
                setSelectedTicket(null);
                fetchTickets(); // Recarrega lista para remover o fechado da vista atual
            }
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        }
    };

    // Polling de Mensagens e Tickets
    useEffect(() => {
        fetchTickets();
        const interval = setInterval(() => {
            if (selectedTicket) {
                fetchMessages(selectedTicket.id);
            }
            // Atualiza lista de tickets a cada 10s (menos frequente que mensagens)
            if (Math.random() > 0.7) fetchTickets(); 
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedTicket, filterStatus]); // Recarrega se mudar filtro ou ticket selecionado

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Filtragem local por nome
    const filteredTickets = tickets.filter(t => 
        t.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.includes(searchTerm)
    );

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] gap-4">
            {/* Lista de Tickets (Sidebar) */}
            <Card className="w-full md:w-1/3 bg-gray-900 border-gray-800 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-900 z-10">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <MessageSquare size={20} className="text-purple-500" />
                        Fila de Atendimento
                    </h3>
                    
                    {/* Filtros de Status */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Button 
                            size="xs" 
                            variant={filterStatus === 'open' ? 'default' : 'outline'}
                            onClick={() => setFilterStatus('open')}
                            className={`flex-1 min-w-[80px] ${filterStatus === 'open' ? 'bg-green-600' : ''}`}
                        >
                            Abertos
                        </Button>
                        <Button 
                            size="xs" 
                            variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
                            onClick={() => setFilterStatus('in_progress')}
                            className={`flex-1 min-w-[80px] ${filterStatus === 'in_progress' ? 'bg-blue-600' : ''}`}
                        >
                            Em Andamento
                        </Button>
                        <Button 
                            size="xs" 
                            variant={filterStatus === 'closed' ? 'default' : 'outline'}
                            onClick={() => setFilterStatus('closed')}
                            className={`flex-1 min-w-[80px] ${filterStatus === 'closed' ? 'bg-gray-600' : ''}`}
                        >
                            Fechados
                        </Button>
                    </div>

                    {/* Busca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Buscar usuário ou ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-xs focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading && tickets.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">Carregando tickets...</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">Nenhum ticket encontrado.</div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id}
                                onClick={() => {
                                    setSelectedTicket(ticket);
                                    fetchMessages(ticket.id);
                                }}
                                className={`p-3 rounded cursor-pointer border transition-colors ${
                                    selectedTicket?.id === ticket.id 
                                        ? 'bg-purple-900/30 border-purple-500' 
                                        : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-white">{ticket.profiles?.username || 'Usuário Desconhecido'}</span>
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                        ticket.status === 'open' ? 'bg-green-900/50 text-green-400' :
                                        ticket.status === 'in_progress' ? 'bg-blue-900/50 text-blue-400' :
                                        'bg-gray-700 text-gray-400'
                                    }`}>
                                        {ticket.status === 'open' ? 'NOVO' : ticket.status === 'in_progress' ? 'ATENDENDO' : 'FECHADO'}
                                    </span>
                                    <span className="text-[10px] text-gray-500">ID: ...{ticket.id.slice(-4)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Área de Chat (Main) */}
            <Card className="w-full md:flex-1 min-w-0 bg-gray-900 border-gray-800 flex flex-col overflow-hidden relative">
                {selectedTicket ? (
                    <>
                        {/* Header do Chat */}
                        <div className="p-4 border-b border-gray-800 bg-gray-900 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 z-10">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                                    <User size={20} className="text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-white truncate">{selectedTicket.profiles?.username}</h3>
                                    <p className="text-xs text-gray-500 truncate">{selectedTicket.profiles?.email}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                                {selectedTicket.status !== 'closed' && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="border-red-500 text-red-500 hover:bg-red-900/20 whitespace-nowrap"
                                        onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                                    >
                                        <Archive size={16} className="mr-1" /> Encerrar Atendimento
                                    </Button>
                                )}
                                {selectedTicket.status === 'closed' && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="border-green-500 text-green-500 hover:bg-green-900/20 whitespace-nowrap"
                                        onClick={() => handleUpdateStatus(selectedTicket.id, 'in_progress')}
                                    >
                                        <RefreshCw size={16} className="mr-1" /> Reabrir
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Lista de Mensagens */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                            {messages.map((msg, idx) => (
                                <div 
                                    key={msg.id || idx} 
                                    className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div 
                                        className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                            msg.is_admin 
                                                ? 'bg-purple-600 text-white rounded-tr-none' 
                                                : 'bg-gray-800 text-gray-200 rounded-tl-none'
                                        }`}
                                    >
                                        <p>{msg.message}</p>
                                        <p className={`text-[10px] mt-1 text-right ${msg.is_admin ? 'text-purple-200' : 'text-gray-500'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input de Mensagem */}
                        <div className="p-4 border-t border-gray-800 bg-gray-900">
                            {selectedTicket.status === 'closed' ? (
                                <div className="text-center text-gray-500 text-sm py-2">
                                    Este ticket foi encerrado. Reabra para responder.
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Digite sua resposta..." 
                                        className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                    />
                                    <Button type="submit" size="icon" className="bg-purple-600 hover:bg-purple-700">
                                        <Send size={18} />
                                    </Button>
                                </form>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <MessageSquare size={48} className="mb-4 opacity-20" />
                        <p>Selecione um ticket na fila para iniciar o atendimento.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default SupportAdmin;
