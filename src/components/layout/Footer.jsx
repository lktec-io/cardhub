import { Link } from 'react-router-dom';
import { FiInstagram, FiFacebook, FiTwitter } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

const COLUMNS = [
  {
    headingKey: 'footer.colCardHub',
    links: [
      { labelKey: 'footer.about', to: ROUTES.ABOUT },
      { labelKey: 'nav.howItWorks', to: ROUTES.HOW_IT_WORKS },
      { labelKey: 'nav.templates', to: ROUTES.TEMPLATES },
      { labelKey: 'nav.pricing', to: ROUTES.PRICING },
      { labelKey: 'landing.tryOurService', to: ROUTES.TRY },
    ],
  },
  {
    headingKey: 'footer.colSupport',
    links: [
      { labelKey: 'nav.faq', to: ROUTES.FAQ },
      { labelKey: 'footer.contact', to: ROUTES.CONTACT },
      { labelKey: 'footer.privacy', to: ROUTES.PRIVACY },
      { labelKey: 'footer.terms', to: ROUTES.TERMS },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: FiInstagram },
  { label: 'Facebook', href: 'https://facebook.com', icon: FiFacebook },
  { label: 'X (Twitter)', href: 'https://x.com', icon: FiTwitter },
];

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="ch-footer">
      <div className="ch-footer__inner">
        <div className="ch-footer__brand-col">
          <p className="ch-footer__brand">CardHub</p>
          <p className="ch-footer__tagline">{t('footer.tagline')}</p>
          <div className="ch-footer__social">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                <Icon aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div className="ch-footer__col" key={column.headingKey}>
            <p className="ch-footer__col-heading">{t(column.headingKey)}</p>
            <nav aria-label={t(column.headingKey)}>
              {column.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="ch-footer__bottom">
        <p className="ch-footer__copyright">{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}
