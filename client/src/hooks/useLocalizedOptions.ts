import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface RawOption<T extends string> {
  value: T;
  labelKey: string;
}

export function useLocalizedOptions<T extends string>(
  items: RawOption<T>[],
): { value: T; label: string }[] {
  const { t } = useTranslation();
  return useMemo(
    () => items.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
}
