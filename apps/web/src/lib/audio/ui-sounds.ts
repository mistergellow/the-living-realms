import { unlockAudio } from './engine';
import { playSfx, SFX_NAMES, type SfxName } from './sfx';

/*
 * Request #87: every button, link and tab sounds like a game control, without
 * wiring each one. Hover gives a faint tick, a click a soft "thunk"; a control
 * can ask for another sound with `data-sfx="coin"` (or none with
 * `data-sfx="none"`). A disabled control answers with the error sound.
 * The first press anywhere unlocks the audio (browser rule).
 */
export const INTERACTIVE =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], summary, select, input[type="range"], input[type="checkbox"], [data-sfx]';

const isSfx = (s: string | undefined): s is SfxName =>
  !!s && (SFX_NAMES as readonly string[]).includes(s);

const disabled = (el: Element) =>
  (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';

/** The sound a click on `el` makes (null = none). */
export function clickSoundFor(el: Element): SfxName | null {
  const own = (el as HTMLElement).dataset?.sfx;
  if (own === 'none') return null;
  if (disabled(el)) return 'error';
  if (isSfx(own)) return own;
  if (el.getAttribute('role') === 'tab') return 'tab';
  return 'click';
}

export function installUiSounds(doc: Document = document): () => void {
  let hovered: Element | null = null;
  const onOver = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const el = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
    if (el === hovered) return;
    hovered = el;
    if (el && !disabled(el) && (el as HTMLElement).dataset?.sfx !== 'none') playSfx('hover');
  };
  const onDown = (e: Event) => {
    unlockAudio();
    // Disabled buttons fire no click: answer them here.
    if (e.type !== 'pointerdown') return;
    const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
    if (el && (el as HTMLButtonElement).disabled === true) playSfx('error');
  };
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
    if (!el) return;
    const s = clickSoundFor(el);
    if (s) playSfx(s);
  };
  doc.addEventListener('pointerover', onOver, { passive: true });
  doc.addEventListener('pointerdown', onDown, { capture: true, passive: true });
  doc.addEventListener('keydown', onDown, { capture: true, passive: true });
  doc.addEventListener('click', onClick, { capture: true, passive: true });
  return () => {
    doc.removeEventListener('pointerover', onOver);
    doc.removeEventListener('pointerdown', onDown, { capture: true });
    doc.removeEventListener('keydown', onDown, { capture: true });
    doc.removeEventListener('click', onClick, { capture: true });
  };
}
