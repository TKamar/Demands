import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdClose, MdEdit, MdDelete } from 'react-icons/md';
import type { Project } from '../../types/domain';
import PriorityBadge from './PriorityBadge';

interface ProjectDetailSidebarProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export default function ProjectDetailSidebar({
  project,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ProjectDetailSidebarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const isRtl = i18n.dir() === 'rtl';

  function handleViewDemands() {
    navigate(`/demands?project=${encodeURIComponent(project!.name)}`);
    onClose();
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`fixed top-0 end-0 h-full w-full max-w-md bg-bg-paper shadow-xl border-s border-divider flex flex-col ${isRtl ? 'animate-[slide-in-left_0.3s_ease-out]' : 'animate-[slide-in-right_0.3s_ease-out]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-text-primary m-0 truncate flex-1">
            {project.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer ms-2"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Type Badge */}
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">
            {t(`projects.type.${project.type}`)}
          </span>

          {/* Purpose */}
          {project.purpose && (
            <div className="mt-4">
              <p className="text-text-secondary text-sm">{project.purpose}</p>
            </div>
          )}

          {/* Details Section */}
          <DetailSection title={t('projectSidebar.details')}>
            <DetailRow
              label={t('projectsTable.columns.relatedTo')}
              value={project.relatedTo}
            />
            <DetailRow
              label={t('projectsTable.columns.kind')}
              value={project.kind ? t(`projects.kind.${project.kind}`) : undefined}
            />
            <DetailRow
              label={t('projects.createProject.priority')}
              value={<PriorityBadge priority={project.priority} />}
            />
          </DetailSection>

          {/* Location Section */}
          <DetailSection title={t('projectSidebar.location')}>
            <DetailRow
              label={t('projects.columns.base')}
              value={project.location.base}
            />
            <DetailRow
              label={t('projects.columns.environment')}
              value={project.location.environment}
            />
            <DetailRow
              label={t('projects.columns.network')}
              value={project.location.network}
            />
            <DetailRow
              label={t('projects.columns.cluster')}
              value={project.location.cluster}
            />
          </DetailSection>

          {/* Organization Section */}
          <DetailSection title={t('projectSidebar.organization')}>
            <DetailRow
              label={t('projects.columns.center')}
              value={project.centerName}
            />
            <DetailRow
              label={t('projects.columns.branch')}
              value={project.branchName}
            />
            <DetailRow
              label={t('projects.columns.section')}
              value={project.sectionName}
            />
          </DetailSection>

          {/* Time-related Fields */}
          {(project.year || project.median || project.emergencyOption) && (
            <DetailSection title="">
              {project.year && (
                <DetailRow
                  label={t('projectsTable.columns.year')}
                  value={project.year}
                />
              )}
              {project.median && (
                <DetailRow
                  label={t('projectsTable.columns.median')}
                  value={project.median}
                />
              )}
              {project.emergencyOption && (
                <DetailRow
                  label={t('projectsTable.columns.emergencyOption')}
                  value={project.emergencyOption}
                />
              )}
            </DetailSection>
          )}

          {/* Meta Section */}
          <DetailSection title={t('projectSidebar.meta')}>
            <DetailRow
              label={t('projects.columns.createdBy')}
              value={project.createdByName}
            />
            <DetailRow
              label={t('projects.columns.createdAt')}
              value={formatDate(project.createdAt)}
            />
            <DetailRow
              label={t('projectsTable.columns.demandCount')}
              value={project.demandCount ?? 0}
            />
          </DetailSection>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-divider flex flex-col gap-3">
          <button
            type="button"
            onClick={handleViewDemands}
            className="w-full px-6 py-2.5 bg-text-primary text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer border-none"
          >
            {t('projectSidebar.viewDemands')} ({project.demandCount ?? 0})
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
            >
              <MdEdit size={16} />
              {t('common.edit')}
            </button>
            <button
              type="button"
              onClick={() => onDelete(project)}
              disabled={(project.demandCount ?? 0) > 0}
              className="flex-1 px-4 py-2 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title={(project.demandCount ?? 0) > 0 ? t('projects.actions.cannotDeleteWithDemands') : ''}
            >
              <MdDelete size={16} />
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      {title && (
        <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary font-medium">
        {value ?? '-'}
      </span>
    </div>
  );
}
