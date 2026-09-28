import { useCallback } from 'react';
import { ROUTES } from '../constants/routes';
import { useLanguage } from './useLanguage';
import { useToast } from './useToast';
import { absoluteUrl, shareLink } from '../utils/share';
import { downloadFromUrl, toFileSlug } from '../utils/download';
import { getTemplateImageSrc } from '../utils/templateImage';

/** The link a shared card opens: the catalogue with that card's preview already open. */
export function getCardShareUrl(template) {
  return absoluteUrl(`${ROUTES.TEMPLATES}?card=${template.id}`);
}

/**
 * Share and Download for catalogue cards, shared by the landing gallery,
 * the full catalogue and the lightbox. Download saves the real card
 * image file, not the web page.
 */
export function useCardActions() {
  const { t } = useLanguage();
  const toast = useToast();

  const share = useCallback(
    async (template) => {
      const result = await shareLink({
        title: `${template.name} · CardHub`,
        text: t('catalogue.shareText', { name: template.name }),
        url: getCardShareUrl(template),
      });
      if (result === 'copied') toast.success(t('catalogue.linkCopied'));
      if (result === 'failed') toast.error(t('catalogue.shareFailed'));
    },
    [t, toast]
  );

  const download = useCallback(
    async (template) => {
      const src = getTemplateImageSrc(template);
      if (!src) return;
      const extension = (src.split('?')[0].match(/\.(jpe?g|png|webp|avif)$/i)?.[1] || 'jpg').toLowerCase();
      const result = await downloadFromUrl(new URL(src, window.location.origin).toString(), `cardhub-${toFileSlug(template.name)}.${extension}`);
      toast.success(result === 'downloaded' ? t('catalogue.downloadStarted') : t('catalogue.downloadOpened'));
    },
    [t, toast]
  );

  return { share, download };
}
