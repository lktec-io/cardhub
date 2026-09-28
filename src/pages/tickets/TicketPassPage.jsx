import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiInfo } from 'react-icons/fi';
import { Container, Seo } from '../../components/common';
import { Spinner } from '../../components/ui';
import { TicketActions, TicketPass } from '../../components/tickets';
import { ticketsService } from '../../services/ticketsService';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

/** A single ticket, as shared by link. Reached by the ticket's random token. Shows the holder's phone masked and never exposes the order. */
export function TicketPassPage() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [state, setState] = useState({ status: 'loading', ticket: null, token: null });

  useEffect(() => {
    let active = true;
    ticketsService
      .getTicket(token)
      .then((res) => active && setState({ status: 'success', ticket: res.data.data.ticket, token }))
      .catch(() => active && setState({ status: 'notfound', ticket: null, token }));
    return () => {
      active = false;
    };
  }, [token]);

  if (state.token !== token) {
    return (
      <div className="ch-tix ch-tix-status">
        <Spinner size="lg" />
      </div>
    );
  }

  if (state.status !== 'success') {
    return (
      <div className="ch-tix ch-tix-status">
        <Seo title="Ticket not found" description="This ticket link doesn't exist." />
        <FiAlertCircle aria-hidden="true" className="ch-tix-status__icon" />
        <h1 className="ch-tix-status__title">{t('tix.pass.notFoundTitle')}</h1>
        <p className="ch-tix-status__text">{t('tix.pass.notFoundDescription')}</p>
        <Link to={ROUTES.TICKETS} className="ch-btn ch-btn--brand ch-btn--md">
          {t('tix.event.allEvents')}
        </Link>
      </div>
    );
  }

  const { ticket } = state;

  return (
    <div className="ch-tix ch-tix-success">
      <Seo title={`${ticket.event.title} ticket`} description={`CardHub ticket for ${ticket.event.title}.`} />
      <Container>
        <div className="ch-tix-success__tickets">
          <section className="ch-tix-success__item">
            {ticket.isDemo && (
              <p className="ch-tix-demo-note ch-tix-demo-note--center ch-tix-noprint">
                <FiInfo aria-hidden="true" />
                {t('tix.order.demoIssued')}
              </p>
            )}
            <TicketPass ticket={ticket} />
            <div className="ch-tix-noprint">
              <TicketActions ticket={ticket} />
            </div>
          </section>
        </div>
        <div className="ch-tix-success__footer ch-tix-noprint">
          <Link to={ROUTES.ticketEvent(ticket.event.slug)} className="ch-tix-linkbtn">
            {t('tix.pass.viewEvent')}
          </Link>
        </div>
      </Container>
    </div>
  );
}
