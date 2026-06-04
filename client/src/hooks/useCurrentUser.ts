import { useAuth } from 'react-oidc-context';
import { useEffect, useState } from 'react';
import type { AppUser } from '../types/domain';
import api from '../api/axiosInstance';

export function useCurrentUser(): AppUser | null {
  const auth = useAuth();
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    api.get<AppUser>('/api/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, [auth.isAuthenticated]);

  return user;
}
