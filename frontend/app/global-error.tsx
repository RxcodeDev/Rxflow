'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
          gap: '1rem',
          padding: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Algo salió mal
        </h2>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.375rem',
            border: '1px solid currentColor',
            cursor: 'pointer',
          }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
