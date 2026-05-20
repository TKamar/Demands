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
    <div className="flex gap-1 border-b border-gray-200 mb-4" dir="rtl">
      {visibleTabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleClick(tab.id)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
