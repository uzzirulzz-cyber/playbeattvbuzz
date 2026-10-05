'use client';

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

/** Hash router — routes look like #/live-tv, #/watch/abc, #/admin/plans */
export function useHashRoute(): { path: string; params: Record<string, string> } {
  const [hash, setHash] = useState<string>('');
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    on();
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const raw = (hash || window.location.hash || '#/').replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const params: Record<string, string> = {};
  if (query) {
    for (const [k, v] of new URLSearchParams(query).entries()) params[k] = v;
  }
  return { path: path || '/', params };
}

export function navigate(to: string) {
  window.location.hash = to.startsWith('#') ? to : `#${to}`;
  window.scrollTo({ top: 0 });
}

export function Link({
  to,
  children,
  className,
  style,
  onClick,
  ariaLabel,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const handle = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    onClick?.();
    navigate(to);
  };
  return (
    <a href={`#${to}`} onClick={handle} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
