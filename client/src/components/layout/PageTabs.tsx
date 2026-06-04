import { useNavigate, useLocation } from 'react-router-dom';

export interface PageTab {
  label: string;
  path: string;
}

interface PageTabsProps {
  tabs: PageTab[];
  basePath: string;
}

export default function PageTabs({ tabs, basePath }: PageTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="flex border-b border-divider mb-6">
      {tabs.map((tab) => {
        const isActive = location.pathname === `${basePath}${tab.path}`;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(`${basePath}${tab.path}`)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors bg-transparent cursor-pointer ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
