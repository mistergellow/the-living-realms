"""
Cut an art sheet (pieces on a white background) into one transparent WebP per
piece (request #72). Usage:

    python3 scripts/art/cut-sheet.py art/source/base-hero.webp out/dir [--mirror]

Writes piece_<n>.webp (largest first) and pieces.json with each piece's box in
the sheet, so a rig can be assembled from the original layout. --mirror flips
every piece horizontally (monsters face left). Needs Pillow, numpy and scipy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

WHITE = 235  # a pixel lighter than this on every channel counts as background
MIN_AREA = 300  # smaller specks are dropped


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    mirror = '--mirror' in sys.argv
    os.makedirs(out, exist_ok=True)
    sheet = Image.open(src).convert('RGBA')
    a = np.array(sheet).astype(float)
    darkest = a[:, :, :3].min(axis=2)
    ink = darkest < WHITE
    labels, _ = ndimage.label(ndimage.binary_dilation(ink, iterations=2))
    soft = np.clip((245 - darkest) / 25.0, 0, 1)  # feathered edge; near-white is background
    pieces = []
    for i, box in enumerate(ndimage.find_objects(labels), start=1):
        # No hole filling: white inside a piece (a bow's string gap, a ring's
        # hole) is background too. Ink and colour stay opaque.
        mask = labels == i
        if mask.sum() < MIN_AREA:
            continue
        alpha = np.where(mask, soft, 0.0)
        rgba = a.copy()
        rgba[:, :, 3] = alpha * 255
        ys, xs = np.where(mask)
        crop = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        img = Image.fromarray(rgba.astype('uint8'), 'RGBA').crop(crop)
        if mirror:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        pieces.append({'box': crop, 'area': int(mask.sum()), 'img': img})
    pieces.sort(key=lambda p: -p['area'])
    index = []
    for n, p in enumerate(pieces, start=1):
        name = f'piece_{n}.webp'
        p['img'].save(os.path.join(out, name), 'WEBP', quality=86, method=6)
        index.append({'file': name, 'box': p['box'], 'size': p['img'].size})
    with open(os.path.join(out, 'pieces.json'), 'w') as f:
        json.dump(index, f, indent=1)
    print(f'{len(index)} pieces -> {out}')


if __name__ == '__main__':
    main()
