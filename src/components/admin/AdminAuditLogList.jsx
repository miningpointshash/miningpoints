import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';

const formatDateTime = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
};

const safeJsonPreview = (value) => {
  try {
    if (!value) return '-';
    const s = JSON.stringify(value);
    if (s.length <= 240) return s;
    return `${s.slice(0, 240)}...`;
  } catch {
    return '-';
  }
};

export const AdminAuditLogList = ({ targetUserId }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!targetUserId) return;
      setLoading(true);
      setError(null);
      try {
        const { data: logs, error: lError } = await supabase
          .from('admin_logs')
          .select('id, admin_id, action_type, details, created_at')
          .eq('target_user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (lError) throw lError;
        const list = logs || [];

        const adminIds = Array.from(new Set(list.map((r) => r.admin_id).filter(Boolean)));
        const adminMap = new Map();

        for (let i = 0; i < adminIds.length; i += 100) {
          const chunk = adminIds.slice(i, i + 100);
          const { data: admins, error: aError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', chunk);
          if (aError) throw aError;
          (admins || []).forEach((a) => adminMap.set(a.id, a.username));
        }

        const enriched = list.map((r) => ({
          ...r,
          admin_username: r.admin_id ? adminMap.get(r.admin_id) || null : null,
        }));

        if (!cancelled) setRows(enriched);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Erro ao carregar auditoria.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const hasRows = useMemo(() => (rows || []).length > 0, [rows]);

  return (
    <div className="space-y-3">
      <h4 className="text-lg font-bold text-white">Auditoria Admin</h4>
      {loading ? (
        <div className="text-xs text-gray-500">Carregando auditoria...</div>
      ) : error ? (
        <div className="text-xs text-red-400">{error}</div>
      ) : !hasRows ? (
        <div className="text-xs text-gray-500">Nenhum log administrativo para este usuário.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="bg-black/40 border-gray-800 p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-white font-bold">
                  {r.action_type}
                </div>
                <div className="text-[10px] text-gray-500">
                  {formatDateTime(r.created_at)}
                </div>
              </div>
              <div className="mt-1 text-[10px] text-gray-400">
                Admin: <span className="text-purple-300 font-bold">{r.admin_username || r.admin_id || 'Sistema'}</span>
              </div>
              <div className="mt-2 text-[10px] text-gray-500 font-mono break-words">
                {safeJsonPreview(r.details)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

