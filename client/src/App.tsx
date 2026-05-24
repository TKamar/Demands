import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { useAuthToken } from './hooks/useAuthToken';
import { ToastProvider } from './components/common/Toast';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import MainPage from './pages/MainPage';
import NotFoundPage from './pages/NotFoundPage';
import GlobalModals from './components/layout/GlobalModals';
import { RefreshProvider } from './contexts/RefreshContext';
import { ModalProvider } from './contexts/ModalContext';
import { ReferenceDataProvider } from './context/ReferenceDataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import type { UserProfile } from './types/navigation';

function AppContent() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  useAuthToken();

  useEffect(() => {
    const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
    document.title = t('app.title');
  }, [i18n.language, t]);

  // Handle authentication
  useEffect(() => {
    // If not authenticated and not loading, redirect to login
    if (!auth.isAuthenticated && !auth.isLoading && !auth.activeNavigator) {
      auth.signinRedirect();
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.activeNavigator, auth.signinRedirect]);

  // Show loading state while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('auth.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Show error if authentication failed
  if (auth.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <p className="text-xl font-semibold">{t('auth.error', 'Authentication Error')}</p>
          </div>
          <p className="text-gray-600 mb-4">{auth.error.message}</p>
          <button
            onClick={() => auth.signinRedirect()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('auth.retry', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (will redirect)
  if (!auth.isAuthenticated) {
    return null;
  }

  // Extract user profile from token
  const VALID_ROLES: UserProfile['role'][] = ['admin', 'moderator', 'user'];
  const rawRole = (auth.user?.profile.groups as string[])?.[0]?.toLowerCase();
  const userProfile: UserProfile = {
    name: `${auth.user?.profile.given_name || ''} ${auth.user?.profile.family_name || ''}`.trim() || auth.user?.profile.email || 'User',
    role: VALID_ROLES.includes(rawRole as UserProfile['role']) ? (rawRole as UserProfile['role']) : 'user',
  };

  return (
    <NotificationProvider>
      <BrowserRouter>
        <GlobalModals />
        <Routes>
          <Route element={<Layout userProfile={userProfile} />}>
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="/callback" element={<Navigate to="/projects" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<MainPage />} />
            <Route path="/demands" element={<Navigate to="/projects?tab=requirements" replace />} />
            <Route path="/management" element={<Navigate to="/projects" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <RefreshProvider>
        <ReferenceDataProvider>
          <ModalProvider>
            <AppContent />
          </ModalProvider>
        </ReferenceDataProvider>
      </RefreshProvider>
    </ToastProvider>
  );
}
