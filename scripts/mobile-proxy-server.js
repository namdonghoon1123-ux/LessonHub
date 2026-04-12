const http = require('http');
const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '../frontend');
const BACKEND_HOST = process.env.MOBILE_BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = Number.parseInt(process.env.MOBILE_BACKEND_PORT || '4000', 10);
const PORT = Number.parseInt(process.env.MOBILE_FRONTEND_PORT || '18080', 10);
const HOST = process.env.MOBILE_FRONTEND_HOST || '0.0.0.0';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function setCacheHeaders(res, extname) {
  if (extname === '.html' || extname === '.js') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return;
  }
  if (extname === '.css') {
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
  }
}

function safeResolvePath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname || '/');
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const relativePath = normalized === '/' ? '/index.html' : normalized;
  const candidate = path.resolve(FRONTEND_ROOT, `.${relativePath}`);
  if (!candidate.startsWith(FRONTEND_ROOT)) {
    return null;
  }
  return candidate;
}

function sendStaticFile(req, res) {
  const requestPath = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`).pathname;
  const primaryPath = safeResolvePath(requestPath);
  if (!primaryPath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let filePath = primaryPath;
  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch (_) {
    stat = null;
  }

  if (!stat || !stat.isFile()) {
    const fallbackPath = safeResolvePath('/index.html');
    if (!fallbackPath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    filePath = fallbackPath;
    try {
      stat = fs.statSync(filePath);
    } catch (_) {
      stat = null;
    }
    if (!stat || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
  }

  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  setCacheHeaders(res, extname);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
  });
  fs.createReadStream(filePath).pipe(res);
}

function proxyApi(req, res) {
  const headers = { ...req.headers };
  headers.host = req.headers.host || `${BACKEND_HOST}:${BACKEND_PORT}`;

  const proxyReq = http.request(
    {
      host: BACKEND_HOST,
      port: BACKEND_PORT,
      method: req.method,
      path: req.url,
      headers,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'proxy_error', message: err.message }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (req.url.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }

  sendStaticFile(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`mobile proxy listening on http://${HOST}:${PORT}`);
  console.log(`frontend root: ${FRONTEND_ROOT}`);
  console.log(`proxying /api to http://${BACKEND_HOST}:${BACKEND_PORT}`);
});
