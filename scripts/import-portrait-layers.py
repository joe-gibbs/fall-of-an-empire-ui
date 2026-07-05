#!/usr/bin/env python3
"""
Import UMG portrait layer source art into the WebUI public asset tree.

The source directory is a one-time import input. The WebUI dev server and
production build only read the generated PNGs under public/assets.

Usage:
    python scripts/import-portrait-layers.py --source "C:\\path\\to\\Portraits"
"""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from PIL import Image, ImageOps
import argparse
import os
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DESTINATION = ROOT / 'public' / 'assets' / 'portraits' / 'layers'
IMAGE_EXTS = {'.png', '.jpg', '.jpeg'}


@dataclass(frozen=True)
class ImportJob:
    source: Path
    destination: Path
    is_mask: bool
    max_size: tuple[int, int]


def has_transparency(img: Image.Image) -> bool:
    if 'A' in img.getbands():
        return img.getchannel('A').getextrema()[0] < 255
    return 'transparency' in img.info


def resize_image(img: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    width, height = img.size
    max_width, max_height = max_size
    if width <= max_width and height <= max_height:
        return img

    ratio = min(max_width / width, max_height / height)
    return img.resize((round(width * ratio), round(height * ratio)), Image.LANCZOS)


def convert_mask(img: Image.Image) -> Image.Image:
    if has_transparency(img):
        return img.convert('RGBA')

    alpha = img.convert('L')
    out = Image.new('RGBA', img.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def is_importable_image(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.suffix.lower() not in IMAGE_EXTS:
        return False
    return not path.stem.lower().endswith('_n')


def is_mask(rel: Path) -> bool:
    return 'mask' in rel.stem.lower()


def max_size_for(rel: Path) -> tuple[int, int]:
    if 'backgrounds' in rel.parts:
        return (800, 800)
    return (420, 420)


def build_jobs(source_root: Path, destination_root: Path) -> list[ImportJob]:
    jobs: list[ImportJob] = []
    for source in sorted(source_root.rglob('*')):
        if not is_importable_image(source):
            continue

        rel = source.relative_to(source_root)
        destination = destination_root / rel.with_suffix('.png')
        jobs.append(ImportJob(
            source=source,
            destination=destination,
            is_mask=is_mask(rel),
            max_size=max_size_for(rel),
        ))
    return jobs


def import_one(job: ImportJob) -> tuple[str, int, tuple[int, int], tuple[int, int]]:
    with Image.open(job.source) as src_img:
        src_img = ImageOps.exif_transpose(src_img)
        original_size = src_img.size
        if job.is_mask:
            img = convert_mask(src_img)
        else:
            img = src_img.convert('RGBA' if has_transparency(src_img) else 'RGB')

    img = resize_image(img, job.max_size)

    job.destination.parent.mkdir(parents=True, exist_ok=True)
    img.save(job.destination, 'PNG', optimize=True, compress_level=6)
    output_bytes = job.destination.stat().st_size
    output_size = img.size
    img.close()

    return job.destination.as_posix(), output_bytes, original_size, output_size


def resolve_destination(raw: str | None) -> Path:
    destination = Path(raw).resolve() if raw else DEFAULT_DESTINATION.resolve()
    required_parent = (ROOT / 'public' / 'assets' / 'portraits').resolve()
    if required_parent not in destination.parents and destination != required_parent:
        raise ValueError(f'Destination must stay under {required_parent}')
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, help='Raw Portraits source directory to import from.')
    parser.add_argument('--destination', help='Destination directory. Defaults to WebUI/public/assets/portraits/layers.')
    parser.add_argument('--clean', action='store_true', help='Remove the destination directory before importing.')
    parser.add_argument('--workers', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_root = Path(args.source).resolve()
    destination_root = resolve_destination(args.destination)

    if not source_root.exists() or not source_root.is_dir():
        print(f'Error: source directory not found: {source_root}')
        return 1

    if args.clean and destination_root.exists():
        required_parent = (ROOT / 'public' / 'assets' / 'portraits').resolve()
        if required_parent not in destination_root.parents:
            print(f'Error: refusing to clean outside {required_parent}')
            return 1
        shutil.rmtree(destination_root)

    jobs = build_jobs(source_root, destination_root)
    print(f'Importing {len(jobs)} portrait layer PNGs into {destination_root}')

    total_bytes = 0
    resized = 0
    completed = 0
    workers = max(1, args.workers)
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(import_one, job) for job in jobs]
        for future in as_completed(futures):
            try:
                _path, output_bytes, original_size, output_size = future.result()
            except Exception as exc:
                print(f'\nError: import failed: {exc}')
                return 1

            completed += 1
            total_bytes += output_bytes
            if original_size != output_size:
                resized += 1
            if completed % 250 == 0 or completed == len(jobs):
                print(f'  {completed}/{len(jobs)}')

    print(f'Imported: {completed}  Resized: {resized}  Size: {total_bytes / 1024 / 1024:.1f}MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
