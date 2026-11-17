import type { CharacterAppearance } from '@realms/shared';
import { CharacterAvatar } from '../avatar/CharacterAvatar';

/** Round portrait of a character (lists, presence, headers). */
export function CharacterToken({
  appearance,
  size = 40,
  title,
}: {
  appearance: CharacterAppearance;
  size?: number;
  title?: string;
}) {
  return (
    <span className="token" style={{ width: size, height: size }}>
      <CharacterAvatar
        appearance={appearance}
        portrait
        size={size}
        animated={false}
        title={title}
      />
    </span>
  );
}
