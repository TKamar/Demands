import { useTranslation } from 'react-i18next';

interface TxProps {
  i18nKey: string;
  values?: Record<string, string | number>;
}

export function Tx({ i18nKey, values }: TxProps) {
  const { t } = useTranslation();
  return <>{t(i18nKey, values)}</>;
}
