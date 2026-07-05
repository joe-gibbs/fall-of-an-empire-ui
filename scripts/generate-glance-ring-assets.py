from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "glance" / "rings"
SIZE = 128
SCALE = 4
WORK_SIZE = SIZE * SCALE
UNIT = WORK_SIZE / 100
CENTER = 50 * UNIT

TRACK_COLOUR = "#16191c"
STRENGTH_COLOURS = {
    "own": "#e0c872",
    "ally": "#5ca9d6",
    "enemy": "#d85845",
    "neutral": "#b8aa82",
}
MORALE_COLOURS = {
    "green": "#78c058",
    "gold": "#c9a84c",
    "amber": "#c88a3a",
    "red": "#c44040",
}
SETTLEMENT_PROGRESS_COLOURS = {
    "build": "#d6a83a",
    "siege": "#d8483d",
}
MILITARY_STACK_COLUMNS = 25
SETTLEMENT_STACK_COLUMNS = 25
MILITARY_STRENGTH_SEGMENTS = 16
MILITARY_MORALE_SEGMENTS = 24
SETTLEMENT_FORTIFICATION_SEGMENTS = 10
SETTLEMENT_PROGRESS_SEGMENTS = 24
IMPERIAL_STANDING_SEGMENTS = 5
IMPERIAL_STACK_COLUMNS = IMPERIAL_STANDING_SEGMENTS + 1
IMPERIAL_RING_SOURCE = OUT_DIR / "imperial-standing-ring-source.png"
IMPERIAL_STANDING_COLOURS = {
    "favoured": "#78c058",
    "stable": "#c9a84c",
    "warning": "#e0c872",
    "danger": "#c88a3a",
    "critical": "#c44040",
}


def rgba(hex_colour: str, alpha: float = 1.0) -> Tuple[int, int, int, int]:
    clean = hex_colour.lstrip("#")
    return (
        int(clean[0:2], 16),
        int(clean[2:4], 16),
        int(clean[4:6], 16),
        max(0, min(255, round(alpha * 255))),
    )


def lerp_channel(a: int, b: int, t: float) -> int:
    return max(0, min(255, round(a + (b - a) * t)))


def colourise_pixel(
    pixel: Tuple[int, int, int, int],
    target_colour: Tuple[int, int, int, int],
    alpha_scale: float,
) -> Tuple[int, int, int, int]:
    r, g, b, a = pixel
    if a <= 0:
        return (0, 0, 0, 0)

    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    bevel = max(0.0, min(1.0, (luminance - 0.68) / 0.32))
    shade = 0.36 + luminance * 0.82
    tr, tg, tb, ta = target_colour
    rr = max(0, min(255, round(tr * shade)))
    gg = max(0, min(255, round(tg * shade)))
    bb = max(0, min(255, round(tb * shade)))

    rr = lerp_channel(rr, 255, bevel * 0.22)
    gg = lerp_channel(gg, 236, bevel * 0.22)
    bb = lerp_channel(bb, 176, bevel * 0.22)
    aa = max(0, min(255, round(a * (ta / 255) * alpha_scale)))
    return (rr, gg, bb, aa)


def arc_box(radius: float) -> Tuple[int, int, int, int]:
    r = radius * UNIT
    return (
        round(CENTER - r),
        round(CENTER - r),
        round(CENTER + r),
        round(CENTER + r),
    )


def draw_arc(
    draw: ImageDraw.ImageDraw,
    radius: float,
    start: float,
    end: float,
    colour: Tuple[int, int, int, int],
    width: float,
) -> None:
    draw.arc(arc_box(radius), start=start, end=end, fill=colour, width=max(1, round(width * UNIT)))


def point(radius: float, angle_deg: float) -> Tuple[float, float]:
    angle = math.radians(angle_deg)
    return (
        CENTER + radius * UNIT * math.cos(angle),
        CENTER + radius * UNIT * math.sin(angle),
    )


def draw_round_cap(
    draw: ImageDraw.ImageDraw,
    radius: float,
    angle_deg: float,
    colour: Tuple[int, int, int, int],
    width: float,
) -> None:
    x, y = point(radius, angle_deg)
    cap = width * UNIT * 0.5
    draw.ellipse((x - cap, y - cap, x + cap, y + cap), fill=colour)


def draw_segment_arc(
    draw: ImageDraw.ImageDraw,
    *,
    radius: float,
    start: float,
    end: float,
    colour: Tuple[int, int, int, int],
    width: float,
    round_caps: bool = True,
) -> None:
    draw_arc(draw, radius, start, end, colour, width)
    if round_caps:
        draw_round_cap(draw, radius, start, colour, width)
        draw_round_cap(draw, radius, end, colour, width)


def downsample(image: Image.Image) -> Image.Image:
    resampling = getattr(Image, "Resampling", Image).LANCZOS
    return image.resize((SIZE, SIZE), resampling)


def resample_filter() -> int:
    return getattr(Image, "Resampling", Image).LANCZOS


def remove_magenta_key(image: Image.Image) -> Image.Image:
    keyed = image.convert("RGBA")
    pixels = []
    for r, g, b, a in keyed.getdata():
        if r > 235 and g < 35 and b > 235:
            pixels.append((r, g, b, 0))
        else:
            pixels.append((r, g, b, a))
    keyed.putdata(pixels)
    return keyed


def extract_imperial_source_segment(
    *,
    min_angle: float = -121,
    max_angle: float = -59,
    min_radius: float = 31,
    max_radius: float = 47,
) -> Image.Image | None:
    if not IMPERIAL_RING_SOURCE.exists():
        return None

    source = remove_magenta_key(Image.open(IMPERIAL_RING_SOURCE))
    source = source.resize((WORK_SIZE, WORK_SIZE), resample_filter())
    pixels = []

    for y in range(WORK_SIZE):
        for x in range(WORK_SIZE):
            r, g, b, a = source.getpixel((x, y))
            if a <= 0:
                pixels.append((0, 0, 0, 0))
                continue

            angle = math.degrees(math.atan2(y - CENTER, x - CENTER))
            radius = math.hypot(x - CENTER, y - CENTER) / UNIT
            if min_angle <= angle <= max_angle and min_radius <= radius <= max_radius:
                pixels.append((r, g, b, a))
            else:
                pixels.append((0, 0, 0, 0))

    segment = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    segment.putdata(pixels)
    return segment


def colourise_segment(segment: Image.Image, target: str, alpha_scale: float) -> Image.Image:
    target_colour = rgba(target)
    output = Image.new("RGBA", segment.size, (0, 0, 0, 0))
    output.putdata([colourise_pixel(pixel, target_colour, alpha_scale) for pixel in segment.getdata()])
    return output


def rotated_segment(segment: Image.Image, index: int) -> Image.Image:
    resampling = getattr(Image, "Resampling", Image).BICUBIC
    return segment.rotate(
        -index * (360 / IMPERIAL_STANDING_SEGMENTS),
        resample=resampling,
        center=(CENTER, CENTER),
        fillcolor=(0, 0, 0, 0),
    )


def draw_generated_imperial_standing_ring(
    *,
    source_segment: Image.Image,
    track_segment: Image.Image,
    filled_segments: int,
    fill_colour: str,
) -> Image.Image:
    image = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    backing = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    backing_draw = ImageDraw.Draw(backing)
    draw_arc(backing_draw, 47.2, 0, 359.9, rgba("#05080b", 0.98), 14.4)
    draw_arc(backing_draw, 47.6, 0, 359.9, rgba("#161a1d", 0.94), 10.8)
    draw_arc(backing_draw, 50.0, 0, 359.9, rgba("#3e3321", 0.56), 1.8)
    draw_arc(backing_draw, 40.0, 0, 359.9, rgba("#030507", 0.72), 1.6)

    slot_backing = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    slot_draw = ImageDraw.Draw(slot_backing)
    for index in range(IMPERIAL_STANDING_SEGMENTS):
        rotation = index * (360 / IMPERIAL_STANDING_SEGMENTS)
        start = -123 + rotation
        end = -57 + rotation
        draw_segment_arc(slot_draw, radius=48.0, start=start, end=end, colour=rgba("#070b0e", 0.98), width=10.8, round_caps=False)
        draw_segment_arc(slot_draw, radius=50.0, start=start, end=end, colour=rgba("#303331", 0.32), width=1.4, round_caps=False)
        draw_segment_arc(slot_draw, radius=42.2, start=start, end=end, colour=rgba("#030507", 0.58), width=1.2, round_caps=False)

    track = colourise_segment(track_segment, "#202428", 1.0)
    fill = colourise_segment(source_segment, fill_colour, 1.0)
    value = filled_count(filled_segments, IMPERIAL_STANDING_SEGMENTS)

    image.alpha_composite(backing)
    image.alpha_composite(slot_backing)

    for index in range(IMPERIAL_STANDING_SEGMENTS):
        image.alpha_composite(rotated_segment(track, index))

    for index in range(value):
        image.alpha_composite(rotated_segment(fill, index))

    return image


def composite_layers(*layers: Image.Image) -> Image.Image:
    image = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    for layer in layers:
        image.alpha_composite(layer)
    return image


def write_sprite(name: str, tiles: Iterable[Image.Image], columns: int) -> None:
    tile_list = list(tiles)
    rows = max(1, math.ceil(len(tile_list) / columns))
    sheet = Image.new("RGBA", (columns * SIZE, rows * SIZE), (0, 0, 0, 0))

    for index, tile in enumerate(tile_list):
        col = index % columns
        row = index // columns
        small_tile = downsample(tile)
        sheet.paste(small_tile, (col * SIZE, row * SIZE), small_tile)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT_DIR / name, optimize=True)


def filled_count(value: int, segments: int) -> int:
    return max(0, min(segments, value))


def segment_angles(index: int, segments: int, gap_degrees: float) -> Tuple[float, float]:
    step = 360 / segments
    start = -90 + index * step + gap_degrees * 0.5
    end = -90 + (index + 1) * step - gap_degrees * 0.5
    return start, end


def draw_segmented_ring(
    *,
    segments: int,
    filled_segments: int,
    gap_degrees: float,
    radius: float,
    stroke_width: float,
    fill_colour: str,
    include_separator: bool = False,
) -> Image.Image:
    image = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    track = rgba(TRACK_COLOUR, 0.5)
    fill = rgba(fill_colour, 0.96)

    for index in range(segments):
        start, end = segment_angles(index, segments, gap_degrees)
        draw_arc(draw, radius, start, end, track, stroke_width)

    for index in range(filled_count(filled_segments, segments)):
        start, end = segment_angles(index, segments, gap_degrees)
        draw_arc(draw, radius, start, end, fill, stroke_width)

    if include_separator:
        draw_arc(draw, 41.25, 0, 359.9, track, 2.1)

    return image


def draw_imperial_standing_ring(
    *,
    filled_segments: int,
    fill_colour: str,
) -> Image.Image:
    image = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    shadow = rgba("#080c11", 0.56)
    track = rgba("#7b6530", 0.46)
    track_highlight = rgba("#f3da8b", 0.18)
    fill = rgba(fill_colour, 0.96)
    fill_highlight = rgba("#fff1bd", 0.2)

    for index in range(IMPERIAL_STANDING_SEGMENTS):
        start, end = segment_angles(index, IMPERIAL_STANDING_SEGMENTS, 8.2)
        draw_segment_arc(draw, radius=44, start=start, end=end, colour=shadow, width=8.8, round_caps=False)
        draw_segment_arc(draw, radius=44, start=start, end=end, colour=track, width=6.6, round_caps=False)
        draw_segment_arc(draw, radius=46.0, start=start, end=end, colour=track_highlight, width=1.2, round_caps=False)

    for index in range(filled_count(filled_segments, IMPERIAL_STANDING_SEGMENTS)):
        start, end = segment_angles(index, IMPERIAL_STANDING_SEGMENTS, 8.2)
        draw_segment_arc(draw, radius=44, start=start, end=end, colour=fill, width=7.0, round_caps=False)
        draw_segment_arc(draw, radius=46.0, start=start, end=end, colour=fill_highlight, width=1.4, round_caps=False)

    return image


def draw_progress_ring(
    *,
    segments: int,
    filled_segments: int,
    radius: float,
    stroke_width: float,
    fill_colour: str,
) -> Image.Image:
    image = Image.new("RGBA", (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    track = rgba(TRACK_COLOUR, 0.5)
    fill = rgba(fill_colour, 1.0)
    draw_arc(draw, radius, 0, 359.9, track, stroke_width)

    value = filled_count(filled_segments, segments)
    if value > 0:
        end = -90 + min(0.999, value / segments) * 360
        draw_arc(draw, radius, -90, end, fill, stroke_width)
        draw_round_cap(draw, radius, -90, fill, stroke_width)
        draw_round_cap(draw, radius, end, fill, stroke_width)

    return image


def values(count: int) -> Iterable[int]:
    return range(count + 1)


def morale_colour_for_bucket(value: int) -> str:
    fraction = value / MILITARY_MORALE_SEGMENTS
    if fraction >= 0.75:
        return MORALE_COLOURS["green"]
    if fraction >= 0.5:
        return MORALE_COLOURS["gold"]
    if fraction >= 0.25:
        return MORALE_COLOURS["amber"]
    return MORALE_COLOURS["red"]


def military_stack_tiles(relation_colour: str) -> Iterable[Image.Image]:
    for strength in values(MILITARY_STRENGTH_SEGMENTS):
        strength_layer = draw_segmented_ring(
            segments=MILITARY_STRENGTH_SEGMENTS,
            filled_segments=strength,
            gap_degrees=3.6,
            radius=45,
            stroke_width=6,
            fill_colour=relation_colour,
            include_separator=True,
        )

        for morale in values(MILITARY_MORALE_SEGMENTS):
            morale_layer = draw_segmented_ring(
                segments=MILITARY_MORALE_SEGMENTS,
                filled_segments=morale,
                gap_degrees=2.1,
                radius=37.5,
                stroke_width=4,
                fill_colour=morale_colour_for_bucket(morale),
            )
            yield composite_layers(strength_layer, morale_layer)


def settlement_stack_tiles() -> Iterable[Image.Image]:
    for kind, colour in SETTLEMENT_PROGRESS_COLOURS.items():
        for fortification in values(SETTLEMENT_FORTIFICATION_SEGMENTS):
            fortification_layer = draw_segmented_ring(
                segments=SETTLEMENT_FORTIFICATION_SEGMENTS,
                filled_segments=fortification,
                gap_degrees=5,
                radius=46,
                stroke_width=7,
                fill_colour="#d0c28a",
            )

            for progress in values(SETTLEMENT_PROGRESS_SEGMENTS):
                progress_layer = draw_progress_ring(
                    segments=SETTLEMENT_PROGRESS_SEGMENTS,
                    filled_segments=progress,
                    radius=37,
                    stroke_width=6,
                    fill_colour=colour,
                )
                yield composite_layers(fortification_layer, progress_layer)


def imperial_standing_stack_tiles() -> Iterable[Image.Image]:
    source_segment = extract_imperial_source_segment(
        min_angle=-121,
        max_angle=-59,
        min_radius=31,
        max_radius=47,
    )
    track_segment = extract_imperial_source_segment(
        min_angle=-124,
        max_angle=-56,
        min_radius=33,
        max_radius=50,
    )
    for colour in IMPERIAL_STANDING_COLOURS.values():
        for standing in values(IMPERIAL_STANDING_SEGMENTS):
            if source_segment is not None and track_segment is not None:
                yield draw_generated_imperial_standing_ring(
                    source_segment=source_segment,
                    track_segment=track_segment,
                    filled_segments=standing,
                    fill_colour=colour,
                )
            else:
                yield draw_imperial_standing_ring(
                    filled_segments=standing,
                    fill_colour=colour,
                )


def generate_imperial_standing_stack() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    target = OUT_DIR / "imperial-standing-ring-stack.png"
    if target.exists():
        target.unlink()

    write_sprite(
        "imperial-standing-ring-stack.png",
        imperial_standing_stack_tiles(),
        IMPERIAL_STACK_COLUMNS,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate packaged WebUI ring sprites.")
    parser.add_argument(
        "--imperial-only",
        action="store_true",
        help="Only regenerate the imperial standing topbar ring stack.",
    )
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.imperial_only:
        generate_imperial_standing_stack()
        return

    for prefix in ("military-", "settlement-"):
        for path in OUT_DIR.glob(f"{prefix}*.png"):
            path.unlink()

    for tone, colour in STRENGTH_COLOURS.items():
        write_sprite(
            f"military-ring-stack-{tone}.png",
            military_stack_tiles(colour),
            MILITARY_STACK_COLUMNS,
        )

    write_sprite(
        "settlement-ring-stack.png",
        settlement_stack_tiles(),
        SETTLEMENT_STACK_COLUMNS,
    )

    generate_imperial_standing_stack()


if __name__ == "__main__":
    main()
