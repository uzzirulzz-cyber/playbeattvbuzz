import { useEffect, useState } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import SearchOverlay from './components/SearchOverlay';
import Home from './views/Home';
import Watch from './views/Watch';
import Browse from './views/Browse';
import ChannelView from './views/ChannelView';
import { Link, useRoute } from './lib/router';

function NotFound() {
  return (
    <main className="pt-36 pb-28 text-center px-4">
      <p className="font-display text-8xl text-buzz">404</p>
      <h1 className="font-display text-3xl uppercase mt-2">Off air</h1>
      <p className="text-mute mt-3 mb-7">
        The page you're looking for isn't on the schedule.
      </p>
      <Link to="/" className="inline-flex h-11 items-center rounded-full bg-buzz px-6 font-bold">
        Back home
      </Link>
    </main>
  );
}

export default function App() {
  const path = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  let view: React.ReactNode;
  if (path === '/') {
    view = <Home />;
  } else if (path === '/browse') {
    view = <Browse />;
  } else if (path.startsWith('/watch/')) {
    view = <Watch id={decodeURIComponent(path.slice('/watch/'.length))} />;
  } else if (path.startsWith('/channel/')) {
    view = <ChannelView id={decodeURIComponent(path.slice('/channel/'.length))} />;
  } else {
    view = <NotFound />;
  }

  return (
    <div className="min-h-screen bg-ink text-cream font-body">
      <Nav onSearch={() => setSearchOpen(true)} />
      {view}
      <Footer />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
