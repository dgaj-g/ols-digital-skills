import sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
root = sys.argv[1]; port = int(sys.argv[2])
class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path in ('/', '/index.html'):
            body = open(os.path.join(root, 'Index.html'), 'rb').read()
            # the built page is an Apps Script template: fill the scriptlets the
            # way doGet would, so the BUILT TIER can be walked like the preview
            for k, v in [(b'<?= classCode ?>', b'demo'), (b'<?= baseUrl ?>', b''),
                         (b'<?= email ?>', b'aoife.gartland@c2ken.net'),
                         (b'<?= name ?>', b'Aoife Gartland'), (b'<?= firstVisit ?>', b'no')]:
                body = body.replace(k, v)
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        super().do_GET()
ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
