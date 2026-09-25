type Radii = { tl: number; tr: number; br: number; bl: number };
export type MockupKind = "cover" | "open";

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | Radii) {
  const radii = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  const tl = Math.min(radii.tl, w / 2, h / 2);
  const tr = Math.min(radii.tr, w / 2, h / 2);
  const br = Math.min(radii.br, w / 2, h / 2);
  const bl = Math.min(radii.bl, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function fillWhite(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  ox: number,
  oy: number,
  blur: number,
  alpha: number,
) {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = ox;
  ctx.shadowOffsetY = oy;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
}

function drawForeEdge(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, thickX: number, thickY: number) {
  const frontTop = { x, y };
  const backTop = { x: x + thickX, y: y - thickY };
  const backBot = { x: x + thickX, y: y + h - thickY };
  const frontBot = { x, y: y + h };
  ctx.beginPath();
  ctx.moveTo(frontTop.x, frontTop.y);
  ctx.lineTo(backTop.x, backTop.y);
  ctx.lineTo(backBot.x, backBot.y);
  ctx.lineTo(frontBot.x, frontBot.y);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(frontTop.x, 0, backTop.x, 0);
  gradient.addColorStop(0, "#f4f1ea");
  gradient.addColorStop(0.35, "#ffffff");
  gradient.addColorStop(0.7, "#efebe3");
  gradient.addColorStop(1, "#d9d3c8");
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(120, 112, 100, 0.14)";
  ctx.lineWidth = 1;
  const lines = Math.max(8, Math.round(h / 36));
  for (let i = 1; i < lines; i += 1) {
    const t = i / lines;
    const y0 = frontTop.y + (frontBot.y - frontTop.y) * t;
    const y1 = backTop.y + (backBot.y - backTop.y) * t;
    ctx.beginPath();
    ctx.moveTo(frontTop.x, y0);
    ctx.lineTo(backTop.x, y1);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(90, 84, 76, 0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | Radii,
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(image, x, y, w, h);
  ctx.restore();
}

function shadeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | Radii,
  from: string,
  to: string,
  horizontal = true,
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  const gradient = horizontal
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

async function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG maken mislukt"))), "image/png");
  });
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

function pageSize(page: ImageBitmap) {
  const width = Math.max(1, page.width);
  const height = Math.max(1, page.height);
  return { width, height, aspect: width / height };
}

function renderCover(page: ImageBitmap) {
  const canvas = canvasOf(1600, 2100);
  const ctx = context(canvas);
  fillWhite(ctx, canvas.width, canvas.height);
  const { aspect } = pageSize(page);
  const bookH = canvas.height * 0.82;
  const bookW = Math.min(canvas.width * 0.72, bookH * aspect);
  const thickX = Math.max(18, bookW * 0.042);
  const thickY = thickX * 0.46;
  const x = (canvas.width - bookW - thickX) / 2;
  const y = (canvas.height - bookH + thickY) / 2;
  const radius = Math.max(6, bookW * 0.012);

  drawShadow(ctx, x, y, bookW + thickX * 0.35, bookH, radius, 12, 26, 42, 0.18);
  drawShadow(ctx, x, y, bookW, bookH, radius, 1, 5, 12, 0.07);
  drawForeEdge(ctx, x + bookW, y, bookH, thickX, thickY);
  drawPage(ctx, page, x, y, bookW, bookH, radius);
  shadeRect(ctx, x, y, bookW, bookH, radius, "rgba(255,255,255,0.03)", "rgba(0,0,0,0.05)");
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 0.5, y + 0.5, bookW - 1, bookH - 1, radius);
  ctx.stroke();
  ctx.restore();
  return canvas;
}

function renderOpen(left: ImageBitmap, right: ImageBitmap) {
  const canvas = canvasOf(2400, 1500);
  const ctx = context(canvas);
  fillWhite(ctx, canvas.width, canvas.height);
  const { aspect } = pageSize(left);
  const pageH = canvas.height * 0.78;
  const pageW = Math.min((canvas.width * 0.84) / 2, pageH * aspect);
  const thickX = Math.max(16, pageW * 0.028);
  const thickY = thickX * 0.38;
  const bookW = pageW * 2;
  const x = (canvas.width - bookW - thickX) / 2;
  const y = (canvas.height - pageH + thickY) / 2;
  const outer = Math.max(8, pageW * 0.016);
  const leftR: Radii = { tl: outer, tr: 1, br: 1, bl: outer };
  const rightR: Radii = { tl: 1, tr: outer, br: outer, bl: 1 };

  drawShadow(ctx, x, y, bookW + thickX * 0.25, pageH, outer, 8, 20, 40, 0.14);
  drawShadow(ctx, x, y, bookW, pageH, outer, 0, 5, 12, 0.06);
  drawForeEdge(ctx, x + bookW, y, pageH, thickX, thickY);
  drawPage(ctx, left, x, y, pageW, pageH, leftR);
  drawPage(ctx, right, x + pageW, y, pageW, pageH, rightR);
  shadeRect(ctx, x, y, pageW, pageH, leftR, "rgba(255,255,255,0)", "rgba(0,0,0,0.07)");
  shadeRect(ctx, x + pageW, y, pageW, pageH, rightR, "rgba(0,0,0,0.08)", "rgba(255,255,255,0)");
  const gutter = ctx.createLinearGradient(x + pageW - 14, 0, x + pageW + 14, 0);
  gutter.addColorStop(0, "rgba(0,0,0,0)");
  gutter.addColorStop(0.46, "rgba(0,0,0,0.05)");
  gutter.addColorStop(0.5, "rgba(0,0,0,0.14)");
  gutter.addColorStop(0.54, "rgba(0,0,0,0.05)");
  gutter.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gutter;
  ctx.fillRect(x + pageW - 14, y, 28, pageH);
  return canvas;
}

export async function renderCoverMockup(input: { pages: ImageBitmap[]; kind: MockupKind }) {
  const pages = input.pages;
  if (pages.length === 0) throw new Error("Geen pagina’s voor de mockup.");
  const cover = pages[0];
  const left = pages[1] ?? cover;
  const right = pages[2] ?? pages[1] ?? cover;
  const canvas = input.kind === "cover" ? renderCover(cover) : renderOpen(left, right);
  return { canvas, blob: await canvasPng(canvas) };
}

export async function downloadCoverMockup(input: { pages: ImageBitmap[]; filename: string; kind: MockupKind }) {
  const { blob } = await renderCoverMockup(input);
  downloadBlob(blob, `${input.filename}.png`);
}
