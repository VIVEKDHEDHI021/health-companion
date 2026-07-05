import fs from "fs";
import path from "path";

const clientDistDir = path.resolve("dist/client");
const assetsDir = path.join(clientDistDir, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error("Assets directory not found");
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);

// 1. Find the CSS file (e.g. styles-DTP39opD.css)
let cssFile = files.find(f => f.endsWith(".css") && (f.startsWith("styles-") || f.includes("styles")));
if (cssFile) {
  cssFile = `assets/${cssFile}`;
}

// 2. Find the largest index-*.js file which represents our main React/router bundle
let jsEntry = "";
let maxJsSize = 0;

for (const file of files) {
  if (file.endsWith(".js") && file.startsWith("index-")) {
    const filePath = path.join(assetsDir, file);
    const stats = fs.statSync(filePath);
    if (stats.size > maxJsSize) {
      maxJsSize = stats.size;
      jsEntry = `assets/${file}`;
    }
  }
}

// Fallback if no index-*.js matches
if (!jsEntry) {
  const anyIndex = files.find(f => f.endsWith(".js") && f.startsWith("index"));
  if (anyIndex) jsEntry = `assets/${anyIndex}`;
}

console.log("Using JS entry:", jsEntry);
console.log("Using CSS entry:", cssFile);

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#2563eb" />
    <title>GlucoLab</title>
    ${cssFile ? `<link rel="stylesheet" href="/${cssFile}" />` : ""}
    <script src="capacitor.js"></script>
    <script>
      window.addEventListener("error", function(event) {
        console.error("HTML GLOBAL ERROR:", event.message, event.error ? event.error.stack : "");
      });
      window.addEventListener("unhandledrejection", function(event) {
        console.error("HTML UNHANDLED REJECTION:", event.reason ? event.reason.message : event.reason, event.reason ? event.reason.stack : "");
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <!-- Tanstack Router uses the body directly or hydrates -->
    ${jsEntry ? `<script type="module" src="/${jsEntry}"></script>` : ""}
  </body>
</html>`;

fs.writeFileSync(path.join(clientDistDir, "index.html"), html);
console.log("Generated dist/client/index.html");
