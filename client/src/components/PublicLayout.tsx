import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { fetchSiteSettings } from '../api/queries';
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton';

export function PublicLayout() {
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: fetchSiteSettings });

  return (
    <div className="app-shell">
      <Navbar settings={settings} />
      <main className="app-main">
        <Outlet />
      </main>
      <WhatsAppFloatingButton settings={settings} />
      <Footer settings={settings} />
    </div>
  );
}
