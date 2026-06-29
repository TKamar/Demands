import { MdEdit, MdDelete } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import type { Capacity } from '../../api/types';

interface CapacityTableProps {
    capacities: Capacity[];
    onEdit: (capacity: Capacity) => void;
    onDelete: (id: number) => void;
    isLoading: boolean;
}

export default function CapacityTable({ capacities, onEdit, onDelete, isLoading }: CapacityTableProps) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="w-full h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const getUtilizationColor = (utilization: number) => {
        if (utilization >= 90) return 'bg-red-500';
        if (utilization >= 75) return 'bg-orange-500';
        return 'bg-green-500';
    };

    return (
        <div className="bg-bg-paper rounded-xl shadow-sm border border-divider overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-start">
                    <thead className="text-xs text-text-secondary uppercase bg-bg-default border-b border-divider">
                        <tr>
                            <th className="px-6 py-3 font-semibold">{t('management.capacity.columns.service')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.capacity.columns.resource')}</th>
                            <th className="px-6 py-3 font-semibold text-center w-[80px]">{t('management.capacity.columns.unit')}</th>
                            <th className="px-6 py-3 font-semibold">{t('projects.createProject.base')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.capacity.columns.network')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.capacity.columns.environment')}</th>
                            <th className="px-6 py-3 font-semibold">{t('projects.createProject.cluster')}</th>
                            <th className="px-6 py-3 font-semibold text-end">{t('management.capacity.columns.total')}</th>
                            <th className="px-6 py-3 font-semibold text-end">{t('management.capacity.columns.allocated')}</th>
                            <th className="px-6 py-3 font-semibold text-end">{t('management.capacity.columns.available')}</th>
                            <th className="px-6 py-3 font-semibold text-center min-w-[200px]">{t('management.capacity.columns.utilization')}</th>
                            <th className="px-6 py-3 font-semibold text-center w-[100px]">{t('management.capacity.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                        {capacities.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-6 py-12 text-center text-text-secondary">
                                    {t('common.noResults')}
                                </td>
                            </tr>
                        ) : (
                            capacities.map((capacity) => {
                                const utilization = capacity.value > 0
                                    ? (capacity.allocated / capacity.value) * 100
                                    : 0;

                                return (
                                    <tr key={capacity.id} className="bg-bg-paper hover:bg-bg-default transition-colors">
                                        <td className="px-6 py-4 font-medium text-text-primary">{capacity.resourceService}</td>
                                        <td className="px-6 py-4 text-text-secondary">{capacity.resourceName}</td>
                                        <td className="px-6 py-4 text-center text-text-secondary">{capacity.resource?.unit || '-'}</td>
                                        <td className="px-6 py-4 text-text-secondary">{capacity.location.baseName}</td>
                                        <td className="px-6 py-4 text-text-secondary">{capacity.location.networkName}</td>
                                        <td className="px-6 py-4 text-text-secondary">{capacity.location.environmentName}</td>
                                        <td className="px-6 py-4 text-text-secondary">{capacity.location.clusterName}</td>
                                        <td className="px-6 py-4 text-end font-bold text-text-primary">{capacity.value}</td>
                                        <td className="px-6 py-4 text-end text-orange-600 font-medium">{capacity.allocated}</td>
                                        <td className="px-6 py-4 text-end text-green-600 font-medium">{capacity.available}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${getUtilizationColor(utilization)}`}
                                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-text-secondary w-11 text-end">
                                                    {utilization.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => onEdit(capacity)}
                                                    className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                                                >
                                                    <MdEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(capacity.id)}
                                                    className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer"
                                                >
                                                    <MdDelete size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
