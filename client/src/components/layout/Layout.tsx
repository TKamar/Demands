// client/src/components/layout/Layout.tsx
import { Outlet, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import TopBar from './TopBar';
import NavigationContext from '../../contexts/NavigationContext';
import type { UserProfile } from '../../types/navigation';

interface LayoutProps {
  userProfile: UserProfile;
}

export default function Layout({ userProfile }: LayoutProps) {
  const navigate = useNavigate();

  const handleNavigateHome = useCallback(() => {
    navigate('/projects?reset=true');
  }, [navigate]);

  return (
    <NavigationContext.Provider value={{ navigateToHome: handleNavigateHome }}>
      <div className="flex flex-col min-h-screen bg-bg-default">
        {/* Top accent bar */}
        <div className="h-1 bg-topbar shrink-0" />
        <TopBar userProfile={userProfile} />
        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </NavigationContext.Provider>
  );
}
