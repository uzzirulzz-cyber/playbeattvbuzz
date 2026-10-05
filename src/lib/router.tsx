import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

export function getPath(): string {
  const p = window.location.pathname;
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p || '/';
}

export function navigate(to: string, opts?: { replace?: boolean }) {
  if (opts?.replace) {
    history.replaceState(null, '', to);
  } else {
    history.pushState(null, '', to);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): string {
  const [path, setPath] = useState<string>(getPath);
  useEffect(() => {
    const on = () => setPath(getPath());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return path;
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
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClick?.();
    navigate(to);
    window.scrollTo({ top: 0 });
  };
  return (
    <a href={to} onClick={handle} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
