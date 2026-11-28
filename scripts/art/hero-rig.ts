/*
 * Request #91: the hero rig reference sheet for the artist.
 *
 *   pnpm tsx scripts/art/hero-rig.ts
 *
 * Writes art/rig/hero_rig_reference.svg (the assembled hero with every bone,
 * its joints and the box its picture fills; then every part on its own, with
 * the picture size and file name) and prints the table for docs/HERO_RIG.md.
 * Reads apps/web/src/features/avatar/bone-rig.ts, so it always matches the game.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BONE_ART_SCALE,
  BONES,
  boneBox,
  boneGeometry,
  type BoneDef,
} from '../../apps/web/src/features/avatar/bone-rig.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const S = BONE_ART_SCALE;
const px = (n: number) => Math.round(n * S);

function shape(b: BoneDef): string {
  const g = boneGeometry(b);
  if (b.shape === 'oval') {
    const rx = Math.max(g.length / 2 + 2, b.width * 0.35);
    return `<ellipse cx="${g.mid.x}" cy="${g.mid.y}" rx="${rx}" ry="${b.width / 2}" transform="rotate(${g.angle} ${g.mid.x} ${g.mid.y})" fill="${b.color}" stroke="#111" stroke-width="0.8"/>`;
  }
  return (
    `<line x1="${b.from.x}" y1="${b.from.y}" x2="${b.to.x}" y2="${b.to.y}" stroke="#111" stroke-width="${b.width + 1.6}" stroke-linecap="round"/>` +
    `<line x1="${b.from.x}" y1="${b.from.y}" x2="${b.to.x}" y2="${b.to.y}" stroke="${b.color}" stroke-width="${b.width}" stroke-linecap="round"/>`
  );
}
const joint = (b: BoneDef) =>
  `<circle cx="${b.from.x}" cy="${b.from.y}" r="1.4" fill="#fff" stroke="#111" stroke-width="0.4"/>`;

// --- left: the assembled hero (viewBox units scaled ×4)
const figure = `<g transform="translate(40 80) scale(${S})">
  <rect x="0" y="0" width="120" height="160" fill="none" stroke="#bbb" stroke-width="0.3" stroke-dasharray="2 2"/>
  ${BONES.map(shape).join('\n  ')}
  ${BONES.map(joint).join('\n  ')}
  ${BONES.map((b) => {
    const r = boneBox(b);
    return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="${b.color}" stroke-width="0.35" stroke-dasharray="1.2 0.8"/>`;
  }).join('\n  ')}
</g>`;

// --- right: every part on its own
const cols = 4;
const cellW = 250;
const cellH = 230;
const parts = BONES.map((b, i) => {
  const r = boneBox(b);
  const k = Math.min((cellW - 40) / (r.w * S), (cellH - 92) / (r.h * S), 1);
  const x0 = 600 + (i % cols) * cellW;
  const y0 = 80 + Math.floor(i / cols) * cellH;
  return `<g transform="translate(${x0} ${y0})">
  <rect width="${cellW - 14}" height="${cellH - 14}" rx="6" fill="#fafafa" stroke="#ddd"/>
  <text x="12" y="24" font-size="15" font-weight="700" fill="#111">${b.label}</text>
  <rect x="${cellW - 44}" y="11" width="18" height="18" rx="3" fill="${b.color}" stroke="#111"/>
  <text x="12" y="43" font-size="12" fill="#333">_bone_${b.id}.png</text>
  <text x="12" y="59" font-size="12" fill="#777">${px(r.w)} × ${px(r.h)} px · layer ${b.layer}</text>
  <g transform="translate(20 72) scale(${S * k}) translate(${-r.x} ${-r.y})">
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#fff" stroke="${b.color}" stroke-width="${0.6 / k}" stroke-dasharray="${2 / k} ${1.2 / k}"/>
    ${shape(b)}
    ${joint(b)}
  </g>
</g>`;
}).join('\n');

const W = 600 + cols * cellW + 20;
const H = Math.max(80 + Math.ceil(BONES.length / cols) * cellH + 20, 80 + 160 * S + 60);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Georgia, serif">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="40" y="44" font-size="26" font-weight="700" fill="#111">Hero rig — ${BONES.length} parts to draw</text>
<text x="40" y="66" font-size="13" fill="#555">Facing right. White dot = the joint the part turns at. Dashed box = the picture's size and place (draw the part in this pose, filling the box; transparent background).</text>
${figure}
${parts}
</svg>`;

const out = join(root, 'art', 'rig', 'hero_rig_reference.svg');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`wrote ${out}\n`);
console.log('| # | Parte | Cor | Ficheiro | Tamanho (px) | Roda em (x, y) | Camada |');
console.log('| - | ----- | --- | -------- | ------------ | -------------- | ------ |');
BONES.forEach((b, i) => {
  const r = boneBox(b);
  console.log(
    `| ${i + 1} | ${b.label} | \`${b.color}\` | \`_bone_${b.id}.png\` | ${px(r.w)} × ${px(r.h)} | ${px(b.from.x)}, ${px(b.from.y)} | ${b.layer} |`,
  );
});
