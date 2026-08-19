import { FiSearch } from 'react-icons/fi';
import { Input } from '../ui';
import { TEMPLATE_CATEGORIES } from '../../constants/templateCategories';
import { useLanguage } from '../../hooks/useLanguage';

export function TemplateFilters({ search, onSearchChange, category, onCategoryChange }) {
  const { t } = useLanguage();

  return (
    <div className="ch-templates-page__toolbar">
      <Input
        icon={<FiSearch aria-hidden="true" />}
        placeholder={t('catalogue.searchPlaceholder')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={t('catalogue.searchPlaceholder')}
      />
      <div className="ch-templates-page__categories" role="group" aria-label="Filter by category">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.value || 'all'}
            type="button"
            className={`ch-chip ${category === cat.value ? 'ch-chip--active' : ''}`}
            onClick={() => onCategoryChange(cat.value)}
            aria-pressed={category === cat.value}
          >
            {cat.value === '' ? t('catalogue.categoryAll') : t(`category.${cat.value}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
