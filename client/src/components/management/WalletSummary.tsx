import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWalletsByCenter } from '../../api/apiService';
import type { Wallet } from '../../api/types';

interface WalletSummaryProps {
  centerName: string;
}

export default function WalletSummary({ centerName }: WalletSummaryProps) {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    if (!centerName) return;
    fetchWalletsByCenter(centerName).then(setWallets).catch(() => setWallets([]));
  }, [centerName]);

  if (wallets.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm" dir="rtl">
      <div className="font-medium text-blue-800 mb-2">
        {t('management.wallet.summaryTitle', { center: centerName })}
      </div>
      <div className="flex flex-col gap-1.5">
        {wallets.map((w) => (
          <div key={w.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-1.5 border border-blue-100 text-xs">
            <span className="text-gray-600">{w.capacity.resource.serviceName} / {w.capacity.resource.name}</span>
            <span className="flex gap-3">
              <span className="text-gray-500">{t('management.wallet.available')}: <span className="font-semibold text-blue-700">{w.available}</span></span>
              <span className="text-gray-500">{t('management.wallet.allocated')}: <span className="font-semibold">{w.allocated}</span></span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
