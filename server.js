import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  try {
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `http://${host}`);
    // Local development has no Pages Functions runtime. Mirror the one public
    // auth read so the UI can enter honest guest mode without a noisy 404.
    if (req.method === 'GET' && parsedUrl.pathname === '/api/auth/status') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(JSON.stringify({ authenticated: false, google_available: false, user: null }));
      return;
    }
    let reqPath = parsedUrl.pathname === '/' ? '/index.html' : decodeURIComponent(parsedUrl.pathname);
    const filePath = path.resolve(__dirname, `.${path.normalize(reqPath)}`);
    if (filePath !== __dirname && !filePath.startsWith(`${__dirname}${path.sep}`)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1 style="font-family:sans-serif;padding:2rem;">404 Not Found</h1>', 'utf-8');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1 style="font-family:sans-serif;padding:2rem;">Server Error: ${err.code}</h1>`, 'utf-8');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
  }
});

server.listen(PORT, () => {
  console.log(`🎮 Dr Non — Non-Gaming System running at http://localhost:${PORT}`);
});
