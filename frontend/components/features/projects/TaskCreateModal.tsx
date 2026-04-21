'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { apiPost } from '@/lib/api';
import { PRIORITY_STYLE, PRIORITY_LABEL, PRIORITIES, fieldCls, selectCls, type Priority, type StatusKey, STATUS_LABEL, STATUS_ORDER } from './projectShared';

export interface CreateTaskDto {
  projectCode: string;
  title: string;
  priority: Priority;
  status: StatusKey;
  assigneeId?: string;
  epicId?: string;
  dueDate?: string;
}

interface EpicOpt    { id: string; name: string }
interface MemberOpt  { id: string; name: string; initials: string }

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectCode: string;
  /** Pre-select a status column when opening from a column "+" */
  defaultStatus?: StatusKey;
  /** Pre-select an epic when opening from an epic row "+" */
  defaultEpicId?: string;
  epics: EpicOpt[];
  members: MemberOpt[];
}

export default function TaskCreateModal({
  open, onClose, onCreated,
  projectCode, defaultStatus = 'backlog', defaultEpicId = '',
  epics, members,
}: TaskCreateModalProps) {
  const [title,      setTitle]      = useState('');
  const [priority,   setPriority]   = useState<Priority>('media');
  const [status,     setStatus]     = useState<StatusKey>(defaultStatus);
  const [assigneeId, setAssigneeId] = useState('');
  const [epicId,     setEpicId]     = useState(defaultEpicId);
  const [dueDate,    setDueDate]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  /* Reset when props change */
  function handleOpen() {
    setTitle(''); setPriority('media'); setStatus(defaultStatus);
    setAssigneeId(''); setEpicId(defaultEpicId); setDueDate(''); setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('El título es requerido'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost('/tasks', {
        projectCode: projectCode.toUpperCase(),
        title: title.trim(),
        priority,
        status,
        ...(assigneeId && { assigneeId }),
        ...(epicId     && { epicId }),
        ...(dueDate    && { dueDate }),
      });
    onCreated();
    onClose();
    setTitle('');
  } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la tarea');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva tarea"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tc-title" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
            Título <span className="text-[var(--c-danger)]">*</span>
          </label>
          <input
            id="tc-title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setError(''); }}
            placeholder="Ej. Diseñar pantalla de login"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className={fieldCls}
          />
          {error && <p className="text-[0.75rem] text-[var(--c-danger)]">{error}</p>}
        </div>

        {/* Row: priority + status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tc-prio" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Prioridad
            </label>
            <select id="tc-prio" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={selectCls} style={{ width: '100%' }}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tc-status" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Estado
            </label>
            <select id="tc-status" value={status} onChange={(e) => setStatus(e.target.value as StatusKey)} className={selectCls} style={{ width: '100%' }}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Epic */}
        {epics.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tc-epic" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Épica (tarea padre)
            </label>
            <select id="tc-epic" value={epicId} onChange={(e) => setEpicId(e.target.value)} className={selectCls} style={{ width: '100%' }}>
              <option value="">Sin épica</option>
              {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
            </select>
          </div>
        )}

        {/* Row: assignee + due date */}
        <div className="grid grid-cols-2 gap-3">
          {members.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tc-assignee" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
                Asignado a
              </label>
              <select id="tc-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={selectCls} style={{ width: '100%' }}>
                <option value="">Sin asignar</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tc-due" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Fecha límite
            </label>
            <input
              id="tc-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldCls}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-[var(--c-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors font-[inherit] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--c-text)] text-[var(--c-bg)] disabled:opacity-50 transition-opacity font-[inherit] cursor-pointer"
          >
            {saving ? 'Creando…' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
