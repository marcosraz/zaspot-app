#!/usr/bin/env python3
"""
Erzeugt die App-Icons ohne den "ZAspot"-Schriftzug aus dem Original-Icon.

Die Bildmarke (orange Flügel + grüne Raute) wird pixelgenau aus
assets/icon-with-text.png freigestellt: pro Pixel wird der Abstand zur
Tile-Hintergrundfarbe ins Verhältnis zum Abstand der reinen Markenfarbe
gesetzt. Das ergibt korrektes Alpha auch an den weichen Kanten, statt einer
harten Schwellwert-Maske mit Treppchen.

Ausgabe:
  assets/icon.png           1024, randlos dunkel (iOS/Expo maskiert selbst)
  assets/adaptive-icon.png  1024, transparent, Marke in der Android-Sicherheitszone
  assets/favicon.png        196, für den Web-Build
"""

from PIL import Image

SRC = 'assets/icon-with-text.png'

BG = (19, 20, 25)              # Tile-Hintergrund im Original (Extraktion)
BG_OUT = (26, 26, 26)          # #1A1A1A — brand-dark-bg, wie splash + adaptiveIcon
ORANGE = (255, 102, 8)
GREEN = (19, 190, 58)

# Bildmarke im Original (ohne Schriftzug), ausgemessen
MARK_BOX = (326, 300, 698, 580)

CANVAS = 1024


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def extract_mark():
    """Marke freistellen: Alpha aus dem Farbabstand zum Hintergrund."""
    src = Image.open(SRC).convert('RGB').crop(MARK_BOX)
    w, h = src.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sp, op = src.load(), out.load()

    d_orange = dist(ORANGE, BG)
    d_green = dist(GREEN, BG)

    for y in range(h):
        for x in range(w):
            c = sp[x, y]
            d = dist(c, BG)
            if d < 8:                      # Hintergrund
                continue
            # Zu welcher Markenfarbe gehört das Pixel?
            pure, d_ref = (ORANGE, d_orange) if c[0] > c[1] else (GREEN, d_green)
            alpha = min(255, round(255 * d / d_ref))
            op[x, y] = (*pure, alpha)

    return out.crop(out.getbbox())


def place(mark, canvas_size, target_width, background):
    """Marke zentriert auf eine Leinwand setzen."""
    scale = target_width / mark.width
    resized = mark.resize(
        (round(mark.width * scale), round(mark.height * scale)),
        Image.LANCZOS,
    )
    canvas = Image.new('RGBA', (canvas_size, canvas_size), background)
    canvas.alpha_composite(
        resized,
        ((canvas_size - resized.width) // 2, (canvas_size - resized.height) // 2),
    )
    return canvas


def main():
    mark = extract_mark()
    print(f'Marke freigestellt: {mark.width}x{mark.height}')

    # iOS/Expo maskiert das Icon selbst -> randlos, keine eigenen Ecken.
    # 62 % Breite entspricht optisch dem, was Apple/Google für Marken empfehlen.
    icon = place(mark, CANVAS, round(CANVAS * 0.62), (*BG_OUT, 255))
    icon.convert('RGB').save('assets/icon.png')
    print('assets/icon.png')

    # Android-Adaptive-Icon: der Launcher zoomt den Vordergrund und maskiert
    # ihn (Kreis/Squircle). Sicher ist nur der innere Kreis mit 66 % Durchmesser
    # -> Marke bewusst kleiner halten. Hintergrund kommt aus app.config.ts.
    adaptive = place(mark, CANVAS, round(CANVAS * 0.44), (0, 0, 0, 0))
    adaptive.save('assets/adaptive-icon.png')
    print('assets/adaptive-icon.png')

    icon.convert('RGB').resize((196, 196), Image.LANCZOS).save('assets/favicon.png')
    print('assets/favicon.png')


if __name__ == '__main__':
    main()
