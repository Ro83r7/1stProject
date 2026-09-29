/* Baut Orion Lite zu einer einzigen HTML-Datei (CSS und JS eingebettet).
   node tools/build.js                 → dist/orion-lite.html (vollständiges Dokument)
   node tools/build.js --fragment out  → Seiteninhalt ohne <html>/<head>/<body>-Gerüst */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html');
const app = html.slice(html.indexOf('<!--APP-->') + 10, html.indexOf('<!--/APP-->')).trim();
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const css = read('css/style.css');
const js = ['js/data.js', 'js/engine.js', 'js/ai.js', 'js/ui.js'].map((f) => '/* ' + f + ' */\n' + read(f)).join('\n');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

const body = `${fonts}
<style>
${css}
</style>
${app}
<script>
${safe(js)}
</script>
`;

const args = process.argv.slice(2);
if (args[0] === '--fragment') {
  const out = args[1] || path.join(root, 'dist', 'orion-lite.fragment.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `<title>Orion Lite</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n${body}`);
  console.log('Fragment geschrieben: ' + out);
} else {
  const out = path.join(root, 'dist', 'orion-lite.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Orion Lite</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
</head>
<body>
${body}</body>
</html>
`);
  console.log('Einzeldatei geschrieben: ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
}
