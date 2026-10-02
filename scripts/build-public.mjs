import { cpSync, mkdtempSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// Functions are bundled by Wrangler from the project root. Their source,
// migrations and operator notes must never become public static assets.
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
  writeFileSync(join(output, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>Not found</title><h1>Page not found</h1><a href="/">Return to the games</a></html>');
  return output;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(buildPublic());
