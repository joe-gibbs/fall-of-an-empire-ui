import type { BattlefieldHeightPointDetail } from '../../../bridge-types.generated.ts';

const HEIGHT_IMAGE_SIZE = 512;
const HEIGHT_CONTOUR_THRESHOLDS = [0.24, 0.38, 0.52, 0.66, 0.8] as const;

interface RgbColour {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
interface RgbaColour extends RgbColour {
  a: number;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_CRC_TABLE = (() => {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function heightColour(height: number, slope: number): RgbColour {
  const clampedHeight = clamp(height, 0, 1);
  const clampedSlope = clamp(slope, 0, 1);

  if (clampedHeight < 0.18) return { r: Math.round(48 + clampedSlope * 10), g: Math.round(78 + clampedSlope * 8), b: Math.round(72 + clampedSlope * 10) };
  if (clampedHeight < 0.38) return { r: Math.round(73 + clampedSlope * 10), g: Math.round(86 + clampedSlope * 8), b: Math.round(56 + clampedSlope * 8) };
  if (clampedHeight > 0.82) return { r: Math.round(148 + clampedSlope * 12), g: Math.round(126 + clampedSlope * 10), b: Math.round(86 + clampedSlope * 10) };
  if (clampedHeight > 0.62) return { r: Math.round(119 + clampedSlope * 12), g: Math.round(100 + clampedSlope * 10), b: Math.round(66 + clampedSlope * 8) };
  return { r: Math.round(98 + clampedSlope * 10), g: Math.round(88 + clampedSlope * 8), b: Math.round(58 + clampedSlope * 8) };
}

function heightOpacity(height: number, slope: number): number {
  return clamp(0.24 + Math.abs(height - 0.5) * 0.22 + slope * 0.08, 0.18, 0.48);
}

function contourColour(threshold: number): RgbColour {
  if (threshold < 0.28) return { r: 42, g: 62, b: 58 };
  if (threshold > 0.72) return { r: 75, g: 55, b: 34 };
  return { r: 75, g: 64, b: 42 };
}

function heightMapValue(
  heightMap: BattlefieldHeightPointDetail[],
  columns: number,
  rows: number,
  column: number,
  row: number,
): BattlefieldHeightPointDetail {
  const safeColumn = Math.max(0, Math.min(columns - 1, column));
  const safeRow = Math.max(0, Math.min(rows - 1, row));
  return heightMap[safeRow * columns + safeColumn] ?? { height: 0.5, slope: 0 };
}

function sampleHeightMap(
  heightMap: BattlefieldHeightPointDetail[],
  columns: number,
  rows: number,
  x: number,
  y: number,
): { height: number; slope: number } {
  if (heightMap.length === 0 || columns <= 1 || rows <= 1) {
    return { height: 0.5, slope: 0 };
  }

  const gridX = clamp(x, 0, 1) * (columns - 1);
  const gridY = clamp(y, 0, 1) * (rows - 1);
  const left = Math.floor(gridX);
  const top = Math.floor(gridY);
  const right = Math.min(columns - 1, left + 1);
  const bottom = Math.min(rows - 1, top + 1);
  const alphaX = gridX - left;
  const alphaY = gridY - top;

  const topLeft = heightMapValue(heightMap, columns, rows, left, top);
  const topRight = heightMapValue(heightMap, columns, rows, right, top);
  const bottomLeft = heightMapValue(heightMap, columns, rows, left, bottom);
  const bottomRight = heightMapValue(heightMap, columns, rows, right, bottom);

  const topHeight = topLeft.height + (topRight.height - topLeft.height) * alphaX;
  const bottomHeight = bottomLeft.height + (bottomRight.height - bottomLeft.height) * alphaX;
  const topSlope = topLeft.slope + (topRight.slope - topLeft.slope) * alphaX;
  const bottomSlope = bottomLeft.slope + (bottomRight.slope - bottomLeft.slope) * alphaX;

  return {
    height: topHeight + (bottomHeight - topHeight) * alphaY,
    slope: topSlope + (bottomSlope - topSlope) * alphaY,
  };
}

function heightBandBoundaryColour(height: number, slope: number): RgbColour | null {
  for (const threshold of HEIGHT_CONTOUR_THRESHOLDS) {
    const boundaryWidth = 0.0045 + clamp(slope, 0, 1) * 0.0025;
    if (Math.abs(height - threshold) <= boundaryWidth) {
      return contourColour(threshold);
    }
  }

  return null;
}

function heightPixelColour(height: number, slope: number): RgbaColour {
  const boundaryColour = heightBandBoundaryColour(height, slope);
  const colour = boundaryColour ?? heightColour(height, slope);

  return {
    ...colour,
    a: Math.round(clamp(heightOpacity(height, slope) + (boundaryColour ? 0.1 : 0), 0, 0.62) * 255),
  };
}

function appendBytes(target: number[], source: readonly number[]): void {
  for (let index = 0; index < source.length; index += 1) {
    target.push(source[index] & 0xff);
  }
}

function appendUInt32BE(target: number[], value: number): void {
  target.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function pngTypeBytes(type: string): number[] {
  return [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)];
}

function crc32(bytes: readonly number[]): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = PNG_CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: readonly number[]): number[] {
  const typeBytes = pngTypeBytes(type);
  const crcBytes: number[] = [];
  appendBytes(crcBytes, typeBytes);
  appendBytes(crcBytes, data);

  const chunk: number[] = [];
  appendUInt32BE(chunk, data.length);
  appendBytes(chunk, typeBytes);
  appendBytes(chunk, data);
  appendUInt32BE(chunk, crc32(crcBytes));
  return chunk;
}

function adler32(bytes: readonly number[]): number {
  let a = 1;
  let b = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    a = (a + bytes[index]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStore(bytes: readonly number[]): number[] {
  const output = [0x78, 0x01];
  let offset = 0;

  while (offset < bytes.length) {
    const blockLength = Math.min(65535, bytes.length - offset);
    const finalBlock = offset + blockLength >= bytes.length;
    const inverseLength = (~blockLength) & 0xffff;

    output.push(finalBlock ? 0x01 : 0x00);
    output.push(blockLength & 0xff, (blockLength >>> 8) & 0xff);
    output.push(inverseLength & 0xff, (inverseLength >>> 8) & 0xff);

    for (let index = 0; index < blockLength; index += 1) {
      output.push(bytes[offset + index] & 0xff);
    }

    offset += blockLength;
  }

  appendUInt32BE(output, adler32(bytes));
  return output;
}

function bytesToBase64(bytes: readonly number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const second = hasSecond ? bytes[index + 1] : 0;
    const third = hasThird ? bytes[index + 2] : 0;

    result += alphabet[first >>> 2];
    result += alphabet[((first & 0x03) << 4) | (second >>> 4)];
    result += hasSecond ? alphabet[((second & 0x0f) << 2) | (third >>> 6)] : '=';
    result += hasThird ? alphabet[third & 0x3f] : '=';
  }

  return result;
}

function buildPngDataUrl(width: number, height: number, rgbaScanlines: readonly number[]): string {
  const ihdr: number[] = [];
  appendUInt32BE(ihdr, width);
  appendUInt32BE(ihdr, height);
  ihdr.push(8, 6, 0, 0, 0);

  const pngBytes: number[] = [];
  appendBytes(pngBytes, PNG_SIGNATURE);
  appendBytes(pngBytes, pngChunk('IHDR', ihdr));
  appendBytes(pngBytes, pngChunk('IDAT', zlibStore(rgbaScanlines)));
  appendBytes(pngBytes, pngChunk('IEND', []));

  return `data:image/png;base64,${bytesToBase64(pngBytes)}`;
}

export function buildHeightMapDataUrl(
  heightMap: BattlefieldHeightPointDetail[],
  columns: number,
  rows: number,
): string {
  if (heightMap.length === 0 || columns <= 0 || rows <= 0) {
    return '';
  }

  const imageSize = HEIGHT_IMAGE_SIZE;
  const maxIndex = imageSize - 1;
  const rgbaScanlines: number[] = [];

  for (let y = 0; y < imageSize; y += 1) {
    rgbaScanlines.push(0);
    for (let x = 0; x < imageSize; x += 1) {
      const sampled = sampleHeightMap(heightMap, columns, rows, x / maxIndex, y / maxIndex);
      const pixel = heightPixelColour(sampled.height, sampled.slope);
      rgbaScanlines.push(pixel.r, pixel.g, pixel.b, pixel.a);
    }
  }

  return buildPngDataUrl(imageSize, imageSize, rgbaScanlines);
}


