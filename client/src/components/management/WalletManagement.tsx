import { useState, useEffect, useMemo, useCallback } from 'react';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useWallets } from '../../hooks/useWallets';
import type { Wallet } from '../../api/types';
import WalletTable from './WalletTable';
import WalletModal from './WalletModal';
import FilterSort from '../common/filters/FilterSort';
import { useToast } from '../common/Toast';
import type { FilterGroupConfig } from '../../types/filter';

type WalletFilterKey = 'service' | 'resource' | 'center';

const INITIAL_FILTERS: Record<WalletFilterKey, string> = {
    service: '',
    resource: '',
    center: '',
};

const noop = () => {};

export default function WalletManagement() {
    const { t } = useTranslation();
    const {
        wallets,
        isLoading,
        error,
        fetchWallets,
        createWallet,
        updateWallet,
        deleteWallet
    } = useWallets();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filters, setFilters] = useState<Record<WalletFilterKey, string>>(INITIAL_FILTERS);

    useEffect(() => {
        fetchWallets();
    }, [fetchWallets]);

    const serviceOptions = useMemo(() => {
        const seen = new Set<string>();
        return wallets
            .filter(w => w.capacity.resource.serviceName && !seen.has(w.capacity.resource.serviceName) && !!seen.add(w.capacity.resource.serviceName))
            .map(w => ({ value: w.capacity.resource.serviceName, label: w.capacity.resource.serviceName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [wallets]);

    const resourceOptions = useMemo(() => {
        const seen = new Set<string>();
        return wallets
            .filter(w => w.capacity.resourceName && !seen.has(w.capacity.resourceName) && !!seen.add(w.capacity.resourceName))
            .map(w => ({ value: w.capacity.resourceName, label: w.capacity.resourceName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [wallets]);

    const centerOptions = useMemo(() => {
        const seen = new Set<string>();
        return wallets
            .filter(w => w.centerName && !seen.has(w.centerName) && !!seen.add(w.centerName))
            .map(w => ({ value: w.centerName, label: w.center?.displayName || w.centerName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [wallets]);

    const filterGroups = useMemo((): FilterGroupConfig<WalletFilterKey>[] => [
        {
            id: 'main',
            label: 'common.filters',
            defaultExpanded: true,
            fields: [
                { key: 'service', label: 'management.wallet.columns.service', inputType: 'select', options: serviceOptions },
                { key: 'resource', label: 'management.wallet.columns.resource', inputType: 'select', options: resourceOptions },
                { key: 'center', label: 'management.wallet.columns.center', inputType: 'select', options: centerOptions },
            ],
        },
    ], [serviceOptions, resourceOptions, centerOptions]);

    const filteredWallets = useMemo(() => {
        return wallets.filter(w => {
            if (filters.service && w.capacity.resource.serviceName !== filters.service) return false;
            if (filters.resource && w.capacity.resourceName !== filters.resource) return false;
            if (filters.center && w.centerName !== filters.center) return false;
            return true;
        });
    }, [wallets, filters]);

    const handleFilterChange = useCallback((key: WalletFilterKey, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleClearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

    const handleCreate = useCallback(() => {
        setSelectedWallet(null);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((wallet: Wallet) => {
        setSelectedWallet(wallet);
        setIsModalOpen(true);
    }, []);

    const handleDelete = async (id: number) => {
        if (window.confirm(t('management.wallet.confirmDelete'))) {
            try {
                await deleteWallet(id);
                showToast(t('management.wallet.deleteSuccess'), 'success');
            } catch (err) {
                showToast(t('management.wallet.deleteFailed'), 'error');
            }
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (selectedWallet) {
                await updateWallet({ id: selectedWallet.id, value: data.value });
                showToast(t('management.wallet.updateSuccess'), 'success');
            } else {
                await createWallet(data);
                showToast(t('management.wallet.createSuccess'), 'success');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            showToast(err.response?.data?.error || t('management.wallet.operationFailed'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="relative flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary m-0">
                    {t('management.tabs.wallet')}
                </h2>
                <div className="flex items-center gap-2">
                    <FilterSort
                        compact
                        filterGroups={filterGroups}
                        filterValues={filters}
                        onFilterChange={handleFilterChange}
                        onClearAllFilters={handleClearFilters}
                        sortOptions={[]}
                        sortState={{ field: null, direction: 'asc' }}
                        onSortChange={noop}
                    />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-paper rounded-xl hover:bg-black transition-colors border-none cursor-pointer font-medium"
                    >
                        <MdAdd size={20} />
                        {t('management.wallet.add')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    {error}
                </div>
            )}

            <WalletTable
                wallets={filteredWallets}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading && !isSubmitting}
            />

            {isModalOpen && (
                <WalletModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleSubmit}
                    wallet={selectedWallet}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
}
