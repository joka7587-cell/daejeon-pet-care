/**
 * This script patches all .tsx files under app/ to replace hardcoded colors
 * with dynamic theme-aware colors using useColors() hook.
 *
 * Strategy: For each file that uses StyleSheet.create with hardcoded colors,
 * we add useColors() and replace static styles with dynamic style overrides.
 *
 * Since StyleSheet.create() is static, we need to apply color overrides
 * at render time via inline style merging.
 */
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(__dirname, "..", "app");

// Color mappings: hardcoded -> theme token
const COLOR_MAP: Record<string, string> = {
  // Text/foreground colors
  '"#1A1A1A"': "colors.foreground",
  '"#1C1C1E"': "colors.foreground",
  '"#2C2C2E"': "colors.foreground",
  // Muted/secondary text
  '"#636366"': "colors.muted",
  '"#8E8E93"': "colors.muted",
  '"#757575"': "colors.muted",
  '"#9E9E9E"': "colors.muted",
  '"#AEAEB2"': "colors.muted",
  '"#BDBDBD"': "colors.muted",
  // Background
  '"#FFFFFF"': "colors.background",
  '"#F8F8F8"': "colors.surface",
  '"#F5F5F5"': "colors.surface",
  '"#F0F0F0"': "colors.border",
  // Border
  '"#E8E8E8"': "colors.border",
  '"#E5E5EA"': "colors.border",
  '"#E0E0E0"': "colors.border",
  '"#D1D1D6"': "colors.border",
};

console.log("Dark mode fix script - analysis only");
console.log("Files with hardcoded #1A1A1A:");

function findFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findFiles(APP_DIR);
for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const count = (content.match(/#1A1A1A/g) || []).length;
  if (count > 0) {
    console.log(`  ${path.relative(APP_DIR, file)}: ${count} occurrences`);
  }
}
