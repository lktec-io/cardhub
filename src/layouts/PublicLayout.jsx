import { Outlet } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout';

export function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="ch-public-main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
