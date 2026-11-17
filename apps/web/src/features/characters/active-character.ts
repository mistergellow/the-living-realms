import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Which character this tab plays. Per-tab (sessionStorage) so a refresh keeps
 * you in the world; the server still enforces one active character per account.
 */
interface ActiveCharacterState {
  characterId: string | null;
  select: (id: string) => void;
  clear: () => void;
}

export const useActiveCharacter = create<ActiveCharacterState>()(
  persist(
    (set) => ({
      characterId: null,
      select: (characterId) => set({ characterId }),
      clear: () => set({ characterId: null }),
    }),
    { name: 'lr-active-character', storage: createJSONStorage(() => sessionStorage) },
  ),
);
