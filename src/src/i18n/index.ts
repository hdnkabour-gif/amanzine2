import { useMemo } from 'react';
import { useStore } from '../store';
import { type Lang, t as _t } from './translations';

export { type Lang, translations, LANGS, isRtlLang } from './translations';
export { t } from './translations';

export function useT() {
  const { settings } = useStore();
  const lang = ((settings.brand as any)?.language || 'ar') as Lang;
  return useMemo(
    () => (key: string, vars?: Record<string, string>) => _t(lang, key, vars),
    [lang]
  );
}

export function useLang(): Lang {
  const { settings } = useStore();
  return ((settings.brand as any)?.language || 'ar') as Lang;
}
