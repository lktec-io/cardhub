import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiCalendar, FiInfo, FiMapPin, FiSearch, FiX } from 'react-icons/fi';
import { Container, Pagination, Seo } from '../../components/common';
import { Button, EmptyState, Input, Select, Skeleton } from '../../components/ui';
import { TicketEventCard } from '../../components/tickets';
import { ticketsService } from '../../services/ticketsService';
import { EVENT_TYPES } from '../../constants/eventTypes';
import { TICKET_DATE_FILTERS, TICKET_PRICE_FILTERS } from '../../constants/tickets';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTzs } from '../../utils/money';

const TEXT_DEBOUNCE_MS = 350;
const PAGE_SIZE = 12;
const FILTER_KEYS = ['search', 'category', 'date', 'location', 'maxPrice'];

/** Public ticket marketplace: upcoming events with ticket sales enabled. Filters live in the URL, so a filtered view can be shared or bookmarked. */
export function TicketMarketplacePage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get('search') || '');
  const [locationInput, setLocationInput] = useState(params.get('location') || '');
  const [state, setState] = useState({ status: 'loading', events: [], pagination: null, key: null });
  const [paymentMode, setPaymentMode] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestId = useRef(0);

  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const query = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) || '']));
  const queryKey = `${FILTER_KEYS.map((key) => query[key]).join('|')}|${page}|${reloadToken}`;
  const hasFilters = FILTER_KEYS.some((key) => query[key]);

  function updateParams(changes) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true }
    );
  }

  // Debounced free-text filters.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== (params.get('search') || '') || locationInput.trim() !== (params.get('location') || '')) {
        updateParams({ search: searchInput.trim(), location: locationInput.trim() });
      }
    }, TEXT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, locationInput]);

  useEffect(() => {
    const current = ++requestId.current;
    ticketsService
      .listEvents({ ...Object.fromEntries(Object.entries(query).filter(([, v]) => v)), page, limit: PAGE_SIZE })
      .then((res) => {
        if (current !== requestId.current) return;
        const { events, pagination } = res.data.data;
        setPaymentMode(res.data.data.paymentMode);
        setState({ status: events.length ? 'success' : 'empty', events, pagination, key: queryKey });
      })
      .catch(() => {
        if (current !== requestId.current) return;
        setState((prev) => ({ ...prev, status: 'error', key: queryKey }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const isLoading = state.key !== queryKey;

  function clearFilters() {
    setSearchInput('');
    setLocationInput('');
    setParams(new URLSearchParams(), { replace: true });
  }

  const categoryOptions = [{ value: '', label: t('tix.filters.allCategories') }, ...EVENT_TYPES.map((type) => ({ value: type.value, label: t(`category.${type.value}`) }))];
  const dateOptions = [{ value: '', label: t('tix.filters.anyDate') }, ...TICKET_DATE_FILTERS.map((value) => ({ value, label: t(`tix.filters.date.${value}`) }))];
  const priceOptions = [
    { value: '', label: t('tix.filters.anyPrice') },
    ...TICKET_PRICE_FILTERS.map((value) => ({ value: String(value), label: t('tix.filters.upTo', { price: formatTzs(value) }) })),
  ];

  return (
    <div className="ch-tix ch-tix-market">
      <Seo title="Event Tickets" description="Buy tickets for upcoming events in Tanzania on CardHub. Browse events, choose your ticket and get a QR ticket on your phone." />

      <section className="ch-tix-market__intro">
        <Container>
          <p className="ch-tix-eyebrow">{t('tix.market.eyebrow')}</p>
          <h1 className="ch-tix-market__title">{t('tix.market.title')}</h1>
          <p className="ch-tix-market__lead">{t('tix.market.lead')}</p>
          {paymentMode === 'demo' && (
            <p className="ch-tix-demo-note ch-tix-market__demo">
              <FiInfo aria-hidden="true" />
              {t('tix.event.demoNote')}
            </p>
          )}

          <div className="ch-tix-filters" role="search">
            <Input
              className="ch-tix-filters__search"
              icon={<FiSearch aria-hidden="true" />}
              placeholder={t('tix.filters.searchPlaceholder')}
              aria-label={t('tix.filters.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              maxLength={100}
              type="search"
            />
            <Select
              aria-label={t('tix.filters.category')}
              options={categoryOptions}
              value={query.category}
              onChange={(e) => updateParams({ category: e.target.value })}
            />
            <Select aria-label={t('tix.filters.dateLabel')} options={dateOptions} value={query.date} onChange={(e) => updateParams({ date: e.target.value })} />
            <Input
              icon={<FiMapPin aria-hidden="true" />}
              placeholder={t('tix.filters.location')}
              aria-label={t('tix.filters.location')}
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              maxLength={100}
            />
            <Select aria-label={t('tix.filters.price')} options={priceOptions} value={query.maxPrice} onChange={(e) => updateParams({ maxPrice: e.target.value })} />
          </div>
          {hasFilters && (
            <button type="button" className="ch-tix-linkbtn ch-tix-filters__clear" onClick={clearFilters}>
              <FiX aria-hidden="true" />
              {t('tix.filters.clear')}
            </button>
          )}
        </Container>
      </section>

      <section className="ch-tix-market__results" aria-live="polite" aria-busy={isLoading || undefined}>
        <Container>
          {isLoading && (
            <div className="ch-tix-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="ch-tix-card ch-tix-card--skeleton">
                  <span className="ch-skeleton ch-tix-skeleton-media" aria-hidden="true" />
                  <div className="ch-tix-card__body">
                    <Skeleton height="22px" width="70%" />
                    <Skeleton height="14px" width="50%" />
                    <Skeleton height="14px" width="85%" />
                    <Skeleton height="38px" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && state.status === 'error' && (
            <EmptyState
              icon={<FiAlertCircle />}
              title={t('tix.market.errorTitle')}
              description={t('tix.market.errorDescription')}
              action={
                <Button variant="brand" onClick={() => setReloadToken((n) => n + 1)}>
                  {t('catalogue.retry')}
                </Button>
              }
            />
          )}

          {!isLoading && state.status === 'empty' && (
            <EmptyState
              icon={<FiCalendar />}
              title={hasFilters ? t('tix.market.noMatchesTitle') : t('tix.market.emptyTitle')}
              description={hasFilters ? t('tix.market.noMatchesDescription') : t('tix.market.emptyDescription')}
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    {t('tix.filters.clear')}
                  </Button>
                ) : null
              }
            />
          )}

          {!isLoading && state.status === 'success' && (
            <>
              <p className="ch-tix-market__count">{t(state.pagination.total === 1 ? 'tix.market.countOne' : 'tix.market.count', { count: state.pagination.total })}</p>
              <div className="ch-tix-grid">
                {state.events.map((event) => (
                  <TicketEventCard key={event.slug} event={event} />
                ))}
              </div>
              <Pagination page={page} totalPages={state.pagination?.totalPages} onChange={(next) => updateParams({ page: String(next) })} />
            </>
          )}
        </Container>
      </section>
    </div>
  );
}
