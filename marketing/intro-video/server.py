# Static file server for the video studio that also accepts PUT /out/<name> to save the recording.
import http.server, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_PUT(self):
        name = os.path.basename(self.path)
        os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
        n = int(self.headers.get("Content-Length", 0))
        with open(os.path.join(ROOT, "out", name), "wb") as f:
            remaining = n
            while remaining:
                chunk = self.rfile.read(min(1 << 20, remaining))
                if not chunk:
                    break
                f.write(chunk)
                remaining -= len(chunk)
        self.send_response(201)
        self.end_headers()

    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
