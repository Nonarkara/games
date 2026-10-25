import { cpSync, mkdtempSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Functions are bundled by Wrangler from the project root. Their source,
// migrations and operator notes must never become public static assets.
export function moduleRevision(directory) {
  const files = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(directory);
  const hash = createHash('sha256');
  for (const file of files.sort()) hash.update(relative(directory, file)).update('\0').update(readFileSync(file));
  return hash.digest('hex').slice(0, 16);
}

export function buildPublic() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const output = mkdtempSync(join(tmpdir(), 'ngs-public-'));
  for (const name of ['index.html', '_headers', 'robots.txt', 'sitemap.xml', 'LICENSE', 'CREDITS.md', 'js', 'css', 'public']) {
    const source = join(root, name);
    if (!existsSync(source)) continue;
    cpSync(source, join(output, name), {
      recursive: true,
      filter: path => !basename(path).startsWith('.') && !/\.test\.(?:js|mjs)$/.test(path)
    });
  }
  // Every module receives the same immutable namespace. Relative imports
  // still resolve to one shared storage/UI instance, and any code change
  // refreshes the entire graph even behind the zone's four-hour cache.
  const revision = moduleRevision(join(output, 'js'));
  const modules = join('releases', revision, 'js');
  cpSync(join(output, 'js'), join(output, modules), { recursive: true });
  const html = readFileSync(join(output, 'index.html'), 'utf8');
  const stagedHtml = html.replace(/src="\.\/js\/app\.js(?:\?[^"]*)?"/, `src="./releases/${revision}/js/app.js"`);
  if (stagedHtml === html) throw new Error('Module entry point missing from index.html');
  writeFileSync(join(output, 'index.html'), stagedHtml);
  writeFileSync(join(output, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>Not found</title><h1>Page not found</h1><a href="/">Return to the games</a></html>');
  return output;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(buildPublic());
