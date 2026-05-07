import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve('dist/server/.vite/manifest.json');
const clientDistDir = path.resolve('dist/client');

if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// The client entry in Tanstack Start is usually an entry inside node_modules/@tanstack/react-start or virtual
// Let's find the main script by looking for the one that imports most router stuff or has the name "index"
// Actually, let's look for "client" or "index".
let cssFile = '';
for (const key in manifest) {
  const item = manifest[key];
  if (item.file && item.file.endsWith('.css')) {
    cssFile = item.file;
  }
}

// Tanstack start client entry is typically the start script.
let jsEntry = '';
for (const key in manifest) {
    if (key.includes('plugin/default-entry/start.ts')) {
        jsEntry = manifest[key].file;
        break;
    }
}
if (!jsEntry) {
    for (const key in manifest) {
        if (key.includes('index.es-') || key.includes('index-')) {
            jsEntry = manifest[key].file;
        }
    }
}

console.log('Using JS entry:', jsEntry);
console.log('Using CSS entry:', cssFile);

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#2563eb" />
    <title>GlucoLab</title>
    ${cssFile ? `<link rel="stylesheet" href="/${cssFile}" />` : ''}
  </head>
  <body>
    <!-- Tanstack Router uses the body directly or hydrates -->
    ${jsEntry ? `<script type="module" src="/${jsEntry}"></script>` : ''}
  </body>
</html>`;

fs.writeFileSync(path.join(clientDistDir, 'index.html'), html);
console.log('Generated dist/client/index.html');
