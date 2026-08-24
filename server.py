"""Internal News Room server. Team members with the link can upload a file to add an entry.

Uses the Python standard library only so it can run without pip (office proxy).
"""

from __future__ import annotations

import json
import posixpath
import re
import socket
import uuid
import zipfile
from datetime import date
from email import policy
from email.parser import BytesParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
NEWS_PATH = ROOT / "data" / "news.json"
UPLOAD_DIR = ROOT / "uploads"
ALLOWED = {".pdf", ".docx", ".txt", ".md", ".text"}
MAX_BYTES = 20 * 1024 * 1024
PORT = 8765

UPLOAD_DIR.mkdir(exist_ok=True)


def load_news() -> dict:
    if NEWS_PATH.exists():
        return json.loads(NEWS_PATH.read_text(encoding="utf-8"))
    return {"meta": {"title": "ʻEwa Development Plan News Room", "updated": ""}, "items": []}


def save_news(data: dict) -> None:
    data.setdefault("meta", {})["updated"] = date.today().isoformat()
    NEWS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md", ".text"}:
        return path.read_text(encoding="utf-8", errors="replace")
    if suffix == ".docx":
        with zipfile.ZipFile(path) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", errors="replace")
        xml = re.sub(r"</w:p>", "\n", xml)
        xml = re.sub(r"<[^>]+>", "", xml)
        xml = xml.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        return re.sub(r"\n+", "\n", xml).strip()
    if suffix == ".pdf":
        raw = path.read_bytes().decode("latin-1", errors="ignore")
        chunks = re.findall(r"\((?:\\.|[^\\)]){6,}\)", raw)
        cleaned = []
        for chunk in chunks:
            text = chunk[1:-1]
            text = bytes(text, "latin-1").decode("unicode_escape", errors="ignore")
            text = re.sub(r"[\x00-\x1f]+", " ", text)
            if re.search(r"[A-Za-z]{4}", text):
                cleaned.append(text.strip())
        return " ".join(cleaned[:80])
    return ""


def first_line(text: str) -> str:
    for line in (text or "").splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        if 8 <= len(line) <= 140:
            return line
    return ""


def summarize(text: str, extra: str = "") -> str:
    body = re.sub(r"\s+", " ", (text or "")).strip()
    if extra.strip():
        body = extra.strip() + (" " + body if body else "")
    if not body:
        return "Uploaded file. Needs review. Source date and place were not identified."
    if len(body) > 700:
        body = body[:700].rsplit(" ", 1)[0] + "…"
    return body


def source_type(suffix: str) -> str:
    if suffix == ".pdf":
        return "PDF"
    if suffix == ".docx":
        return "Word"
    return "Text"


def safe_name(name: str) -> str:
    stem = Path(name).stem
    suffix = Path(name).suffix.lower()
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._") or "upload"
    return f"{date.today().isoformat()}_{uuid.uuid4().hex[:8]}_{stem[:80]}{suffix}"


def parse_multipart(headers: dict[str, str], body: bytes) -> tuple[dict[str, str], dict[str, tuple[str, bytes]]]:
    header_blob = "".join(f"{key}: {value}\r\n" for key, value in headers.items() if key.lower() == "content-type")
    message = BytesParser(policy=policy.default).parsebytes(header_blob.encode("utf-8") + b"\r\n" + body)
    fields: dict[str, str] = {}
    files: dict[str, tuple[str, bytes]] = {}
    if not message.is_multipart():
        return fields, files
    for part in message.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if not name:
            continue
        filename = part.get_filename()
        payload = part.get_payload(decode=True) or b""
        if filename:
            files[name] = (unquote(filename), payload)
        else:
            fields[name] = payload.decode("utf-8", errors="replace")
    return fields, files


def json_bytes(payload: dict, status: int = 200) -> tuple[int, bytes, str]:
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return status, raw, "application/json; charset=utf-8"


def add_news(fields: dict[str, str], files: dict[str, tuple[str, bytes]]) -> tuple[int, dict]:
    if "file" not in files:
        return 400, {"error": "Choose a PDF, Word, or text file."}
    filename, content = files["file"]
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED:
        return 400, {"error": "Use a PDF, Word (.docx), or text file."}
    if len(content) > MAX_BYTES:
        return 400, {"error": "File is over 20 MB."}

    stored = UPLOAD_DIR / safe_name(filename)
    stored.write_bytes(content)
    text = extract_text(stored)
    headline = (fields.get("headline") or "").strip() or first_line(text) or Path(filename).stem
    note = (fields.get("note") or "").strip()
    item = {
        "id": "news-" + uuid.uuid4().hex[:10],
        "date": date.today().isoformat(),
        "headline": headline,
        "summary": summarize(text, note),
        "place": "",
        "source": filename,
        "sourceType": source_type(suffix),
        "sourceFile": str(stored),
        "needsReview": True,
    }
    data = load_news()
    data.setdefault("items", []).insert(0, item)
    save_news(data)
    return 200, {"ok": True, "item": item}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), format % args))

    def do_POST(self) -> None:
        path = posixpath.normpath(unquote(self.path.split("?", 1)[0]))
        if path != "/api/news":
            self.send_error(404, "Not found")
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BYTES + 1024 * 1024:
            self.send_error(413, "File too large")
            return
        body = self.rfile.read(length) if length else b""
        headers = {key: value for key, value in self.headers.items()}
        try:
            fields, files = parse_multipart(headers, body)
            status, payload = add_news(fields, files)
        except Exception as exc:
            status, payload = 500, {"error": "Could not read that file."}
            print("upload error:", exc)
        raw_status, raw, content_type = json_bytes(payload, status)
        self.send_response(raw_status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)


def lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


if __name__ == "__main__":
    host_ip = lan_ip()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("News Room (this computer): http://127.0.0.1:%s" % PORT)
    print("News Room (team link on your network): http://%s:%s" % (host_ip, PORT))
    print("Share only with people who should add news. Do not put this on the public internet.")
    server.serve_forever()
