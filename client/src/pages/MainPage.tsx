// client/src/pages/MainPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';
import { MdAdd, MdSearch, MdArrowBack } from 'react-icons/md';
import CenterFilter from '../components/main/CenterFilter';
import ResourceSummaryStrip from '../components/main/ResourceSummaryStrip';
import RequirementsView from '../components/main/RequirementsView';
import ProjectsAccordion from '../components/main/ProjectsAccordion';
import { TopNavTabs } from '../components/main/TopNavTabs';
import type { TopNavTabId } from '../components/main/TopNavTabs';
import { MyApprovalRequests } from '../components/main/MyApprovalRequests';
import { RequestsIOpened } from '../components/main/RequestsIOpened';
import { ResourcesForAssignment } from '../components/main/ResourcesForAssignment';
import { useCurrentUser } from '../hooks/useCurrentUser';

type MainTab = 'projects' | 'requirements';

export default function MainPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openModal } = useModal();

  const currentUser = useCurrentUser();
  const isCenterManager = currentUser?.role === 'CENTER_MANAGER' || currentUser?.role === 'ADMIN';
  const [topNavTab, setTopNavTab] = useState<TopNavTabId | null>(null);

  const [activeTab, setActiveTab] = useState<MainTab>(
    searchParams.get('tab') === 'requirements' ? 'requirements' : 'projects'
  );

  useEffect(() => {
    const tabFromUrl: MainTab = searchParams.get('tab') === 'requirements' ? 'requirements' : 'projects';
    setActiveTab(tabFromUrl);
  }, [searchParams]);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [resourceSummaryOpen, setResourceSummaryOpen] = useState(false);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'requirements' ? { tab: 'requirements' } : {}, { replace: true });
  };

  const BackButton = () => (
    <div className="flex items-center mb-4" dir="rtl">
      <button
        onClick={() => setTopNavTab(null)}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none"
      >
        <MdArrowBack size={18} />
        {t('nav.back')}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* TopNavTabs — always visible at the top */}
      <TopNavTabs
        activeTab={topNavTab}
        onTabChange={setTopNavTab}
        isCenterManager={isCenterManager}
      />

      {/* Tab bar — hidden when a topNavTab is active */}
      {!topNavTab && (
        <div role="tablist" className="flex items-center gap-0 border-b border-divider bg-bg-paper px-6">
          {(['projects', 'requirements'] as MainTab[]).map((tab) => {
            const label =
              tab === 'projects'
                ? t('main.tabs.projects', 'Projects & Requirements')
                : t('main.tabs.requirements', 'Requirements');
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => handleTabChange(tab)}
                className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
                {/* TODO: show total count in tab label */}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Center filter + resource summary strip — hidden when a topNavTab is active */}
      {!topNavTab && (
        <div className="bg-bg-paper border-b border-divider px-6 py-3 flex items-center gap-4 flex-wrap">
          <CenterFilter selectedCenters={selectedCenters} onChange={setSelectedCenters} />
          <ResourceSummaryStrip
            selectedCenters={selectedCenters}
            open={resourceSummaryOpen}
            onToggle={() => setResourceSummaryOpen(!resourceSummaryOpen)}
          />
        </div>
      )}

      {/* Search + create buttons — hidden when a topNavTab is active */}
      {!topNavTab && (
        <div className="flex items-center gap-3 px-6 py-3 bg-bg-paper border-b border-divider">
          <div className="w-56 flex items-center gap-2 px-3 py-2 border border-divider rounded-lg bg-bg-default cursor-not-allowed opacity-60">
            <MdSearch size={16} className="text-text-secondary" />
            <span className="text-sm text-text-secondary">
              {t('main.search.placeholder', 'Search...')}
            </span>
          </div>
          <button
            onClick={() => openModal('project')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
          >
            <MdAdd size={16} />
            {t('main.actions.newProject', 'New Project')}
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {/* TopNav content panels */}
        {topNavTab === 'approvalRequests' && isCenterManager && (
          <div>
            <BackButton />
            <MyApprovalRequests
              onApprove={(_demand) => { /* CmDecisionModal wired in Branch 3 */ }}
              onReject={(_demand) => { /* CmDecisionModal wired in Branch 3 */ }}
            />
          </div>
        )}
        {topNavTab === 'myRequests' && (
          <div>
            <BackButton />
            <RequestsIOpened />
          </div>
        )}
        {topNavTab === 'history' && (
          <div>
            <BackButton />
            <div className="p-4 text-center text-gray-400" dir="rtl">
              {/* RequestHistory component added in Branch 4 */}
              {t('history.comingSoon')}
            </div>
          </div>
        )}

        {/* Resources for Assignment — shown when CM and no top tab selected */}
        {isCenterManager && !topNavTab && <ResourcesForAssignment />}

        {/* Main Projects/Requirements view — hidden when a top nav tab is active */}
        {!topNavTab && (
          activeTab === 'projects' ? (
            <ProjectsAccordion selectedCenters={selectedCenters} />
          ) : (
            <RequirementsView selectedCenters={selectedCenters} />
          )
        )}
      </div>
    </div>
  );
}
