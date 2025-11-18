'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      console.log('ProtectedRoute check - user:', user, 'requiredRole:', requiredRole);
      if (!user) {
        console.log('No user, redirecting to /');
        router.push('/');
      } else if (requiredRole && user.rol !== requiredRole) {
        console.log('Wrong role, redirecting to /dashboard');
        router.push('/dashboard');
      } else {
        console.log('Access granted');
      }
    }
  }, [user, loading, requiredRole, router]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return null;
  }

  if (requiredRole && user.rol !== requiredRole) {
    return null;
  }

  return children;
}