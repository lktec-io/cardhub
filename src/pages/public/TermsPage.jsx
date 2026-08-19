import { Container, SectionHeader, Seo } from '../../components/common';
import { useLanguage } from '../../hooks/useLanguage';

const SECTIONS = [1, 2, 3, 4, 5];

export function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="ch-legal-page">
      <Seo title="Terms of Service" description="CardHub Terms of Service." />
      <Container>
        <SectionHeader eyebrow={t('legal.eyebrow')} title={t('terms.title')} description={t('legal.lastUpdated')} />
        <div className="ch-legal-page__content">
          <p>{t('terms.intro')}</p>
          {SECTIONS.map((n) => (
            <div key={n}>
              <h3 className="ch-h4">{t(`terms.section${n}.title`)}</h3>
              <p>{t(`terms.section${n}.body`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
