/** Small inline icon set for the game UI (stroke icons, inherit currentColor). */
const PATHS = {
  portal:
    'M12 3c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9Zm0 4c-2 0-3.5 2.2-3.5 5s1.5 5 3.5 5 3.5-2.2 3.5-5S14 7 12 7Z',
  hero: 'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 18c0-4 3-7 7-7s7 3 7 7',
  friends:
    'M9 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm-6 16c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5a3 3 0 0 1 0 6m2.5 9c0-2.6-1.2-4.6-3-5.6',
  swap: 'M4 8h13l-3-3M20 16H7l3 3',
  exit: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  back: 'M15 5l-7 7 7 7',
  sword: 'M14.5 4H20v5.5L9 20.5 3.5 15 14.5 4ZM5 13l6 6M3 21l3-3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  plus: 'M12 5v14M5 12h14',
  scroll: 'M7 4h11v13a3 3 0 0 1-3 3H6a3 3 0 0 1 0-6h9M7 4a2 2 0 0 0-2 2v8',
  home: 'M3 11 12 3l9 8M5 9.5V20h5v-6h4v6h5V9.5',
  compass: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  bag: 'M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  lock: 'M6 11h12v9H6v-9Zm2.5 0V8a3.5 3.5 0 0 1 7 0v3',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  // request #57: guilds
  banner: 'M6 3v18M6 4h12l-3 4 3 4H6',
  skull:
    'M12 3a8 8 0 0 0-5 14.2V20h3v-2h4v2h3v-2.8A8 8 0 0 0 12 3Zm-3 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  coin: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4v10M9.5 9.5c0-1.4 1.1-2 2.5-2s2.5.6 2.5 2-1.1 1.8-2.5 2.2-2.5.9-2.5 2.3 1.1 2 2.5 2 2.5-.6 2.5-2',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z',
  lobby:
    'M8 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm8 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 19c0-2.8 2.2-5 5-5s5 2.2 5 5m-2 0c0-2.8 2.2-5 5-5s5 2.2 5 5',
  gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0-6 1.5 2.6 3-.6.9 2.9 2.6 1.5-1.2 2.6 1.2 2.6-2.6 1.5-.9 2.9-3-.6L12 21l-1.5-2.6-3 .6-.9-2.9L4 14.6l1.2-2.6L4 9.4l2.6-1.5.9-2.9 3 .6L12 3Z',
  // request #87: sound and full screen
  sound: 'M4 9h4l5-4v14l-5-4H4V9Zm12 0c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4V9Zm12 1 5 5m0-5-5 5',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
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
