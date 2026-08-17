# Folio

Upload een PDF en blader erdoorheen alsof het een gedrukt magazine is.

## Lokaal draaien

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sleep een PDF op de pagina, en je krijgt een deelbare link naar `/m/...`.

## Wat erin zit (v1)

- PDF uploaden via drag-and-drop
- Cover + paginaformaat uit de PDF
- Magazine-viewer met page-flip, pijltjestoetsen, thumbnails, fullscreen, delen en PDF-download
- Magazines blijven lokaal bewaard in `data/magazines/`

## Vercel

Dit is een Next.js-app, klaar voor Vercel. Lokaal worden bestanden op schijf gezet. Op Vercel is die schijf niet persistent — volgende stap is opslag via Vercel Blob als we live gaan.
