import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    base44.auth
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        if (cancelled) return;
        setUser(null);
        setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    user,
    error,
    isLoading: user === undefined,
    isSignedIn: Boolean(user),
    signIn: () => base44.auth.redirectToLogin(window.location.href),
    signOut: () => base44.auth.logout(window.location.origin),
  };
}
