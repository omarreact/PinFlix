#!/usr/bin/env python3
"""PinFlix local loopback bridge for Android/Termux.

Binds only to 127.0.0.1:8787. It is intentionally NOT an open proxy.
Only approved Cineplex hosts and ports are accepted.
"""

from __future__ import annotations

import json
import re
import shutil
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Optional

HOST = "127.0.0.1"
PORT = 8787
ALLOWED_ORIGINS = {
    "https://pinflix.pincodeit.com",
    "https://pinflix-staging.pincodeit.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
URI_ATTRIBUTE = re.compile(r'URI="([^"]+)"')


def is_allowed_source(raw: str) -> bool:
    try:
        url = urllib.parse.urlsplit(raw)
    except ValueError:
        return False

    if url.scheme not in {"http", "https"}:
        return False
    if url.username or url.password:
        return False

    host = (url.hostname or "").lower()
    try:
        port = url.port
    except ValueError:
        return False

    if port is None:
        port = 443 if url.scheme == "https" else 80

    if host == "vod.cineplexbd.net":
        return port in {80, 443, 8081}
    if host in {"cineplexbd.net", "www.cineplexbd.net"}:
        return port in {80, 443}
    return False


def bridge_url(raw: str) -> str:
    return f"http://{HOST}:{PORT}/proxy?url=" + urllib.parse.quote(raw, safe="")


def rewrite_manifest(text: str, base_url: str) -> str:
    out: list[str] = []

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            out.append(line)
            continue

        if not stripped.startswith("#"):
            absolute = urllib.parse.urljoin(base_url, stripped)
            out.append(bridge_url(absolute))
            continue

        def repl(match: re.Match[str]) -> str:
            absolute = urllib.parse.urljoin(base_url, match.group(1))
            return f'URI="{bridge_url(absolute)}"'

        out.append(URI_ATTRIBUTE.sub(repl, line))

    return "\n".join(out) + ("\n" if text.endswith("\n") else "")


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        absolute = urllib.parse.urljoin(req.full_url, newurl)
        if not is_allowed_source(absolute):
            raise urllib.error.HTTPError(
                req.full_url,
                403,
                "Redirect target is not allowed",
                headers,
                fp,
            )
        return super().redirect_request(req, fp, code, msg, headers, absolute)


OPENER = urllib.request.build_opener(SafeRedirectHandler())


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "PinFlixBridge/1.0"

    def log_message(self, fmt: str, *args) -> None:
        sys.stdout.write("[PinFlix Bridge] " + fmt % args + "\n")

    def _origin(self) -> Optional[str]:
        return self.headers.get("Origin")

    def _origin_allowed(self) -> bool:
        origin = self._origin()
        return origin is None or origin in ALLOWED_ORIGINS

    def _cors(self) -> None:
        origin = self._origin()
        self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
        self.send_header(
            "Access-Control-Expose-Headers",
            "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag, Last-Modified",
        )
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("Vary", "Origin")

    def _send_json(self, status: int, payload: dict, head_only: bool = False) -> None:
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def _send_text(self, status: int, text: str) -> None:
        data = text.encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def do_OPTIONS(self) -> None:
        if not self._origin_allowed():
            self._send_text(403, "Origin is not allowed.")
            return

        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self) -> None:
        self._handle_request(head_only=True)

    def do_GET(self) -> None:
        self._handle_request(head_only=False)

    def _handle_request(self, head_only: bool) -> None:
        if not self._origin_allowed():
            self._send_text(403, "Origin is not allowed.")
            return

        parsed = urllib.parse.urlsplit(self.path)

        if parsed.path == "/health":
            self._send_json(
                200,
                {"ok": True, "service": "pinflix-bridge", "version": "1.0.0"},
                head_only=head_only,
            )
            return

        if parsed.path != "/proxy":
            self._send_text(404, "Unknown PinFlix Bridge route.")
            return

        query = urllib.parse.parse_qs(parsed.query)
        source = (query.get("url") or [""])[0]

        if not source:
            self._send_text(400, "Missing url query parameter.")
            return
        if not is_allowed_source(source):
            self._send_text(403, "Source host or port is not allowed.")
            return

        headers = {
            "User-Agent": "PinFlixBridge/1.0 Android-Termux",
            "Accept": "*/*",
            "Accept-Encoding": "identity",
        }
        range_value = self.headers.get("Range")
        if range_value:
            headers["Range"] = range_value

        method = "HEAD" if head_only else "GET"
        request = urllib.request.Request(source, headers=headers, method=method)

        try:
            upstream = OPENER.open(request, timeout=25)
        except urllib.error.HTTPError as exc:
            upstream = exc
        except (urllib.error.URLError, socket.timeout, TimeoutError) as exc:
            self._send_text(502, f"Upstream connection failed: {type(exc).__name__}")
            return

        try:
            final_url = upstream.geturl()
            if not is_allowed_source(final_url):
                self._send_text(403, "Final upstream URL is not allowed.")
                return

            status = getattr(upstream, "status", None) or upstream.getcode()
            content_type = upstream.headers.get("Content-Type", "application/octet-stream")
            lower_type = content_type.lower()
            is_manifest = (
                not head_only
                and (
                    urllib.parse.urlsplit(final_url).path.lower().endswith(".m3u8")
                    or "mpegurl" in lower_type
                )
            )

            if is_manifest and 200 <= status < 300:
                raw = upstream.read()
                text = raw.decode("utf-8", errors="replace")
                data = rewrite_manifest(text, final_url).encode("utf-8")

                self.send_response(status)
                self._cors()
                self.send_header("Content-Type", "application/vnd.apple.mpegurl")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(data)
                return

            self.send_response(status)
            self._cors()

            forwarded = {
                "Content-Type",
                "Content-Length",
                "Content-Range",
                "Accept-Ranges",
                "ETag",
                "Last-Modified",
                "Cache-Control",
            }
            for name in forwarded:
                value = upstream.headers.get(name)
                if value is not None:
                    self.send_header(name, value)

            if upstream.headers.get("Content-Type") is None:
                self.send_header("Content-Type", content_type)

            self.end_headers()

            if not head_only:
                shutil.copyfileobj(upstream, self.wfile, length=64 * 1024)
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            try:
                upstream.close()
            except Exception:
                pass


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"PinFlix Bridge running at http://{HOST}:{PORT}")
    print("Keep this Termux session running, then return to pinflix.pincodeit.com/play")
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nStopping PinFlix Bridge…")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
