import { useCallback, useMemo, useState } from 'react';
import { LanguageContext } from './language-context';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { LANGUAGES } from '../constants/languages';

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return LANGUAGES.some((l) => l.value === stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

/**
 * A real, persisted UI toggle — not a translation engine. CardHub's UI
 * copy has no Swahili dictionary yet (translating every page's text is a
 * content/i18n project of its own, well beyond a UI/UX polish pass), so
 * switching languages here does not yet change rendered text. What it
 * does do, honestly: reflects and persists the visitor's choice
 * (localStorage, survives reloads) and makes the active language visually
 * obvious in the navbar, on both mobile and desktop — the foundation a
 * real translation layer would plug into later without changing this
 * provider's shape.
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

  const value = useMemo(() => ({ language, setLanguage, languages: LANGUAGES }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
