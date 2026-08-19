import { FiHeart, FiMapPin, FiTarget } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { useLanguage } from '../../hooks/useLanguage';

const CARDS = [
  { icon: FiTarget, key: 'about.purpose' },
  { icon: FiMapPin, key: 'about.origin' },
  { icon: FiHeart, key: 'about.building' },
];

export function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="ch-about-page">
      <Seo title="About" description="CardHub is a Clix Digital Works product built to modernize the way people invite, connect, and celebrate." />
      <Container>
        <SectionHeader eyebrow={t('about.eyebrow')} title={t('about.title')} description={t('about.description')} align="center" />

        <div className="ch-about-page__grid">
          {CARDS.map(({ icon: Icon, key }) => (
            <div className="ch-about-page__card" key={key}>
              <Icon aria-hidden="true" />
              <h3 className="ch-h4">{t(`${key}.title`)}</h3>
              <p className="ch-body-sm">{t(`${key}.description`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
