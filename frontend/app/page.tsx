// app/page.tsx
import Link from 'next/link';
import { DM_Serif_Display, DM_Mono, Instrument_Sans } from 'next/font/google';

const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

const sans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const FEATURES = [
  {
    n: '01',
    title: 'Tableros en tiempo real',
    desc: 'Kanban, lista o timeline. Cada equipo elige su vista sin perder sincronizacion entre miembros.',
  },
  {
    n: '02',
    title: 'Dependencias claras',
    desc: 'Marca bloqueos, enlaza tareas y visualiza el camino critico antes de que afecte la entrega.',
  },
  {
    n: '03',
    title: 'Sprints con contexto',
    desc: 'Planea iteraciones con capacidad real del equipo. Sin hojas de calculo, sin friction.',
  },
  {
    n: '04',
    title: 'Reportes sin esfuerzo',
    desc: 'Velocity, burndown y progreso por proyecto generados automaticamente al cerrar cada sprint.',
  },
  {
    n: '05',
    title: 'Integraciones nativas',
    desc: 'Conecta con GitHub, Slack, Figma y mas. El trabajo fluye sin cambiar de herramienta.',
  },
  {
    n: '06',
    title: 'Permisos granulares',
    desc: 'Controla quien ve, edita o comenta cada proyecto. Ideal para equipos distribuidos.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Crea tu espacio de trabajo',
    desc: 'Configura tu organizacion en menos de dos minutos. Invita a tu equipo con un enlace.',
  },
  {
    n: '02',
    title: 'Define proyectos y sprints',
    desc: 'Organiza el trabajo por epics, tareas e hitos. Asigna fechas y responsables.',
  },
  {
    n: '03',
    title: 'Ejecuta y rastrea en vivo',
    desc: 'El tablero refleja el estado real. Sin actualizaciones manuales, sin reportes perdidos.',
  },
  {
    n: '04',
    title: 'Itera con datos reales',
    desc: 'Cierra sprints, revisa metricas y ajusta la capacidad del siguiente ciclo con evidencia.',
  },
];

export default function HomePage() {
  return (
    <div className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <style>{`
        :root {
          --bg: #f8f6f1;
          --bg2: #f0ede6;
          --bg3: #e8e4db;
          --border: rgba(0,0,0,0.08);
          --border2: rgba(0,0,0,0.14);
          --text: #111110;
          --muted: #7a7870;
          --accent: #1a1a18;
          --green: #2d6a2d;
          --font-serif: var(--font-serif);
          --font-mono: var(--font-mono);
          --font-sans: var(--font-sans);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-sans), sans-serif; background: var(--bg); color: var(--text); }
        a { color: inherit; text-decoration: none; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 58,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(248,246,241,0.92)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text)', display: 'inline-block' }} />
          Rxflow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {['Producto', 'Precios', 'Docs'].map(l => (
            <Link key={l} href="#" style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 14px', borderRadius: 6, fontWeight: 500, transition: 'color 0.15s' }}>{l}</Link>
          ))}
          <Link href="/login" style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 14px', marginLeft: 8, borderRadius: 6, border: '1px solid var(--border2)', fontWeight: 500 }}>
            Iniciar sesion
          </Link>
          <Link href="/register" style={{ fontSize: 13, fontWeight: 600, padding: '7px 18px', background: 'var(--text)', color: 'var(--bg)', borderRadius: 6, marginLeft: 4 }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px 80px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 80, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 1, background: 'var(--muted)', display: 'inline-block' }} />
            Gestion de proyectos
          </div>

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(56px,6vw,88px)', lineHeight: 0.92, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 28 }}>
            Entrega<br />
            <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>sin ruido.</em>
          </h1>

          <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 400, lineHeight: 1.7, marginBottom: 44 }}>
            Planifica sprints, coordina equipos y rastrea entregas con la claridad que proyectos complejos exigen.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/register" style={{ padding: '12px 28px', background: 'var(--text)', color: 'var(--bg)', fontSize: 14, fontWeight: 600, borderRadius: 8 }}>
              Empezar gratis
            </Link>
            <Link href="#" style={{ padding: '12px 28px', background: 'transparent', color: 'var(--muted)', fontSize: 14, fontWeight: 500, borderRadius: 8, border: '1px solid var(--border2)' }}>
              Ver demo
            </Link>
          </div>

          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 48 }}>
            {[['4.2k', 'Equipos activos'], ['98%', 'Uptime SLA'], ['3.1M', 'Tareas completadas']].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>{n}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DASHBOARD CARD */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 16, overflow: 'hidden' }}>
          {/* header bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['#d4d1c8', '#d4d1c8', '#b0b0a8'].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}>RXFLOW / Q3-2025</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', background: 'rgba(45,106,45,0.08)', border: '1px solid rgba(45,106,45,0.2)', borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em' }}>EN VIVO</div>
          </div>

          <div style={{ padding: 18 }}>
            {/* metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
              {[['47', 'Completadas', '+12 esta sem.', 'var(--green)'], ['18', 'En curso', '3 bloqueadas', 'var(--muted)'], ['92%', 'Velocidad', 'vs sprint ant.', 'var(--green)']].map(([v, l, d, c]) => (
                <div key={l} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 5 }}>{l}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>{v}</div>
                  <div style={{ fontSize: 9, color: c as string, marginTop: 3 }}>{d}</div>
                </div>
              ))}
            </div>

            {/* kanban */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { col: 'Backlog', count: 12, cards: [{ t: 'Rediseno flujo de pagos', s: 'Alta', c: '#b87333' }, { t: 'Integracion Slack', s: 'Normal', c: 'var(--green)' }] },
                { col: 'En curso', count: 5, cards: [{ t: 'API reportes v2', s: '75% listo', c: 'var(--green)' }, { t: 'Permisos por rol', s: 'Bloqueada', c: '#a33' }] },
                { col: 'Revision', count: 3, cards: [{ t: 'Dashboard analytics', s: 'En revision', c: '#7a7870' }, { t: 'Onboarding nuevo', s: 'Aprobado', c: 'var(--green)' }] },
              ].map(({ col, count, cards }) => (
                <div key={col} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    {col}
                    <span style={{ background: 'var(--bg2)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{count}</span>
                  </div>
                  {cards.map(({ t, s, c }) => (
                    <div key={t} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 8px', marginBottom: 5 }}>
                      <div style={{ fontSize: 10, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{t}</div>
                      <div style={{ fontSize: 9, color: c as string, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: c as string, display: 'inline-block' }} />
                        {s}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', maxWidth: 1200, margin: '0 auto 0' }} />

      {/* FEATURES */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 20, height: 1, background: 'var(--muted)', display: 'inline-block' }} />
          Capacidades
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px,4vw,56px)', lineHeight: 1.0, letterSpacing: '-0.02em', maxWidth: 500, marginBottom: 64, color: 'var(--text)' }}>
          Todo lo que un equipo serio <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>necesita.</em>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {FEATURES.map(({ n, title, desc }, i) => (
            <div key={n} style={{
              background: 'var(--bg2)', padding: '32px 28px',
              borderRight: (i + 1) % 3 !== 0 ? '1px solid var(--border)' : 'none',
              borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
              position: 'relative',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--border2)', position: 'absolute', top: 20, right: 20 }}>{n}</div>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border2)', marginBottom: 18 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', maxWidth: 1200, margin: '0 auto' }} />

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 1, background: 'var(--muted)', display: 'inline-block' }} />
            Como funciona
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px,3.5vw,52px)', lineHeight: 1.0, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 48 }}>
            De cero a entregando <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>en horas.</em>
          </h2>
          <div>
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} style={{ display: 'flex', gap: 24, padding: '24px 0', borderBottom: '1px solid var(--border)', borderTop: i === 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', paddingTop: 2, flexShrink: 0 }}>{n}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TIMELINE VIS */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, marginTop: 100 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 20 }}>Sprint Q3 — Semana 4</div>
          {[
            { label: 'Auth', left: '0%', width: '60%', cls: 'green' },
            { label: 'API', left: '20%', width: '50%', cls: 'muted' },
            { label: 'Dashboard', left: '10%', width: '75%', cls: 'green' },
            { label: 'Permisos', left: '40%', width: '35%', cls: 'red' },
            { label: 'Reportes', left: '0%', width: '90%', cls: 'green' },
          ].map(({ label, left, width, cls }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', width: 70, flexShrink: 0 }}>{label}</div>
              <div style={{ flex: 1, height: 18, background: 'var(--bg3)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: 0, left, width, height: '100%', borderRadius: 4,
                  background: cls === 'green' ? 'rgba(45,106,45,0.25)' : cls === 'red' ? 'rgba(180,60,60,0.2)' : 'rgba(0,0,0,0.08)',
                  borderLeft: `2px solid ${cls === 'green' ? 'var(--green)' : cls === 'red' ? '#a33' : 'var(--muted)'}`,
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  color: cls === 'green' ? 'var(--green)' : cls === 'red' ? '#a33' : 'var(--muted)',
                }}>
                  {cls === 'green' ? 'completado' : cls === 'red' ? 'bloqueado' : 'en curso'}
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 10 }}>
            {['Jul 1', 'Jul 8', 'Jul 15', 'Jul 22', 'Jul 28'].map(d => <span key={d}>{d}</span>)}
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', maxWidth: 1200, margin: '0 auto' }} />

      {/* PRICING */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 20, height: 1, background: 'var(--muted)', display: 'inline-block' }} />
          Precios
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px,4vw,56px)', lineHeight: 1.0, letterSpacing: '-0.02em', maxWidth: 480, marginBottom: 64, color: 'var(--text)' }}>
          Simple, <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>sin sorpresas.</em>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { name: 'Starter', price: '0', period: 'Gratis para siempre', features: ['Hasta 3 proyectos', '5 miembros de equipo', 'Tablero Kanban', 'Reportes basicos'], featured: false },
            { name: 'Pro', price: '18', period: 'por usuario / mes', features: ['Proyectos ilimitados', '50 miembros', 'Sprints y backlog', 'Reportes avanzados', 'Integraciones GitHub y Slack', 'Soporte prioritario'], featured: true },
            { name: 'Enterprise', price: 'Custom', period: 'contactar ventas', features: ['Todo en Pro', 'SSO y SAML', 'Auditoria y logs', 'SLA garantizado', 'Gerente de cuenta', 'Onboarding dedicado'], featured: false },
          ].map(({ name, price, period, features, featured }) => (
            <div key={name} style={{
              background: featured ? 'var(--text)' : 'var(--bg2)',
              border: `1px solid ${featured ? 'var(--text)' : 'var(--border2)'}`,
              borderRadius: 12, padding: '32px 28px', position: 'relative',
            }}>
              {featured && (
                <div style={{ position: 'absolute', top: 16, right: 16, fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bg)', background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '3px 8px' }}>Popular</div>
              )}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: featured ? 'rgba(255,255,255,0.5)' : 'var(--muted)', marginBottom: 20 }}>{name}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: price === 'Custom' ? 36 : 52, color: featured ? 'var(--bg)' : 'var(--text)', lineHeight: 1, marginBottom: 4 }}>
                {price !== 'Custom' && <sup style={{ fontSize: 18, fontFamily: 'var(--font-sans)', fontWeight: 400, verticalAlign: 'top', marginTop: 8, display: 'inline-block' }}>$</sup>}
                {price}
              </div>
              <div style={{ fontSize: 12, color: featured ? 'rgba(255,255,255,0.45)' : 'var(--muted)', marginBottom: 28 }}>{period}</div>
              <hr style={{ border: 'none', borderTop: `1px solid ${featured ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`, marginBottom: 24 }} />
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: featured ? 'rgba(255,255,255,0.7)' : 'var(--muted)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: featured ? 'rgba(255,255,255,0.4)' : 'var(--muted)', flexShrink: 0 }}>—</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{
                display: 'block', width: '100%', padding: '11px 0', textAlign: 'center',
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${featured ? 'transparent' : 'var(--border2)'}`,
                background: featured ? 'var(--bg)' : 'transparent',
                color: featured ? 'var(--text)' : 'var(--muted)',
              }}>
                {name === 'Enterprise' ? 'Contactar ventas' : 'Empezar ahora'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', maxWidth: 1200, margin: '0 auto' }} />

      {/* TESTIMONIAL */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 1, background: 'var(--muted)', display: 'inline-block' }} />
            Testimonios
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,3.5vw,48px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 40 }}>
            Equipos que ya <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>entregan mejor.</em>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {['Vertikal', 'Nubis', 'Arqnode', 'Semilla', 'Codex', 'Lineal'].map(l => (
              <div key={l} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {l}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { q: 'Antes usabamos cinco herramientas para lo que Rxflow hace en una sola. La diferencia en velocidad de entrega fue inmediata.', name: 'Ana Reyes', role: 'CTO, Vertikal' },
            { q: 'El mejor tablero de sprints que hemos usado. Claro, rapido y sin curva de aprendizaje para el equipo.', name: 'Carlos Mora', role: 'PM Senior, Nubis' },
          ].map(({ q, name, role }) => (
            <div key={name} style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: '28px 28px' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.5, color: 'var(--text)', fontStyle: 'italic', marginBottom: 20 }}>
                &ldquo;{q}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                  {name.split(' ').map(p => p[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', maxWidth: 1200, margin: '0 auto' }} />

      {/* CTA BANNER */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px' }}>
        <div style={{ background: 'var(--text)', borderRadius: 16, padding: '80px 72px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,3.5vw,52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--bg)', marginBottom: 12 }}>
              Tu equipo merece<br />
              <em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.45)' }}>trabajar mejor.</em>
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 380 }}>
              Empieza gratis hoy. Sin tarjeta de credito. Sin limite de tiempo en el plan Starter.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <Link href="/register" style={{ padding: '13px 32px', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontWeight: 600, borderRadius: 8, whiteSpace: 'nowrap' }}>
              Empezar gratis
            </Link>
            <Link href="/login" style={{ padding: '13px 32px', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '36px 48px', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Rxflow</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacidad', 'Terminos', 'Soporte', 'Status'].map(l => (
            <Link key={l} href="#" style={{ fontSize: 12, color: 'var(--muted)' }}>{l}</Link>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--border2)' }}>2025 Rxflow</div>
      </footer>

    </div>
  );
}