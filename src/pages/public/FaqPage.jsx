import { Container, SectionHeader, Seo } from '../../components/common';
import { Accordion } from '../../components/ui';
import { FAQ_ITEMS } from '../../constants/faq';

export function FaqPage() {
  return (
    <div className="ch-faq-page">
      <Seo title="FAQ" description="Frequently asked questions about CardHub." />
      <Container>
        <SectionHeader eyebrow="FAQ" title="Frequently asked questions" align="center" />
        <div className="ch-faq-page__list">
          <Accordion items={FAQ_ITEMS} />
        </div>
      </Container>
    </div>
  );
}
