#!/usr/bin/env node
/* Tiny static file server WITH HTTP Range support (python3 -m http.server has
   none, which breaks <video> seek/playback in the preview - Chrome aborts
   full-file 200 responses). GitHub Pages + the hosted build serve ranges fine;
   this brings localhost to parity.
   Usage: node ks3-dt/tools/dev-static.js [port] [rootDir]  (defaults 8098, repo root) */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || 8098);
const ROOT = path.resolve(process.argv[3] || path.join(__dirname, '..', '..'));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.hex': 'application/octet-stream'
};

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (e) { res.writeHead(400); res.end('bad url'); return; }
  let filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  let st;
  try {
    st = fs.statSync(filePath);
    if (st.isDirectory()) { filePath = path.join(filePath, 'index.html'); st = fs.statSync(filePath); }
  } catch (e) { res.writeHead(404); res.end('not found'); return; }

  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range && (range[1] !== '' || range[2] !== '')) {
    let start = range[1] === '' ? st.size - Number(range[2]) : Number(range[1]);
    let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : st.size - 1;
    if (isNaN(start) || isNaN(end) || start > end || start < 0 || end >= st.size) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); res.end(); return;
    }
    headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
    headers['Content-Length'] = end - start + 1;
    res.writeHead(206, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    headers['Content-Length'] = st.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
  }
}).listen(PORT, () => console.log('dev-static serving ' + ROOT + ' on http://localhost:' + PORT + ' (Range enabled)'));
