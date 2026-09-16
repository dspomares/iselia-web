#!/usr/bin/env python3
"""Genera assets/ a partir del maestro vectorial brand/logo_v3.svg.

    python3 brand/build-assets.py

brand/logo_v3.svg es el archivo maestro (manual v3.1, pagina 17: "conservar
siempre una version vectorial del logotipo como referencia"). Contiene el
lockup VERTICAL: el grupo #simbolo arriba y #iselia-tipografia-construida
abajo. El lockup HORIZONTAL -el "logo principal" de la pagina 3- no viene como
archivo suelto, asi que se recompone aqui con las proporciones exactas medidas
sobre el arte maestro del propio manual (xref 29 de la pagina 5, 1200x246):

    simbolo    215 x 215 px, cuadrado exacto
    hueco       28 px          -> 0.130233 x lado del simbolo
    wordmark   926 x 166 px    -> lado del simbolo = 1.295181 x alto wordmark
    vertical   ambas cajas de tinta centradas entre si (123 vs 122.5)

La regla 1 de la pagina 5 solo pide "separacion minima proporcional" (en v2
daba un 0.35x que contradecia su propio diagrama por 4.5x; en v3.1 ese numero
ya no esta), de modo que la proporcion se toma del arte, no del texto.

Variantes de color, segun la pagina 3:
    color        -- tal cual el maestro                 (fondos claros)
    oscuro       -- nucleo y "isel" en blanco           (fondos oscuros)
    mono-blanco  -- todo blanco
    mono-azul    -- todo azul noche

En el maestro, rgb(4,29,88) aparece exactamente en el nucleo y en las letras
"isel"; "ia" es rgb(0,109,250) y las orbitas son gradientes. Por eso la
variante "oscuro" es una sustitucion directa de ese unico color.

Los PNG se rasterizan con Chrome headless, NO con PyMuPDF: el renderizador SVG
de MuPDF no soporta <linearGradient> y dibuja las orbitas en negro. Se
comprobo que falla incluso con el maestro intacto, asi que no es cosa de este
script -- pero si se vuelve a rasterizar con fitz, los iconos saldran negros.
"""

import os
import re
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, os.pardir))
ASSETS = os.path.join(ROOT, "assets")
MASTER = os.path.join(HERE, "logo_v3.svg")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

AZUL_NOCHE = "#041D58"
ISEL = "rgb(4,29,88)"          # nucleo + "isel"

# Cajas de tinta del maestro, en unidades de su viewBox (0 0 1040 960).
SYM = dict(x=233.00, y=65.00, size=573.67)
WM = dict(x=60.00, y=760.00, w=919.67, h=163.67)

# Proporciones del lockup horizontal, medidas sobre el arte del manual.
SYM_OVER_WM_H_MANUAL = 215 / 166
GAP_OVER_SYM_MANUAL = 28 / 215

# Ajuste del propietario sobre esas proporciones: el wordmark del arte maestro
# se veia grande y pegado al pictograma. Se encoge un 15 % respecto al simbolo
# y se abre el hueco 2,5 veces. Es una desviacion deliberada del arte de la
# pagina 5; para volver al manual, poner ambos factores a 1.
WM_SHRINK = 0.85
GAP_FACTOR = 2.5

SYM_OVER_WM_H = SYM_OVER_WM_H_MANUAL / WM_SHRINK
GAP_OVER_SYM = GAP_OVER_SYM_MANUAL * GAP_FACTOR

# Tile de icono (manual p.8 / arte 600x600): simbolo al 60.2 % centrado.
TILE_SYMBOL_FRAC = 361 / 600

SVG_STYLE = ("fill-rule:evenodd;clip-rule:evenodd;"
             "stroke-linejoin:round;stroke-miterlimit:2;")


# ── troceado del maestro ───────────────────────────────────────────────────

def master():
    return open(MASTER, encoding="utf-8").read()


def group(svg, gid):
    """Devuelve el markup completo del grupo <g id=gid ...>...</g>."""
    i = svg.index(f'<g id="{gid}"')
    depth, j = 0, i
    while True:
        m = re.compile(r"<g\b|</g>").search(svg, j)
        depth += 1 if m.group(0) == "<g" else -1
        j = m.end()
        if depth == 0:
            return svg[i:j]


def defs(svg):
    return svg[svg.index("<defs>"):svg.index("</defs>") + len("</defs>")]


def recolour(markup, variant):
    """Aplica una de las variantes de color de la pagina 3."""
    if variant == "color":
        return markup
    if variant == "oscuro":                      # nucleo y "isel" a blanco
        return markup.replace(f"fill:{ISEL}", "fill:rgb(255,255,255)")
    flat = "rgb(255,255,255)" if variant == "mono-blanco" else "rgb(4,29,88)"
    markup = re.sub(r"fill:url\(#[^)]+\)", f"fill:{flat}", markup)
    markup = re.sub(r"fill:rgb\(\d+,\d+,\d+\)", f"fill:{flat}", markup)
    return markup


def wrap(inner, w, h, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'viewBox="0 0 {w:.2f} {h:.2f}" style="{SVG_STYLE}">\n'
            f'{extra}{inner}\n</svg>\n')


# ── piezas ─────────────────────────────────────────────────────────────────

def lockup_horizontal(variant):
    """Lockup horizontal (simbolo + palabra), viewBox ajustado a la tinta."""
    svg = master()
    S = SYM_OVER_WM_H * WM["h"]
    k = S / SYM["size"]
    gap = GAP_OVER_SYM * S
    w, h = S + gap + WM["w"], S
    sym = (f'<g transform="translate({-SYM["x"] * k:.4f},{-SYM["y"] * k:.4f}) '
           f'scale({k:.6f})">{group(svg, "simbolo")}</g>')
    wm = (f'<g transform="translate({S + gap - WM["x"]:.4f},'
          f'{(S - WM["h"]) / 2 - WM["y"]:.4f})">'
          f'{group(svg, "iselia-tipografia-construida")}</g>')
    return wrap(recolour(defs(svg) + sym + wm, variant), w, h), w, h


def symbol_only(variant):
    """Solo el simbolo, viewBox ajustado a la tinta (favicon, avatar)."""
    svg = master()
    s = SYM["size"]
    sym = (f'<g transform="translate({-SYM["x"]:.4f},{-SYM["y"]:.4f})">'
           f'{group(svg, "simbolo")}</g>')
    return wrap(recolour(defs(svg) + sym, variant), s, s), s, s


def vertical(variant):
    """Lockup vertical, tal cual lo compone el maestro, ajustado a la tinta."""
    svg = master()
    x0 = min(SYM["x"], WM["x"])
    w = max(SYM["x"] + SYM["size"], WM["x"] + WM["w"]) - x0
    h = WM["y"] + WM["h"] - SYM["y"]
    body = (f'<g transform="translate({-x0:.4f},{-SYM["y"]:.4f})">'
            f'{group(svg, "simbolo")}{group(svg, "iselia-tipografia-construida")}</g>')
    return wrap(recolour(defs(svg) + body, variant), w, h), w, h


def tile(px=600):
    """Simbolo sobre azul noche, con el margen interno del manual."""
    svg = master()
    inner = px * TILE_SYMBOL_FRAC
    off = (px - inner) / 2
    k = inner / SYM["size"]
    sym = (f'<g transform="translate({off - SYM["x"] * k:.4f},'
           f'{off - SYM["y"] * k:.4f}) scale({k:.6f})">'
           f'{group(svg, "simbolo")}</g>')
    inner_markup = recolour(defs(svg) + sym, "oscuro")
    rect = f'<rect width="{px}" height="{px}" fill="{AZUL_NOCHE}"/>\n'
    return wrap(inner_markup, px, px, extra=rect), px, px


def panel(piece, w, h, bg, frac):
    """Centra una pieza sobre un lienzo solido de w x h, ocupando `frac` del ancho."""
    markup, vw, vh = piece
    tw = w * frac
    th = tw * vh / vw
    if th > h * 0.68:
        th = h * 0.68
        tw = th * vw / vh
    inner = markup.split(">", 1)[1].rsplit("</svg>", 1)[0]
    nested = (f'<svg x="{(w - tw) / 2:.2f}" y="{(h - th) / 2:.2f}" '
              f'width="{tw:.2f}" height="{th:.2f}" '
              f'viewBox="0 0 {vw:.2f} {vh:.2f}">{inner}</svg>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w} {h}">\n'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>\n{nested}\n</svg>\n'), w, h


# ── salida ─────────────────────────────────────────────────────────────────

def write_svg(name, piece):
    path = os.path.join(ASSETS, name)
    open(path, "w", encoding="utf-8").write(piece[0])
    print(f"  {name:42s} {os.path.getsize(path):>7,} B")


def chrome_png(markup, w, h, out):
    """Rasteriza con Chrome headless (MuPDF no dibuja los gradientes)."""
    with tempfile.TemporaryDirectory() as tmp:
        svg = os.path.join(tmp, "a.svg")
        html = os.path.join(tmp, "a.html")
        open(svg, "w", encoding="utf-8").write(markup)
        open(html, "w", encoding="utf-8").write(
            f'<style>html,body{{margin:0;padding:0;background:transparent}}'
            f'img{{display:block;width:{w}px;height:{h}px}}</style>'
            f'<img src="a.svg">')
        # Se usa el perfil por defecto de Chrome a proposito. Forzar un perfil
        # nuevo -con --user-data-dir o apuntando HOME a un temporal- hace que
        # Chrome se cuelgue indefinidamente en el primer arranque del perfil;
        # con el perfil existente responde en decimas. El timeout evita que un
        # cuelgue asi vuelva a dejar el script parado en silencio.
        subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--no-sandbox",
             "--force-device-scale-factor=1", "--default-background-color=00000000",
             "--hide-scrollbars", f"--window-size={w},{h}",
             f"--screenshot={out}", html],
            check=True, capture_output=True, timeout=60)


def scale_area(pix, nw, nh):
    """Reduccion por promedio de area sobre un fitz.Pixmap RGBA."""
    import fitz
    w, h, s = pix.width, pix.height, pix.samples
    n = pix.n
    out = bytearray(nw * nh * 4)
    for oy in range(nh):
        sy0, sy1 = oy * h // nh, max(oy * h // nh + 1, (oy + 1) * h // nh)
        for ox in range(nw):
            sx0, sx1 = ox * w // nw, max(ox * w // nw + 1, (ox + 1) * w // nw)
            acc = [0, 0, 0, 0]
            cnt = 0
            for y in range(sy0, sy1):
                base = y * w * n
                for x in range(sx0, sx1):
                    i = base + x * n
                    a = s[i + 3] if n == 4 else 255
                    acc[0] += s[i] * a
                    acc[1] += s[i + 1] * a
                    acc[2] += s[i + 2] * a
                    acc[3] += a
                    cnt += 1
            o = (oy * nw + ox) * 4
            if acc[3]:
                for c in range(3):
                    out[o + c] = min(255, acc[c] // acc[3])
            out[o + 3] = acc[3] // cnt
    return fitz.Pixmap(fitz.csRGB, nw, nh, bytes(out), True)


def write_png(name, piece, w, h=None):
    h = h or w
    out = os.path.join(ASSETS, name)
    chrome_png(piece[0], w, h, out)
    print(f"  {name:42s} {w}x{h}")


def write_icon_pngs(sizes):
    """Rasteriza el tile una vez en grande y reduce por promedio de area."""
    import fitz
    with tempfile.TemporaryDirectory() as tmp:
        big = os.path.join(tmp, "tile.png")
        chrome_png(tile(600)[0], 960, 960, big)
        src = fitz.Pixmap(big)
        for n, name in sizes:
            scale_area(src, n, n).save(os.path.join(ASSETS, name))
            print(f"  {name:42s} {n}x{n}")


if __name__ == "__main__":
    print("SVG (lo que sirve el sitio):")
    write_svg("iselia-lockup-horizontal-color.svg", lockup_horizontal("color"))
    write_svg("iselia-lockup-horizontal-oscuro.svg", lockup_horizontal("oscuro"))
    write_svg("iselia-lockup-horizontal-mono.svg", lockup_horizontal("mono-blanco"))
    write_svg("iselia-favicon-claro.svg", symbol_only("color"))
    write_svg("iselia-favicon-oscuro.svg", symbol_only("oscuro"))

    print("PNG (rasterizados con Chrome):")
    write_icon_pngs([(180, "iselia-apple-touch-icon.png"),
                     (32, "iselia-favicon-32.png"),
                     (16, "iselia-favicon-16.png")])
    write_png("iselia-logo-512.png",
              panel(vertical("color"), 512, 512, "#FFFFFF", .80), 512)
    write_png("iselia-og.png",
              panel(lockup_horizontal("oscuro"), 1200, 630, AZUL_NOCHE, .62), 1200, 630)
