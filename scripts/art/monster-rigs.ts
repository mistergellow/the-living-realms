/*
 * Request #91: the monster body plans reference sheet for the artist.
 *
 *   pnpm tsx scripts/art/monster-rigs.ts
 *
 * Writes art/rig/monster_rigs_reference.svg (one row per body plan: the
 * skeleton with joints and picture boxes, its parts with colour, file name and
 * size, and the monsters that use it) and prints the tables for
 * docs/MONSTER_RIG.md. Reads apps/web/src/features/avatar/monster-rigs.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BONE_ART_SCALE,
  boneBox,
  boneGeometry,
  type BoneDef,
} from '../../apps/web/src/features/avatar/bone-rig.js';
import {
  BODY_PLAN_NAMES,
  BODY_PLANS,
  ENEMY_RIGS,
  type BodyPlan,
} from '../../apps/web/src/features/avatar/monster-rigs.js';

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

const plans = Object.keys(BODY_PLANS) as BodyPlan[];
const users = (p: BodyPlan) =>
  Object.entries(ENEMY_RIGS)
    .filter(([, r]) => r.plan === p)
    .map(([id, r]) => `${id}${r.scale && r.scale !== 1 ? ` (×${r.scale})` : ''}`);

const FIG = 2.6; // figure scale on the sheet
const rowH = 160 * FIG + 70;
const rows = plans
  .map((p, i) => {
    const bones = BODY_PLANS[p];
    const y0 = 90 + i * rowH;
    const fig = `<g transform="translate(40 ${y0 + 40}) scale(${FIG})">
  <rect width="120" height="160" fill="#fcfcfc" stroke="#ccc" stroke-width="0.4" stroke-dasharray="2 2"/>
  ${bones.map(shape).join('')}${bones.map(joint).join('')}
  ${bones
    .map((b) => {
      const r = boneBox(b);
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="${b.color}" stroke-width="0.4" stroke-dasharray="1.2 0.8"/>`;
    })
    .join('')}
</g>`;
    const list = bones
      .map((b, k) => {
        const r = boneBox(b);
        const col = Math.floor(k / 9);
        const row = k % 9;
        return `<g transform="translate(${400 + col * 420} ${y0 + 56 + row * 34})">
  <rect width="16" height="16" y="-12" rx="3" fill="${b.color}" stroke="#111"/>
  <text x="24" font-size="14" fill="#111">${b.label}</text>
  <text x="24" y="15" font-size="11" fill="#777">_bone_${b.id}.png · ${px(r.w)}×${px(r.h)} px</text>
</g>`;
      })
      .join('');
    const who = users(p);
    return `<g>
  <text x="40" y="${y0 + 24}" font-size="20" font-weight="700" fill="#111">${BODY_PLAN_NAMES[p]} — ${bones.length} parts</text>
  <text x="400" y="${y0 + 24}" font-size="12" fill="#555">Used by: ${who.join(', ') || '—'}</text>
  ${fig}
  ${list}
  <line x1="40" x2="1240" y1="${y0 + rowH - 14}" y2="${y0 + rowH - 14}" stroke="#ddd"/>
</g>`;
  })
  .join('\n');

const W = 1260;
const H = 90 + plans.length * rowH;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Georgia, serif">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="40" y="44" font-size="26" font-weight="700" fill="#111">Monster rigs — body plans</text>
<text x="40" y="66" font-size="13" fill="#555">Drawn facing right (the game mirrors monsters to face left). White dot = joint the part turns at. Dashed box = the picture's size and place. One folder per monster: avatar/monsters/&lt;monster&gt;/_bone_&lt;part&gt;.png</text>
${rows}
</svg>`;

const out = join(root, 'art', 'rig', 'monster_rigs_reference.svg');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`wrote ${out}\n`);
for (const p of plans) {
  console.log(`### ${BODY_PLAN_NAMES[p]}\n`);
  console.log(
    `Monstros: ${users(p)
      .map((u) => `\`${u}\``)
      .join(', ')}\n`,
  );
  console.log('| Parte | Cor | Ficheiro | Tamanho (px) |');
  console.log('| ----- | --- | -------- | ------------ |');
  for (const b of BODY_PLANS[p]) {
    const r = boneBox(b);
    console.log(
      `| ${b.label} | \`${b.color}\` | \`_bone_${b.id}.png\` | ${px(r.w)} × ${px(r.h)} |`,
    );
  }
  console.log('');
}
