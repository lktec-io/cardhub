import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiCalendar, FiInfo, FiSearch, FiX } from 'react-icons/fi';
import { Container, Pagination, Seo } from '../../components/common';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { TicketEventCard } from '../../components/tickets';
import { ticketsService } from '../../services/ticketsService';
import { useLanguage } from '../../hooks/useLanguage';

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 12;

/**
 * Public ticket marketplace. One search box (event name, venue, organizer,
 * category, ticket type or event number like EV-12; matched server-side),
 * kept in the URL so a search can be shared or bookmarked.
 */
export function TicketMarketplacePage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get('search') || '');
  const [state, setState] = useState({ status: 'loading', events: [], pagination: null, key: null });
  const [paymentMode, setPaymentMode] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestId = useRef(0);
  const inputRef = useRef(null);

  const search = params.get('search') || '';
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const queryKey = `${search}|${page}|${reloadToken}`;

  function setQuery(nextSearch, nextPage = 1) {
    setParams(
      () => {
        const next = new URLSearchParams();
        if (nextSearch) next.set('search', nextSearch);
        if (nextPage > 1) next.set('page', String(nextPage));
        return next;
      },
      { replace: true }
    );
  }

  // Search as you type (debounced); Enter/Search applies immediately and
  // cancels the pending timer so it can't fire after the buyer moves on.
  const typingTimer = useRef(null);
  useEffect(() => {
    const value = searchInput.trim();
    if (value === search) return undefined;
    typingTimer.current = setTimeout(() => setQuery(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(typingTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function searchNow(value) {
    clearTimeout(typingTimer.current);
    setQuery(value);
  }

  useEffect(() => {
    const current = ++requestId.current;
    ticketsService
      .listEvents({ ...(search ? { search } : {}), page, limit: PAGE_SIZE })
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

  function clearSearch() {
    setSearchInput('');
    searchNow('');
    inputRef.current?.focus();
  }

  return (
    <div className="ch-tix ch-tix-market">
      <Seo title="Event Tickets" description="Buy tickets for upcoming events in Tanzania on CardHub. Find an event, choose your ticket and get a QR ticket on your phone." />

      <section className="ch-tix-stage">
        <div className="ch-tix-stage__lights" aria-hidden="true" />
        <Container className="ch-tix-stage__inner">
          <p className="ch-tix-eyebrow">{t('tix.market.eyebrow')}</p>
          <h1 className="ch-tix-stage__title">{t('tix.market.heroTitle')}</h1>
          <p className="ch-tix-stage__lead">{t('tix.market.lead')}</p>

          <form
            className="ch-tix-searchbar"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              searchNow(searchInput.trim());
              document.getElementById('ch-tix-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <FiSearch className="ch-tix-searchbar__icon" aria-hidden="true" />
            <input
              ref={inputRef}
              className="ch-tix-searchbar__input"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              maxLength={100}
              placeholder={t('tix.search.placeholder')}
              aria-label={t('tix.search.placeholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button type="button" className="ch-tix-searchbar__clear" onClick={clearSearch} aria-label={t('tix.search.clear')}>
                <FiX aria-hidden="true" />
              </button>
            )}
            <Button type="submit" variant="conversion" className="ch-tix-searchbar__submit">
              {t('tix.search.submit')}
            </Button>
          </form>
          <p className="ch-tix-stage__hint">{t('tix.search.hint')}</p>

          {paymentMode === 'demo' && (
            <p className="ch-tix-demo-note ch-tix-market__demo">
              <FiInfo aria-hidden="true" />
              {t('tix.event.demoNote')}
            </p>
          )}
        </Container>
      </section>

      <section className="ch-tix-market__results" id="ch-tix-results" aria-live="polite" aria-busy={isLoading || undefined}>
        <Container>
          <div className="ch-tix-market__bar">
            <h2 className="ch-tix-market__results-title">{search ? t('tix.search.resultsFor', { query: search }) : t('tix.market.title')}</h2>
            {!isLoading && state.status === 'success' && (
              <p className="ch-tix-market__count">{t(state.pagination.total === 1 ? 'tix.market.countOne' : 'tix.market.count', { count: state.pagination.total })}</p>
            )}
          </div>

          {isLoading && (
            <div className="ch-tix-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="ch-tix-card ch-tix-card--skeleton">
                  <span className="ch-skeleton ch-tix-skeleton-media" aria-hidden="true" />
                  <div className="ch-tix-card__body">
                    <Skeleton height="22px" width="70%" />
                    <Skeleton height="14px" width="50%" />
                    <Skeleton height="14px" width="85%" />
                    <Skeleton height="44px" />
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
                <Button variant="conversion" onClick={() => setReloadToken((n) => n + 1)}>
                  {t('catalogue.retry')}
                </Button>
              }
            />
          )}

          {!isLoading && state.status === 'empty' && (
            <EmptyState
              icon={search ? <FiSearch /> : <FiCalendar />}
              title={search ? t('tix.market.noMatchesTitle') : t('tix.market.emptyTitle')}
              description={search ? t('tix.search.noMatchesDescription') : t('tix.market.emptyDescription')}
              action={
                search ? (
                  <Button variant="secondary" onClick={clearSearch}>
                    {t('tix.search.clear')}
                  </Button>
                ) : null
              }
            />
          )}

          {!isLoading && state.status === 'success' && (
            <>
              <div className="ch-tix-grid">
                {state.events.map((event) => (
                  <TicketEventCard key={event.slug} event={event} />
                ))}
              </div>
              <Pagination page={page} totalPages={state.pagination?.totalPages} onChange={(next) => setQuery(search, next)} />
            </>
          )}
        </Container>
      </section>
    </div>
  );
}
