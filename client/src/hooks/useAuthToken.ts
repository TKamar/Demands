import { useAuth } from 'react-oidc-context';
import { setAuthToken } from '../api/axiosInstance';

export function useAuthToken() {
  const auth = useAuth();
  setAuthToken(auth.user?.access_token ?? null);
}
