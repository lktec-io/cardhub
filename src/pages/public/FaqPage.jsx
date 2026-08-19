import { Container, SectionHeader, Seo } from '../../components/common';
import { Accordion } from '../../components/ui';
import { useLanguage } from '../../hooks/useLanguage';

const FAQ_KEYS = Array.from({ length: 9 }, (_, i) => `faq.${i + 1}`);

export function FaqPage() {
  const { t } = useLanguage();
  const items = FAQ_KEYS.map((key) => ({ question: t(`${key}.question`), answer: t(`${key}.answer`) }));

  return (
    <div className="ch-faq-page">
      <Seo title="FAQ" description="Frequently asked questions about CardHub." />
      <Container>
        <SectionHeader eyebrow={t('nav.faq')} title={t('faq.title')} align="center" />
        <div className="ch-faq-page__list">
          <Accordion items={items} />
        </div>
      </Container>
    </div>
  );
}
