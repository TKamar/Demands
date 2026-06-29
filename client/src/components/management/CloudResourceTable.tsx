import { MdEdit, MdDelete } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import type { CloudResourceStatusFlat } from '../../api/types';

interface CloudResourceTableProps {
    resources: CloudResourceStatusFlat[];
    onEdit: (resource: CloudResourceStatusFlat) => void;
    onDelete: (id: number) => void;
    isLoading: boolean;
}

export default function CloudResourceTable({ resources, onEdit, onDelete, isLoading }: CloudResourceTableProps) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="w-full h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'green':
                return 'text-green-600 bg-green-50';
            case 'yellow':
                return 'text-yellow-600 bg-yellow-50';
            case 'red':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-text-secondary bg-bg-default';
        }
    };

    return (
        <div className="bg-bg-paper rounded-xl shadow-sm border border-divider overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-start">
                    <thead className="text-xs text-text-secondary uppercase bg-bg-default border-b border-divider">
                        <tr>
                            <th className="px-6 py-3 font-semibold">{t('projects.createProject.base', 'Base')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.capacity.columns.network', 'Network')}</th>
                            <th className="px-6 py-3 font-semibold">{t('projects.createProject.cluster', 'Cluster')}</th>
                            <th className="px-6 py-3 font-semibold">{t('common.service', 'Service')}</th>
                            <th className="px-6 py-3 font-semibold text-center w-[80px]">{t('common.status', 'Status')}</th>
                            <th className="px-6 py-3 font-semibold">{t('common.reason', 'Reason')}</th>
                            <th className="px-6 py-3 font-semibold">{t('common.tag', 'Tag')}</th>
                            <th className="px-6 py-3 font-semibold">{t('common.updatedBy', 'Updated By')}</th>
                            <th className="px-6 py-3 font-semibold text-center w-[100px]">{t('common.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                        {resources.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-12 text-center text-text-secondary">
                                    {t('common.noResults', 'No results')}
                                </td>
                            </tr>
                        ) : (
                            resources.map((resource) => (
                                <tr key={resource.id} className="bg-bg-paper hover:bg-bg-default transition-colors">
                                    <td className="px-6 py-4 font-medium text-text-primary">{resource.baseName}</td>
                                    <td className="px-6 py-4 text-text-secondary">{resource.networkName}</td>
                                    <td className="px-6 py-4 text-text-secondary">{resource.clusterName}</td>
                                    <td className="px-6 py-4 text-text-secondary">{resource.service}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(resource.status)}`}>
                                            {resource.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">{resource.reason}</td>
                                    <td className="px-6 py-4 text-text-secondary">{resource.tag}</td>
                                    <td className="px-6 py-4 text-text-secondary text-xs">{resource.updatedBy || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onEdit(resource)}
                                                className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                                            >
                                                <MdEdit size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(resource.id)}
                                                className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer"
                                            >
                                                <MdDelete size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
