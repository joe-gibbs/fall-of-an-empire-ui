#!/usr/bin/env python3
"""
Post-build image optimisation for Fall of an Empire Web UI.
Runs after `vite build` and publishes optimised assets from public/assets/ to
UIResources/foae/assets/.

1. Resizes each image to its maximum 4K display size
2. Converts to WebP
3. Rewrites .png/.jpg references in built JS/CSS/HTML to .webp

Source files in public/ and src/ are never touched. Unchanged outputs are
restored from WebUI/.image-cache instead of re-optimised or re-copied.

At 4K (3840x2160) the base font clamp(11px, 0.68vw, 26px) = 26px, so 1rem = 26px.
All max sizes below are the largest pixel dimensions an image appears at on a 4K display.

Usage:
    python scripts/optimize-images.py              # optimise UIResources/foae/
    python scripts/optimize-images.py --dry-run    # preview without changes
    python scripts/optimize-images.py --seed-cache # cache existing optimised output
"""

from PIL import Image
from pathlib import Path
import hashlib
import json
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
SOURCE_PUBLIC = ROOT / 'public'
SOURCE_ASSETS = ROOT / 'public' / 'assets'
WEB_DIR = ROOT.parent / 'UIResources' / 'foae'
WEB_ASSETS = WEB_DIR / 'assets'
CACHE_DIR = ROOT / '.image-cache'
CACHE_ASSETS = CACHE_DIR / 'assets'
CACHE_MANIFEST = CACHE_DIR / 'manifest.json'

WEBP_DEFAULT_QUALITY = 88
WEBP_MEDIUM_QUALITY = 92
WEBP_LARGE_QUALITY = 95
CACHE_VERSION = 6

# ---- CSS cursor images must stay PNG (limited browser support for WebP cursors) ----
SKIP_FILES = {
    'cursor-default.png',
    'cursor-pointer.png',
    'cursor-grab.png',
    'cursor-default-48.png',
    'cursor-pointer-48.png',
    'cursor-grab-48.png',
}

# ---- Per-file overrides for root-level assets (directly in assets/) ----
# None = keep original dimensions (tiling textures, already tiny, etc.)
FILE_SIZES: dict[str, tuple[int, int] | None] = {
    # Full-screen backgrounds
    'main-menu-background.png':     (3840, 2160),
    'map-bg.png':                   (3840, 2160),
    # Large overlays
    'main-menu-logo.png':           (1024, 512),
    'main-menu-logo-normals.png':   (1024, 512),
    'event-border.png':             (832, 416),   # event popup overlay
    'event-mask.png':               (832, 416),   # event popup mask
    'event-painting-effect.png':    (832, 416),
    # World maps
    'world-map.png':                (1024, 1024),
    'world-map-index.png':          (1024, 1024),
    'world-map-painted.jpg':        (1024, 1024),
    # Notifications (tiling)
    'notification-bg.png':          None,
    'notification-edge.png':        None,
    'notification-seal.png':        (64, 64),
    # Small tiling textures
    'bar-gold.png':                 None,
    'bar-green.png':                None,
    'bar-red.png':                  None,
    'bar-track.png':                None,
    'chart-bevel.png':              None,
    'chart-noise.png':              None,
    'chart-ring-overlay.png':       None,
    'chart-sep.png':                None,
    'gold-frame.png':               None,  # 9-slice border-image
    'gold-line.png':                None,  # tiling rule line
    'lozenge.png':                  None,  # tiny ornament
    'meander.png':                  None,  # tiling pattern
    'grunge.png':                   None,
    'grunge-soft.png':              None,
    'noise-light.png':              None,
    'noise-heavy.png':              None,
    'modifier-frame.png':           None,
    'modifier-frame-negative.png':  None,
    'modifier-frame-positive.png':  None,
    'I_MainCursor.png':             None,
    'I_PointerCursor.png':          None,
}

# ---- Per-directory max bounding box (width, height) ----
# Most-specific path wins.  None = convert only, keep dimensions.
DIR_SIZES: dict[str, tuple[int, int] | None] = {
    # Character portraits: hero = 14rem * 115% ~= 420px
    'portraits':                        (420, 420),
    'portraits/backgrounds':            (800, 800),   # behind hero in 29rem sidebar
    # Event illustrations: popup 32rem x 14rem = 832x364
    'events':                           (832, 416),
    # Trait medallions: displayed at 2rem = 52px
    'traits':                           (64, 64),
    # Culture/religion roundels: max 3rem = 78px
    'cultures':                         (96, 96),
    'religions':                        (96, 96),
    # Faction heraldry: roundel xl 5.5rem = 143px
    'factions':                         (192, 192),
    # Leader portraits: portrait xl 7.4rem = 192px
    'leaders':                          (256, 256),
    # Unit portraits: battle slot 128px, tall aspect ratio
    'units':                            (192, 384),
    'units/Rephsian':                   (192, 384),
    # World glance plates and radial progress widgets
    'glance':                           None,
    # Tiny health bar textures
    'slate':                            None,
    # Icons: default 128px with per-subdir overrides
    'icons':                            (128, 128),
    'icons/Armies':                     (128, 128),
    'icons/Compliance':                 (128, 128),
    'icons/Courtiers':                  (256, 512),
    'icons/Cultures':                   (96, 96),
    'icons/Diplomacy':                  (128, 128),
    'icons/Flags':                      (128, 64),
    'icons/FormationStance':            (64, 64),
    'icons/Gifts':                      (128, 128),
    'icons/MainMenu':                   (384, 144),
    'icons/Models':                     (128, 128),
    'icons/Relations':                  (64, 64),
    'icons/Religions':                  (96, 96),
    'icons/Resources':                  (128, 128),
    'icons/Seasons':                    (64, 64),
    'icons/Siege':                      (384, 210),
    'icons/Socials':                    (48, 48),
    'icons/StatIcons':                  (64, 64),
    'icons/Terrain':                    (128, 128),
    'icons/Tiers':                      (128, 128),
    'icons/Treaties':                   (128, 128),
    'icons/UnitTypes':                  (128, 128),
    'icons/Victory':                    (128, 128),
    # HUD game textures
    'loading-screens':                  (3840, 2160),
    'hud':                              None,
    'hud/Components/CharacterPortrait': (420, 420),
    'hud/Components/Notifications':     (256, 256),
    'hud/Components/Tutorial':          (256, 256),
    'hud/Screens/Battle':               (512, 256),
    'hud/Screens/CharacterSelector':    (512, 512),
    'hud/Screens/Faction':              (512, 512),
    'hud/Sidebars':                     (256, 256),
    'hud/Sidebars/Character':           (256, 256),
    # UI panel/card textures -- varied sizes, convert only
    'baked':                            None,
    'ui':                               None,
    'ui-shadowed':                      None,
    'ui-shadowed/ArmySidebar':          None,
}

# ---- Extra prefiltered variants for images that are drawn very small ----
# FoaeCefUI's runtime minification is rough on detailed UI icons.  These
# variants are generated from the original source images using Pillow's
# offline resampler, then selected by components that know their display size.
SIZED_VARIANT_BUCKETS: dict[str, tuple[int, ...]] = {
    'icons': (16, 24, 32, 48, 64, 96, 128, 192, 256),
}


# ---------------------------------------------------------------------------
# Image processing
# ---------------------------------------------------------------------------

def get_asset_relpath(filepath: Path) -> Path:
    """Return an asset path relative to either source or built assets."""
    try:
        return filepath.relative_to(WEB_ASSETS)
    except ValueError:
        pass
    try:
        return filepath.relative_to(SOURCE_ASSETS)
    except ValueError:
        return filepath.relative_to(SOURCE_ASSETS)


def get_max_size(filepath: Path) -> tuple[int, int] | None:
    """Determine the max display size for a given image file."""
    rel = get_asset_relpath(filepath)
    name = filepath.name

    if len(rel.parts) >= 2 and rel.parts[0] == 'portraits' and rel.parts[1] == 'layers':
        if 'backgrounds' in rel.parts:
            return (800, 800)
        return (420, 420)

    # Per-file override (root-level files only)
    if str(rel.parent) == '.' and name in FILE_SIZES:
        return FILE_SIZES[name]

    # Walk directory rules from most-specific to least-specific
    rel_dir = str(rel.parent).replace('\\', '/')
    parts = rel_dir.split('/')
    for depth in range(len(parts), 0, -1):
        key = '/'.join(parts[:depth])
        if key in DIR_SIZES:
            return DIR_SIZES[key]

    return None


def get_sized_variant_sizes(rel: Path) -> tuple[int, ...]:
    """Return extra square bounding-box variants to publish for an asset."""
    if not rel.parts:
        return ()
    if rel.parts[0] == 'icons' and len(rel.parts) >= 2 and rel.parts[1] != '__sizes':
        return SIZED_VARIANT_BUCKETS['icons']
    return ()


def sized_variant_relpath(rel: Path, size: int) -> Path:
    """Return the published asset-relative path for a sized variant."""
    if not rel.parts:
        return Path('__sizes') / str(size) / rel
    if len(rel.parts) == 1:
        return Path('__sizes') / str(size) / rel.name
    return Path(rel.parts[0]) / '__sizes' / str(size) / Path(*rel.parts[1:])


def resize_image(img: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    """Downscale to fit within max_size bounding box.  Never upscales."""
    w, h = img.size
    new_size = resized_dimensions((w, h), max_size)
    if new_size == (w, h):
        return img
    return img.resize(new_size, Image.LANCZOS)


def resize_premultiplied_alpha(img: Image.Image, new_size: tuple[int, int]) -> Image.Image:
    """Resize RGBA content without colour bleeding through transparent pixels."""
    rgba = img.convert('RGBA')
    premultiplied = Image.new('RGBA', rgba.size)
    premultiplied.putdata([
        (
            round(r * a / 255),
            round(g * a / 255),
            round(b * a / 255),
            a,
        )
        for r, g, b, a in rgba.getdata()
    ])

    resized = premultiplied.resize(new_size, Image.LANCZOS)
    out = Image.new('RGBA', new_size)
    out.putdata([
        (
            0 if a == 0 else min(255, round(r * 255 / a)),
            0 if a == 0 else min(255, round(g * 255 / a)),
            0 if a == 0 else min(255, round(b * 255 / a)),
            a,
        )
        for r, g, b, a in resized.getdata()
    ])
    return out


def resize_sized_variant_image(img: Image.Image, max_size: tuple[int, int], has_alpha: bool) -> Image.Image:
    """Resize a small variant, using alpha-safe filtering for icon art."""
    new_size = resized_dimensions(img.size, max_size)
    if new_size == img.size:
        return img.copy()
    if has_alpha:
        return resize_premultiplied_alpha(img, new_size)
    return img.resize(new_size, Image.LANCZOS)


def resized_dimensions(size: tuple[int, int], max_size: tuple[int, int] | None) -> tuple[int, int]:
    """Return the post-optimisation dimensions without opening the full output."""
    if max_size is None:
        return size
    max_w, max_h = max_size
    w, h = size
    if w <= max_w and h <= max_h:
        return size
    ratio = min(max_w / w, max_h / h)
    return round(w * ratio), round(h * ratio)


def has_transparency(img: Image.Image) -> bool:
    """Return whether an image carries alpha, including paletted PNG transparency."""
    if 'A' in img.getbands():
        alpha = img.getchannel('A')
        return alpha.getextrema()[0] < 255
    return 'transparency' in img.info


def is_portrait_face_mask_rel(rel: Path) -> bool:
    parts = rel.parts
    return (
        len(parts) >= 2
        and parts[0] == 'portraits'
        and parts[1] == 'layers'
        and 'mask' in rel.stem.lower()
    )


def convert_luminance_to_alpha_mask(img: Image.Image) -> Image.Image:
    if has_transparency(img):
        return img.convert('RGBA')

    alpha = img.convert('L')
    out = Image.new('RGBA', img.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def get_webp_policy(rel: Path, output_size: tuple[int, int], has_alpha: bool) -> dict:
    """Choose WebP encoding by asset family and final pixel area."""
    first_part = rel.parts[0] if rel.parts else ''
    if first_part == 'baked':
        return {'encoding': 'lossless'}
    if first_part == 'glance':
        return {'encoding': 'lossless'}

    area = output_size[0] * output_size[1]
    if has_alpha and area < 128 * 128:
        return {'encoding': 'lossless'}
    if area >= 1024 * 1024:
        return {'encoding': 'lossy', 'quality': WEBP_LARGE_QUALITY}
    if area >= 256 * 256:
        return {'encoding': 'lossy', 'quality': WEBP_MEDIUM_QUALITY}
    return {'encoding': 'lossy', 'quality': WEBP_DEFAULT_QUALITY}


def copy_file_if_changed(source: Path, destination: Path, dry_run: bool = False) -> bool:
    """Copy source to destination only when the output is absent or stale."""
    source_stat = source.stat()
    if destination.exists():
        try:
            dest_stat = destination.stat()
            if (
                dest_stat.st_size == source_stat.st_size
                and dest_stat.st_mtime_ns == source_stat.st_mtime_ns
            ):
                return False
            if (
                dest_stat.st_size == source_stat.st_size
                and hash_file(destination) == hash_file(source)
            ):
                return False
        except OSError:
            pass

    if not dry_run:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    return True


def copy_static_assets(dry_run: bool = False) -> int:
    """Copy non-converted public assets, such as cursor PNGs and audio files."""
    copied = 0
    source_exts = {'.png', '.jpg', '.jpeg'}
    for source_path in sorted(SOURCE_ASSETS.rglob('*')):
        if not source_path.is_file():
            continue
        rel = source_path.relative_to(SOURCE_ASSETS)
        should_copy_raw = source_path.suffix.lower() not in source_exts or source_path.name in SKIP_FILES
        if not should_copy_raw:
            continue
        if copy_file_if_changed(source_path, WEB_ASSETS / rel, dry_run):
            copied += 1
    return copied


def copy_public_files(dry_run: bool = False) -> int:
    """Copy public files outside assets/ after Vite's public copy is disabled."""
    copied = 0
    for source_path in sorted(SOURCE_PUBLIC.rglob('*')):
        if not source_path.is_file():
            continue
        rel = source_path.relative_to(SOURCE_PUBLIC)
        if rel.parts and rel.parts[0] == 'assets':
            continue
        if copy_file_if_changed(source_path, WEB_DIR / rel, dry_run):
            copied += 1
    return copied


def parse_only_paths() -> tuple[str, ...]:
    """Return optional asset-relative paths to process, from repeated --only args."""
    paths: list[str] = []
    index = 0
    while index < len(sys.argv):
        arg = sys.argv[index]
        value = ''
        if arg == '--only' and index + 1 < len(sys.argv):
            index += 1
            value = sys.argv[index]
        elif arg.startswith('--only='):
            value = arg.split('=', 1)[1]

        value = value.replace('\\', '/').strip('/')
        if value:
            paths.append(value)
        index += 1
    return tuple(paths)


def matches_only_paths(rel: Path, only_paths: tuple[str, ...]) -> bool:
    if not only_paths:
        return True

    key = rel.as_posix()
    for only_path in only_paths:
        if key == only_path or key.startswith(f'{only_path}/'):
            return True
    return False


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

def hash_file(filepath: Path) -> str:
    """Return a content hash for cache validation."""
    digest = hashlib.sha256()
    with filepath.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def load_cache_manifest() -> dict[str, dict]:
    """Load the optimisation cache manifest if it matches this cache version."""
    if not CACHE_MANIFEST.exists():
        return {}
    try:
        data = json.loads(CACHE_MANIFEST.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return {}
    if data.get('version') != CACHE_VERSION:
        return {}
    images = data.get('images')
    return images if isinstance(images, dict) else {}


def save_cache_manifest(images: dict[str, dict]) -> None:
    """Persist the optimisation cache manifest."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        'version': CACHE_VERSION,
        'webpQuality': {
            'default': WEBP_DEFAULT_QUALITY,
            'medium': WEBP_MEDIUM_QUALITY,
            'large': WEBP_LARGE_QUALITY,
        },
        'images': images,
    }
    tmp_path = CACHE_MANIFEST.with_suffix('.tmp')
    tmp_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding='utf-8')
    tmp_path.replace(CACHE_MANIFEST)


def cache_output_path(rel_key: str) -> Path:
    return CACHE_ASSETS / Path(rel_key).with_suffix('.webp')


def cache_resize_key(max_size: tuple[int, int] | None) -> list[int] | None:
    return [max_size[0], max_size[1]] if max_size is not None else None


def cache_entry_matches(
    entry: dict | None,
    source_hash: str,
    source_bytes: int,
    source_suffix: str,
    max_size: tuple[int, int] | None,
    webp_policy: dict,
) -> bool:
    if not entry:
        return False
    return (
        entry.get('sourceHash') == source_hash
        and entry.get('sourceBytes') == source_bytes
        and entry.get('sourceSuffix') == source_suffix.lower()
        and entry.get('resize') == cache_resize_key(max_size)
        and entry.get('webp') == webp_policy
    )


def cache_entry_can_reuse_source(
    entry: dict | None,
    source_bytes: int,
    source_suffix: str,
    max_size: tuple[int, int] | None,
) -> bool:
    """Return whether a cache entry still matches non-content inputs."""
    if not entry:
        return False
    return (
        entry.get('sourceBytes') == source_bytes
        and entry.get('sourceSuffix') == source_suffix.lower()
        and entry.get('resize') == cache_resize_key(max_size)
        and 'origDim' in entry
        and 'newDim' in entry
        and 'outputBytes' in entry
    )


def cached_output_available(entry: dict | None, cache_path: Path) -> bool:
    """Return whether the optimised cache file exists and matches the manifest."""
    if not entry:
        return False
    try:
        return cache_path.exists() and cache_path.stat().st_size == entry.get('outputBytes')
    except OSError:
        return False


def published_output_matches_cache(entry: dict, cache_path: Path, out_path: Path) -> bool:
    """Return whether the already-published output is the cached file."""
    try:
        out_stat = out_path.stat()
        cache_stat = cache_path.stat()
    except OSError:
        return False

    return (
        out_stat.st_size == entry.get('outputBytes')
        and out_stat.st_size == cache_stat.st_size
        and out_stat.st_mtime_ns == cache_stat.st_mtime_ns
    )


def restore_cached_output(entry: dict, cache_path: Path, out_path: Path, dry_run: bool) -> bool:
    """Publish a cached output unless the existing file is already current."""
    if dry_run or published_output_matches_cache(entry, cache_path, out_path):
        return False

    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(cache_path, out_path)
    return True


def build_cache_entry(
    source_hash: str,
    source_bytes: int,
    source_mtime_ns: int,
    source_suffix: str,
    max_size: tuple[int, int] | None,
    webp_policy: dict,
    orig_dim: tuple[int, int],
    new_dim: tuple[int, int],
    new_bytes: int,
) -> dict:
    return {
        'sourceHash': source_hash,
        'sourceBytes': source_bytes,
        'sourceMtimeNs': source_mtime_ns,
        'sourceSuffix': source_suffix.lower(),
        'resize': cache_resize_key(max_size),
        'webp': webp_policy,
        'origDim': [orig_dim[0], orig_dim[1]],
        'newDim': [new_dim[0], new_dim[1]],
        'outputBytes': new_bytes,
    }


def seed_cache_from_existing_outputs(manifest: dict[str, dict]) -> tuple[int, int]:
    """Prime the cache from an already optimised Content/uiresources/foae build."""
    if not SOURCE_ASSETS.exists() or not WEB_ASSETS.exists():
        return 0, 0

    source_exts = {'.png', '.jpg', '.jpeg'}
    source_files = sorted(
        f for f in SOURCE_ASSETS.rglob('*')
        if f.is_file() and f.suffix.lower() in source_exts and f.name not in SKIP_FILES
    )

    seeded = 0
    reused = 0
    for source_path in source_files:
        rel = source_path.relative_to(SOURCE_ASSETS)
        rel_key = rel.as_posix()
        built_webp = (WEB_ASSETS / rel).with_suffix('.webp')
        if not built_webp.exists():
            continue

        source_stat = source_path.stat()
        source_hash = hash_file(source_path)
        source_bytes = source_stat.st_size
        max_size = get_max_size(WEB_ASSETS / rel)
        cache_path = cache_output_path(rel_key)
        with Image.open(source_path) as src_img:
            orig_dim = src_img.size
            source_has_transparency = has_transparency(src_img)
        expected_dim = resized_dimensions(orig_dim, max_size)
        webp_policy = get_webp_policy(rel, expected_dim, source_has_transparency)

        if (
            cache_entry_matches(
                manifest.get(rel_key),
                source_hash,
                source_bytes,
                source_path.suffix,
                max_size,
                webp_policy,
            )
            and cache_path.exists()
            and cache_path.stat().st_size == manifest[rel_key].get('outputBytes')
        ):
            reused += 1
            continue

        with Image.open(built_webp) as out_img:
            new_dim = out_img.size

        cache_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(built_webp, cache_path)
        new_bytes = cache_path.stat().st_size
        manifest[rel_key] = build_cache_entry(
            source_hash,
            source_bytes,
            source_stat.st_mtime_ns,
            source_path.suffix,
            max_size,
            webp_policy,
            orig_dim,
            new_dim,
            new_bytes,
        )
        seeded += 1

    return seeded, reused


def process_image(filepath: Path, manifest: dict[str, dict], dry_run: bool = False) -> dict:
    """Resize and convert one image to WebP.  Returns a stats dict."""
    if filepath.name in SKIP_FILES:
        return {'skipped': True, 'reason': 'cursor'}

    source_stat = filepath.stat()
    original_bytes = source_stat.st_size
    source_hash: str | None = None
    source_suffix = filepath.suffix.lower()
    rel = get_asset_relpath(filepath)
    rel_key = rel.as_posix()
    max_size = get_max_size(filepath)
    out_path = (WEB_ASSETS / rel).with_suffix('.webp')
    cache_path = cache_output_path(rel_key)
    entry = manifest.get(rel_key)

    if (
        cache_entry_can_reuse_source(entry, original_bytes, source_suffix, max_size)
        and cached_output_available(entry, cache_path)
    ):
        source_matches_entry = entry.get('sourceMtimeNs') == source_stat.st_mtime_ns
        if not source_matches_entry:
            source_hash = hash_file(filepath)
            source_matches_entry = source_hash == entry.get('sourceHash')
            if source_matches_entry:
                entry['sourceMtimeNs'] = source_stat.st_mtime_ns

        if source_matches_entry:
            restore_cached_output(entry, cache_path, out_path, dry_run)
            return {
                'skipped': False,
                'cached': True,
                'orig_dim': tuple(entry['origDim']),
                'new_dim': tuple(entry['newDim']),
                'orig_bytes': original_bytes,
                'new_bytes': entry['outputBytes'],
            }

    with Image.open(filepath) as src_img:
        orig_dim = src_img.size
        source_has_transparency = has_transparency(src_img) or is_portrait_face_mask_rel(rel)

    new_dim = resized_dimensions(orig_dim, max_size)
    webp_policy = get_webp_policy(rel, new_dim, source_has_transparency)
    if source_hash is None:
        source_hash = hash_file(filepath)

    if (
        cache_entry_matches(
            entry,
            source_hash,
            original_bytes,
            source_suffix,
            max_size,
            webp_policy,
        )
        and cache_path.exists()
        and cache_path.stat().st_size == entry.get('outputBytes')
    ):
        entry['sourceMtimeNs'] = source_stat.st_mtime_ns
        restore_cached_output(entry, cache_path, out_path, dry_run)
        return {
            'skipped': False,
            'cached': True,
            'orig_dim': tuple(entry['origDim']),
            'new_dim': tuple(entry['newDim']),
            'orig_bytes': original_bytes,
            'new_bytes': entry['outputBytes'],
        }

    with Image.open(filepath) as src_img:
        if is_portrait_face_mask_rel(rel):
            img = convert_luminance_to_alpha_mask(src_img)
        else:
            img = src_img.copy()

    if source_has_transparency and img.mode != 'RGBA':
        img = img.convert('RGBA')

    if max_size is not None:
        img = resize_image(img, max_size)

    if dry_run:
        return {
            'skipped': False,
            'cached': False,
            'orig_dim': orig_dim,
            'new_dim': img.size,
            'orig_bytes': original_bytes,
        }

    out_path.parent.mkdir(parents=True, exist_ok=True)

    if img.mode not in ('RGB', 'RGBA'):
        img = img.convert('RGBA' if source_has_transparency else 'RGB')

    if webp_policy['encoding'] == 'lossless':
        img.save(out_path, 'WEBP', lossless=True, method=4)
    else:
        img.save(out_path, 'WEBP', quality=webp_policy['quality'], method=4)

    new_dim = img.size
    img.close()
    new_bytes = out_path.stat().st_size

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_path, cache_path)
    manifest[rel_key] = build_cache_entry(
        source_hash,
        original_bytes,
        source_stat.st_mtime_ns,
        source_suffix,
        max_size,
        webp_policy,
        orig_dim,
        new_dim,
        new_bytes,
    )

    return {
        'skipped': False,
        'cached': False,
        'orig_dim': orig_dim,
        'new_dim': new_dim,
        'orig_bytes': original_bytes,
        'new_bytes': new_bytes,
    }


def process_sized_variant(
    filepath: Path,
    rel: Path,
    size: int,
    manifest: dict[str, dict],
    dry_run: bool = False,
) -> dict:
    """Publish one prefiltered size variant for a small UI image."""
    if filepath.name in SKIP_FILES:
        return {'skipped': True, 'reason': 'cursor'}

    source_stat = filepath.stat()
    original_bytes = source_stat.st_size
    source_hash: str | None = None
    source_suffix = filepath.suffix.lower()
    variant_rel = sized_variant_relpath(rel, size)
    rel_key = variant_rel.as_posix()
    max_size = (size, size)
    out_path = (WEB_ASSETS / variant_rel).with_suffix('.webp')
    cache_path = cache_output_path(rel_key)
    entry = manifest.get(rel_key)

    with Image.open(filepath) as src_img:
        orig_dim = src_img.size
        source_has_transparency = has_transparency(src_img) or is_portrait_face_mask_rel(rel)

    new_dim = resized_dimensions(orig_dim, max_size)
    webp_policy = (
        {'encoding': 'lossless'}
        if source_has_transparency
        else get_webp_policy(variant_rel, new_dim, source_has_transparency)
    )

    if dry_run:
        return {
            'skipped': False,
            'cached': False,
            'orig_dim': orig_dim,
            'new_dim': new_dim,
            'orig_bytes': original_bytes,
        }

    if (
        cache_entry_can_reuse_source(entry, original_bytes, source_suffix, max_size)
        and entry.get('webp') == webp_policy
        and cached_output_available(entry, cache_path)
    ):
        source_matches_entry = entry.get('sourceMtimeNs') == source_stat.st_mtime_ns
        if not source_matches_entry:
            source_hash = hash_file(filepath)
            source_matches_entry = source_hash == entry.get('sourceHash')
            if source_matches_entry:
                entry['sourceMtimeNs'] = source_stat.st_mtime_ns

        if source_matches_entry:
            restore_cached_output(entry, cache_path, out_path, dry_run)
            return {
                'skipped': False,
                'cached': True,
                'orig_dim': tuple(entry['origDim']),
                'new_dim': tuple(entry['newDim']),
                'orig_bytes': original_bytes,
                'new_bytes': entry['outputBytes'],
            }

    if source_hash is None:
        source_hash = hash_file(filepath)

    if (
        cache_entry_matches(
            entry,
            source_hash,
            original_bytes,
            source_suffix,
            max_size,
            webp_policy,
        )
        and cache_path.exists()
        and cache_path.stat().st_size == entry.get('outputBytes')
    ):
        entry['sourceMtimeNs'] = source_stat.st_mtime_ns
        restore_cached_output(entry, cache_path, out_path, dry_run)
        return {
            'skipped': False,
            'cached': True,
            'orig_dim': tuple(entry['origDim']),
            'new_dim': tuple(entry['newDim']),
            'orig_bytes': original_bytes,
            'new_bytes': entry['outputBytes'],
        }

    with Image.open(filepath) as src_img:
        if is_portrait_face_mask_rel(rel):
            img = convert_luminance_to_alpha_mask(src_img)
        else:
            img = src_img.copy()

    if source_has_transparency and img.mode != 'RGBA':
        img = img.convert('RGBA')

    img = resize_sized_variant_image(img, max_size, source_has_transparency)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    if img.mode not in ('RGB', 'RGBA'):
        img = img.convert('RGBA' if source_has_transparency else 'RGB')

    if webp_policy['encoding'] == 'lossless':
        img.save(out_path, 'WEBP', lossless=True, method=4)
    else:
        img.save(out_path, 'WEBP', quality=webp_policy['quality'], method=4)

    new_dim = img.size
    img.close()
    new_bytes = out_path.stat().st_size

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_path, cache_path)
    manifest[rel_key] = build_cache_entry(
        source_hash,
        original_bytes,
        source_stat.st_mtime_ns,
        source_suffix,
        max_size,
        webp_policy,
        orig_dim,
        new_dim,
        new_bytes,
    )

    return {
        'skipped': False,
        'cached': False,
        'orig_dim': orig_dim,
        'new_dim': new_dim,
        'orig_bytes': original_bytes,
        'new_bytes': new_bytes,
    }


# ---------------------------------------------------------------------------
# Rewrite references in built output files
# ---------------------------------------------------------------------------

# Cursor stems that must stay .png
_CURSOR_STEMS = {
    'cursor-default',
    'cursor-pointer',
    'cursor-grab',
    'cursor-default-48',
    'cursor-pointer-48',
    'cursor-grab-48',
}


def _is_cursor_ref(path_str: str) -> bool:
    """Check if an asset path refers to a cursor file."""
    # e.g. /assets/cursor-pointer.png or ./assets/cursor-default.png
    basename = path_str.rsplit('/', 1)[-1] if '/' in path_str else path_str
    stem = basename.rsplit('.', 1)[0] if '.' in basename else basename
    return stem in _CURSOR_STEMS


def rewrite_built_refs():
    """Replace .png/.jpg asset references with .webp in built output files."""
    exts_to_scan = {'.js', '.css', '.html'}

    # Matches full static paths like /assets/traits/Brave.png
    static_pattern = re.compile(r'([\w/.\-]+)\.(png|jpe?g)', re.IGNORECASE)
    # Matches template-literal suffixes like }.png` (from `${expr}.png`)
    template_pattern = re.compile(r'(\})\.(png|jpe?g)(`)', re.IGNORECASE)

    changed_files = 0
    for fpath in WEB_DIR.rglob('*'):
        if fpath.suffix.lower() not in exts_to_scan:
            continue
        text = fpath.read_text(encoding='utf-8', errors='replace')
        if '.png' not in text and '.jpg' not in text and '.jpeg' not in text:
            continue

        def replace_static_ref(match: re.Match) -> str:
            full_match = match.group(0)
            if _is_cursor_ref(full_match):
                return full_match
            return f'{match.group(1)}.webp'

        new_text = static_pattern.sub(replace_static_ref, text)
        new_text = template_pattern.sub(r'\1.webp\3', new_text)

        if new_text != text:
            fpath.write_text(new_text, encoding='utf-8')
            changed_files += 1

    return changed_files


def expected_published_asset_path(source_path: Path) -> Path:
    """Return the path the optimiser should publish for a public asset."""
    rel = get_asset_relpath(source_path)
    source_exts = {'.png', '.jpg', '.jpeg'}
    if source_path.suffix.lower() in source_exts and source_path.name not in SKIP_FILES:
        return (WEB_ASSETS / rel).with_suffix('.webp')
    return WEB_ASSETS / rel


def expected_published_asset_paths(source_path: Path) -> list[Path]:
    """Return every path the optimiser should publish for a public asset."""
    paths = [expected_published_asset_path(source_path)]
    source_exts = {'.png', '.jpg', '.jpeg'}
    if source_path.suffix.lower() not in source_exts or source_path.name in SKIP_FILES:
        return paths

    rel = get_asset_relpath(source_path)
    paths.extend(
        (WEB_ASSETS / sized_variant_relpath(rel, size)).with_suffix('.webp')
        for size in get_sized_variant_sizes(rel)
    )
    return paths


def prune_stale_published_assets() -> int:
    """Remove published public assets that no longer exist in public/assets."""
    expected = {
        expected_path.relative_to(WEB_ASSETS).as_posix()
        for source_path in SOURCE_ASSETS.rglob('*')
        if source_path.is_file()
        for expected_path in expected_published_asset_paths(source_path)
    }
    public_output_exts = {'.webp', '.png', '.jpg', '.jpeg', '.ttf', '.wav'}
    removed = 0

    for output_path in sorted(WEB_ASSETS.rglob('*'), reverse=True):
        if output_path.is_dir():
            try:
                output_path.rmdir()
            except OSError:
                pass
            continue
        rel = output_path.relative_to(WEB_ASSETS).as_posix()
        if rel in expected or output_path.suffix.lower() not in public_output_exts:
            continue
        output_path.unlink()
        removed += 1

    return removed


def verify_published_assets(only_paths: tuple[str, ...]) -> int:
    """Fail the build if a source asset did not reach UIResources."""
    missing: list[str] = []
    checked = 0

    for source_path in sorted(SOURCE_ASSETS.rglob('*')):
        if not source_path.is_file():
            continue

        rel = source_path.relative_to(SOURCE_ASSETS)
        if not matches_only_paths(rel, only_paths):
            continue

        expected_paths = expected_published_asset_paths(source_path)
        checked += len(expected_paths)
        for expected in expected_paths:
            if not expected.exists():
                missing.append(expected.relative_to(WEB_DIR).as_posix())

    if missing:
        print('\nError: WebUI asset publish is incomplete.')
        for rel in missing[:40]:
            print(f'  Missing: {rel}')
        if len(missing) > 40:
            print(f'  ...and {len(missing) - 40} more')
        sys.exit(1)

    return checked


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    dry_run = '--dry-run' in sys.argv
    seed_cache = '--seed-cache' in sys.argv
    only_paths = parse_only_paths()

    if not SOURCE_PUBLIC.exists():
        print(f'Error: {SOURCE_PUBLIC} not found.')
        sys.exit(1)
    if not SOURCE_ASSETS.exists():
        print(f'Error: {SOURCE_ASSETS} not found.')
        sys.exit(1)

    manifest = load_cache_manifest()

    if seed_cache:
        seeded, reused = seed_cache_from_existing_outputs(manifest)
        save_cache_manifest(manifest)
        print(f'--- Image optimisation cache ---')
        print(f'Seeded: {seeded}  Already cached: {reused}')
        return

    if dry_run:
        print('=== DRY RUN (no files will be modified) ===\n')
    else:
        WEB_ASSETS.mkdir(parents=True, exist_ok=True)

    copied_public = 0 if only_paths else copy_public_files(dry_run)
    copied_static = 0 if only_paths else copy_static_assets(dry_run)

    # Find all images
    image_exts = {'.png', '.jpg', '.jpeg'}
    files = sorted(
        f for f in SOURCE_ASSETS.rglob('*')
        if f.is_file() and f.suffix.lower() in image_exts
        and matches_only_paths(f.relative_to(SOURCE_ASSETS), only_paths)
    )
    if only_paths:
        print(f'Found {len(files)} selected images in public assets\n')
    else:
        print(f'Found {len(files)} images in public assets\n')

    total_orig = 0
    total_new = 0
    processed = 0
    cached = 0
    skipped = 0
    resized = 0
    variant_processed = 0
    variant_cached = 0
    variant_resized = 0
    pruned = 0

    for fp in files:
        rel = get_asset_relpath(fp)
        r = process_image(fp, manifest, dry_run)

        if r['skipped']:
            skipped += 1
            continue

        if r.get('cached'):
            cached += 1
        else:
            processed += 1
        total_orig += r['orig_bytes']
        ow, oh = r['orig_dim']
        nw, nh = r['new_dim']
        did_resize = (ow, oh) != (nw, nh)
        if did_resize:
            resized += 1

        if dry_run:
            dim = f'{ow}x{oh}'
            if did_resize:
                dim += f' -> {nw}x{nh}'
            print(f'  {rel}: {r["orig_bytes"]/1024:.0f}KB  {dim}')
        else:
            total_new += r['new_bytes']
            if not r.get('cached'):
                pct = (1 - r['new_bytes'] / r['orig_bytes']) * 100 if r['orig_bytes'] else 0
                dim = f'{ow}x{oh}'
                if did_resize:
                    dim += f' -> {nw}x{nh}'
                print(f'  {rel}: {r["orig_bytes"]/1024:.0f}KB -> {r["new_bytes"]/1024:.0f}KB ({pct:.0f}%)  {dim}')

        for size in get_sized_variant_sizes(rel):
            vr = process_sized_variant(fp, rel, size, manifest, dry_run)
            if vr['skipped']:
                continue
            if vr.get('cached'):
                variant_cached += 1
            else:
                variant_processed += 1
            vow, voh = vr['orig_dim']
            vnw, vnh = vr['new_dim']
            if (vow, voh) != (vnw, vnh):
                variant_resized += 1

    if not dry_run and not only_paths:
        pruned = prune_stale_published_assets()

    print(f'\n--- Image optimisation ---')
    print(f'Processed: {processed}  Cached: {cached}  Skipped: {skipped}  Static copied: {copied_static}  Public copied: {copied_public}  Resized: {resized}  Pruned: {pruned}')
    print(f'Sized variants: {variant_processed}  Cached: {variant_cached}  Resized: {variant_resized}')
    if not dry_run and total_orig:
        pct = (1 - total_new / total_orig) * 100
        print(f'Size: {total_orig/1024/1024:.1f}MB -> {total_new/1024/1024:.1f}MB  ({pct:.0f}% reduction)')
        save_cache_manifest(manifest)

    # Rewrite references in built JS/CSS/HTML
    if not dry_run:
        print(f'\n--- Rewriting references in {WEB_DIR.relative_to(ROOT.parent)}/ ---')
        nf = rewrite_built_refs()
        print(f'Updated {nf} files')

        print(f'\n--- Verifying published assets ---')
        checked = verify_published_assets(only_paths)
        print(f'Verified {checked} assets')


if __name__ == '__main__':
    main()
