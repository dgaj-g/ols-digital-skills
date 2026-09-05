import sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
root = sys.argv[1]; port = int(sys.argv[2])
class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
