import { useState } from 'react';
import { FiDownload, FiPrinter, FiShare2 } from 'react-icons/fi';
import { Button } from '../ui';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../hooks/useToast';
import { renderTicketImage } from '../../utils/ticketImage';
import { downloadBlob, toFileSlug } from '../../utils/download';
import { absoluteUrl, shareLink } from '../../utils/share';

/**
 * Download (a real PNG ticket), Share (native share sheet, else copy
 * link) and Print. The shared link is the ticket's own page, keyed by its
 * random token. It carries no name or phone number, and the page it opens
 * shows the phone number masked.
 */
export function TicketActions({ ticket, showPrint = true }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [isRendering, setIsRendering] = useState(false);

  async function handleDownload() {
    setIsRendering(true);
    try {
      const blob = await renderTicketImage(ticket);
      downloadBlob(blob, `cardhub-ticket-${toFileSlug(ticket.event.title)}-${ticket.ticketId}.png`);
      toast.success(t('tix.actions.downloaded'));
    } catch {
      toast.error(t('tix.actions.downloadFailed'));
    } finally {
      setIsRendering(false);
    }
  }

  async function handleShare() {
    const result = await shareLink({
      title: `${ticket.event.title} · ${ticket.ticketType.name}`,
      text: t('tix.actions.shareText', { event: ticket.event.title }),
      url: absoluteUrl(ROUTES.ticketPass(ticket.token)),
    });
    if (result === 'copied') toast.success(t('tix.actions.linkCopied'));
    if (result === 'failed') toast.error(t('tix.actions.shareFailed'));
  }

  return (
    <div className="ch-tix-actions">
      <Button variant="brand" leftIcon={<FiDownload aria-hidden="true" />} onClick={handleDownload} isLoading={isRendering}>
        {t('tix.actions.download')}
      </Button>
      <Button variant="secondary" leftIcon={<FiShare2 aria-hidden="true" />} onClick={handleShare}>
        {t('tix.actions.share')}
      </Button>
      {showPrint && (
        <Button variant="ghost" leftIcon={<FiPrinter aria-hidden="true" />} onClick={() => window.print()} className="ch-tix-actions__print">
          {t('tix.actions.print')}
        </Button>
      )}
    </div>
  );
}
