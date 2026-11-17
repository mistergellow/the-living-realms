import type { ReactNode } from 'react';

export function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="centered">
      <div className="muted">{children}</div>
    </div>
  );
}
