import { useTranslation } from 'react-i18next';
import ProjectsAccordion from '../ProjectsAccordion';
import RequestHistory from '../RequestHistory';
import type { SubViewId } from '../../../utils/roleUtils';

interface HistoryPanelProps {
  subView: SubViewId;
  onSubViewChange: (view: SubViewId) => void;
}

export default function HistoryPanel({ subView, onSubViewChange }: HistoryPanelProps) {
  const { t } = useTranslation();

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

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subView === 'projects' && <ProjectsAccordion selectedCenters={[]} />}
        {subView === 'requirements' && <RequestHistory />}
      </div>
    </div>
  );
}
