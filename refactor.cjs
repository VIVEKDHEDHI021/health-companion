const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// Directories moved manually

// 4. Update imports in all files inside src
function replaceInFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInFiles(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content.replace(/@\/integrations\/supabase\/client/g, '@/db/client');
      newContent = newContent.replace(/@\/integrations\/supabase\/client\.server/g, '@/db/client.server');
      newContent = newContent.replace(/@\/integrations\/supabase\/types/g, '@/db/types');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}
replaceInFiles(srcDir);

// 5. Update tsconfig.json paths
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
tsConfig.compilerOptions.paths = {
  "@/*": ["./src/*"],
  "@/components/*": ["./src/frontend/components/*"],
  "@/hooks/*": ["./src/frontend/hooks/*"],
  "@/lib/*": ["./src/frontend/lib/*"]
};
fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
console.log('Updated tsconfig.json');

// 6. Update components.json paths
const compJsonPath = path.join(__dirname, 'components.json');
const compJson = JSON.parse(fs.readFileSync(compJsonPath, 'utf8'));
compJson.aliases = {
  "components": "@/frontend/components",
  "utils": "@/frontend/lib/utils",
  "ui": "@/frontend/components/ui",
  "lib": "@/frontend/lib",
  "hooks": "@/frontend/hooks"
};
fs.writeFileSync(compJsonPath, JSON.stringify(compJson, null, 2));
console.log('Updated components.json');
