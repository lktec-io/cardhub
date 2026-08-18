import { useLanguage } from '../../hooks/useLanguage';

export function LanguageToggle({ className = '' }) {
  const { language, setLanguage, languages } = useLanguage();

  return (
    <div className={`ch-lang-toggle ${className}`} role="group" aria-label="Choose language">
      {languages.map((lang) => (
        <button
          key={lang.value}
          type="button"
          className={`ch-lang-toggle__option ${language === lang.value ? 'ch-lang-toggle__option--active' : ''}`}
          aria-pressed={language === lang.value}
          onClick={() => setLanguage(lang.value)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
