/**
 * Decorative + data-driven invitation preview. Used on marketing pages
 * (no `colors` passed — falls back to CardHub's own token palette), the
 * template catalog, and the event creation wizard / event overview (real
 * `colors` from the selected template's config, real event fields).
 *
 * This is a themed mock, not the real invitation renderer — Phase 4 owns
 * turning template.config + event data into an actual invitation layout.
 */
export function InvitationPreview({
  title = 'Amara & Joel',
  date = 'Saturday, 14 March 2026',
  venue = 'Dar es Salaam, Tanzania',
  eyebrow = "You’re Invited",
  badge = 'RSVP requested',
  colors,
  compact = false,
}) {
  const style = colors
    ? { '--ip-primary': colors.primary, '--ip-accent': colors.accent }
    : undefined;

  return (
    <div className={`ch-invite-preview ${compact ? 'ch-invite-preview--compact' : ''}`} style={style}>
      <div className="ch-invite-preview__glow" aria-hidden="true" />
      <div className="ch-invite-preview__card">
        <p className="ch-invite-preview__eyebrow">{eyebrow}</p>
        <h3 className="ch-invite-preview__title">{title}</h3>
        <p className="ch-invite-preview__date">{date}</p>
        <div className="ch-invite-preview__divider" />
        <p className="ch-invite-preview__venue">{venue}</p>
        {badge && <span className="ch-invite-preview__badge">{badge}</span>}
      </div>
    </div>
  );
}
