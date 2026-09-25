type Pt = { x: number; y: number };
type Vec3 = { x: number; y: number; z: number };
type Quad = { tl: Vec3; tr: Vec3; br: Vec3; bl: Vec3 };
type Tex = CanvasImageSource & { width: number; height: number };

const BG = "#050505";
const WIDTH = 1920;
const HEIGHT = 1080;
const COLS = 40;
const ROWS = 28;

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function bilinear(tl: Pt, tr: Pt, br: Pt, bl: Pt, u: number, v: number): Pt {
  return lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
}

function rotX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function rotY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function project(p: Vec3): Pt {
  const depth = 3.55 - p.z;
  const f = 2.55;
  return { x: (p.x * f) / depth, y: (-p.y * f) / depth };
}

function mapPage(local: Vec3, open: number, pitch: number, yaw: number, origin: Vec3): Vec3 {
  return add(rotY(rotX(rotY(local, open), pitch), yaw), origin);
}

function pageQuad(width: number, height: number, x0: number, x1: number, open: number, pitch: number, yaw: number, origin: Vec3): Quad {
  const y0 = height / 2;
  const y1 = -height / 2;
  const corner = (x: number, y: number): Vec3 => mapPage({ x, y, z: 0 }, open, pitch, yaw, origin);
  return {
    tl: corner(x0, y0),
    tr: corner(x1, y0),
    br: corner(x1, y1),
    bl: corner(x0, y1),
  };
}

function screenQuad(quad: Quad, fit: (p: Pt) => Pt) {
  return {
    tl: fit(project(quad.tl)),
    tr: fit(project(quad.tr)),
    br: fit(project(quad.br)),
    bl: fit(project(quad.bl)),
  };
}

function makeFitter(points: Pt[], width: number, height: number, pad: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const scale = Math.min((width - pad * 2) / Math.max(0.01, maxX - minX), (height - pad * 2) / Math.max(0.01, maxY - minY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return (p: Pt): Pt => ({
    x: width / 2 + (p.x - cx) * scale,
    y: height / 2 + (p.y - cy) * scale,
  });
}

function drawTexturedQuad(ctx: CanvasRenderingContext2D, image: Tex, tl: Pt, tr: Pt, br: Pt, bl: Pt) {
  const imgW = image.width;
  const imgH = image.height;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const padU = 1.15 / COLS;
  const padV = 1.15 / ROWS;
  for (let y = 0; y < ROWS; y += 1) {
    const v0 = Math.max(0, y / ROWS - padV);
    const v1 = Math.min(1, (y + 1) / ROWS + padV);
    for (let x = 0; x < COLS; x += 1) {
      const u0 = Math.max(0, x / COLS - padU);
      const u1 = Math.min(1, (x + 1) / COLS + padU);
      const p00 = bilinear(tl, tr, br, bl, u0, v0);
      const p10 = bilinear(tl, tr, br, bl, u1, v0);
      const p01 = bilinear(tl, tr, br, bl, u0, v1);
      const sx = u0 * imgW;
      const sy = v0 * imgH;
      const sw = Math.max(1, (u1 - u0) * imgW);
      const sh = Math.max(1, (v1 - v0) * imgH);
      ctx.save();
      ctx.setTransform((p10.x - p00.x) / sw, (p10.y - p00.y) / sw, (p01.x - p00.x) / sh, (p01.y - p00.y) / sh, p00.x, p00.y);
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
      ctx.restore();
    }
  }
  ctx.restore();
}

function fillQuad(ctx: CanvasRenderingContext2D, tl: Pt, tr: Pt, br: Pt, bl: Pt, fill: string) {
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function gradientTex(horizontal: boolean, stops: Array<[number, string]>) {
  const canvas = document.createElement("canvas");
  canvas.width = horizontal ? 256 : 1;
  canvas.height = horizontal ? 1 : 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  const gradient = horizontal ? ctx.createLinearGradient(0, 0, 256, 0) : ctx.createLinearGradient(0, 0, 0, 256);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function shadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha: number) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function shadedTexture(image: Tex, shade: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(image.width));
  canvas.height = Math.max(2, Math.round(image.height));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(shade, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

function drawPage(
  ctx: CanvasRenderingContext2D,
  image: Tex | null,
  screen: { tl: Pt; tr: Pt; br: Pt; bl: Pt },
  shade: HTMLCanvasElement,
  paper = "#f3efe8",
) {
  fillQuad(ctx, screen.tl, screen.tr, screen.br, screen.bl, paper);
  if (!image) return;
  drawTexturedQuad(ctx, shadedTexture(image, shade), screen.tl, screen.tr, screen.br, screen.bl);
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

export async function renderCoverMockup(input: {
  pages: ImageBitmap[];
  pageWidth: number;
  pageHeight: number;
}) {
  const pages = input.pages;
  if (pages.length === 0) throw new Error("Geen pagina’s voor de mockup.");
  const aspect = input.pageWidth / Math.max(input.pageHeight, 1);
  const height = 1.18;
  const width = height * Math.min(Math.max(aspect, 0.62), 0.9);
  const cover = pages[0];
  const leftInner = pages[1] ?? null;
  const rightInner = pages[2] ?? pages[1] ?? null;
  const showSpread = Boolean(leftInner || rightInner);

  const coverOrigin = { x: showSpread ? -0.82 : 0, y: 0.02, z: 0.32 };
  const spreadOrigin = { x: 0.58, y: 0, z: 0.1 };
  const coverPitch = 0.05;
  const coverYaw = -0.2;
  const spreadPitch = 0.14;
  const spreadYaw = 0.08;
  const leftOpen = 0.5;
  const rightOpen = -0.56;

  const coverPage = pageQuad(width, height, 0, width, 0, coverPitch, coverYaw, coverOrigin);
  const coverStack = pageQuad(width, height, width, width + 0.028, 0, coverPitch, coverYaw, coverOrigin);
  const leftPage = pageQuad(width, height, -width, 0, leftOpen, spreadPitch, spreadYaw, spreadOrigin);
  const rightPage = pageQuad(width, height, 0, width, rightOpen, spreadPitch, spreadYaw, spreadOrigin);

  const world = showSpread
    ? [coverPage, coverStack, leftPage, rightPage]
    : [coverPage, coverStack];
  const projected: Pt[] = [];
  for (const quad of world) {
    projected.push(project(quad.tl), project(quad.tr), project(quad.br), project(quad.bl));
  }
  const fit = makeFitter(projected, WIDTH, HEIGHT, showSpread ? 96 : 160);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const coverScreen = screenQuad(coverPage, fit);
  const stackScreen = screenQuad(coverStack, fit);
  const leftScreen = showSpread ? screenQuad(leftPage, fit) : null;
  const rightScreen = showSpread ? screenQuad(rightPage, fit) : null;

  if (leftScreen && rightScreen) {
    const mid = lerp(leftScreen.bl, rightScreen.br, 0.55);
    shadow(ctx, mid.x, mid.y + 36, 340, 70, 0.55);
  }
  shadow(ctx, (coverScreen.bl.x + coverScreen.br.x) / 2, Math.max(coverScreen.bl.y, coverScreen.br.y) + 28, 220, 52, 0.62);

  const coverShade = gradientTex(true, [
    [0, "rgb(255,255,255)"],
    [0.72, "rgb(236,236,236)"],
    [1, "rgb(168,168,168)"],
  ]);
  const leftShade = gradientTex(true, [
    [0, "rgb(210,210,210)"],
    [0.55, "rgb(255,255,255)"],
    [1, "rgb(118,118,118)"],
  ]);
  const rightShade = gradientTex(true, [
    [0, "rgb(96,96,96)"],
    [0.18, "rgb(170,170,170)"],
    [0.55, "rgb(255,255,255)"],
    [1, "rgb(230,230,230)"],
  ]);

  if (leftScreen) drawPage(ctx, leftInner, leftScreen, leftShade);
  if (rightScreen) drawPage(ctx, rightInner, rightScreen, rightShade);
  if (leftScreen && rightScreen) {
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo((leftScreen.tr.x + rightScreen.tl.x) / 2, (leftScreen.tr.y + rightScreen.tl.y) / 2);
    ctx.lineTo((leftScreen.br.x + rightScreen.bl.x) / 2, (leftScreen.br.y + rightScreen.bl.y) / 2);
    ctx.stroke();
  }

  fillQuad(ctx, stackScreen.tl, stackScreen.tr, stackScreen.br, stackScreen.bl, "#d8d2c8");
  const stackInner = screenQuad(
    pageQuad(width, height, width + 0.006, width + 0.022, 0, coverPitch, coverYaw, coverOrigin),
    fit,
  );
  fillQuad(ctx, stackInner.tl, stackInner.tr, stackInner.br, stackInner.bl, "#f7f4ee");
  drawPage(ctx, cover, coverScreen, coverShade, "#fff");

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG maken mislukt"))), "image/png");
  });
  return { canvas, blob };
}

export async function downloadCoverMockup(input: {
  pages: ImageBitmap[];
  pageWidth: number;
  pageHeight: number;
  filename: string;
}) {
  const { blob } = await renderCoverMockup(input);
  downloadBlob(blob, `${input.filename}.png`);
}
