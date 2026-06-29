import type { UserRole } from '../types/domain';
import type { TopNavTabId } from '../components/main/TopNavTabs';

export type SubViewId = 'projects' | 'requirements';

export const getDefaultTab = (role: UserRole): TopNavTabId =>
  role === 'REGULAR_USER' ? 'myRequests' : 'approvalRequests';

export const getAvailableTabs = (role: UserRole): TopNavTabId[] => {
  if (role === 'REGULAR_USER') return ['myRequests', 'history'];
  const base: TopNavTabId[] = ['approvalRequests', 'myRequests', 'history'];
  return [...base, 'dashboard'];
};

export const isModeratorOrAdmin = (role: UserRole): boolean =>
  role === 'ADMIN' || role === 'MODERATOR';

export const isCenterManagerOrAdmin = (role: UserRole): boolean =>
  role === 'ADMIN' || role === 'CENTER_MANAGER';
