"""Generate favicon + social/OG raster images for the docs site.

Brand identity (from docs/css/styles.css): neobrutalist — lime square brand
mark with a hard 3px black border, hard offset shadow, and a blocky "N".
Palette: cream #f4efe3, ink #111, lime #bcff3c, yellow #ffd23f,
pink #ff6fb5, cyan #34d1f5.

Run:  python scripts/make_seo_images.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, "..", "docs")
ASSETS = os.path.join(DOCS, "assets")

INK = (17, 17, 17)
CREAM = (244, 239, 227)
LIME = (188, 255, 60)
YELLOW = (255, 210, 63)
PINK = (255, 111, 181)
CYAN = (52, 209, 245)

FONT_DIR = r"C:\Windows\Fonts"


def font(name, size):
    for candidate in (name, name.lower()):
        path = os.path.join(FONT_DIR, candidate)
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


BLACK_FONT = "ariblk.ttf"   # Arial Black — matches "Archivo Black" display face
BOLD_FONT = "arialbd.ttf"
REG_FONT = "arial.ttf"
MONO_FONT = "consola.ttf"


def make_badge(size):
    """Return an RGBA badge image: lime square, hard border + shadow, blocky N."""
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    sq = S * 0.74
    off = S * 0.11
    m = (S - (sq + off)) / 2
    x0, y0 = m, m
    border = max(2, int(round(S * 0.055)))

    # hard offset shadow
    d.rectangle([x0 + off, y0 + off, x0 + off + sq, y0 + off + sq], fill=INK)
    # lime square with black border
    d.rectangle([x0, y0, x0 + sq, y0 + sq], fill=LIME, outline=INK, width=border)

    # blocky "N"
    p = sq * 0.24
    xl, xr = x0 + p, x0 + sq - p
    yt, yb = y0 + p, y0 + sq - p
    w = max(2, int(round(sq * 0.17)))
    d.line([(xl, yb), (xl, yt), (xr, yb), (xr, yt)], fill=INK, width=w, joint="curve")
    return img


def save_icon(size, path, bg=None, pad_ratio=0.0):
    """Render the badge centered on an optional background, then save as PNG."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if bg is not None:
        ImageDraw.Draw(canvas).rectangle([0, 0, size, size], fill=bg)
    inner = int(round(size * (1 - pad_ratio)))
    badge = make_badge(inner)
    o = (size - inner) // 2
    canvas.alpha_composite(badge, (o, o))
    canvas.convert("RGBA").save(path)
    print("wrote", os.path.relpath(path, DOCS))


def chip(d, x, y, text, fill, fnt, padx=22, pady=12, shadow=8):
    tb = d.textbbox((0, 0), text, font=fnt)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    w, h = tw + padx * 2, th + pady * 2
    d.rectangle([x + shadow, y + shadow, x + w + shadow, y + h + shadow], fill=INK)
    d.rectangle([x, y, x + w, y + h], fill=fill, outline=INK, width=4)
    d.text((x + padx - tb[0], y + pady - tb[1]), text, font=fnt, fill=INK)
    return w, h


def make_og():
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    d = ImageDraw.Draw(img)

    # heavy frame
    d.rectangle([0, 0, W - 1, H - 1], outline=INK, width=16)

    # brand row
    badge = make_badge(132)
    img.alpha_composite(badge, (74, 70))
    wm = font(BLACK_FONT, 46)
    wx, wy = 220, 104
    d.text((wx, wy), "NEPSE", font=wm, fill=INK)
    nb = d.textbbox((wx, wy), "NEPSE", font=wm)
    d.text((nb[2] + 14, wy), "//", font=wm, fill=PINK)
    sb = d.textbbox((nb[2] + 14, wy), "//", font=wm)
    d.text((sb[2] + 14, wy), "ARCHIVE", font=wm, fill=INK)

    # headline
    h1 = font(BLACK_FONT, 86)
    d.text((76, 250), "Nepal Stock Exchange", font=h1, fill=INK)
    d.text((76, 344), "share-price history", font=h1, fill=INK)

    # subline
    sub = font(REG_FONT, 33)
    d.text((78, 452), "Every NEPSE trading day archived  ·  free to download",
           font=sub, fill=(40, 40, 40))

    # chips
    cf = font(BLACK_FONT, 26)
    cx, cy = 78, 512
    w, _ = chip(d, cx, cy, "CSV + EXCEL", YELLOW, cf); cx += w + 22
    w, _ = chip(d, cx, cy, "DAILY UPDATES", CYAN, cf); cx += w + 22
    w, _ = chip(d, cx, cy, "NO LOGIN", PINK, cf)

    # url, bottom-right on its own row
    uf = font(MONO_FONT, 22)
    url = "omitnomis.github.io/ShareSansarScraper"
    ub = d.textbbox((0, 0), url, font=uf)
    d.text((W - (ub[2] - ub[0]) - 60, 584), url, font=uf, fill=(70, 70, 70))

    out = os.path.join(ASSETS, "og-image.png")
    img.convert("RGB").save(out, "PNG")
    print("wrote", os.path.relpath(out, DOCS))


def main():
    os.makedirs(ASSETS, exist_ok=True)
    save_icon(32, os.path.join(ASSETS, "favicon-32.png"))
    save_icon(180, os.path.join(ASSETS, "apple-touch-icon.png"), bg=CREAM + (255,), pad_ratio=0.06)
    save_icon(192, os.path.join(ASSETS, "icon-192.png"), bg=CREAM + (255,), pad_ratio=0.10)
    save_icon(512, os.path.join(ASSETS, "icon-512.png"), bg=CREAM + (255,), pad_ratio=0.10)
    make_og()


if __name__ == "__main__":
    main()
