import { useTranslation } from 'react-i18next';
import { MdAdd, MdSearch } from 'react-icons/md';
import { useModal } from '../../../contexts/ModalContext';
import ProjectsAccordion from '../ProjectsAccordion';
import { RequestsIOpened } from '../RequestsIOpened';
import type { SubViewId } from '../../../utils/roleUtils';

interface MyRequestsPanelProps {
  subView: SubViewId;
  onSubViewChange: (view: SubViewId) => void;
}

export default function MyRequestsPanel({ subView, onSubViewChange }: MyRequestsPanelProps) {
  const { t } = useTranslation();
  const { openModal } = useModal();

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
          <button
            onClick={() => openModal('project')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap ms-auto"
          >
            <MdAdd size={16} />
            {t('main.actions.newProject', 'New Project')}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subView === 'projects' && <ProjectsAccordion selectedCenters={[]} />}
        {subView === 'requirements' && <RequestsIOpened />}
      </div>
    </div>
  );
}
