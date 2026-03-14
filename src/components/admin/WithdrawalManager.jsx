import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Check, X, Clock, AlertTriangle, RefreshCw, Search } from 'lucide-react';

const WithdrawalManager = ({ currentAdmin }) => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            // Busca saques pendentes
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    profiles:user_id (username, email, account_status)
                `)
                .eq('type', 'withdrawal')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setWithdrawals(data || []);
        } catch (error) {
            console.error("Erro ao buscar saques:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const handleApprove = async (txId) => {
        if (!window.confirm("Confirmar aprovação deste saque?")) return;
        setProcessingId(txId);
        try {
            const { error } = await supabase.rpc('approve_withdrawal', { transaction_id: txId });
            if (error) throw error;
            
            // Remove da lista local
            setWithdrawals(prev => prev.filter(tx => tx.id !== txId));
            alert("Saque aprovado com sucesso!");
        } catch (error) {
            console.error("Erro ao aprovar:", error);
            alert("Erro ao aprovar saque: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (txId) => {
        if (!window.confirm("Rejeitar este saque e estornar o valor?")) return;
        setProcessingId(txId);
        try {
            const { error } = await supabase.rpc('reject_withdrawal', { transaction_id: txId });
            if (error) throw error;

            // Remove da lista local
            setWithdrawals(prev => prev.filter(tx => tx.id !== txId));
            alert("Saque rejeitado e estornado!");
        } catch (error) {
            console.error("Erro ao rejeitar:", error);
            alert("Erro ao rejeitar saque: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-4 pb-20">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Clock size={20} className="text-yellow-500" /> 
                    Saques Pendentes ({withdrawals.length})
                </h3>
                <Button size="sm" variant="outline" onClick={fetchWithdrawals}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>

            {loading && withdrawals.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Carregando solicitações...</div>
            ) : withdrawals.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-gray-900 rounded border border-gray-800">
                    <Check size={48} className="mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Nenhum saque pendente.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {withdrawals.map(tx => (
                        <Card key={tx.id} className="bg-gray-900 border-gray-800 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-white text-lg">{tx.profiles?.username}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                        tx.profiles?.account_status === 'active' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'
                                    }`}>
                                        {tx.profiles?.account_status?.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{tx.profiles?.email}</p>
                                
                                <div className="bg-black/40 p-2 rounded border border-gray-800 text-sm font-mono">
                                    <p className="text-gray-300">{tx.description}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Data: {new Date(tx.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 min-w-[150px]">
                                <p className="text-2xl font-bold text-green-400">${tx.amount.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">Taxa: ${tx.fee?.toFixed(2)}</p>
                                
                                <div className="flex gap-2 mt-2 w-full">
                                    <Button 
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApprove(tx.id)}
                                        disabled={processingId === tx.id}
                                    >
                                        {processingId === tx.id ? '...' : <Check size={18} />} Aprovar
                                    </Button>
                                    <Button 
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleReject(tx.id)}
                                        disabled={processingId === tx.id}
                                    >
                                        {processingId === tx.id ? '...' : <X size={18} />} Rejeitar
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WithdrawalManager;
