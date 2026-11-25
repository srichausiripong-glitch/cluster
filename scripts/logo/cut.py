"""Cuts the mark and the word out of the founder's Pop-art logo and removes its cream ground.

Usage: python3 scripts/logo/cut.py <source.png> <output folder>
Writes mark.png (108 px high) and word.png (78 px high), three times the size they are shown at.
The source file is the founder's and is not kept in this repository.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

src = Image.open(sys.argv[1]).convert('RGB')
out_dir = sys.argv[2].rstrip('/')
BG = src.getpixel((20, 20))


def cut(box, keep_out, height):
    im = src.crop(box)
    w, h = im.size
    px = im.load()
    # Blank the parts that belong to the other element: the mark and the word touch in the source.
    for (x0, y0, x1, y1) in keep_out:
        for y in range(max(0, y0 - box[1]), min(h, y1 - box[1])):
            for x in range(max(0, x0 - box[0]), min(w, x1 - box[0])):
                px[x, y] = BG
    near = Image.new('L', (w, h), 0)
    npx = near.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if max(abs(r - BG[0]), abs(g - BG[1]), abs(b - BG[2])) < 14:
                npx[x, y] = 255
    # The outside is the ground that touches the picture's edge; ground enclosed by a letter stays.
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if npx[seed] == 255:
            ImageDraw.floodfill(near, seed, 128)
    outside = near.point(lambda v: 255 if v == 128 else 0)
    band = outside.filter(ImageFilter.MaxFilter(5))
    out = Image.new('RGBA', (w, h))
    opx, spx, bpx = out.load(), outside.load(), band.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if spx[x, y]:
                opx[x, y] = (0, 0, 0, 0)
            elif bpx[x, y]:
                # An edge pixel is a blend with the ground: undo the blend.
                a = max(((c - k) / (255 - k) if c > k else (k - c) / k) for c, k in zip((r, g, b), BG))
                a = min(1.0, max(0.0, a))
                if a < 0.02:
                    opx[x, y] = (0, 0, 0, 0)
                else:
                    opx[x, y] = tuple(int(max(0, min(255, (c - k) / a + k))) for c, k in zip((r, g, b), BG)) + (int(a * 255),)
            else:
                opx[x, y] = (r, g, b, 255)
    out = out.crop(out.getbbox())
    width = round(out.size[0] * height / out.size[1])
    return out.convert('RGBa').resize((width, height), Image.LANCZOS).convert('RGBA')


mark = cut((262, 62, 985, 613), [(285, 590, 382, 613)], 108)
word = cut((120, 590, 1135, 842), [(120, 590, 300, 624), (352, 590, 382, 597), (364, 590, 382, 612), (382, 590, 690, 624), (690, 590, 790, 616), (790, 590, 1135, 624)], 78)
mark.save(f'{out_dir}/mark.png', optimize=True)
word.save(f'{out_dir}/word.png', optimize=True)
print('mark', mark.size, 'word', word.size)
