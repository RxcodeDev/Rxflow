import Link from 'next/link';
import { Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google';

const heading = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
});

const features = [
  'Tableros por proyecto en tiempo real',
  'Roadmap, backlog y ciclos en un solo flujo',
  'Asignaciones, estado y prioridad sincronizados',
  'Reportes claros para seguimiento semanal',
  'Control de accesos por workspace y proyecto',
  'Import y export de contexto para IA',
];

export default function HomePage() {
  return (
    <main className="h-dvh overflow-y-auto bg-[var(--c-bg)] text-[var(--c-text)]">
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-4 md:px-8 md:pb-24">
        <header className="sticky top-0 z-20 -mx-5 mb-10 flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-bg)]/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--c-text)]" />
            <span className={`${mono.className} text-[11px] uppercase tracking-[0.16em] text-[var(--c-text-sub)]`}>
              Rxflow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md border border-[var(--c-border)] px-3 py-1.5 text-xs font-semibold text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-[var(--c-text)] bg-[var(--c-text)] px-3 py-1.5 text-xs font-semibold text-[var(--c-bg)]"
            >
              Crear cuenta
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <p className={`${mono.className} mb-4 text-[11px] uppercase tracking-[0.16em] text-[var(--c-text-sub)]`}>
              Gestion de proyectos
            </p>
            <h1 className={`${heading.className} text-5xl font-extrabold leading-[0.92] tracking-tight sm:text-6xl md:text-7xl`}>
              Entrega
              <span className="block text-[var(--c-text-sub)]">sin ruido</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[var(--c-text-sub)] sm:text-base">
              Organiza ciclos, alinea equipos y cierra tareas con claridad operativa.
              Un flujo simple para trabajo real, sin perder trazabilidad.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-lg bg-[var(--c-text)] px-5 py-2.5 text-sm font-semibold text-[var(--c-bg)]"
              >
                Empezar gratis
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-[var(--c-border)] px-5 py-2.5 text-sm font-semibold text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]"
              >
                Entrar ahora
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-hover)] p-4">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
              <div className="mb-3 flex items-center justify-between border-b border-[var(--c-line)] pb-2">
                <span className={`${mono.className} text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]`}>
                  Sprint activo
                </span>
                <span className="rounded border border-[var(--c-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-text-sub)]">
                  EN CURSO
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[64, 78, 92].map((pct) => (
                  <div key={pct} className="rounded-md border border-[var(--c-border)] bg-[var(--c-hover)] p-2">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">Progreso</p>
                    <p className="mt-1 text-lg font-bold text-[var(--c-text)]">{pct}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className={`${heading.className} text-3xl font-bold tracking-tight md:text-4xl`}>
            Funciones que respetan tu flujo
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {features.map((item, idx) => (
              <div key={item} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.12em] text-[var(--c-muted)]`}>
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--c-text)]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-[var(--c-border)] bg-[var(--c-hover)] p-6 md:p-8">
          <h3 className={`${heading.className} text-2xl font-bold tracking-tight md:text-3xl`}>
            Empieza en minutos
          </h3>
          <p className="mt-3 max-w-2xl text-sm text-[var(--c-text-sub)] md:text-base">
            Crea tu workspace, importa datos y comienza a trabajar con tu equipo hoy.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-[var(--c-text)] px-5 py-2.5 text-sm font-semibold text-[var(--c-bg)]">
              Crear workspace
            </Link>
            <Link href="/login" className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]">
              Ya tengo cuenta
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
