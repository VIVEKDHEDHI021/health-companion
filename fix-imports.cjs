const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");

function replaceInFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInFiles(fullPath);
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let newContent = content.replace(/@\/components\//g, "@/frontend/components/");
      newContent = newContent.replace(/@\/hooks\//g, "@/frontend/hooks/");
      newContent = newContent.replace(/@\/lib\//g, "@/frontend/lib/");
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}
replaceInFiles(srcDir);
