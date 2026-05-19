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
    // `items` is intentionally excluded: this hook is for static config arrays only.
    // Their values never change — only translations (via `t`) do. Adding `items` would
    // cause memo invalidation on every render when callers use inline array literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
}
