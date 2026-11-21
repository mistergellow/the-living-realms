# ADR-021 — Provisional character art as layered SVG ("paper doll")

**Status:** accepted (provisional art)

**Context.** The owner wants illustrated, animated characters in the style of
the reference they sent (chibi heroes, equipment around the character), with
an editable base body now and visible equipment later (D32). There is no art
pipeline or artist yet.

**Decision.** Characters are drawn in code as layered SVG
(`apps/web/src/features/avatar/CharacterAvatar.tsx`): back hair, legs, torso,
arms, weapon, head, face, front hair. Appearance v2 stores only choices
(body, skin, hair style/colour, eyes, outfit colour). Idle animations
(breathing, bobbing, blinking) and combat animations (lunge, hit flash,
floating numbers, falling) are CSS. Enemies have their own SVG art.

**Consequences.** No asset pipeline is needed and everything scales and
recolours freely. The quality is far below professional illustration: real
artwork (static layers or a skeletal animation tool such as Spine) can replace
each layer behind the same component. Equipment will be added as extra layers
on the same anchors. Appearance v1 (emblem) characters are converted with
`normalizeAppearance`.

_Update (ADR-029):_ in the combat screen and on the map the same SVG layers
are rasterised into PixiJS textures and animated there; the CSS animations
remain for the DOM uses (sheet, lists, editor).
