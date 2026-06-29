// client/src/components/layout/TopBar.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { MdStorage, MdPersonOutline, MdLogout, MdExpandMore, MdOutlineSettings, MdDarkMode, MdLightMode, MdDns } from 'react-icons/md';
import ResourceAvailabilityModal from './ResourceAvailabilityModal';
import { GiQueenCrown } from 'react-icons/gi';
import type { UserProfile } from '../../types/navigation';
import LanguageSwitcher from '../LanguageSwitcher';
import NotificationBell from '../notifications/NotificationBell';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface TopBarProps {
  userProfile: UserProfile;
}

export default function TopBar({ userProfile }: TopBarProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const { effectiveTheme, toggleTheme } = useTheme();
  const { navigateToHome } = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const isAdmin = userProfile.role.toLowerCase() === 'admin';
  const isModerator = userProfile.role.toLowerCase() === 'moderator';
  const hasSettingsAccess = isAdmin || isModerator;

  return (
    <>
    <header className="h-14 bg-bg-paper border-b border-divider flex items-center justify-between px-6 shrink-0">
      {/* Logo */}
      <button
        onClick={navigateToHome}
        className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition-opacity"
        aria-label={t('nav.backToHome')}
      >
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <MdStorage size={20} className="text-white" />
        </div>
        <span className="text-base font-bold text-text-primary">{t('app.title')}</span>
      </button>

      {/* Right side: language + role icon + user */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <button
          onClick={toggleTheme}
          aria-label={t('theme.toggle')}
          className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-primary-light dark:hover:bg-primary-light transition-colors"
        >
          {effectiveTheme === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
        </button>
        <NotificationBell />

        <button
          onClick={() => setResourceModalOpen(true)}
          aria-label={t('tabs.resourceAvailability')}
          title={t('tabs.resourceAvailability')}
          className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-primary-light dark:hover:bg-primary-light transition-colors"
        >
          <MdDns size={18} />
        </button>

        {/* Role icon — clicking navigates to settings */}
        {hasSettingsAccess && (
          <button
            onClick={() => navigate('/settings')}
            className="p-1.5 rounded-lg hover:bg-bg-default text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
            title={t('nav.settings', 'Settings')}
            aria-label={t('nav.settings', 'Settings')}
          >
            {isAdmin ? (
              <GiQueenCrown size={20} className="text-amber-500" />
            ) : (
              <MdOutlineSettings size={20} />
            )}
          </button>
        )}

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-bg-default transition-colors bg-transparent border-none cursor-pointer"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center">
              <MdPersonOutline size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary max-w-[140px] truncate" title={userProfile.name}>
              {userProfile.name}
            </span>
            <MdExpandMore
              size={18}
              className={`text-text-secondary transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute end-0 top-full mt-1 w-44 bg-bg-paper rounded-xl shadow-lg border border-divider overflow-hidden z-[9999]">
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-bg-default transition-colors bg-transparent border-none cursor-pointer text-start"
              >
                <MdPersonOutline size={18} />
                {t('user.profile')}
              </button>
              <button
                onClick={() => { setMenuOpen(false); auth.signoutRedirect(); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger hover:bg-bg-default transition-colors bg-transparent border-none cursor-pointer text-start"
              >
                <MdLogout size={18} />
                {t('user.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    <ResourceAvailabilityModal
      isOpen={resourceModalOpen}
      onClose={() => setResourceModalOpen(false)}
    />
    </>
  );
}
