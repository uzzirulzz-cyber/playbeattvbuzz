'use client';

import { useEffect } from 'react';
import { useHashRoute } from './router';
import { AppProvider, useApp } from './store';
import { Footer, PublicNav } from './chrome';
import { Spinner } from './ui';
import { Home, Pricing, DevicesPage, Faq, Contact, Login, Register } from './views/public';
import { LiveTV, WatchPage, Movies, MoviePlayer, SeriesList, SeriesPage, EpisodePlayer, Sports } from './views/catalog';
import { Checkout, AccountShell, AccountDashboard, AccountSubscription, AccountDevices, AccountHistory, AccountFavorites, AccountOrders, AccountInvoices, AccountTickets, AccountProfile, AccountPassword } from './views/account';
import { AccountIptv } from './views/iptv';
import { AdminApp } from './views/admin';
import { Empty } from './ui';
import { navigate } from './router';

function Router() {
  const { path, params } = useHashRoute();
  const { session, sessionLoading } = useApp();

  // document title per view (SEO-ish within hash routing)
  useEffect(() => {
    const map: Record<string, string> = {
      '/': 'PLAYBEATTV — Premium Entertainment. One Powerful Platform.',
      '/live-tv': 'Live TV — PLAYBEATTV',
      '/movies': 'Movies — PLAYBEATTV',
      '/series': 'Series — PLAYBEATTV',
      '/sports': 'Sports — PLAYBEATTV',
      '/pricing': 'Pricing — PLAYBEATTV',
      '/devices': 'Devices — PLAYBEATTV',
      '/faq': 'FAQ — PLAYBEATTV',
      '/contact': 'Contact — PLAYBEATTV',
      '/admin': 'Admin Console — PLAYBEATTV',
      '/account': 'My Account — PLAYBEATTV',
    };
    document.title = map[path] || 'PLAYBEATTV';
  }, [path]);

  const isAdminArea = path === '/admin' || path.startsWith('/admin/');
  const isAccountArea = path === '/account' || path.startsWith('/account/');

  let view: React.ReactNode;
  if (isAdminArea) {
    view = <AdminApp section={path.replace('/admin', '').replace(/^\//, '')} />;
  } else if (isAccountArea) {
    if (sessionLoading) view = <Spinner />;
    else if (!session?.user) {
      navigate(`/login?next=${encodeURIComponent(path)}`);
      view = null;
    } else {
      const sub = path.replace('/account', '').replace(/^\//, '');
      const accountViews: Record<string, [string, React.ReactNode]> = {
        '': ['Dashboard', <AccountDashboard key="d" />],
        subscription: ['My Subscription', <AccountSubscription key="s" />],
        devices: ['My Devices', <AccountDevices key="v" />],
        history: ['Watch History', <AccountHistory key="h" />],
        favorites: ['Favorites', <AccountFavorites key="f" />],
        iptv: ['My IPTV Line', <AccountIptv key="iptv" />],
        orders: ['Orders', <AccountOrders key="o" />],
        invoices: ['Invoices', <AccountInvoices key="i" />],
        tickets: ['Support Tickets', <AccountTickets key="t" />],
        profile: ['Profile', <AccountProfile key="p" />],
        password: ['Change Password', <AccountPassword key="w" />],
      };
      const [title, node] = accountViews[sub] || accountViews[''];
      view = (
        <AccountShell active={sub} title={title}>
          {node}
        </AccountShell>
      );
    }
  } else {
    switch (path) {
      case '/':
        view = <Home />;
        break;
      case '/live-tv':
        view = <LiveTV params={params} />;
        break;
      case '/movies':
        view = <Movies params={params} />;
        break;
      case '/series':
        view = <SeriesList />;
        break;
      case '/sports':
        view = <Sports />;
        break;
      case '/pricing':
        view = <Pricing />;
        break;
      case '/devices':
        view = <DevicesPage />;
        break;
      case '/faq':
        view = <Faq />;
        break;
      case '/contact':
        view = <Contact />;
        break;
      case '/login':
        view = <Login params={params} />;
        break;
      case '/register':
        view = <Register />;
        break;
      case '/checkout':
        view = <Checkout params={params} />;
        break;
      default:
        if (path.startsWith('/watch/')) view = <WatchPage id={decodeURIComponent(path.slice(7))} />;
        else if (path.startsWith('/play/movie/')) view = <MoviePlayer id={decodeURIComponent(path.slice(12))} />;
        else if (path.startsWith('/play/episode/')) view = <EpisodePlayer id={decodeURIComponent(path.slice(14))} />;
        else if (path.startsWith('/series/')) view = <SeriesPage id={decodeURIComponent(path.slice(8))} />;
        else {
          view = (
            <Empty icon="bi-signpost-split" text="404 — this page doesn't exist.">
              <button className="btn btn-pb btn-sm mt-2" onClick={() => navigate('/')}>Back home</button>
            </Empty>
          );
        }
    }
  }

  // chrome: admin shell renders its own; account keeps public nav
  return (
    <div className="pb-app">
      {isAdminArea ? (
        <main>{view}</main>
      ) : (
        <>
          <PublicNav />
          <main className="pb-container pb-4">
            {view}
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}

export default function PbApp() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
