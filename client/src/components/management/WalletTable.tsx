import { MdEdit, MdDelete } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import type { Wallet } from '../../api/types';

interface WalletTableProps {
    wallets: Wallet[];
    onEdit: (wallet: Wallet) => void;
    onDelete: (id: number) => void;
    isLoading: boolean;
}

export default function WalletTable({ wallets, onEdit, onDelete, isLoading }: WalletTableProps) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="w-full h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-paper rounded-xl shadow-sm border border-divider overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-start">
                    <thead className="text-xs text-text-secondary uppercase bg-gray-50 border-b border-divider">
                        <tr>
                            <th className="px-6 py-3 font-semibold">{t('management.wallet.columns.service')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.wallet.columns.resource')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.wallet.columns.base')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.wallet.columns.environment')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.wallet.columns.network')}</th>
                            <th className="px-6 py-3 font-semibold">{t('management.wallet.columns.center')}</th>
                            <th className="px-6 py-3 font-semibold text-end">{t('management.wallet.columns.value')}</th>
                            <th className="px-6 py-3 font-semibold text-center w-[100px]">{t('management.wallet.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                        {wallets.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-text-secondary">
                                    {t('common.noResults')}
                                </td>
                            </tr>
                        ) : (
                            wallets.map((wallet) => (
                                <tr key={wallet.id} className="bg-white hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-text-primary">
                                        {wallet.capacity.resource.serviceName}
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {wallet.capacity.resourceName}
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {wallet.capacity.location.baseName}
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {wallet.capacity.location.environmentName}
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {wallet.capacity.location.networkName}
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {wallet.center.displayName || wallet.centerName}
                                    </td>
                                    <td className="px-6 py-4 text-end font-bold text-text-primary">
                                        {wallet.value}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onEdit(wallet)}
                                                className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                                            >
                                                <MdEdit size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(wallet.id)}
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
