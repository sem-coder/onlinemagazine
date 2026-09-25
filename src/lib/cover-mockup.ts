type Pt = { x: number; y: number };
type Tex = CanvasImageSource & { width: number; height: number };
type Quad = { tl: Pt; tr: Pt; br: Pt; bl: Pt };
export type MockupKind = "cover" | "open";

const TEMPLATE_SRC = "/mockups/brochure.jpg";
const TEMPLATE_W = 1024;
const TEMPLATE_H = 606;
const OUT_W = 1920;
const OUT_H = Math.round((OUT_W * TEMPLATE_H) / TEMPLATE_W);
const COLS = 42;
const ROWS = 30;

const COVER: Quad = {
  tl: { x: 158, y: 46 },
  tr: { x: 400, y: 74 },
  br: { x: 418, y: 476 },
  bl: { x: 112, y: 452 },
};

const STACK: Quad = {
  tl: { x: 400, y: 74 },
  tr: { x: 452, y: 78 },
  br: { x: 458, y: 478 },
  bl: { x: 418, y: 476 },
};

const LEFT: Quad = {
  tl: { x: 398, y: 90 },
  tr: { x: 546, y: 118 },
  br: { x: 558, y: 478 },
  bl: { x: 356, y: 508 },
};

const RIGHT: Quad = {
  tl: { x: 546, y: 118 },
  tr: { x: 805, y: 70 },
  br: { x: 874, y: 411 },
  bl: { x: 558, y: 478 },
};

const COVER_HIDE: Pt[] = [
  { x: 48, y: 6 },
  { x: 492, y: 12 },
  { x: 505, y: 86 },
  { x: 478, y: 518 },
  { x: 40, y: 518 },
];

const OPEN_HIDE: Pt[] = [
  { x: 396, y: 68 },
  { x: 838, y: 36 },
  { x: 918, y: 428 },
  { x: 572, y: 498 },
  { x: 328, y: 548 },
  { x: 328, y: 488 },
  { x: 418, y: 488 },
];

function scaleQuad(quad: Quad, sx: number, sy: number): Quad {
  const map = (p: Pt): Pt => ({ x: p.x * sx, y: p.y * sy });
  return { tl: map(quad.tl), tr: map(quad.tr), br: map(quad.br), bl: map(quad.bl) };
}

function solve(A: number[][], b: number[]) {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i += 1) {
    let pivot = i;
    for (let r = i + 1; r < n; r += 1) {
      if (Math.abs(m[r][i]) > Math.abs(m[pivot][i])) pivot = r;
    }
    [m[i], m[pivot]] = [m[pivot], m[i]];
    const div = m[i][i] || 1e-12;
    for (let c = i; c <= n; c += 1) m[i][c] /= div;
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const f = m[r][i];
      for (let c = i; c <= n; c += 1) m[r][c] -= f * m[i][c];
    }
  }
  return m.map((row) => row[n]);
}

function homography(dest: Quad) {
  const src = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const dst = [dest.tl, dest.tr, dest.br, dest.bl];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return [...h, 1];
}

function applyH(h: number[], x: number, y: number): Pt {
  const w = h[6] * x + h[7] * y + h[8] || 1e-12;
  return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w };
}

function paintPaperStack(ctx: CanvasRenderingContext2D, quad: Quad) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(quad.tl.x, quad.tl.y);
  ctx.lineTo(quad.tr.x, quad.tr.y);
  ctx.lineTo(quad.br.x, quad.br.y);
  ctx.lineTo(quad.bl.x, quad.bl.y);
  ctx.closePath();
  ctx.clip();
  const x0 = Math.min(quad.tl.x, quad.bl.x);
  const x1 = Math.max(quad.tr.x, quad.br.x);
  const y0 = Math.min(quad.tl.y, quad.tr.y);
  const y1 = Math.max(quad.bl.y, quad.br.y);
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
  gradient.addColorStop(0, "#ece7de");
  gradient.addColorStop(0.2, "#fbf8f2");
  gradient.addColorStop(0.48, "#e8e2d7");
  gradient.addColorStop(0.78, "#fffdf8");
  gradient.addColorStop(1, "#d9d2c6");
  ctx.fillStyle = gradient;
  ctx.fillRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12);
  ctx.strokeStyle = "rgba(120,110,95,0.28)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 7; i += 1) {
    const t = i / 8;
    const top = {
      x: quad.tl.x + (quad.tr.x - quad.tl.x) * t,
      y: quad.tl.y + (quad.tr.y - quad.tl.y) * t,
    };
    const bot = {
      x: quad.bl.x + (quad.br.x - quad.bl.x) * t,
      y: quad.bl.y + (quad.br.y - quad.bl.y) * t,
    };
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.stroke();
  }
  ctx.restore();
}

function scalePts(pts: Pt[], sx: number, sy: number) {
  return pts.map((p) => ({ x: p.x * sx, y: p.y * sy }));
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawTexturedQuad(ctx: CanvasRenderingContext2D, image: Tex, quad: Quad) {
  const { tl, tr, br, bl } = quad;
  const imgW = image.width;
  const imgH = image.height;
  const h = homography(quad);
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
  const padU = 1.2 / COLS;
  const padV = 1.2 / ROWS;
  for (let y = 0; y < ROWS; y += 1) {
    const v0 = Math.max(0, y / ROWS - padV);
    const v1 = Math.min(1, (y + 1) / ROWS + padV);
    for (let x = 0; x < COLS; x += 1) {
      const u0 = Math.max(0, x / COLS - padU);
      const u1 = Math.min(1, (x + 1) / COLS + padU);
      const p00 = applyH(h, u0, v0);
      const p10 = applyH(h, u1, v0);
      const p01 = applyH(h, u0, v1);
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

function shadePage(image: Tex, stops: Array<[number, string]>) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(image.width));
  canvas.height = Math.max(2, Math.round(image.height));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

function unionBox(quads: Quad[], pad: number) {
  const pts = quads.flatMap((quad) => [quad.tl, quad.tr, quad.br, quad.bl]);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.max(0, Math.min(...xs) - pad);
  const y = Math.max(0, Math.min(...ys) - pad);
  const r = Math.min(OUT_W, Math.max(...xs) + pad);
  const b = Math.min(OUT_H, Math.max(...ys) + pad);
  return { x, y, w: r - x, h: b - y };
}

function frameOnBlack(source: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }, outW: number, outH: number) {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, outW, outH);
  const scale = Math.min((outW * 0.78) / box.w, (outH * 0.82) / box.h);
  const dw = box.w * scale;
  const dh = box.h * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, box.x, box.y, box.w, box.h, (outW - dw) / 2, (outH - dh) / 2, dw, dh);
  return canvas;
}

async function loadTemplate() {
  const response = await fetch(TEMPLATE_SRC);
  if (!response.ok) throw new Error("Mockup-achtergrond ontbreekt.");
  const blob = await response.blob();
  return createImageBitmap(blob);
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

async function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG maken mislukt"))), "image/png");
  });
}

export async function renderCoverMockup(input: { pages: ImageBitmap[]; kind: MockupKind }) {
  const pages = input.pages;
  if (pages.length === 0) throw new Error("Geen pagina’s voor de mockup.");
  const template = await loadTemplate();
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(template, 0, 0, OUT_W, OUT_H);

  const sx = OUT_W / TEMPLATE_W;
  const sy = OUT_H / TEMPLATE_H;
  const coverQ = scaleQuad(COVER, sx, sy);
  const stackQ = scaleQuad(STACK, sx, sy);
  const leftQ = scaleQuad(LEFT, sx, sy);
  const rightQ = scaleQuad(RIGHT, sx, sy);
  const cover = pages[0];
  const left = pages[1] ?? cover;
  const right = pages[2] ?? pages[1] ?? cover;

  if (input.kind === "cover") {
    fillPoly(ctx, scalePts(OPEN_HIDE, sx, sy), "#000000");
    paintPaperStack(ctx, stackQ);
    drawTexturedQuad(
      ctx,
      shadePage(cover, [
        [0, "rgb(255,255,255)"],
        [0.8, "rgb(248,248,248)"],
        [1, "rgb(200,200,200)"],
      ]),
      coverQ,
    );
    template.close();
    const framed = frameOnBlack(canvas, unionBox([coverQ, stackQ], 120), 1600, 1600);
    return { canvas: framed, blob: await canvasPng(framed) };
  }

  fillPoly(ctx, scalePts(COVER_HIDE, sx, sy), "#000000");
  drawTexturedQuad(
    ctx,
    shadePage(left, [
      [0, "rgb(242,242,242)"],
      [0.82, "rgb(255,255,255)"],
      [1, "rgb(170,170,170)"],
    ]),
    leftQ,
  );
  drawTexturedQuad(
    ctx,
    shadePage(right, [
      [0, "rgb(155,155,155)"],
      [0.18, "rgb(215,215,215)"],
      [0.55, "rgb(255,255,255)"],
      [1, "rgb(238,238,238)"],
    ]),
    rightQ,
  );
  template.close();
  const framed = frameOnBlack(canvas, unionBox([leftQ, rightQ], 120), 1920, 1080);
  return { canvas: framed, blob: await canvasPng(framed) };
}

export async function downloadCoverMockup(input: { pages: ImageBitmap[]; filename: string; kind: MockupKind }) {
  const { blob } = await renderCoverMockup(input);
  downloadBlob(blob, `${input.filename}.png`);
}
