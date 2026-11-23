import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * A window in front of everything (request #70). Rendered into <body> through
 * a portal, so no parent (a transform, an overflow, a stacking context) can
 * trap it or push its buttons off screen — that soft-locked Rift rooms.
 */
export function Modal({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return createPortal(
    <div
      className={['loot-popup', 'room-modal', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </div>,
    document.body,
  );
}
