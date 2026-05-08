'use client';

import { useState } from 'react';
import LoginForm from '@/components/features/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

function toUserMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Ocurrió un error inesperado. Intenta de nuevo.';
  switch (e.status) {
    case 400: return 'Verifica que tu correo y contraseña sean correctos.';
    case 401: return 'Correo o contraseña incorrectos.';
    case 403: return 'No tienes permiso para acceder.';
    case 429: return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    case 502:
    case 503:
    case 0:   return 'No se pudo conectar al servidor. Verifica tu conexión.';
    default:  return 'Ocurrió un error al iniciar sesión. Intenta de nuevo.';
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(email: string, password: string) {
    try {
      setError(undefined);
      await login({ email, password });
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  return <LoginForm onSubmit={handleSubmit} error={error} />;
}
