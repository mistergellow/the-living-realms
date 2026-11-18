import type { ReactNode } from 'react';
import { Screen } from './Screen';

/** Full-screen loading / status message. Pass `spinner={false}` for static messages. */
export function FullPageMessage({
  children,
  spinner = true,
}: {
  children: ReactNode;
  spinner?: boolean;
}) {
  return (
    <Screen>
      <div className="centered">
        <div className="loading" role="status">
          {spinner && <span className="rune-spinner" aria-hidden />}
          <div>{children}</div>
        </div>
      </div>
    </Screen>
  );
}
