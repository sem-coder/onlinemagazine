import { PageFlip } from "page-flip";
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
const HOLD_COVER = 1.05;
const HOLD_SPREAD = 0.72;
const HOLD_END = 1.35;
const FLIP_MS = 900;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function frame() {
  return new Promise<number>((resolve) => requestAnimationFrame(resolve));
}

function bookSize(pageW: number, pageH: number, stage: number) {
  const pad = Math.round(stage * 0.1);
  const aspect = pageW / Math.max(pageH, 1);
  const maxH = stage - pad * 2;
  const maxW = stage - pad * 2;
  let leafH = Math.floor(Math.min(maxH, maxW / (aspect * 2)));
  if (leafH % 2) leafH -= 1;
  let leafW = Math.floor(leafH * aspect);
  if (leafW % 2) leafW -= 1;
  return { leafW: Math.max(2, leafW), leafH: Math.max(2, leafH) };
}

async function bitmapUrls(pages: ImageBitmap[]) {
  const urls: string[] = [];
  for (const page of pages) {
    const canvas = document.createElement("canvas");
    canvas.width = page.width;
    canvas.height = page.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas niet beschikbaar");
    ctx.drawImage(page, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Pagina exporteren mislukt"))), "image/jpeg", 0.92);
    });
    urls.push(URL.createObjectURL(blob));
  }
  return urls;
}

async function preload(urls: string[]) {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Pagina kon niet worden geladen."));
          image.src = src;
        }),
    ),
  );
}

function paintBook(out: CanvasRenderingContext2D, src: HTMLCanvasElement, size: number) {
  out.fillStyle = BG;
  out.fillRect(0, 0, size, size);
  const x = (size - src.width) / 2;
  const y = (size - src.height) / 2;
  out.save();
  out.shadowColor = "rgba(0,0,0,0.55)";
  out.shadowBlur = Math.round(src.height * 0.06);
  out.shadowOffsetY = Math.round(src.height * 0.025);
  out.drawImage(src, x, y);
  out.restore();
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

function gifBlob(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "image/gif" });
}

async function recordPromo(
  pages: ImageBitmap[],
  pageW: number,
  pageH: number,
  format: PromoFormat,
  onProgress: (value: number) => void,
) {
  const size = format === "gif" ? 720 : 1080;
  const { leafW, leafH } = bookSize(pageW, pageH, size);
  const urls = await bitmapUrls(pages);
  const host = document.createElement("div");
  host.className = "promo-flip-host";
  host.style.width = `${leafW * 2}px`;
  host.style.height = `${leafH}px`;
  document.body.appendChild(host);

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d", { alpha: false, willReadFrequently: format === "gif" });
  if (!ctx) throw new Error("Canvas niet beschikbaar");

  let book: PageFlip | null = null;
  try {
    await preload(urls);
    book = new PageFlip(host, {
      width: leafW,
      height: leafH,
      size: "fixed",
      drawShadow: true,
      flippingTime: FLIP_MS,
      usePortrait: false,
      autoSize: false,
      maxShadowOpacity: 0.55,
      showCover: true,
      useMouseEvents: false,
      showPageCorners: false,
      mobileScrollSupport: false,
    });
    await new Promise<void>((resolve) => {
      book?.on("init", () => resolve());
      book?.loadFromImages(urls);
    });
    await wait(250);
    const src = host.querySelector("canvas");
    if (!src) throw new Error("Flipbook-canvas ontbreekt.");
    src.width = leafW * 2;
    src.height = leafH;
    book.update();
    await wait(80);

    let hideCoverLeft = true;
    const paint = () => {
      paintBook(ctx, src, size);
      if (!hideCoverLeft) return;
      const x = (size - src.width) / 2;
      const y = (size - src.height) / 2;
      ctx.fillStyle = BG;
      ctx.fillRect(x, y, Math.ceil(src.width / 2), src.height);
    };
    paint();

    const wrapFlip = (flip: () => Promise<void>) => async () => {
      hideCoverLeft = false;
      await flip();
    };

    if (format === "mp4") {
      return await encodeMp4FromBook(out, paint, book, wrapFlip, onProgress);
    }
    return await encodeGifFromBook(out, paint, book, wrapFlip, onProgress);
  } finally {
    try {
      book?.destroy();
    } catch {
      /* ignore */
    }
    host.remove();
    for (const url of urls) URL.revokeObjectURL(url);
  }
}

async function waitForFlip() {
  await wait(FLIP_MS + 60);
}

async function playTurns(book: PageFlip, onHold: (seconds: number) => Promise<void>, onFlip: () => Promise<void>, onProgress: (value: number) => void) {
  const total = book.getPageCount();
  const flips = Math.max(0, Math.min(5, Math.ceil((total - 1) / 2)));
  const steps = flips * 2 + 1;
  let step = 0;
  const mark = () => {
    step += 1;
    onProgress(step / steps);
  };

  await onHold(HOLD_COVER);
  mark();
  for (let i = 0; i < flips; i += 1) {
    if (book.getCurrentPageIndex() >= total - 1) break;
    await onFlip();
    mark();
    await onHold(i === flips - 1 ? HOLD_END : HOLD_SPREAD);
    mark();
  }
}

async function encodeMp4FromBook(
  canvas: HTMLCanvasElement,
  paint: () => void,
  book: PageFlip,
  wrapFlip: (flip: () => Promise<void>) => () => Promise<void>,
  onProgress: (value: number) => void,
) {
  const fps = 30;
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
  let time = 0;

  const add = async (duration: number) => {
    paint();
    await source.add(time, duration, { keyFrame: time < 0.05 || Math.round(time * fps) % fps === 0 });
    time += duration;
  };

  await playTurns(
    book,
    (seconds) => add(seconds),
    wrapFlip(async () => {
      const start = time;
      const t0 = performance.now();
      let last = 0;
      const turning = waitForFlip();
      book.flipNext("bottom");
      while (performance.now() - t0 < FLIP_MS + 120) {
        await frame();
        const elapsed = (performance.now() - t0) / 1000;
        if (elapsed - last < 1 / fps - 0.002) continue;
        paint();
        await source.add(start + last, elapsed - last);
        last = elapsed;
      }
      await turning;
      time = start + Math.max(last, FLIP_MS / 1000);
    }),
    onProgress,
  );

  await output.finalize();
  if (!target.buffer) throw new Error("MP4 kon niet worden afgerond.");
  return new Blob([target.buffer], { type: "video/mp4" });
}

async function encodeGifFromBook(
  canvas: HTMLCanvasElement,
  paint: () => void,
  book: PageFlip,
  wrapFlip: (flip: () => Promise<void>) => () => Promise<void>,
  onProgress: (value: number) => void,
) {
  const gif = GIFEncoder();
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  let first = true;

  const write = (delay: number) => {
    paint();
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 160, { format: "rgb444" });
    const index = applyPalette(data, palette, "rgb444");
    gif.writeFrame(index, width, height, { palette, delay, repeat: first ? 0 : undefined });
    first = false;
  };

  await playTurns(
    book,
    async (seconds) => {
      write(Math.round(seconds * 1000));
      await wait(20);
    },
    wrapFlip(async () => {
      const t0 = performance.now();
      let last = 0;
      const turning = waitForFlip();
      book.flipNext("bottom");
      while (performance.now() - t0 < FLIP_MS + 120) {
        await frame();
        const elapsed = performance.now() - t0;
        if (elapsed - last < 70) continue;
        write(Math.round(elapsed - last));
        last = elapsed;
      }
      await turning;
    }),
    onProgress,
  );

  gif.finish();
  return gifBlob(gif.bytes());
}

export async function downloadPromoClip(input: {
  pages: ImageBitmap[];
  pageWidth: number;
  pageHeight: number;
  filename: string;
  format: PromoFormat;
  onProgress?: (value: number) => void;
}) {
  const blob = await recordPromo(input.pages, input.pageWidth, input.pageHeight, input.format, input.onProgress ?? (() => undefined));
  downloadBlob(blob, `${input.filename}.${input.format}`);
}
