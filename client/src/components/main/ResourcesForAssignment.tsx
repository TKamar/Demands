import React from 'react';
import { useTranslation } from 'react-i18next';

export const ResourcesForAssignment: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="mt-6 p-4 border border-dashed border-gray-300 rounded bg-gray-50" dir="rtl">
      <h3 className="font-semibold text-gray-700 mb-2">{t('resourceAssignment.title')}</h3>
      <p className="text-sm text-gray-500">{t('resourceAssignment.comingSoon')}</p>
    </div>
  );
};
