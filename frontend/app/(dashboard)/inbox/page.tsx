'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import type { NotificationItem, ApiWrapped } from '@/types/api.types';
import { useUIDispatch } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';

const TYPE_ICON: Record<string, React.ReactNode> = {
  mention:    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" /></svg>,
  asignado:   <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
  comentario: <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  completado: <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>,
  bloqueado:  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>,
};

function timeAgo(raw: string): string {
  const diff = (Date.now() - new Date(raw).getTime()) / 1000;
  if (diff < 60)    return 'hace un momento';
  if (diff < 3600)  return `hace ${Math.round(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)}h`;
  return `hace ${Math.round(diff / 86400)}d`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

export default function InboxPage() {
  const [notifs,  setNotifs]  = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useUIDispatch();

  useEffect(() => {
    apiGet<ApiWrapped<NotificationItem[]>>('/notifications')
      .then((res) => setNotifs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  async function markAllRead() {
    await apiPatch('/notifications/read-all', {}).catch(console.error);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await apiPatch(`/notifications/${id}/read`, {}).catch(console.error);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Bandeja</h1>
          <p className="text-[13px] text-[var(--c-text-sub)] mt-0.5">
            {loading ? '...' : `${unread} sin leer`}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[13px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] bg-transparent border-none cursor-pointer font-[inherit] transition-colors"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {!loading && notifs.length === 0 && (
        <div className="border border-[var(--c-border)] rounded-xl px-4 py-12 text-center">
          <p className="text-sm text-[var(--c-muted)]">Tu bandeja está vacía</p>
        </div>
      )}

      {!loading && notifs.length > 0 && (
        <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden divide-y divide-[var(--c-line)]">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) markRead(n.id);
                if (n.task) dispatch(openDrawer({ taskId: n.task.id, projectId: n.task.identifier.split('-')[0].toLowerCase() }));
              }}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--c-hover)] transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}`}
            >
              <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full" style={{ background: n.read ? 'transparent' : 'var(--c-text)' }} />
              <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[11px] font-semibold flex items-center justify-center">
                {n.sender.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[var(--c-text)] leading-snug">
                  <span className="font-semibold">{n.sender.name}</span>
                  {' '}{n.message}
                  {n.task && (
                    <span className="ml-1 font-mono text-[11px] font-semibold text-[var(--c-text)] underline underline-offset-2">
                      {n.task.identifier}
                    </span>
                  )}
                </p>
                {n.task && <p className="text-[11px] text-[var(--c-muted)] mt-0.5 truncate">{n.task.title}</p>}
                {n.project && !n.task && <p className="text-[11px] text-[var(--c-muted)] mt-0.5">{n.project.name}</p>}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[var(--c-muted)]">{TYPE_ICON[n.type] ?? TYPE_ICON.actividad}</span>
                <span className="text-[11px] text-[var(--c-muted)] whitespace-nowrap">{timeAgo(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
