import { useTranslation } from 'react-i18next';
import { MdAdd, MdSearch } from 'react-icons/md';
import { useModal } from '../../../contexts/ModalContext';
import { useRefresh } from '../../../contexts/RefreshContext';
import ProjectsAccordion from '../ProjectsAccordion';
import { RequestsIOpened } from '../RequestsIOpened';
import ExcelToolbar from '../../excel/ExcelToolbar';
import type { SubViewId } from '../../../utils/roleUtils';
import type { AppUser } from '../../../types/domain';

interface MyRequestsPanelProps {
  subView: SubViewId;
  onSubViewChange: (view: SubViewId) => void;
  currentUser: AppUser | null;
  selectedCenters: string[];
}

export default function MyRequestsPanel({ subView, onSubViewChange, currentUser, selectedCenters }: MyRequestsPanelProps) {
  const { t } = useTranslation();
  const { openModal } = useModal();
  const { triggerRefreshProjects } = useRefresh();

  return (
    <div className="flex flex-col h-full">
      {/* Sub-view toggle */}
      <div role="tablist" className="flex items-center gap-0 border-b border-divider bg-bg-paper px-6">
        {(['projects', 'requirements'] as SubViewId[]).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={subView === view}
            onClick={() => onSubViewChange(view)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
              subView === view ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(view === 'projects' ? 'main.tabs.projects' : 'main.tabs.requirements')}
            {subView === view && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar (Projects sub-view only) */}
      {subView === 'projects' && (
        <div className="flex items-center gap-3 px-6 py-3 bg-bg-paper border-b border-divider">
          <div className="w-56 flex items-center gap-2 px-3 py-2 border border-divider rounded-lg bg-bg-default cursor-not-allowed opacity-60">
            <MdSearch size={16} className="text-text-secondary" />
            <span className="text-sm text-text-secondary">{t('main.search.placeholder', 'Search...')}</span>
          </div>
          <div className="flex items-center gap-3 ms-auto">
            <ExcelToolbar
              centerName={currentUser?.centerName ?? undefined}
              onImportSuccess={triggerRefreshProjects}
            />
            <button
              onClick={() => openModal('project')}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
            >
              <MdAdd size={16} />
              {t('main.actions.newProject', 'New Project')}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subView === 'projects' && (
          <ProjectsAccordion selectedCenters={selectedCenters} mode="active" createdBy={currentUser?.username} />
        )}
        {subView === 'requirements' && currentUser && (
          <RequestsIOpened createdBy={currentUser.username} selectedCenters={selectedCenters} />
        )}
      </div>
    </div>
  );
}
