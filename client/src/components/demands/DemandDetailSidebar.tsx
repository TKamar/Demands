import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MdClose, MdEdit, MdCancel, MdCheck } from 'react-icons/md';
import type { Demand, Project } from '../../types/domain';
import StatusBadge from '../projects/StatusBadge';
import PriorityBadge from '../projects/PriorityBadge';
import DemandHistoryTimeline from './DemandHistoryTimeline';

interface DemandDetailSidebarProps {
  demand: Demand | null;
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (demand: Demand) => void;
  onCancel?: (demand: Demand) => void;
  onApprove?: (demand: Demand) => void;
  onDeny?: (demand: Demand) => void;
  isModerator?: boolean;
}

export default function DemandDetailSidebar({
  demand,
  project,
  isOpen,
  onClose,
  onEdit,
  onCancel,
  onApprove,
  onDeny,
  isModerator = false,
}: DemandDetailSidebarProps) {
  const { t, i18n } = useTranslation();

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

  if (!isOpen || !demand) return null;

  const isRtl = i18n.dir() === 'rtl';

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className={`fixed top-0 end-0 h-full w-full max-w-md bg-bg-paper shadow-xl border-s border-divider flex flex-col pointer-events-auto ${isRtl ? 'animate-[slide-in-left_0.3s_ease-out]' : 'animate-[slide-in-right_0.3s_ease-out]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-text-primary m-0 truncate flex-1">
            {demand.serviceName} - {demand.resourceName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:bg-bg-default hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer ms-2"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Demand Details Section */}
          <DetailSection title={t('demandSidebar.demandDetails')}>
            <DetailRow
              label={t('projects.columns.id')}
              value={demand.id}
            />
            <DetailRow
              label={t('projects.columns.value')}
              value={`${demand.value} ${demand.unit}`}
            />
            <DetailRow
              label={t('projects.columns.type')}
              value={t(`projects.demandType.${demand.type}`)}
            />
            <DetailRow
              label={t('projects.columns.status')}
              value={<StatusBadge status={demand.status} />}
            />
            {demand.clusterName && (
              <DetailRow
                label={t('demandSidebar.clusterName')}
                value={demand.clusterName}
              />
            )}
          </DetailSection>

          {/* Approval Section */}
          {demand.status !== 'Pending' && demand.status !== 'Cancelled' && (
            <DetailSection title={t('demandSidebar.approval')}>
              {demand.approvedValue !== undefined && demand.approvedValue !== null && (
                <DetailRow
                  label={t('projects.columns.approvedValue')}
                  value={`${demand.approvedValue} ${demand.unit}`}
                />
              )}
              <DetailRow
                label={t('projects.columns.approvedDate')}
                value={formatDate(demand.approvedDate)}
              />
              {demand.reason && (
                <DetailRow
                  label={t('projects.columns.reason')}
                  value={demand.reason}
                />
              )}
            </DetailSection>
          )}

          {/* Flow History Timeline Section */}
          {demand.id && (
            <DetailSection title={t('demandSidebar.flowHistory', 'היסטוריית זרימה')}>
              <DemandHistoryTimeline demandId={demand.id} />
            </DetailSection>
          )}

          {/* Location Section */}
          <DetailSection title={t('demandSidebar.location')}>
            <DetailRow
              label={t('projects.columns.base')}
              value={demand.location.base}
            />
            <DetailRow
              label={t('projects.columns.environment')}
              value={demand.location.environment}
            />
            <DetailRow
              label={t('projects.columns.network')}
              value={demand.location.network}
            />
            <DetailRow
              label={t('projects.columns.cluster')}
              value={demand.location.cluster}
            />
          </DetailSection>

          {/* Organization Section */}
          <DetailSection title={t('demandSidebar.organization')}>
            <DetailRow
              label={t('projects.columns.center')}
              value={demand.centerName}
            />
            <DetailRow
              label={t('projects.columns.branch')}
              value={demand.branchName}
            />
            <DetailRow
              label={t('projects.columns.section')}
              value={demand.sectionName}
            />
          </DetailSection>

          {/* Project Information Section */}
          <DetailSection title={t('demandSidebar.projectInfo')}>
            <DetailRow
              label={t('projects.columns.project')}
              value={demand.projectName}
            />
            {project && (
              <>
                <DetailRow
                  label={t('projectsTable.columns.purpose')}
                  value={project.purpose}
                />
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
                <DetailRow
                  label={t('demandSidebar.projectType')}
                  value={project.type ? t(`projects.type.${project.type}`) : undefined}
                />
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
              </>
            )}
          </DetailSection>

          {/* Meta Section */}
          <DetailSection title={t('demandSidebar.meta')}>
            <DetailRow
              label={t('projects.columns.createdBy')}
              value={demand.createdByName}
            />
            <DetailRow
              label={t('projects.columns.createdAt')}
              value={formatDate(demand.createdAt)}
            />
          </DetailSection>
        </div>

        {/* Footer with Actions */}
        {(['PendingCenterManager', 'Pending', 'WaitingOnPrerequisite'] as const).includes(demand?.status as any) && (
          <div className="p-6 border-t border-divider flex gap-3">
            {isModerator ? (
              <>
                <button
                  type="button"
                  onClick={() => onApprove?.(demand)}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <MdCheck size={18} />
                  {t('demands.actions.approve', 'אשר')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeny?.(demand)}
                  className="flex-1 px-4 py-2.5 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <MdCancel size={18} />
                  {t('demands.actions.deny', 'דחה')}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit?.(demand)}
                  className="px-4 py-2.5 bg-bg-default border border-divider text-text-primary rounded-xl text-sm font-medium hover:bg-bg-default transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <MdEdit size={18} />
                  {t('common.edit', 'ערוך')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onEdit?.(demand)}
                  className="flex-1 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <MdEdit size={18} />
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onCancel?.(demand)}
                  className="flex-1 px-6 py-2.5 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <MdCancel size={18} />
                  {t('demands.actions.cancel')}
                </button>
              </>
            )}
          </div>
        )}
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
