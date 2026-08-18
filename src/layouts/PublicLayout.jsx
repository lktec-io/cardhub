import { Outlet } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout';

export function PublicLayout() {
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
