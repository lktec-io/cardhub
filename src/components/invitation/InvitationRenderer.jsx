import './invitation-renderer.css';
import { HeroSection } from './sections/HeroSection';
import { DetailsSection } from './sections/DetailsSection';
import { VenueSection } from './sections/VenueSection';
import { MessageSection } from './sections/MessageSection';
import { HostsSection } from './sections/HostsSection';
import { CountdownSection } from './sections/CountdownSection';
import { GallerySection } from './sections/GallerySection';
import { RsvpSection } from './sections/RsvpSection';

const SECTION_COMPONENTS = {
  details: DetailsSection,
  venue: VenueSection,
  message: MessageSection,
  hosts: HostsSection,
  countdown: CountdownSection,
  gallery: GallerySection,
  rsvp: RsvpSection,
};

/**
 * The one invitation renderer: given event data + an invitation config +
 * the selected template's config, it renders the actual invitation. This
 * exact component is embedded (scaled) in the builder canvas, shown at
 * full size in the builder's preview mode, and rendered on the public
 * /invite/:slug page — no second rendering path exists anywhere.
 *
 * `slug` is only passed by the public page — its presence is what makes
 * the RSVP section actually submittable (see RsvpSection.jsx); the
 * builder/preview render the identical markup with disabled inputs.
 */
export function InvitationRenderer({ event, config, templateConfig, slug }) {
  const design = config?.design || {};
  const colors = design.colors || templateConfig?.colors;
  const sections = [...(config?.sections || [])].filter((s) => s.enabled).sort((a, b) => a.order - b.order);

  const style = {
    '--inv-primary': colors?.primary,
    '--inv-accent': colors?.accent,
    ...(design.background?.type === 'solid' ? { '--inv-bg': design.background.value } : {}),
  };

  const heroIndex = sections.findIndex((s) => s.type === 'hero');
  const restSections = sections.filter((s) => s.type !== 'hero');

  return (
    <div
      className={`ch-invitation ch-invitation--bg-${design.background?.type || 'template'}`}
      style={{
        ...style,
        backgroundImage:
          design.background?.type === 'image' && design.background.value ? `url(${design.background.value})` : undefined,
      }}
    >
      {heroIndex !== -1 && <HeroSection event={event} data={sections[heroIndex].data} coverImage={design.coverImage} index={0} />}

      <div className="ch-invitation__body">
        {restSections.map((section, i) => {
          const Section = SECTION_COMPONENTS[section.type];
          if (!Section) return null;
          return <Section key={section.id} event={event} data={section.data} index={i + 1} slug={slug} />;
        })}
      </div>

      <footer className="ch-invitation__footer">
        <span>Made with CardHub</span>
      </footer>
    </div>
  );
}
