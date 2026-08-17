import { FiHeart, FiMapPin, FiTarget } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';

export function AboutPage() {
  return (
    <div className="ch-about-page">
      <Seo title="About" description="CardHub is a Clix Digital Works product built to modernize the way people invite, connect, and celebrate." />
      <Container>
        <SectionHeader
          eyebrow="About CardHub"
          title="Modernizing the way people invite, connect, and celebrate"
          description="CardHub is a product of Clix Digital Works, built in Tanzania for hosts everywhere."
          align="center"
        />

        <div className="ch-about-page__grid">
          <div className="ch-about-page__card">
            <FiTarget aria-hidden="true" />
            <h3 className="ch-h4">Our purpose</h3>
            <p className="ch-body-sm">
              Invitations should feel as special as the event they announce. CardHub exists to make
              beautiful, digital-first invitations accessible to every host — from an intimate
              gathering to a full celebration.
            </p>
          </div>
          <div className="ch-about-page__card">
            <FiMapPin aria-hidden="true" />
            <h3 className="ch-h4">Where we're from</h3>
            <p className="ch-body-sm">
              CardHub is built by Clix Digital Works in Tanzania, designed with the way people here
              share and celebrate in mind — mobile-first, fast, and easy to pass along.
            </p>
          </div>
          <div className="ch-about-page__card">
            <FiHeart aria-hidden="true" />
            <h3 className="ch-h4">What we're building</h3>
            <p className="ch-body-sm">
              CardHub is under active development. We're building it in the open, phase by phase —
              starting with a premium foundation and growing toward a complete event platform.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
