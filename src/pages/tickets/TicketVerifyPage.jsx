import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Seo } from '../../components/common';
import { Spinner } from '../../components/ui';
import { ticketsService } from '../../services/ticketsService';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTicketDate } from '../../utils/ticketFormat';

/**
 * Where a ticket's QR code points. Shows a clear VALID / INVALID verdict
 * for door staff scanning with a normal phone camera. Read-only: it never
 * marks a ticket as used. Check-in belongs to the future scanner module.
 */
export function TicketVerifyPage() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [state, setState] = useState({ status: 'loading', data: null, token: null });

  useEffect(() => {
    let active = true;
    ticketsService
      .verifyTicket(token)
      .then((res) => active && setState({ status: 'success', data: res.data.data, token }))
      .catch(() => active && setState({ status: 'error', data: null, token }));
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

  const valid = state.status === 'success' && state.data.result === 'VALID';
  const ticket = state.data?.ticket;
  const reason = state.status === 'error' ? 'ERROR' : state.data?.reason;

  return (
    <div className="ch-tix ch-tix-verify">
      <Seo title="Ticket verification" description="CardHub ticket verification." />
      <div className={`ch-tix-verify__card ${valid ? 'ch-tix-verify__card--valid' : 'ch-tix-verify__card--invalid'}`}>
        <div className="ch-tix-verify__verdict">
          {valid ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
          <p className="ch-tix-verify__result">{valid ? t('tix.verify.valid') : t('tix.verify.invalid')}</p>
          {!valid && <p className="ch-tix-verify__reason">{t(`tix.verify.reason.${reason}`)}</p>}
        </div>

        {ticket && (
          <dl className="ch-tix-verify__details">
            <div>
              <dt>{t('tix.verify.event')}</dt>
              <dd>{ticket.event.title}</dd>
            </div>
            <div>
              <dt>{t('tix.date')}</dt>
              <dd>
                {formatTicketDate(ticket.event.date, { weekday: true, short: true })}
                {ticket.event.startTime ? ` · ${ticket.event.startTime}` : ''}
              </dd>
            </div>
            <div>
              <dt>{t('tix.pass.ticketType')}</dt>
              <dd>{ticket.ticketType}</dd>
            </div>
            <div>
              <dt>{t('tix.pass.holder')}</dt>
              <dd>{ticket.buyerName}</dd>
            </div>
            <div>
              <dt>{t('tix.pass.ticketId')}</dt>
              <dd className="ch-tix-verify__code">{ticket.ticketId}</dd>
            </div>
            <div>
              <dt>{t('tix.verify.status')}</dt>
              <dd>{t(`tix.verify.ticketStatus.${ticket.status}`)}</dd>
            </div>
          </dl>
        )}
        {ticket?.isDemo && <p className="ch-tix-verify__demo">{t('tix.verify.demo')}</p>}
      </div>
    </div>
  );
}
