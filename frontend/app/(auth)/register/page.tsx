'use client';

import { useState } from 'react';
import RegisterForm from '@/components/features/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(name: string, email: string, password: string) {
    try {
      setError(undefined);
      await register({ name, email, password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al registrarse');
    }
  }

  return <RegisterForm onSubmit={handleSubmit} error={error} />;
}
