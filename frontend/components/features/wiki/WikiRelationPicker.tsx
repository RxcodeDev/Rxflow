'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { ApiWrapped, ProjectSummary } from '@/types/api.types';

export interface WikiRelationValue {
  projectCode?: string;
  epicId?: string;
  taskId?: string;
}

interface EpicOption {
  id: string;
  name: string;
}

interface WikiRelationPickerProps {
  value: WikiRelationValue;
  onChange: (value: WikiRelationValue) => void;
}

export default function WikiRelationPicker({ value, onChange }: WikiRelationPickerProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [epics, setEpics] = useState<EpicOption[]>([]);

  useEffect(() => {
    apiGet<ApiWrapped<ProjectSummary[]>>('/projects')
      .then(r => { if (r.ok) setProjects(r.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!value.projectCode) { setEpics([]); return; }
    apiGet<ApiWrapped<EpicOption[]>>(`/projects/${value.projectCode}/epics`)
      .then(r => { if (r.ok) setEpics(r.data); })
      .catch(() => setEpics([]));
  }, [value.projectCode]);

  const update = (patch: Partial<WikiRelationValue>) => onChange({ ...value, ...patch });

  const selectCls =
    'w-full px-3 py-2 text-sm border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors';

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[var(--c-text-sub)] uppercase tracking-wide">
        Vincular a (opcional)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Project */}
        <div>
          <label className="block text-xs text-[var(--c-text-sub)] mb-1">Proyecto</label>
          <select
            className={selectCls}
            value={value.projectCode ?? ''}
            onChange={e => update({ projectCode: e.target.value || undefined, epicId: undefined })}
          >
            <option value="">— ninguno —</option>
            {projects.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Epic — only if project selected */}
        {value.projectCode && (
          <div>
            <label className="block text-xs text-[var(--c-text-sub)] mb-1">Épica</label>
            <select
              className={selectCls}
              value={value.epicId ?? ''}
              onChange={e => update({ epicId: e.target.value || undefined })}
            >
              <option value="">— ninguna —</option>
              {epics.map(ep => (
                <option key={ep.id} value={ep.id}>{ep.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
