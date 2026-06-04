import { useTranslation } from 'react-i18next';
import PageHeader from '../components/layout/PageHeader';

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
      />
      <p className="text-text-secondary">{t('dashboard.placeholder')}</p>
    </div>
  );
}
