import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router's BrowserRouter does not reset scroll position on
 * navigation by itself. Without this, navigating from a page you'd
 * scrolled deep into (e.g. a long FAQ page) to a shorter page landed you
 * exactly at that same scrollY — which, on the new (shorter) page, could
 * be at or past its footer. This is the actual cause of "clicking a nav
 * item lands at the footer, not the section."
 *
 * If the URL includes a hash (e.g. /#pricing), scrolls to that element
 * instead of the top — offset by the fixed floating navbar's height so
 * the target isn't hidden underneath it (see --navbar-height/--navbar-gap
 * in components/layout/layout.css).
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const target = document.getElementById(id);
      if (target) {
        const navbarOffset =
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) +
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-gap')) * 2 +
          16;
        const top = target.getBoundingClientRect().top + window.scrollY - navbarOffset;
        window.scrollTo({ top, behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
