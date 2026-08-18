import { Link } from 'react-router-dom';
import { FiInstagram, FiFacebook, FiTwitter } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';

const COLUMNS = [
  {
    heading: 'CardHub',
    links: [
      { label: 'About', to: ROUTES.ABOUT },
      { label: 'How It Works', to: ROUTES.HOW_IT_WORKS },
      { label: 'Templates', to: ROUTES.TEMPLATES },
      { label: 'Pricing', to: ROUTES.PRICING },
      { label: 'Try Our Service', to: ROUTES.TRY },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'FAQ', to: ROUTES.FAQ },
      { label: 'Contact', to: ROUTES.CONTACT },
      { label: 'Privacy', to: ROUTES.PRIVACY },
      { label: 'Terms', to: ROUTES.TERMS },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: FiInstagram },
  { label: 'Facebook', href: 'https://facebook.com', icon: FiFacebook },
  { label: 'X (Twitter)', href: 'https://x.com', icon: FiTwitter },
];

export function Footer() {
  return (
    <footer className="ch-footer">
      <div className="ch-footer__inner">
        <div className="ch-footer__brand-col">
          <p className="ch-footer__brand">CardHub</p>
          <p className="ch-footer__tagline">Create. Invite. Celebrate.</p>
          <div className="ch-footer__social">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                <Icon aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div className="ch-footer__col" key={column.heading}>
            <p className="ch-footer__col-heading">{column.heading}</p>
            <nav aria-label={column.heading}>
              {column.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="ch-footer__bottom">
        <p className="ch-footer__copyright">&copy; 2026 CardHub. A Clix Digital Works product.</p>
      </div>
    </footer>
  );
}
