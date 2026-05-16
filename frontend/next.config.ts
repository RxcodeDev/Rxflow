import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
};

// Solo wrappear con Sentry si hay DSN configurado
const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default hasSentry
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true, // nunca romper el build por Sentry
      telemetry: false,
      sourcemaps: { disable: true },
      disableLogger: true,
    })
  : nextConfig;
