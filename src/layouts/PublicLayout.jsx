import { Outlet } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout';

/* Purely decorative — six small blurred dots that slowly pop/fade/drift
   behind the content (see .ch-ambient-particles in tokens.css). Fixed,
   pre-set positions (not randomized at runtime) so this stays a static
   CSS animation, never a JS loop. */
const PARTICLE_COUNT = 6;

export function PublicLayout() {
  return (
    <div className="ch-public-theme">
      <div className="ch-ambient-particles" aria-hidden="true">
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <Navbar />
      <main className="ch-public-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
