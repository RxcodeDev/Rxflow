'use client';

import { useRouter } from 'next/navigation';
import LoginForm from '@/components/features/auth/LoginForm';

export default function Home() {
  const router = useRouter();

  async function handleLogin(_email: string, _password: string) {
    // TODO: call auth API � for now just navigate
    router.push('/inicio');
  }

  return <LoginForm onSubmit={handleLogin} />;
}
