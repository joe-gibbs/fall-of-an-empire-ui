#!/usr/bin/env python3
"""
Serve Vite's dist/ folder with MIME types ES modules require.

Python's http.server on Windows often sends .js as text/plain; browsers refuse
to execute <script type="module"> unless the type is JavaScript.

Usage (from repo root):
  python serve_dist.py

Then open http://localhost:8080/  (not required: /index.html)

Prefer for local checks: npm run preview
"""
from __future__ import annotations

import http.server
import mimetypes
import os
import socketserver

# Register before any guessing (Windows registry often maps .js -> text/plain)
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("image/svg+xml", ".svg")

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
PORT = int(os.environ.get("PORT", "8080"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)


def main() -> None:
    if not os.path.isdir(DIST):
        raise SystemExit(f"Missing {DIST} — run: npm run build")
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving {DIST}\n  http://localhost:{PORT}/\n")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
