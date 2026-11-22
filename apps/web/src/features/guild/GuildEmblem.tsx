/*
 * Guild emblem (request #57): a round badge in the guild colour with a white
 * glyph — the same "round gradient icon" style as the effect icons.
 * PLACEHOLDER art: replace GLYPHS entries with real art later.
 */
const GLYPHS: Record<string, string> = {
  shield: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  sword: 'M14.5 4H20v5.5L9 20.5 3.5 15 14.5 4ZM5 13l6 6M3 21l3-3',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z',
  tower: 'M6 21V9h12v12M4 9h16M6 9V4h3v2h2V4h2v2h2V4h3v5M10 21v-5h4v5',
  dragon: 'M4 17c2-6 6-9 11-9l5-4-1 6c-1 5-5 9-11 9l-4 2 1-4ZM14 11h.01',
  wolf: 'M5 4l4 4h6l4-4v8l-3 6-4 2-4-2-3-6V4ZM9.5 12h.01M14.5 12h.01M11 16h2',
  eagle: 'M2 9c4 0 7 1 10 4 3-3 6-4 10-4-2 3-5 5-8 5l-2 6-2-6c-3 0-6-2-8-5Z',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z',
  flame: 'M12 21c-4 0-7-3-7-7 0-5 5-7 5-11 3 2 4 5 3 8 2 0 3-2 3-4 2 2 3 4 3 7 0 4-3 7-7 7Z',
  skull: 'M12 3a8 8 0 0 0-5 14.2V20h3v-2h4v2h3v-2.8A8 8 0 0 0 12 3ZM9 10.5h.01M15 10.5h.01',
  tree: 'M12 21v-6M12 3 6 10h3l-4 5h14l-4-5h3l-6-7Z',
  anchor: 'M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 0v14M5 13a7 7 0 0 0 14 0M9 10h6',
};

export function GuildEmblem({
  icon,
  color,
  size = 48,
}: {
  icon: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="guild-emblem"
      style={{ width: size, height: size, ['--emblem' as string]: color }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round">
        <path d={GLYPHS[icon] ?? GLYPHS.shield} />
      </svg>
    </span>
  );
}
