import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdFolder } from 'react-icons/md';
import type { Project } from '../../types/domain';

interface ProjectCardProps {
  project: Project;
  demandCount: number;
}

export default function ProjectCard({ project, demandCount }: ProjectCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/demands?project=${encodeURIComponent(project.name)}`}
      className="no-underline text-inherit"
    >
      <div className="bg-bg-paper rounded-2xl border border-divider p-5 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
            <MdFolder size={20} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-text-primary m-0 truncate">
            {project.name}
          </h3>
        </div>

        <p className="text-sm text-text-secondary m-0 mb-3 line-clamp-2">
          {project.purpose}
        </p>

        <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
          <span className="px-2 py-0.5 rounded-full bg-gray-100">
            {t(`projects.type.${project.type}`)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-gray-100">
            {t(`projects.kind.${project.kind}`)}
          </span>
          {project.year && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100">
              {project.year} {project.median}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-text-secondary">{project.createdByName}</span>
          <span className="font-medium text-primary">
            {demandCount} {t('projects.demands')}
          </span>
        </div>
      </div>
    </Link>
  );
}
