import { Container, SectionHeader, Seo } from '../../components/common';
import { useLanguage } from '../../hooks/useLanguage';

const SECTIONS = [1, 2, 3, 4, 5];

export function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="ch-legal-page">
      <Seo title="Privacy Policy" description="CardHub Privacy Policy." />
      <Container>
        <SectionHeader eyebrow={t('legal.eyebrow')} title={t('privacy.title')} description={t('legal.lastUpdated')} />
        <div className="ch-legal-page__content">
          <p>{t('privacy.intro')}</p>
          {SECTIONS.map((n) => (
            <div key={n}>
              <h3 className="ch-h4">{t(`privacy.section${n}.title`)}</h3>
              <p>{t(`privacy.section${n}.body`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
