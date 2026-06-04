import { useState, useCallback } from 'react';
import {
    fetchWallets as fetchWalletsApi,
    createWallet as createWalletApi,
    updateWallet as updateWalletApi,
    deleteWallet as deleteWalletApi
} from '../api/apiService';
import type { Wallet, CreateWalletPayload, UpdateWalletPayload } from '../api/types';

export type { Wallet, CreateWalletPayload, UpdateWalletPayload };

export function useWallets() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWallets = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchWalletsApi();
            setWallets(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch wallets');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createWallet = useCallback(async (data: CreateWalletPayload) => {
        setIsLoading(true);
        try {
            await createWalletApi(data);
            await fetchWallets();
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [fetchWallets]);

    const updateWallet = useCallback(async (data: UpdateWalletPayload & { id: number }) => {
        setIsLoading(true);
        try {
            await updateWalletApi(data.id, { value: data.value });
            await fetchWallets();
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [fetchWallets]);

    const deleteWallet = useCallback(async (id: number) => {
        setIsLoading(true);
        try {
            await deleteWalletApi(id);
            await fetchWallets();
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [fetchWallets]);

    return {
        wallets,
        isLoading,
        error,
        fetchWallets,
        createWallet,
        updateWallet,
        deleteWallet,
    };
}
