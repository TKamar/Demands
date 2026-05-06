import type { IconType } from 'react-icons';

export interface NavItem {
  label: string;
  path?: string;
  icon: IconType;
  onClick?: () => void;
  children?: NavItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface UserProfile {
  name: string;
  role: 'admin' | 'moderator' | 'user';
  avatarUrl?: string;
}
