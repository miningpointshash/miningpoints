import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AlertTriangle, Check, Trash2, Ban, X, RefreshCw } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

export default function ForumReportsAdmin() {
    const { addNotification } = useContext(AppContext);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('forum_reports')
                .select(`
                    *,
                    reporter:reporter_id(username, email),
                    reported:reported_user_id(username, email, account_status)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error('Erro ao buscar denúncias:', err);
            addNotification('Erro ao buscar denúncias', 'danger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleResolve = async (reportId, action, deleteContent) => {
        if (!window.confirm('Confirmar ação para esta denúncia?')) return;
        setResolving(true);
        try {
            const { error } = await supabase.rpc('admin_resolve_forum_report', {
                p_report_id: reportId,
                p_action: action,
                p_delete_content: deleteContent
            });
            if (error) throw error;
            addNotification('Ação aplicada com sucesso', 'success');
            fetchReports();
        } catch (err) {
            console.error('Erro ao resolver denúncia:', err);
            addNotification('Erro ao aplicar ação', 'danger');
        } finally {
            setResolving(false);
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-500">Carregando denúncias...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                    <AlertTriangle size={24} /> Fórum Denúncias ({reports.length})
                </h2>
                <Button variant="ghost" onClick={fetchReports} disabled={loading}><RefreshCw size={18} /></Button>
            </div>

            {reports.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800 p-8 text-center text-gray-500">
                    Nenhuma denúncia pendente no momento.
                </Card>
            ) : (
                <div className="space-y-4">
                    {reports.map(report => (
                        <Card key={report.id} className="bg-gray-900 border-red-900/30 p-4">
                            <div className="flex justify-between items-start mb-3 border-b border-gray-800 pb-3">
                                <div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">Denunciado:</span>
                                        <span className="font-bold text-white">{report.reported?.username}</span>
                                        <span className="text-xs text-gray-500">({report.reported?.email})</span>
                                        {report.reported?.account_status === 'blocked' && (
                                            <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded">JÁ BLOQUEADO</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs mt-1">
                                        <span className="text-gray-500">Denunciante:</span>
                                        <span className="text-gray-300">{report.reporter?.username}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-500">{new Date(report.created_at).toLocaleString()}</span>
                                    <div className="mt-1">
                                        <span className="text-xs font-bold uppercase bg-red-900/20 text-red-400 border border-red-900/50 px-2 py-1 rounded">
                                            {report.item_type}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4 bg-black/40 p-3 rounded-lg border border-gray-800">
                                <p className="text-xs text-gray-500 mb-1 uppercase font-bold">Motivo da Denúncia:</p>
                                <p className="text-sm text-red-300 font-bold">{report.reason}</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <Button 
                                    size="sm" 
                                    className="bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600 hover:text-white border border-yellow-600/50"
                                    onClick={() => handleResolve(report.id, 'ban_24h', true)}
                                    disabled={resolving}
                                >
                                    <Ban size={14} className="mr-1" /> Ban 24h + Apagar
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-orange-600/20 text-orange-500 hover:bg-orange-600 hover:text-white border border-orange-600/50"
                                    onClick={() => handleResolve(report.id, 'ban_7d', true)}
                                    disabled={resolving}
                                >
                                    <Ban size={14} className="mr-1" /> Ban 7D + Apagar
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-600/50"
                                    onClick={() => handleResolve(report.id, 'block_account', true)}
                                    disabled={resolving}
                                >
                                    <Trash2 size={14} className="mr-1" /> Block Conta + Apagar
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleResolve(report.id, 'dismiss', false)}
                                    disabled={resolving}
                                >
                                    <X size={14} className="mr-1" /> Ignorar (Falso)
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
