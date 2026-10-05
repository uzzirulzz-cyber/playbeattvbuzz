import { Link } from '../lib/router';
import { CHANNELS } from '../data/catalog';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#060608]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-buzz to-[#b3001b]">
                <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none" aria-hidden="true">
                  <path
                    d="M18 14 L18 50 L30 50 L30 38 L40 38 A12 12 0 0 0 40 14 Z M30 24 L38 24 A3 3 0 0 1 38 30 L30 30 Z"
                    fill="#fff"
                  />
                  <circle cx="47" cy="47" r="9" fill="#0A0A0D" />
                  <path d="M44 42.5 L52 47 L44 51.5 Z" fill="#7C5CFF" />
                </svg>
              </span>
              <span className="font-display text-lg uppercase tracking-wide">
                PlayBeat <span className="text-buzz">TV</span> Buzz
              </span>
            </div>
            <p className="mt-4 text-sm text-mute leading-relaxed max-w-xs">
              Bold originals, live channels and trending shows. Made for the buzz —
              streaming on playbeattvbuzz.com.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {[
                { Icon: Youtube, label: 'YouTube' },
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Twitter, label: 'X (Twitter)' },
                { Icon: Facebook, label: 'Facebook' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  onClick={(e) => e.preventDefault()}
                  className="grid place-items-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-mute hover:text-buzz hover:border-buzz/50 transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-mute mb-4">
              Watch
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="text-cream/80 hover:text-buzz transition-colors">Home</Link></li>
              <li><Link to="/watch/the-buzz-stream" className="text-cream/80 hover:text-buzz transition-colors">Live 24/7</Link></li>
              <li><Link to="/watch/sintel-dragons-call" className="text-cream/80 hover:text-buzz transition-colors">Buzz Originals</Link></li>
              <li><Link to="/browse" className="text-cream/80 hover:text-buzz transition-colors">Browse all</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-mute mb-4">
              Channels
            </h4>
            <ul className="space-y-2.5 text-sm">
              {CHANNELS.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/channel/${c.id}`} className="text-cream/80 hover:text-buzz transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-mute mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-cream/80 hover:text-buzz transition-colors">About</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-cream/80 hover:text-buzz transition-colors">Press</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-cream/80 hover:text-buzz transition-colors">Advertise</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-cream/80 hover:text-buzz transition-colors">Terms & Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-mute">© 2026 PlayBeat TV Buzz. All rights reserved.</p>
          <p className="text-[11px] text-mute/70 tracking-wide uppercase">
            Press play. Join the buzz.
          </p>
        </div>
      </div>
    </footer>
  );
}
