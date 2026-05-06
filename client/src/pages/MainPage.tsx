// client/src/pages/MainPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';
import { MdAdd, MdSearch } from 'react-icons/md';

type MainTab = 'projects' | 'requirements';

export default function MainPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openModal } = useModal();

  const initialTab: MainTab =
    searchParams.get('tab') === 'requirements' ? 'requirements' : 'projects';

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'requirements' ? { tab: 'requirements' } : {}, { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-divider bg-bg-paper px-6">
        {(['projects', 'requirements'] as MainTab[]).map((tab) => {
          const label =
            tab === 'projects'
              ? t('main.tabs.projects', 'Projects & Requirements')
              : t('main.tabs.requirements', 'Requirements');
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Center filter + resource summary strip placeholder */}
      <div className="bg-bg-paper border-b border-divider px-6 py-3">
        <p className="text-xs text-text-secondary italic">
          Center filter + resource summary — Task 4 &amp; 5
        </p>
      </div>

      {/* Search + create buttons */}
      <div className="flex items-center gap-3 px-6 py-3 bg-bg-paper border-b border-divider">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-divider rounded-lg bg-bg-default cursor-not-allowed opacity-60">
          <MdSearch size={16} className="text-text-secondary" />
          <span className="text-sm text-text-secondary">
            {t('main.search.placeholder', 'Search… (coming soon)')}
          </span>
        </div>
        <button
          onClick={() => openModal('project')}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
        >
          <MdAdd size={16} />
          {t('main.actions.newProject', 'New Project')}
        </button>
        <button
          onClick={() => openModal('demand')}
          className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-sm font-medium rounded-lg hover:bg-primary-light transition-colors bg-transparent cursor-pointer whitespace-nowrap"
        >
          <MdAdd size={16} />
          {t('main.actions.newRequirement', 'New Requirement')}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'projects' ? (
          <div className="text-sm text-text-secondary italic">
            Projects accordion — Task 7
          </div>
        ) : (
          <div className="text-sm text-text-secondary italic">
            Requirements table — Task 6
          </div>
        )}
      </div>
    </div>
  );
}
