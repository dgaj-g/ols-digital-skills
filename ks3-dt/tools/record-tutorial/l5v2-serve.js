/* J3 L5 V2 SAME LIGHT · a tiny static server over platform/ for the browser gates (A2 tour, A13 reload, A12 walker).
   serve(port) → Promise<server>. Also runs alone: node l5v2-serve.js 8781 */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', 'platform');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
function serve(port) {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(port, () => res(s));
  });
}
module.exports = { serve };
if (require.main === module) serve(+process.argv[2] || 8781).then(() => console.log('serving platform/ on', +process.argv[2] || 8781));
