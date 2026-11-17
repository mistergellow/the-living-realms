import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="centered">
      <div className="centered-card">
        <div className="brand">
          <h1>The Living Realms</h1>
          <p>A persistent world shaped by its players.</p>
        </div>
        <div className="panel">{children}</div>
      </div>
    </main>
  );
}
