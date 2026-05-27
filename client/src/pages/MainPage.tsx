import { useState, useEffect, useRef } from 'react';
import { TopNavTabs } from '../components/main/TopNavTabs';
import type { TopNavTabId } from '../components/main/TopNavTabs';
import ApprovalRequestsPanel from '../components/main/panels/ApprovalRequestsPanel';
import MyRequestsPanel from '../components/main/panels/MyRequestsPanel';
import HistoryPanel from '../components/main/panels/HistoryPanel';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getDefaultTab } from '../utils/roleUtils';
import type { SubViewId } from '../utils/roleUtils';
import type { UserRole } from '../types/domain';

const DEFAULT_TAB: TopNavTabId = 'myRequests';
const DEFAULT_SUBVIEWS: Record<TopNavTabId, SubViewId> = {
  approvalRequests: 'requirements',
  myRequests: 'projects',
  history: 'requirements',
};

export default function MainPage() {
  const currentUser = useCurrentUser();
  const role: UserRole = currentUser?.role ?? 'REGULAR_USER';

  const [topNavTab, setTopNavTab] = useState<TopNavTabId>(DEFAULT_TAB);
  const [subViewByTab, setSubViewByTab] = useState<Record<TopNavTabId, SubViewId>>(DEFAULT_SUBVIEWS);
  const defaultTabSetRef = useRef(false);

  // Once user role loads, switch to the correct default tab
  useEffect(() => {
    if (currentUser && !defaultTabSetRef.current) {
      defaultTabSetRef.current = true;
      setTopNavTab(getDefaultTab(currentUser.role));
    }
  }, [currentUser]);

  const subView = subViewByTab[topNavTab];

  const handleSubViewChange = (view: SubViewId) => {
    setSubViewByTab((prev) => ({ ...prev, [topNavTab]: view }));
  };

  return (
    <div className="flex flex-col h-full">
      <TopNavTabs activeTab={topNavTab} onTabChange={setTopNavTab} role={role} />

      <div className="flex-1 overflow-hidden">
        {topNavTab === 'approvalRequests' && (
          <ApprovalRequestsPanel
            subView={subView}
            onSubViewChange={handleSubViewChange}
            role={role}
          />
        )}
        {topNavTab === 'myRequests' && (
          <MyRequestsPanel subView={subView} onSubViewChange={handleSubViewChange} />
        )}
        {topNavTab === 'history' && (
          <HistoryPanel subView={subView} onSubViewChange={handleSubViewChange} />
        )}
      </div>
    </div>
  );
}
