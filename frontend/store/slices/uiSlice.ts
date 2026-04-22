export interface UiState {
  loading: boolean;
  sidebarOpen: boolean;

  // Modal crear tarea/proyecto
  isCreateModalOpen: boolean;
  createModalContext: 'task' | 'subtask' | 'project' | 'workspace' | null;

  // Drawer de detalle
  isDrawerOpen: boolean;
  activeTaskId: string | null;
  activeProjectId: string | null;

  // Versión de proyectos — incrementar para forzar re-fetch en Sidebar
  projectsVersion: number;
  // Versión de tareas — incrementar para forzar re-fetch en todas las vistas de tareas
  tasksVersion: number;
}

export const initialUiState: UiState = {
  loading: false,
  sidebarOpen: false,
  isCreateModalOpen: false,
  createModalContext: null,
  isDrawerOpen: false,
  activeTaskId: null,
  activeProjectId: null,
  projectsVersion: 0,
  tasksVersion: 0,
};

/* ── Action types ───────────────────────────────────── */
export type UiAction =
  | { type: 'ui/openCreateModal'; payload: 'task' | 'subtask' | 'project' | 'workspace' }
  | { type: 'ui/closeCreateModal' }
  | { type: 'ui/openDrawer'; payload: { taskId: string; projectId: string } }
  | { type: 'ui/closeDrawer' }
  | { type: 'ui/bumpProjects' }
  | { type: 'ui/bumpTasks' };

/* ── Action creators ────────────────────────────────── */
export const openCreateModal = (
  context: 'task' | 'subtask' | 'project' | 'workspace',
): UiAction => ({ type: 'ui/openCreateModal', payload: context });

export const closeCreateModal = (): UiAction => ({ type: 'ui/closeCreateModal' });

export const openDrawer = (payload: {
  taskId: string;
  projectId: string;
}): UiAction => ({ type: 'ui/openDrawer', payload });

export const closeDrawer = (): UiAction => ({ type: 'ui/closeDrawer' });

export const bumpProjects = (): UiAction => ({ type: 'ui/bumpProjects' });

export const bumpTasks = (): UiAction => ({ type: 'ui/bumpTasks' });

/* ── Reducer ────────────────────────────────────────── */
export default function uiReducer(
  state: UiState = initialUiState,
  action: UiAction,
): UiState {
  switch (action.type) {
    case 'ui/openCreateModal':
      return { ...state, isCreateModalOpen: true, createModalContext: action.payload };
    case 'ui/closeCreateModal':
      return { ...state, isCreateModalOpen: false, createModalContext: null };
    case 'ui/openDrawer':
      return {
        ...state,
        isDrawerOpen: true,
        activeTaskId: action.payload.taskId,
        activeProjectId: action.payload.projectId,
      };
    case 'ui/closeDrawer':
      return { ...state, isDrawerOpen: false, activeTaskId: null, activeProjectId: null };
    case 'ui/bumpProjects':
      return { ...state, projectsVersion: state.projectsVersion + 1 };
    case 'ui/bumpTasks':
      return { ...state, tasksVersion: state.tasksVersion + 1 };
    default:
      return state;
  }
}
