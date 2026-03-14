import React, { useContext, useEffect } from 'react';
import { 
    Bell, TrendingUp, Zap, ArrowDownCircle, ArrowUpCircle, Users, 
    RefreshCw, Headphones, Briefcase, Gamepad2, Trash2, X 
} from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { THEME } from '../utils/theme';

export const NotificationsPanel = ({ onClose }) => {
    const { state, markAllNotificationsRead, clearNotifications } = useContext(AppContext);

    useEffect(() => {
        markAllNotificationsRead();
    }, []);

    const getIcon = (type) => {
        switch(type) {
            case 'profit': return <TrendingUp size={16} className={THEME.success}/>;
            case 'plan': return <Zap size={16} className="text-purple-400"/>;
            case 'deposit': return <ArrowDownCircle size={16} className="text-blue-400"/>;
            case 'withdraw': return <ArrowUpCircle size={16} className={THEME.danger}/>;
            case 'team': return <Users size={16} className="text-blue-300"/>;
            case 'swap': return <RefreshCw size={16} className="text-yellow-400"/>;
            case 'support': return <Headphones size={16} className="text-pink-400"/>;
            case 'company': return <Briefcase size={16} className="text-white"/>;
            case 'game': return <Gamepad2 size={16} className="text-green-400"/>;
            default: return <Bell size={16} className="text-gray-400"/>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg h-full bg-gray-900 flex flex-col shadow-2xl animate-slideUp">
                <div className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shadow-xl">
                    <div className="flex items-center gap-2">
                    <Bell className="text-white" size={20}/>
                    <h2 className="text-lg font-bold text-white">Notificações</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={clearNotifications} className="p-2 bg-gray-800 rounded-full text-red-400 hover:bg-red-900/30">
                        <Trash2 size={18}/>
                    </button>
                    <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700">
                        <X size={18}/>
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {state.notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                        <Bell size={48} className="opacity-20"/>
                        <p>Nenhuma notificação recente.</p>
                    </div>
                ) : (
                    state.notifications.map((notif) => (
                        <div key={notif.id} className="bg-gray-800/50 border border-gray-700 p-3 rounded-lg flex gap-3 animate-slideUp">
                            <div className="mt-1 bg-gray-900 p-2 rounded-full h-fit">
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm text-gray-200 font-medium">{notif.msg}</p>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                        {new Date(notif.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 capitalize mt-1 flex items-center gap-1">
                                    {notif.type === 'profit' && 'Rendimento Automático'}
                                    {notif.type === 'plan' && 'Contrato Ativo'}
                                    {notif.type === 'team' && 'Rede'}
                                    {notif.type === 'support' && 'Mensagem'}
                                    {notif.type === 'game' && 'Arcade'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
    );
};
