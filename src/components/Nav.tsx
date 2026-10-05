import { useEffect, useState } from 'react';
import { Link, useRoute } from '../lib/router';
import { Search } from 'lucide-react';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" ariaLabel="PlayBeat TV Buzz home">
      <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-buzz to-[#b3001b] shadow-[0_0_18px_rgba(255,45,85,0.4)]">
        <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none" aria-hidden="true">
          <path d="M18 14 L18 50 L30 50 L30 38 L40 38 A12 12 0 0 0 40 14 Z M30 24 L38 24 A3 3 0 0 1 38 30 L30 30 Z" fill="#fff" />
          <circle cx="47" cy="47" r="9" fill="#0A0A0D" />
          <path d="M44 42.5 L52 47 L44 51.5 Z" fill="#7C5CFF" />
        </svg>
      </span>
      <span className="font-display text-[15px] md:text-lg leading-none tracking-wide uppercase">
        PlayBeat <span className="text-buzz">TV</span>
        <span className="hidden sm:inline ml-1.5 text-[10px] font-body font-extrabold align-top bg-volt/20 text-volt px-1.5 py-0.5 rounded-md uppercase tracking-widest">
          Buzz
        </span>
      </span>
    </Link>
  );
}

export default function Nav({ onSearch }: { onSearch: () => void }) {
  const path = useRoute();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`whitespace-nowrap text-[13px] md:text-sm font-semibold transition-colors hover:text-cream ${
        path === to ? 'text-cream' : 'text-mute'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-ink/85 backdrop-blur-xl border-b border-white/5'
          : 'bg-gradient-to-b from-ink/80 to-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center gap-3 md:gap-6">
        <Logo />
        <nav className="flex items-center gap-3.5 md:gap-5 ml-1">
          {link('/', 'Home')}
          {link('/browse', 'Browse')}
          {link('/watch/the-buzz-stream', 'Live')}
        </nav>
        <div className="flex-1" />
        <button
          onClick={onSearch}
          className="flex items-center gap-2 h-9 pl-3 pr-3.5 rounded-full bg-white/5 border border-white/10 text-mute hover:text-cream hover:border-white/25 transition-colors"
          aria-label="Search shows and channels"
        >
          <Search size={15} />
          <span className="hidden sm:inline text-xs font-medium">Search</span>
          <kbd className="hidden lg:inline text-[10px] font-bold bg-white/10 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>
        <Link
          to="/watch/the-buzz-stream"
          className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-full bg-buzz hover:bg-buzzhot text-white text-sm font-bold transition-colors shadow-[0_0_20px_rgba(255,45,85,0.35)]"
        >
          <span className="w-2 h-2 rounded-full bg-white live-dot" />
          Watch Live
        </Link>
      </div>
    </header>
  );
}
