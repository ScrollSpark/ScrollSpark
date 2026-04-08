/**
 * Build for GitHub Pages (project site: https://<user>.github.io/<repo>/).
 * Usage:
 *   node scripts/build-gh-pages.mjs
 *   node scripts/build-gh-pages.mjs MyRepoName
 *
 * Defaults to "ScrollSpark" (this project’s GitHub repo name). Override: node scripts/build-gh-pages.mjs OtherName
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const repo =
  process.argv[2] ||
  process.env.GITHUB_REPOSITORY?.split('/')[1] ||
  'ScrollSpark';

const base = `/${repo}/`.replace(/\/{2,}/g, '/');
process.env.VITE_BASE_PATH = base;

console.log(`Building for GitHub Pages with VITE_BASE_PATH=${base}`);

execSync('npx vite build', { stdio: 'inherit', env: { ...process.env } });

const dist = join(process.cwd(), 'dist');
const indexHtml = join(dist, 'index.html');
const notFound = join(dist, '404.html');

if (!existsSync(indexHtml)) {
  console.error('dist/index.html missing after build.');
  process.exit(1);
}

copyFileSync(indexHtml, notFound);
console.log('Copied dist/index.html → dist/404.html (SPA fallback for GitHub Pages).');
