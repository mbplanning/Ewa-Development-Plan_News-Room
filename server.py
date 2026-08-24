"""Internal News Room server. Team members with the link can upload a file to add an entry.

Uses the Python standard library only so it can run without pip (office proxy).
Upload opens a review page; the item is added only after Save and submit.
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
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent
NEWS_PATH = ROOT / "data" / "news.json"
DRAFT_DIR = ROOT / "data" / "drafts"
UPLOAD_DIR = ROOT / "uploads"
ALLOWED = {".pdf", ".docx", ".txt", ".md", ".text"}
MAX_BYTES = 20 * 1024 * 1024
PORT = 8765

UPLOAD_DIR.mkdir(exist_ok=True)
DRAFT_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = [
    ("Civil Beat", ("civil beat", "civilbeat")),
    ("Honolulu Star-Advertiser", ("star-advertiser", "staradvertiser", "honolulu star")),
    ("Hawaii News Now", ("hawaii news now",)),
    ("KHON2", ("khon2", "khon ")),
    ("KITV", ("kitv",)),
    ("EIN Presswire", ("ein presswire", "einpresswire")),
    ("Department of Planning and Permitting", ("department of planning and permitting", "dpp")),
    ("Hawaii Housing Finance and Development Corporation", ("hawaii housing finance", "hhfdc")),
    ("Land Use Commission", ("land use commission",)),
    ("Department of Land and Natural Resources", ("department of land and natural resources",)),
    ("Department of Emergency Management", ("department of emergency management",)),
    ("Honolulu City Council", ("honolulu city council", "city council")),
    ("Neighborhood Board", ("neighborhood board",)),
    ("Board of Water Supply", ("board of water supply",)),
    ("Department of Transportation Services", ("department of transportation services",)),
    ("Hawaii Community Development Authority", ("hawaii community development authority", " hcda")),
]

PLACES = [
    ("Makakilo Drive", "road"),
    ("Farrington Highway", "road"),
    ("Fort Weaver Road", "road"),
    ("Kalaeloa Boulevard", "road"),
    ("Kapolei Parkway", "road"),
    ("Kualakaʻi Parkway", "road"),
    ("North-South Road", "road"),
    ("Waipana Street", "road"),
    ("Kamokila Boulevard", "road"),
    ("Ocean Pointe", "region"),
    ("East Kapolei", "region"),
    ("West Kapolei", "region"),
    ("ʻEwa Beach", "region"),
    ("Ewa Beach", "region"),
    ("Hoakalei", "region"),
    ("Makakilo", "region"),
    ("Kalaeloa", "region"),
    ("Honouliuli", "region"),
    ("Ko Olina", "region"),
    ("Kapolei", "region"),
    ("Kunia", "region"),
    ("Waipahu", "region"),
    ("ʻEwa", "region"),
]

GOV_PARTIES = [
    "Department of Planning and Permitting",
    "Hawaii Housing Finance and Development Corporation",
    "Department of Land and Natural Resources",
    "Land Use Commission",
    "Department of Emergency Management",
    "Honolulu City Council",
    "Board of Water Supply",
    "Department of Transportation Services",
    "Hawaii Community Development Authority",
    "Department of Education",
    "Department of Hawaiian Home Lands",
    "Office of Planning and Sustainable Development",
    "HART",
    "Neighborhood Board",
    "City and County of Honolulu",
    "State of Hawaiʻi",
    "DLNR",
    "HHFDC",
    "DPP",
    "DEM",
    "LUC",
]

OTHER_PARTIES = [
    "Haseko",
    "D.R. Horton",
    "DR Horton",
    "Hunt Development",
    "Gentry Homes",
    "Schuler Homes",
    "A&B",
    "Alexander & Baldwin",
    "Kamehameha Schools",
    "The Salvation Army",
    "University of Hawaiʻi",
]


def fold(text: str) -> str:
    return (text or "").replace("\u02bb", "'").replace("\u2018", "'").lower()


def load_news() -> dict:
    if NEWS_PATH.exists():
        return json.loads(NEWS_PATH.read_text(encoding="utf-8"))
    return {"meta": {"title": "ʻEwa Development Plan News Room", "updated": ""}, "items": []}


def save_news(data: dict) -> None:
    data.setdefault("meta", {})["updated"] = date.today().isoformat()
    NEWS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extract_text(path: Path) -> tuple[str, list[str]]:
    suffix = path.suffix.lower()
    links: list[str] = []
    if suffix in {".txt", ".md", ".text"}:
        text = path.read_text(encoding="utf-8", errors="replace")
        links = find_urls(text)
        return text, links
    if suffix == ".docx":
        with zipfile.ZipFile(path) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", errors="replace")
            rels_name = "word/_rels/document.xml.rels"
            if rels_name in archive.namelist():
                rels = archive.read(rels_name).decode("utf-8", errors="replace")
                links.extend(re.findall(r'Target="(https?://[^"]+)"', rels))
        xml = re.sub(r"</w:p>", "\n", xml)
        xml = re.sub(r"<[^>]+>", "", xml)
        xml = xml.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        text = re.sub(r"\n+", "\n", xml).strip()
        links.extend(find_urls(text))
        return text, unique_keep(links)
    if suffix == ".pdf":
        raw = path.read_bytes().decode("latin-1", errors="ignore")
        links.extend(re.findall(r"/URI\s*\((https?://[^)]+)\)", raw))
        chunks = re.findall(r"\((?:\\.|[^\\)]){4,}\)\s*Tj", raw)
        if not chunks:
            chunks = re.findall(r"\((?:\\.|[^\\)]){6,}\)", raw)
        cleaned = []
        for chunk in chunks:
            inner = re.sub(r"\)\s*Tj$", "", chunk)
            text = inner[1:-1] if inner.startswith("(") else inner
            text = bytes(text, "latin-1").decode("unicode_escape", errors="ignore")
            text = re.sub(r"[\x00-\x1f]+", " ", text)
            if re.search(r"[A-Za-z]{3}", text):
                cleaned.append(text.strip())
        text = " ".join(cleaned[:120])
        links.extend(find_urls(text))
        return text, unique_keep(links)
    return "", []


def find_urls(text: str) -> list[str]:
    return unique_keep(re.findall(r"https?://[^\s)\]>\"']+", text or ""))


def unique_keep(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        key = value.rstrip(".,;")
        if key and key not in seen:
            seen.add(key)
            out.append(key)
    return out


def org_skip() -> set[str]:
    skip = {fold(label) for label, _needles in SOURCES}
    skip.update(fold(name) for name in GOV_PARTIES)
    skip.update(fold(name) for name in OTHER_PARTIES)
    return skip


def is_header_line(line: str) -> bool:
    text = re.sub(r"\s+", " ", line or "").strip(" -–—")
    if len(text) < 8:
        return True
    folded = fold(text)
    if folded in org_skip() or any(len(name) >= 8 and folded.endswith(name) for name in org_skip()):
        return True
    if re.match(r"^(page|http|www\.|\d{1,2}/\d{1,2}/\d{2,4})", text, re.I):
        return True
    if re.match(r"^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d", folded):
        return True
    return False


def first_title(text: str, filename: str) -> str:
    for line in (text or "").splitlines():
        line = re.sub(r"\s+", " ", line).strip(" -–—")
        if len(line) < 8 or len(line) > 140 or is_header_line(line):
            continue
        return line
    stem = Path(filename).stem
    stem = re.sub(r"[_-]+", " ", stem).strip()
    return stem[:140]


def one_sentence(text: str) -> str:
    lines = []
    for line in (text or "").splitlines():
        cleaned = re.sub(r"\s+", " ", line).strip()
        if cleaned and not is_header_line(cleaned):
            if "." not in cleaned and "?" not in cleaned and len(cleaned) <= 90:
                continue
            lines.append(cleaned)
    body = " ".join(lines) or re.sub(r"\s+", " ", (text or "")).strip()
    if not body:
        return ""
    ranked = []
    for sentence in re.split(r"(?<=[.!?])\s+", body):
        sentence = sentence.strip()
        if len(sentence) < 40:
            continue
        score = 1
        if re.search(r"\b(announced|seeks|seeking|reported|approved|denied|said|will|reviewing|established)\b", sentence, re.I):
            score = 2
        ranked.append((score, sentence))
    if ranked:
        ranked.sort(key=lambda item: (-item[0], len(item[1])))
        sentence = ranked[0][1]
        if len(sentence) > 320:
            sentence = sentence[:320].rsplit(" ", 1)[0] + "…"
        return sentence
    if len(body) > 280:
        return body[:280].rsplit(" ", 1)[0] + "…"
    return body


def extract_date(text: str) -> str:
    patterns = [
        r"\b(20\d{2})-(\d{2})-(\d{2})\b",
        r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b",
        r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b",
    ]
    months = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
    }
    for pattern in patterns:
        match = re.search(pattern, text or "", re.I)
        if not match:
            continue
        groups = match.groups()
        if len(groups) == 3 and groups[0].isdigit() and len(groups[0]) == 4:
            return f"{groups[0]}-{groups[1]}-{groups[2]}"
        if groups[0].isalpha():
            return f"{groups[2]}-{months[groups[0].lower()]}-{int(groups[1]):02d}"
        month, day, year = int(groups[0]), int(groups[1]), groups[2]
        if 1 <= month <= 12 and 1 <= day <= 31:
            return f"{year}-{month:02d}-{day:02d}"
    return ""


def extract_source(text: str, filename: str) -> str:
    hay = fold(text + " " + filename)
    for label, needles in SOURCES:
        if any(name_in_text(hay, needle.strip()) or needle in hay for needle in needles):
            return label
    return ""


def extract_place(text: str) -> tuple[str, str]:
    hay = fold(text)
    tmk = re.search(r"\bTMKs?\b[^.]{0,80}", text or "", re.I)
    for label, kind in PLACES:
        if fold(label) in hay:
            place = label
            if tmk and kind != "road":
                return (place + ", " + re.sub(r"\s+", " ", tmk.group(0)).strip()), "point"
            if re.search(r"\b(TMK|parcel|site|lot)\b", text or "", re.I) and kind == "region":
                return place, "point"
            return place, kind
    if tmk:
        return re.sub(r"\s+", " ", tmk.group(0)).strip(), "point"
    return "", ""


def extract_timeline(text: str) -> str:
    body = re.sub(r"\s+", " ", text or "")
    patterns = [
        r"(?:expected completion|completion(?: date| scheduled)?|complete(?:d)? by|occupancy|opening)[^.]{0,90}",
        r"decision due [^.]{0,60}",
        r"scheduled(?: for)? [^.]{0,70}",
        r"Q[1-4]\s+20\d{2}",
    ]
    for pattern in patterns:
        match = re.search(pattern, body, re.I)
        if match:
            found = match.group(0).strip(" ,;:-")
            if len(found) >= 6:
                return found[:180]
    return ""


def name_in_text(hay: str, name: str) -> bool:
    needle = fold(name)
    if len(needle) <= 5:
        return re.search(r"(?<![a-z0-9])" + re.escape(needle) + r"(?![a-z0-9])", hay) is not None
    return needle in hay


ACRONYMS = {
    "DEM": "Department of Emergency Management",
    "DPP": "Department of Planning and Permitting",
    "DLNR": "Department of Land and Natural Resources",
    "HHFDC": "Hawaii Housing Finance and Development Corporation",
    "LUC": "Land Use Commission",
    "HART": "Honolulu Authority for Rapid Transportation",
}


def drop_redundant_acronyms(names: list[str]) -> list[str]:
    folded = {fold(name) for name in names}
    keep: list[str] = []
    for name in names:
        full = ACRONYMS.get(name)
        if full and fold(full) in folded:
            continue
        keep.append(name)
    return keep


def extract_parties(text: str) -> tuple[str, str]:
    hay = fold(text)
    gov: list[str] = []
    other: list[str] = []
    for name in GOV_PARTIES:
        if name_in_text(hay, name) and name not in gov:
            gov.append(name)
    for name in OTHER_PARTIES:
        if name_in_text(hay, name) and name not in other:
            other.append(name)
    return "; ".join(drop_redundant_acronyms(gov)), "; ".join(drop_redundant_acronyms(other))


def source_type(suffix: str) -> str:
    if suffix == ".pdf":
        return "PDF"
    if suffix == ".docx":
        return "Word"
    if suffix in {".txt", ".md", ".text"}:
        return "Text"
    return "Link"


def safe_name(name: str) -> str:
    stem = Path(name).stem
    suffix = Path(name).suffix.lower()
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._") or "upload"
    return f"{date.today().isoformat()}_{uuid.uuid4().hex[:8]}_{stem[:80]}{suffix}"


def empty_item() -> dict:
    return {
        "id": "",
        "date": "",
        "headline": "",
        "source": "",
        "place": "",
        "locationType": "",
        "summary": "",
        "timeline": "",
        "governmentParties": "",
        "otherParties": "",
        "sourceUrl": "",
        "sourceType": "",
        "sourceFile": "",
        "archived": False,
        "needsReview": True,
    }


def extract_fields(text: str, filename: str, links: list[str], extra: dict[str, str]) -> dict:
    item = empty_item()
    place, location_type = extract_place(text)
    gov, other = extract_parties(text)
    item["headline"] = (extra.get("headline") or "").strip() or first_title(text, filename)
    item["source"] = extract_source(text, filename)
    item["place"] = place
    item["locationType"] = location_type
    item["summary"] = one_sentence(text)
    item["timeline"] = extract_timeline(text)
    item["governmentParties"] = gov
    item["otherParties"] = other
    item["sourceUrl"] = (extra.get("sourceUrl") or extra.get("link") or "").strip() or (links[0] if links else "")
    item["date"] = extract_date(text)
    if extra.get("note"):
        note = extra["note"].strip()
        if note and note not in (item["summary"] or ""):
            item["summary"] = (note + " " + (item["summary"] or "")).strip()
    return item


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


def draft_path(draft_id: str) -> Path:
    if not re.fullmatch(r"[a-zA-Z0-9_-]{4,40}", draft_id or ""):
        raise ValueError("Invalid draft id")
    return DRAFT_DIR / f"{draft_id}.json"


def create_draft(fields: dict[str, str], files: dict[str, tuple[str, bytes]]) -> tuple[int, dict]:
    filename = ""
    stored_rel = ""
    suffix = ""
    text = ""
    links: list[str] = []
    if "file" in files:
        filename, content = files["file"]
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED:
            return 400, {"error": "Use a PDF, Word (.docx), or text file."}
        if len(content) > MAX_BYTES:
            return 400, {"error": "File is over 20 MB."}
        stored = UPLOAD_DIR / safe_name(filename)
        stored.write_bytes(content)
        stored_rel = str(stored.relative_to(ROOT)).replace("\\", "/")
        text, links = extract_text(stored)
    elif not (fields.get("sourceUrl") or fields.get("link") or "").strip():
        return 400, {"error": "Choose a PDF, Word, or text file."}

    item = extract_fields(text, filename or "link", links, fields)
    item["sourceType"] = source_type(suffix) if suffix else "Link"
    item["sourceFile"] = stored_rel
    draft_id = "draft-" + uuid.uuid4().hex[:10]
    excerpt = re.sub(r"\s+", " ", text).strip()[:1500]
    payload = {"draftId": draft_id, "item": item, "excerpt": excerpt, "originalName": filename}
    draft_path(draft_id).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return 200, payload


def read_draft(draft_id: str) -> tuple[int, dict]:
    path = draft_path(draft_id)
    if not path.exists():
        return 404, {"error": "That draft is gone. Upload the file again."}
    return 200, json.loads(path.read_text(encoding="utf-8"))


def bool_flag(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {"1", "true", "on", "yes"}


def normalized_item(fields: dict, fallback: dict | None = None) -> dict:
    base = empty_item()
    if fallback:
        base.update({key: fallback.get(key, base[key]) for key in base})
    for key in base:
        if key in fields and fields[key] is not None:
            base[key] = fields[key]
    base["headline"] = str(base.get("headline") or "").strip()
    base["archived"] = bool_flag(base.get("archived"))
    base["needsReview"] = False
    if not base.get("id"):
        base["id"] = "news-" + uuid.uuid4().hex[:10]
    location_type = str(base.get("locationType") or "").strip().lower()
    if location_type in {"dot", "site"}:
        location_type = "point"
    if location_type not in {"point", "road", "region"}:
        location_type = ""
    base["locationType"] = location_type
    return base


def save_item(fields: dict) -> tuple[int, dict]:
    headline = str(fields.get("headline") or "").strip()
    if not headline:
        return 400, {"error": "Add a document title before saving."}
    fallback = None
    draft_id = str(fields.get("draftId") or "").strip()
    if draft_id:
        status, draft = read_draft(draft_id)
        if status != 200:
            return status, draft
        fallback = draft.get("item") or {}
    elif fields.get("id"):
        data = load_news()
        for existing in data.get("items") or []:
            if existing.get("id") == fields.get("id"):
                fallback = existing
                break
    item = normalized_item(fields, fallback)
    data = load_news()
    items = data.setdefault("items", [])
    for index, existing in enumerate(items):
        if existing.get("id") == item["id"]:
            items[index] = item
            break
    else:
        items.insert(0, item)
    save_news(data)
    if draft_id:
        try:
            draft_path(draft_id).unlink(missing_ok=True)
        except OSError:
            pass
    return 200, {"ok": True, "item": item}


def set_archived(item_id: str, archived: bool) -> tuple[int, dict]:
    data = load_news()
    for item in data.get("items") or []:
        if item.get("id") == item_id:
            item["archived"] = archived
            save_news(data)
            return 200, {"ok": True, "item": item}
    return 404, {"error": "News item not found."}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), format % args))

    def send_json(self, status: int, payload: dict) -> None:
        raw_status, raw, content_type = json_bytes(payload, status)
        self.send_response(raw_status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def read_request_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BYTES + 1024 * 1024:
            return b""
        return self.rfile.read(length) if length else b""

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = posixpath.normpath(unquote(parsed.path))
        query = parse_qs(parsed.query)
        if path == "/api/draft":
            draft_id = (query.get("id") or [""])[0]
            try:
                status, payload = read_draft(draft_id)
            except ValueError:
                status, payload = 400, {"error": "Invalid draft id."}
            self.send_json(status, payload)
            return
        self.path = path
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = posixpath.normpath(unquote(parsed.path))
        body = self.read_request_body()
        content_type = (self.headers.get("Content-Type") or "").lower()
        try:
            if path == "/api/draft":
                headers = {key: value for key, value in self.headers.items()}
                fields, files = parse_multipart(headers, body)
                status, payload = create_draft(fields, files)
            elif path == "/api/news":
                fields = json.loads(body.decode("utf-8")) if body else {}
                if "multipart/form-data" in content_type:
                    headers = {key: value for key, value in self.headers.items()}
                    fields, _files = parse_multipart(headers, body)
                status, payload = save_item(fields)
            elif path == "/api/archive":
                fields = json.loads(body.decode("utf-8")) if body else {}
                item_id = str(fields.get("id") or "")
                status, payload = set_archived(item_id, bool_flag(fields.get("archived", True)))
            else:
                self.send_error(404, "Not found")
                return
        except Exception as exc:
            status, payload = 500, {"error": "Could not save that item."}
            print("api error:", exc)
        self.send_json(status, payload)


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
