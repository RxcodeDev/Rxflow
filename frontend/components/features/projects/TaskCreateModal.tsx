'use client';

import Modal from '@/components/ui/Modal';
import TaskForm from '@/components/features/tasks/TaskForm';
import type { StatusKey } from './projectShared';

interface EpicOpt   { id: string; name: string }
interface MemberOpt { id: string; name: string; initials: string }

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectCode: string;
  /** Pre-select a status column when opening from a column "+" */
  defaultStatus?: StatusKey;
  /** Pre-select an epic when opening from an epic row "+" */
  defaultEpicId?: string;
  /** Passed for backwards-compat with call-sites (TaskForm fetches its own) */
  epics?: EpicOpt[];
  members?: MemberOpt[];
}

export default function TaskCreateModal({
  open, onClose, onCreated,
  projectCode, defaultStatus = 'backlog', defaultEpicId = '',
}: TaskCreateModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Nueva tarea">
      <TaskForm
        context="task"
        initialProjectCode={projectCode}
        initialEpicId={defaultEpicId}
        initialStatus={defaultStatus}
        onCancel={onClose}
        onSuccess={() => { onCreated(); onClose(); }}
        submitLabel="Crear tarea"
      />
    </Modal>
  );
}
