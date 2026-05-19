import { useTranslation } from 'react-i18next';

export function useDirection() {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  return {
    isRTL,
    dir: (isRTL ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
}
