'use client';

import { useState } from 'react';
import LoginForm from '@/components/features/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(email: string, password: string) {
    try {
      setError(undefined);
      await login({ email, password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al iniciar sesión');
    }
  }

  return <LoginForm onSubmit={handleSubmit} error={error} />;
}
