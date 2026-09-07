import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";
import { GIFEncoder, applyPalette, quantize } from "gifenc";

export type PromoFormat = "mp4" | "gif";

const BG = "#1b1d1c";
const HOLD_COVER = 1.15;
const HOLD_SPREAD = 0.8;
const HOLD_END = 1.45;
const FLIP = 0.62;

type Leaf = ImageBitmap | null;

type Scene =
  | { kind: "hold"; duration: number; left: Leaf; right: Leaf }
  | { kind: "flip"; duration: number; left: Leaf; from: Leaf; back: Leaf; nextRight: Leaf };

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function buildPromoScenes(pages: ImageBitmap[]): Scene[] {
  if (pages.length === 0) return [];
  const scenes: Scene[] = [{ kind: "hold", duration: HOLD_COVER, left: null, right: pages[0] }];
  let index = 0;
  while (index + 1 < pages.length) {
    const back = pages[index + 1] ?? null;
    const nextRight = pages[index + 2] ?? null;
    const left = index === 0 ? null : pages[index - 1] ?? null;
    scenes.push({
      kind: "flip",
      duration: FLIP,
      left,
      from: pages[index] ?? null,
      back,
      nextRight,
    });
    scenes.push({
      kind: "hold",
      duration: index + 2 >= pages.length - 1 ? HOLD_END : HOLD_SPREAD,
      left: back,
      right: nextRight,
    });
    index += 2;
  }
  if (scenes.length === 1) scenes[0] = { ...scenes[0], duration: HOLD_END };
  return scenes;
}

function bookRect(width: number, height: number, pageW: number, pageH: number) {
  const pad = Math.round(Math.min(width, height) * 0.09);
  const aspect = pageW / Math.max(pageH, 1);
  const maxH = height - pad * 2;
  const maxW = width - pad * 2;
  const leafH = Math.min(maxH, maxW / (aspect * 2));
  const leafW = leafH * aspect;
  const bookW = leafW * 2;
  const bookH = leafH;
  return {
    x: (width - bookW) / 2,
    y: (height - bookH) / 2,
    leafW,
    leafH,
    bookW,
    bookH,
  };
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  img: Leaf,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, w, h);
  if (img) ctx.drawImage(img, x, y, w, h);
}

function drawTurning(
  ctx: CanvasRenderingContext2D,
  img: Leaf,
  spineX: number,
  y: number,
  leafW: number,
  leafH: number,
  scaleX: number,
) {
  if (Math.abs(scaleX) < 0.02) return;
  ctx.save();
  ctx.translate(spineX, y);
  ctx.scale(scaleX, 1);
  drawLeaf(ctx, img, 0, 0, leafW, leafH);
  const shade = 0.32 * (1 - Math.abs(scaleX));
  ctx.fillStyle = `rgba(0,0,0,${shade})`;
  ctx.fillRect(0, 0, leafW, leafH);
  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, localT: number, width: number, height: number, pageW: number, pageH: number) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);
  const book = bookRect(width, height, pageW, pageH);
  const spine = book.x + book.leafW;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = Math.round(book.leafH * 0.08);
  ctx.shadowOffsetY = Math.round(book.leafH * 0.03);

  if (scene.kind === "hold") {
    if (scene.left) drawLeaf(ctx, scene.left, book.x, book.y, book.leafW, book.leafH);
    if (scene.right) drawLeaf(ctx, scene.right, spine, book.y, book.leafW, book.leafH);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(spine - 1, book.y, 2, book.leafH);
    ctx.restore();
    return;
  }

  const t = easeInOut(localT);
  const scaleX = Math.cos(t * Math.PI);
  if (scene.left) drawLeaf(ctx, scene.left, book.x, book.y, book.leafW, book.leafH);
  if (scene.nextRight) drawLeaf(ctx, scene.nextRight, spine, book.y, book.leafW, book.leafH);
  ctx.restore();

  if (scaleX >= 0) drawTurning(ctx, scene.from, spine, book.y, book.leafW, book.leafH, scaleX);
  else drawTurning(ctx, scene.back, spine, book.y, book.leafW, book.leafH, scaleX);
}

function sceneAt(scenes: Scene[], time: number) {
  let elapsed = 0;
  for (const scene of scenes) {
    if (time < elapsed + scene.duration) {
      return { scene, local: (time - elapsed) / scene.duration };
    }
    elapsed += scene.duration;
  }
  const last = scenes[scenes.length - 1];
  return { scene: last, local: 1 };
}

export function promoDuration(scenes: Scene[]) {
  return scenes.reduce((sum, scene) => sum + scene.duration, 0);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function encodeMp4(
  canvas: HTMLCanvasElement,
  draw: (time: number) => void,
  duration: number,
  fps: number,
  onProgress: (value: number) => void,
) {
  const format = new Mp4OutputFormat({ fastStart: "in-memory" });
  const supported = format.getSupportedVideoCodecs();
  const preferred = ["avc" as const, "hevc" as const, ...supported.filter((codec) => codec !== "avc" && codec !== "hevc")];
  const codec = await getFirstEncodableVideoCodec(preferred, {
    width: canvas.width,
    height: canvas.height,
    quality: QUALITY_HIGH,
  });
  if (!codec) throw new Error("Deze browser kan geen MP4 maken. Probeer Chrome, of download een GIF.");
  const target = new BufferTarget();
  const output = new Output({ format, target });
  const source = new CanvasSource(canvas, { codec, quality: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  const frames = Math.max(1, Math.round(duration * fps));
  const frameDur = 1 / fps;
  for (let i = 0; i < frames; i += 1) {
    draw(Math.min(duration, i / fps));
    await source.add(i * frameDur, frameDur, { keyFrame: i % fps === 0 });
    if (i % 6 === 0) {
      onProgress(i / frames);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }
  await output.finalize();
  if (!target.buffer) throw new Error("MP4 kon niet worden afgerond.");
  return new Blob([target.buffer], { type: "video/mp4" });
}

async function encodeGif(
  sourceCanvas: HTMLCanvasElement,
  draw: (time: number) => void,
  duration: number,
  onProgress: (value: number) => void,
) {
  const fps = 12;
  const size = 540;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  const gif = GIFEncoder();
  const frames = Math.max(1, Math.round(duration * fps));
  const delay = Math.round(1000 / fps);
  for (let i = 0; i < frames; i += 1) {
    draw(Math.min(duration, i / fps));
    ctx.drawImage(sourceCanvas, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const palette = quantize(data, 128, { format: "rgb444" });
    const index = applyPalette(data, palette, "rgb444");
    gif.writeFrame(index, size, size, { palette, delay, repeat: i === 0 ? 0 : undefined });
    if (i % 3 === 0) {
      onProgress(i / frames);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }
  gif.finish();
  const bytes = gif.bytes();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "image/gif" });
}

export async function downloadPromoClip(input: {
  pages: ImageBitmap[];
  pageWidth: number;
  pageHeight: number;
  filename: string;
  format: PromoFormat;
  onProgress?: (value: number) => void;
}) {
  const scenes = buildPromoScenes(input.pages);
  const duration = promoDuration(scenes);
  const size = input.format === "gif" ? 720 : 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  const draw = (time: number) => {
    const { scene, local } = sceneAt(scenes, time);
    drawScene(ctx, scene, local, size, size, input.pageWidth, input.pageHeight);
  };
  const report = input.onProgress ?? (() => undefined);
  const blob =
    input.format === "mp4"
      ? await encodeMp4(canvas, draw, duration, 30, report)
      : await encodeGif(canvas, draw, duration, report);
  downloadBlob(blob, `${input.filename}.${input.format}`);
}
