import React from 'react';
import { useTranslation } from 'react-i18next';

export type TopNavTabId = 'approvalRequests' | 'myRequests' | 'history';

interface TopNavTabsProps {
  activeTab: TopNavTabId | null;
  onTabChange: (tab: TopNavTabId | null) => void;
  isCenterManager: boolean;
}

export const TopNavTabs: React.FC<TopNavTabsProps> = ({ activeTab, onTabChange, isCenterManager }) => {
  const { t } = useTranslation();

  const tabs: { id: TopNavTabId; label: string; visible: boolean }[] = [
    { id: 'approvalRequests', label: t('tabs.myApprovalRequests'), visible: isCenterManager },
    { id: 'myRequests', label: t('tabs.requestsIOpened'), visible: true },
    { id: 'history', label: t('tabs.requestHistory'), visible: true },
  ];

  const visibleTabs = tabs.filter(tab => tab.visible);

  const handleClick = (tabId: TopNavTabId) => {
    // Toggle: clicking active tab deselects it (returns to main Projects/Requirements view)
    onTabChange(activeTab === tabId ? null : tabId);
  };

  return (
    <div role="tablist" className="flex gap-1 border-b border-divider bg-bg-paper px-6" dir="rtl">
      {visibleTabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => handleClick(tab.id)}
          className={`px-4 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
            activeTab === tab.id
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
};
