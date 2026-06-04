import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  return (
    <button
      onClick={() => i18n.changeLanguage(isHebrew ? 'en' : 'he')}
      className="px-3 py-1.5 text-xs font-semibold rounded-full border border-divider bg-bg-paper text-text-secondary hover:bg-primary-light hover:text-primary transition-colors"
    >
      {isHebrew ? 'EN' : 'HE'}
    </button>
  );
}
