import { useEffect, useRef, useState } from 'react';
import { templatesService } from '../services/templatesService';

const SEARCH_DEBOUNCE_MS = 350;

/** Shared data-fetching for the template catalog — used by the public
 * Templates page and the event creation wizard's template step, so the
 * loading/empty/error/pagination behavior only exists once. */
export function useTemplateCatalog({ pageSize = 12 } = {}) {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | success | error | empty

  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever filters change, and flip to "loading" whenever
  // any fetch input changes — adjusted during render (not in an effect) so
  // there's no extra render pass or stale-page fetch. See:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const filterKey = `${category}|${debouncedSearch}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  let effectivePage = page;
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    effectivePage = 1;
    if (page !== 1) setPage(1);
  }

  const queryKey = `${filterKey}|${effectivePage}|${pageSize}|${reloadToken}`;
  const [lastQueryKey, setLastQueryKey] = useState(null);
  if (lastQueryKey !== queryKey) {
    setLastQueryKey(queryKey);
    if (status !== 'loading') setStatus('loading');
  }

  useEffect(() => {
    const currentRequest = ++requestId.current;

    templatesService
      .list({ category: category || undefined, search: debouncedSearch || undefined, page: effectivePage, limit: pageSize })
      .then((res) => {
        if (currentRequest !== requestId.current) return;
        const data = res.data.data;
        setTemplates(data.templates);
        setPagination(data.pagination);
        setStatus(data.templates.length === 0 ? 'empty' : 'success');
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return {
    templates,
    pagination,
    status,
    category,
    setCategory,
    search,
    setSearch,
    page: effectivePage,
    setPage,
    retry: () => setReloadToken((t) => t + 1),
  };
}
