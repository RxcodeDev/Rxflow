import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Captura trazas de rendimiento
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Replay de sesiones (1% en prod, 10% en errores)
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration(),
  ],

  debug: process.env.NODE_ENV === 'development',
});
