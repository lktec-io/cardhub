import { useCallback, useMemo, useState } from 'react';
import { LanguageContext } from './language-context';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { LANGUAGES } from '../constants/languages';
import { translate } from '../i18n/translations';

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return LANGUAGES.some((l) => l.value === stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

/**
 * A real, persisted UI toggle backed by a real (if intentionally scoped)
 * translation dictionary — see i18n/translations.js. It covers
 * navigation and the catalogue/Try-Our-Service/order-card/admin-orders
 * surfaces; other marketing pages remain English-only, a deliberate scope
 * boundary, not an oversight. `t(key)` falls back to English, then to the
 * raw key, so a missing translation is never blank. Reflects and persists
 * the visitor's choice (localStorage, survives reloads).
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((value) => {
    if (!LANGUAGES.some((l) => l.value === value)) return;
    setLanguageState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, value);
    } catch {
      // Storage unavailable (private browsing, etc.) — state still updates for this session.
    }
  }, []);

  const t = useCallback((key, vars) => translate(key, language, vars), [language]);

  const value = useMemo(() => ({ language, setLanguage, languages: LANGUAGES, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
