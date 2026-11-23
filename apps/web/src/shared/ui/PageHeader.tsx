import type { ReactNode } from 'react';

/**
 * The head of every in-game page (request #69): the place's name in the
 * title face, one plain sentence on what you do here, and the page's own
 * actions on the right. Keeps every screen introducing itself the same way.
 */
export function PageHeader({
  title,
  lead,
  actions,
  testId,
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  testId?: string;
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <h1 className="page-title" data-testid={testId}>
          {title}
        </h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  );
}
