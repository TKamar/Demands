import type { UserRole } from '../types/domain';
import type { TopNavTabId } from '../components/main/TopNavTabs';

export type SubViewId = 'projects' | 'requirements';

export const getDefaultTab = (role: UserRole): TopNavTabId =>
  role === 'REGULAR_USER' ? 'myRequests' : 'approvalRequests';

export const getAvailableTabs = (role: UserRole): TopNavTabId[] =>
  role === 'REGULAR_USER'
    ? ['myRequests', 'history']
    : ['approvalRequests', 'myRequests', 'history'];

export const isModeratorOrAdmin = (role: UserRole): boolean =>
  role === 'ADMIN' || role === 'MODERATOR';

export const isCenterManagerOrAdmin = (role: UserRole): boolean =>
  role === 'ADMIN' || role === 'CENTER_MANAGER';
