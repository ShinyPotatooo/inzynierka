// scripts/install-fonts.js
// Pobiera Noto Sans (Regular/Bold) do assets/fonts/ przy npm install

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'fonts');
const FILES = [
  {
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
    out: path.join(OUT_DIR, 'NotoSans-Regular.ttf'),
  },
  {
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
    out: path.join(OUT_DIR, 'NotoSans-Bold.ttf'),
  },
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function fileOk(p) {
  try {
    const s = fs.statSync(p);
    return s.isFile() && s.size > 10 * 1024; // >10KB
  } catch (_) {
    return false;
  }
}

function download(url, out) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(out);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(out, () => {});
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        file.close();
        fs.unlink(out, () => {});
        reject(err);
      });
  });
}

(async () => {
  try {
    ensureDir(OUT_DIR);
    for (const { url, out } of FILES) {
      if (fileOk(out)) {
        console.log(`[fonts] OK: ${path.basename(out)} już jest`);
        continue;
      }
      console.log(`[fonts] Pobieram ${url} -> ${out}`);
      await download(url, out);
      if (!fileOk(out)) throw new Error(`Pusty lub uszkodzony plik: ${out}`);
      console.log(`[fonts] Zapisano: ${out}`);
    }
    console.log('[fonts] Gotowe ✔');
  } catch (e) {
    console.warn('[fonts] Uwaga:', e.message);
    console.warn('[fonts] PDF użyje Helvetica, jeśli fontów brak.');
    process.exit(0); // nie blokujemy instalacji
  }
})();
