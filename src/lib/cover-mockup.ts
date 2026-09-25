type Pt = { x: number; y: number };
type Tex = CanvasImageSource & { width: number; height: number };
type Quad = { tl: Pt; tr: Pt; br: Pt; bl: Pt };

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

export async function renderCoverMockup(input: { pages: ImageBitmap[] }) {
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
  const leftQ = scaleQuad(LEFT, sx, sy);
  const rightQ = scaleQuad(RIGHT, sx, sy);

  const cover = pages[0];
  const left = pages[1] ?? cover;
  const right = pages[2] ?? pages[1] ?? cover;

  drawTexturedQuad(
    ctx,
    shadePage(left, [
      [0, "rgb(245,245,245)"],
      [0.82, "rgb(255,255,255)"],
      [1, "rgb(168,168,168)"],
    ]),
    leftQ,
  );
  drawTexturedQuad(
    ctx,
    shadePage(right, [
      [0, "rgb(150,150,150)"],
      [0.16, "rgb(210,210,210)"],
      [0.55, "rgb(255,255,255)"],
      [1, "rgb(236,236,236)"],
    ]),
    rightQ,
  );
  drawTexturedQuad(
    ctx,
    shadePage(cover, [
      [0, "rgb(255,255,255)"],
      [0.78, "rgb(245,245,245)"],
      [1, "rgb(196,196,196)"],
    ]),
    coverQ,
  );

  template.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG maken mislukt"))), "image/png");
  });
  return { canvas, blob };
}

export async function downloadCoverMockup(input: { pages: ImageBitmap[]; filename: string }) {
  const { blob } = await renderCoverMockup(input);
  downloadBlob(blob, `${input.filename}.png`);
}
