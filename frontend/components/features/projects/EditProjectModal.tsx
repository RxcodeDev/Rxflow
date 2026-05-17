'use client';

import Modal from '@/components/ui/Modal';
import ProjectForm from '@/components/features/projects/ProjectForm';
import type { ProjectSummary } from '@/types/api.types';

interface EditProjectModalProps {
  project: ProjectSummary | null;
  onClose: () => void;
  onSaved: (updated: ProjectSummary) => void;
}

export default function EditProjectModal({ project, onClose, onSaved }: EditProjectModalProps) {
  return (
    <Modal open={!!project} onClose={onClose} title="Editar proyecto">
      {project && (
        <ProjectForm
          mode="edit"
          project={project}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
