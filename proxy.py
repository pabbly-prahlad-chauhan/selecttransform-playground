"""
Local CORS Proxy for SelectTransform Playground.
Run this alongside the playground to bypass browser CORS restrictions.

Usage:
  python proxy.py

This starts:
  - Playground at http://localhost:8765
  - Proxy API at http://localhost:8766
"""

import http.server
import json
import os
import sys
import threading
import urllib.request
import urllib.error

PLAYGROUND_PORT = 8765
PROXY_PORT = 8766
PLAYGROUND_DIR = os.path.dirname(os.path.abspath(__file__))


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            params = json.loads(body)

            url = params.get("url", "")
            method = params.get("method", "GET")
            headers = params.get("headers", {})
            data = params.get("body", None)

            req = urllib.request.Request(url, method=method)
            for k, v in headers.items():
                req.add_header(k, v)

            if data:
                req.data = data.encode("utf-8") if isinstance(data, str) else data

            try:
                resp = urllib.request.urlopen(req, timeout=30)
                resp_body = resp.read().decode("utf-8", errors="replace")
                status = resp.status
            except urllib.error.HTTPError as e:
                resp_body = e.read().decode("utf-8", errors="replace")
                status = e.code

            result = json.dumps({"status": status, "body": resp_body})

            self.send_response(200)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(result.encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": 500, "body": str(e)}).encode("utf-8"))

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        print(f"  [proxy] {args[0]}")


def start_playground():
    os.chdir(PLAYGROUND_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    server = http.server.HTTPServer(("", PLAYGROUND_PORT), handler)
    server.serve_forever()


def start_proxy():
    server = http.server.HTTPServer(("", PROXY_PORT), ProxyHandler)
    server.serve_forever()


if __name__ == "__main__":
    print(f"  SelectTransform Playground")
    print(f"  -------------------------")
    print(f"  Playground: http://localhost:{PLAYGROUND_PORT}")
    print(f"  Proxy:      http://localhost:{PROXY_PORT}")
    print(f"  Press Ctrl+C to stop\n")

    t1 = threading.Thread(target=start_playground, daemon=True)
    t2 = threading.Thread(target=start_proxy, daemon=True)
    t1.start()
    t2.start()

    try:
        import webbrowser
        webbrowser.open(f"http://localhost:{PLAYGROUND_PORT}")
    except Exception:
        pass

    try:
        t1.join()
    except KeyboardInterrupt:
        print("\n  Stopped.")
