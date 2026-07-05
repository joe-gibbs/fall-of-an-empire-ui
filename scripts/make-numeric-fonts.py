from __future__ import annotations

from pathlib import Path

from fontTools.ttLib import TTFont


WEBUI_ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = WEBUI_ROOT / "public" / "assets" / "fonts"


FACES = {
    "Lato": ("Light", "LightItalic", "Regular", "Italic", "Bold", "BoldItalic"),
    "Volkhov": ("Regular", "Italic", "Bold", "BoldItalic"),
}


STYLE_NAMES = {
    "Light": "Light",
    "LightItalic": "Light Italic",
    "Regular": "Regular",
    "Italic": "Italic",
    "Bold": "Bold",
    "BoldItalic": "Bold Italic",
}


def set_font_names(font: TTFont, family: str, style: str) -> None:
    style_name = STYLE_NAMES[style]
    postscript_family = family.replace(" ", "")
    postscript_style = style_name.replace(" ", "")
    full_name = f"{family} {style_name}"
    postscript_name = f"{postscript_family}-{postscript_style}"

    name_table = font["name"]
    replaced_ids = {1, 2, 4, 6, 16, 17}
    name_table.names = [record for record in name_table.names if record.nameID not in replaced_ids]

    values = {
        1: family,
        2: style_name,
        4: full_name,
        6: postscript_name,
        16: family,
        17: style_name,
    }

    for name_id, value in values.items():
        name_table.setName(value, name_id, 3, 1, 0x409)
        name_table.setName(value, name_id, 1, 0, 0)


def move_glyph_horizontally(font: TTFont, glyph_name: str, delta: int) -> None:
    if delta == 0 or "glyf" not in font:
        return

    glyf = font["glyf"]
    glyph = glyf[glyph_name]

    if glyph.isComposite():
        for component in glyph.components:
            component.x += delta
    elif glyph.numberOfContours > 0:
        coordinates, _, _ = glyph.getCoordinates(glyf)
        for index in range(len(coordinates)):
            x, y = coordinates[index]
            coordinates[index] = (x + delta, y)

    glyph.recalcBounds(glyf)


def normalise_digit_advances(font: TTFont) -> None:
    cmap = font.getBestCmap()
    digit_glyphs = [cmap.get(codepoint) for codepoint in range(ord("0"), ord("9") + 1)]
    digit_glyphs = [glyph for glyph in digit_glyphs if glyph]

    if len(digit_glyphs) != 10:
        missing = 10 - len(digit_glyphs)
        raise RuntimeError(f"Font is missing {missing} ASCII digit glyphs")

    hmtx = font["hmtx"].metrics
    target_advance = max(hmtx[glyph_name][0] for glyph_name in digit_glyphs)

    for glyph_name in digit_glyphs:
        old_advance, old_lsb = hmtx[glyph_name]
        delta = round((target_advance - old_advance) / 2)
        move_glyph_horizontally(font, glyph_name, delta)
        hmtx[glyph_name] = (target_advance, old_lsb + delta)

    if "hhea" in font:
        font["hhea"].advanceWidthMax = max(font["hhea"].advanceWidthMax, target_advance)


def make_numeric_font(source_family: str, style: str) -> Path:
    source = FONT_DIR / f"{source_family}-{style}.ttf"
    target_family = f"{source_family} Numeric"
    target = FONT_DIR / f"{source_family}Numeric-{style}.ttf"

    font = TTFont(source)
    normalise_digit_advances(font)
    set_font_names(font, target_family, style)
    font.save(target)
    return target


def main() -> None:
    outputs: list[Path] = []
    for family, styles in FACES.items():
        for style in styles:
            outputs.append(make_numeric_font(family, style))

    for output in outputs:
        print(output.relative_to(WEBUI_ROOT))


if __name__ == "__main__":
    main()
