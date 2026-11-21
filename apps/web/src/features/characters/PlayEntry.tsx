import { useEffect } from 'react';
import { Navigate } from 'react-router';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { useActiveCharacter } from './active-character';
import { useCharacters } from './api';

/**
 * The game's front door (request #40): opening the game puts you straight back
 * on the hex where you stopped, with the character you played last. The
 * character list is only needed to create the first one, or to switch.
 */
export function PlayEntry() {
  const characters = useCharacters();
  const active = useActiveCharacter((s) => s.characterId);
  const select = useActiveCharacter((s) => s.select);

  const list = characters.data?.characters ?? [];
  const pick = list.find((c) => c.id === active) ?? lastPlayed(list);

  useEffect(() => {
    if (pick && pick.id !== active) select(pick.id);
  }, [pick, active, select]);

  if (characters.isError) return <Navigate to="/characters" replace />;
  if (characters.isPending) return <FullPageMessage>Loading…</FullPageMessage>;
  if (!pick) return <Navigate to="/characters/new" replace />;
  if (pick.id !== active) return <FullPageMessage>Entering the world…</FullPageMessage>;
  return <Navigate to="/home" replace />;
}

/** The most recently played character (never-played ones last, newest first). */
export function lastPlayed<T extends { lastPlayedAt: string | null; createdAt: string }>(
  list: readonly T[],
): T | undefined {
  return [...list].sort(
    (a, b) =>
      (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? '') ||
      b.createdAt.localeCompare(a.createdAt),
  )[0];
}
