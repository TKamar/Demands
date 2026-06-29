import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '../../types/domain';
import { getAvailableTabs } from '../../utils/roleUtils';

export type TopNavTabId = 'approvalRequests' | 'myRequests' | 'history' | 'dashboard';

interface TopNavTabsProps {
  activeTab: TopNavTabId;
  onTabChange: (tab: TopNavTabId) => void;
  role: UserRole;
}

export const TopNavTabs: React.FC<TopNavTabsProps> = ({ activeTab, onTabChange, role }) => {
  const { t } = useTranslation();

  const TAB_LABELS: Record<TopNavTabId, string> = {
    approvalRequests: t('tabs.myApprovalRequests'),
    myRequests: t('tabs.requestsIOpened'),
    history: t('tabs.requestHistory'),
    dashboard: t('tabs.analytics'),
  };

  const availableTabs = getAvailableTabs(role);

  return (
    <div role="tablist" className="flex gap-1 border-b border-divider bg-bg-paper px-6" dir="rtl">
      {availableTabs.map((tabId) => (
        <button
          key={tabId}
          role="tab"
          aria-selected={activeTab === tabId}
          onClick={() => onTabChange(tabId)}
          className={`px-4 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
            activeTab === tabId
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-default'
          }`}
        >
          {TAB_LABELS[tabId]}
          {activeTab === tabId && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
};
