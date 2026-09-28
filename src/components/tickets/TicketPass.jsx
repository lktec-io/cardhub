import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTzs } from '../../utils/money';
import { formatTicketDate, formatTimeRange } from '../../utils/ticketFormat';

/**
 * The on-screen ticket. Visually matches the downloadable PNG
 * (utils/ticketImage.js). The QR encodes only `ticket.qrPayload`, a
 * verification URL carrying the random ticket token, never the buyer's
 * details. It is rendered from a 480px bitmap and shown at ~220px so it
 * stays crisp and scannable, including when printed.
 */
export function TicketPass({ ticket }) {
  const { t } = useLanguage();
  const [qr, setQr] = useState({ payload: null, dataUrl: null });

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(ticket.qrPayload, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#081827', light: '#ffffff' },
    })
      .then((dataUrl) => active && setQr({ payload: ticket.qrPayload, dataUrl }))
      .catch(() => active && setQr({ payload: ticket.qrPayload, dataUrl: null }));
    return () => {
      active = false;
    };
  }, [ticket.qrPayload]);

  const qrDataUrl = qr.payload === ticket.qrPayload ? qr.dataUrl : null;
  const { event } = ticket;
  const venue = [event.venue?.name, event.venue?.address].filter(Boolean).join(', ');
  const isUsed = ticket.status === 'used';
  const isCancelled = ticket.status === 'cancelled';

  return (
    <article className={`ch-tix-pass ${isUsed || isCancelled ? 'ch-tix-pass--void' : ''}`} aria-label={`${t('tix.pass.eventTicket')} ${ticket.ticketId}`}>
      <header className="ch-tix-pass__head">
        <div className="ch-tix-pass__brandrow">
          <span className="ch-tix-pass__brand">CardHub</span>
          <span className="ch-tix-pass__kind">{ticket.isDemo ? t('tix.pass.demoTicket') : t('tix.pass.eventTicket')}</span>
        </div>
        <h2 className="ch-tix-pass__title">{event.title}</h2>
        <span className="ch-tix-pass__rule" aria-hidden="true" />
        <p className="ch-tix-pass__when">{formatTicketDate(event.date)}</p>
        {event.venue?.name && <p className="ch-tix-pass__where">{event.venue.name}</p>}
      </header>

      <div className="ch-tix-pass__tear" aria-hidden="true" />

      <div className="ch-tix-pass__body">
        <div className="ch-tix-pass__split">
          <div>
            <p className="ch-tix-label">{t('tix.pass.ticketType')}</p>
            <p className="ch-tix-pass__type">{ticket.ticketType.name}</p>
          </div>
          <div className="ch-tix-pass__amount">
            <p className="ch-tix-label">{t('tix.pass.amountPaid')}</p>
            <p className="ch-tix-pass__price">{formatTzs(ticket.pricePaidTzs)}</p>
          </div>
        </div>

        <div className="ch-tix-pass__section">
          <p className="ch-tix-label">{t('tix.pass.holder')}</p>
          <p className="ch-tix-pass__holder">{ticket.holderName}</p>
          {ticket.holderPhone && <p className="ch-tix-pass__phone">{ticket.holderPhone}</p>}
        </div>

        <dl className="ch-tix-pass__grid">
          <div>
            <dt className="ch-tix-label">{t('tix.date')}</dt>
            <dd>{formatTicketDate(event.date, { weekday: true, short: true })}</dd>
          </div>
          <div>
            <dt className="ch-tix-label">{t('tix.time')}</dt>
            <dd>{formatTimeRange(event.startTime, event.endTime) || '—'}</dd>
          </div>
          <div className="ch-tix-pass__grid-wide">
            <dt className="ch-tix-label">{t('tix.venue')}</dt>
            <dd>{venue || '—'}</dd>
          </div>
        </dl>

        <div className="ch-tix-pass__qr">
          {qrDataUrl ? (
            <img src={qrDataUrl} width={220} height={220} alt={t('tix.pass.qrAlt', { id: ticket.ticketId })} />
          ) : (
            <span className="ch-tix-pass__qr-placeholder" aria-hidden="true" />
          )}
          {(isUsed || isCancelled) && (
            <span className="ch-tix-pass__stamp">{isUsed ? t('tix.pass.used') : t('tix.pass.cancelled')}</span>
          )}
        </div>

        <div className="ch-tix-pass__id">
          <p className="ch-tix-label">{t('tix.pass.ticketId')}</p>
          <p className="ch-tix-pass__code">{ticket.ticketId}</p>
          <p className="ch-tix-pass__hint">{ticket.isDemo ? t('tix.pass.demoHint') : t('tix.pass.scanHint')}</p>
        </div>
      </div>
    </article>
  );
}
