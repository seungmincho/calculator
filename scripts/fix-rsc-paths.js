/**
 * fix-rsc-paths.js
 *
 * Workaround for Next.js 16 bug #85374:
 * Static export generates RSC payload files in nested directories,
 * but the client router expects flat dot-separated filenames.
 *
 * Build generates:  out/salary-calculator/__next.salary-calculator/__PAGE__.txt
 * Client requests:  out/salary-calculator/__next.salary-calculator.__PAGE__.txt
 *
 * This script renames the files post-build to match client expectations.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'out');

let fixCount = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Recurse into subdirectories first (depth-first)
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('_next')) {
      // Skip _next (JS/CSS bundles) but process __next.* dirs
      walk(path.join(dir, entry.name));
    }
  }

  // Find directories starting with "__next." and flatten their contents
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('__next.')) {
      flattenDir(path.join(dir, entry.name), dir, entry.name);
    }
  }
}

function flattenDir(srcDir, parentDir, prefix) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destName = prefix + '.' + entry.name;
    const destPath = path.join(parentDir, destName);

    if (entry.isFile()) {
      fs.renameSync(srcPath, destPath);
      fixCount++;
    } else if (entry.isDirectory()) {
      // Recursively flatten nested subdirectories
      flattenDir(srcPath, parentDir, destName);
    }
  }

  // Remove the now-empty directory
  try {
    fs.rmdirSync(srcDir);
  } catch (e) {
    // Ignore if not empty
  }
}

console.log('[fix-rsc-paths] Scanning', OUT_DIR);
walk(OUT_DIR);

if (fixCount > 0) {
  console.log(`[fix-rsc-paths] Fixed ${fixCount} RSC payload file(s)`);
} else {
  console.log('[fix-rsc-paths] No RSC path issues found (may already be fixed in this Next.js version)');
}
