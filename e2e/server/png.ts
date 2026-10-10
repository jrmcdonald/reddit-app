/**
 * Plain placeholder images, drawn without any image library: a card is a
 * coloured panel with a darker art box, its colour taken from the card's id
 * so each card looks different and the same every run.
 */
import { crc32, deflateSync } from 'node:zlib';

type Rgb = [number, number, number];

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** An 8-bit RGB PNG whose pixels come from `paint(x, y)`. */
export function encodePng(width: number, height: number, paint: (x: number, y: number) => Rgb) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      const at = y * stride + 1 + x * 3;
      raw[at] = r;
      raw[at + 1] = g;
      raw[at + 2] = b;
    }
  }
  return encodeRaw(width, height, raw);
}

/** A PNG from rows already laid out: each a filter byte (0), then RGB triples. */
function encodeRaw(width: number, height: number, raw: Buffer) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A stable, mid-dark colour for a string. */
export function colourFor(key: string): Rgb {
  const hue = crc32(key) % 360;
  const [r, g, b] = hslToRgb(hue / 360, 0.45, 0.42);
  return [r, g, b];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    const v =
      u < 1 / 6
        ? p + (q - p) * 6 * u
        : u < 1 / 2
          ? q
          : u < 2 / 3
            ? p + (q - p) * (2 / 3 - u) * 6
            : p;
    return Math.round(v * 255);
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

const darker = ([r, g, b]: Rgb, by: number): Rgb => [r * by, g * by, b * by].map(Math.round) as Rgb;

/**
 * A photo-shaped placeholder: a sky in the key's colour over two ranges of
 * darker hills, so feeds and the swiper look like pictures, not blocks.
 */
export function photoPlaceholder(key: string, width: number, height: number): Buffer {
  const sky = colourFor(key);
  const near = darker(sky, 0.45);
  const far = darker(sky, 0.7);
  const pale = sky.map((c) => Math.min(255, Math.round(c + (255 - c) * 0.35))) as Rgb;
  const seed = (crc32(key) % 1000) / 1000;
  // Where each column's hills start, worked out once per column. The
  // pictures are large, and the simulator waits for them.
  const farTop = new Float64Array(width);
  const nearTop = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const u = x / width;
    farTop[x] =
      (0.55 + 0.08 * Math.sin((u + seed) * 7) + 0.04 * Math.sin((u + seed) * 19)) * height;
    nearTop[x] =
      (0.72 + 0.1 * Math.sin((u + seed * 2) * 4) + 0.03 * Math.sin((u + seed) * 23)) * height;
  }
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      const f = farTop[x] as number;
      const colour =
        y > (nearTop[x] as number) ? near : y > f ? far : y > f - 0.15 * height ? pale : sky;
      const at = row + 1 + x * 3;
      raw[at] = colour[0];
      raw[at + 1] = colour[1];
      raw[at + 2] = colour[2];
    }
  }
  return encodeRaw(width, height, raw);
}

/** A round icon placeholder for a subreddit or account. */
export function iconPlaceholder(key: string): Buffer {
  const size = 128;
  const fill = colourFor(`icon-${key}`);
  const r = size / 2;
  return encodePng(size, size, (x, y) =>
    (x - r) ** 2 + (y - r) ** 2 < (r * 0.92) ** 2 ? fill : [255, 255, 255],
  );
}
