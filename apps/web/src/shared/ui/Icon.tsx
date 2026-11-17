/** Small inline icon set for the game UI (stroke icons, inherit currentColor). */
const PATHS = {
  portal:
    'M12 3c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9Zm0 4c-2 0-3.5 2.2-3.5 5s1.5 5 3.5 5 3.5-2.2 3.5-5S14 7 12 7Z',
  hero: 'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 18c0-4 3-7 7-7s7 3 7 7',
  swap: 'M4 8h13l-3-3M20 16H7l3 3',
  exit: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  back: 'M15 5l-7 7 7 7',
  sword: 'M14.5 4H20v5.5L9 20.5 3.5 15 14.5 4ZM5 13l6 6M3 21l3-3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  plus: 'M12 5v14M5 12h14',
  scroll: 'M7 4h11v13a3 3 0 0 1-3 3H6a3 3 0 0 1 0-6h9M7 4a2 2 0 0 0-2 2v8',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
