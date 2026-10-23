import { useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout';
import '../styles/theme-dark.css';

/**
 * Public website + ticket marketplace. Switches the document to the dark
 * glass theme while mounted (on <html>, so portalled modals and toasts match);
 * admin and auth layouts stay on the light theme.
 */
export function PublicLayout() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('ch-theme-dark');
    return () => root.classList.remove('ch-theme-dark');
  }, []);

  return (
    <div className="ch-public-theme">
      <Navbar />
      <main className="ch-public-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
