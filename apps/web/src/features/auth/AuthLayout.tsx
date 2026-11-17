import type { ReactNode } from 'react';
import { Screen } from '../../shared/ui/Screen';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <main className="centered">
        <div className="centered-card">
          <div className="brand">
            <span className="logo">The Living Realms</span>
            <span className="brand-divider" aria-hidden />
            <p>A persistent world shaped by its players.</p>
          </div>
          <div className="panel">{children}</div>
        </div>
      </main>
    </Screen>
  );
}
