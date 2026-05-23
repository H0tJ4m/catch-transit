import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { getFbAuth, isFirebaseConfigured } from './config';

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const auth = getFbAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        signInAnonymously(auth).catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'Sign-in failed');
        });
      }
    });
    return () => unsub();
  }, []);

  return { user, loading, error };
}
