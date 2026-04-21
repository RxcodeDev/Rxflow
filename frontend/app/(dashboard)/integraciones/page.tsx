// Server Component
interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'Conectado' | 'Disponible' | 'Próximamente';
  icon: string; // emoji fallback
  connectedAs?: string;
}

const INTEGRATIONS: Integration[] = [
  { id: 'github',  name: 'GitHub',       description: 'Vincula PRs y commits a tareas automáticamente.', status: 'Conectado',     icon: '⌥', connectedAs: 'rxflow-org' },
  { id: 'slack',   name: 'Slack',        description: 'Recibe notificaciones en canales de Slack.',       status: 'Disponible',    icon: '#'  },
  { id: 'figma',   name: 'Figma',        description: 'Adjunta frames de Figma directamente en tareas.',  status: 'Disponible',    icon: '◈'  },
  { id: 'notion',  name: 'Notion',       description: 'Importa y sincroniza documentos con proyectos.',   status: 'Próximamente',  icon: 'N'  },
  { id: 'jira',    name: 'Jira',         description: 'Migra proyectos e issues desde Jira.',             status: 'Próximamente',  icon: 'J'  },
  { id: 'discord', name: 'Discord',      description: 'Notificaciones en tiempo real en tu servidor.',    status: 'Próximamente',  icon: 'D'  },
];

const STATUS_STYLE: Record<Integration['status'], string> = {
  Conectado:    'text-[var(--c-text)] border-[var(--c-text)] bg-transparent',
  Disponible:   'text-[var(--c-text-sub)] border-[var(--c-border)] bg-transparent hover:bg-[var(--c-hover)]',
  Próximamente: 'text-[var(--c-muted)] border-[var(--c-border)] bg-transparent opacity-60 cursor-not-allowed',
};

const STATUS_LABEL: Record<Integration['status'], string> = {
  Conectado:    'Desconectar',
  Disponible:   'Conectar',
  Próximamente: 'Próximamente',
};

export default function IntegracionesPage() {
  const connected = INTEGRATIONS.filter((i) => i.status === 'Conectado');
  const available = INTEGRATIONS.filter((i) => i.status !== 'Conectado');

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--c-text)]">Integraciones</h1>
        <p className="text-[13px] text-[var(--c-text-sub)] mt-1">
          Conecta tus herramientas favoritas con Rxflow.
        </p>
      </div>

      {/* Connected */}
      {connected.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-3">
            Conectadas ({connected.length})
          </h2>
          <div className="flex flex-col gap-3">
            {connected.map((i) => (
              <IntegrationCard key={i.id} integration={i} />
            ))}
          </div>
        </section>
      )}

      {/* Available */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-3">
          Disponibles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {available.map((i) => (
            <IntegrationCard key={i.id} integration={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function IntegrationCard({ integration: i }: { integration: Integration }) {
  return (
    <div className="flex items-center gap-4 border border-[var(--c-border)] rounded-xl p-4">
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--c-hover)] border border-[var(--c-border)] flex items-center justify-center font-mono text-lg text-[var(--c-text-sub)] select-none">
        {i.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-[var(--c-text)]">{i.name}</p>
          {i.status === 'Conectado' && (
            <span className="text-[10px] bg-[var(--c-hover)] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-full px-2 py-0.5">
              {i.connectedAs}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5 truncate">{i.description}</p>
      </div>

      {/* Action */}
      <button
        type="button"
        disabled={i.status === 'Próximamente'}
        className={
          'shrink-0 text-[12px] font-medium border rounded-lg px-3 py-1.5 transition-colors font-[inherit] ' +
          STATUS_STYLE[i.status]
        }
      >
        {STATUS_LABEL[i.status]}
      </button>
    </div>
  );
}
