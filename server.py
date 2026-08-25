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
import zlib
from datetime import date, datetime
from email import policy
from email.parser import BytesParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent
NEWS_PATH = ROOT / "data" / "news.json"
DRAFT_DIR = ROOT / "data" / "drafts"
UNDO_DIR = ROOT / "data" / "undo"
SNAP_DIR = ROOT / "data" / "snapshots"
UPLOAD_DIR = ROOT / "uploads"
ALLOWED = {".pdf", ".docx", ".txt", ".md", ".text"}
MAX_BYTES = 20 * 1024 * 1024
UNDO_MAX = 3
PORT = 8765

UPLOAD_DIR.mkdir(exist_ok=True)
DRAFT_DIR.mkdir(parents=True, exist_ok=True)
UNDO_DIR.mkdir(parents=True, exist_ok=True)
SNAP_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = [
    ("Civil Beat", ("civil beat", "civilbeat")),
    ("Honolulu Star-Advertiser", (
        "honolulu star-advertiser",
        "honolulu star advertiser",
        "star-advertiser",
        "star advertiser",
        "staradvertiser",
        "honolulu star",
    )),
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


def undo_paths() -> list[Path]:
    if not UNDO_DIR.exists():
        return []
    return sorted(path for path in UNDO_DIR.glob("*.json") if path.is_file())


def undo_remaining() -> int:
    return len(undo_paths())


def push_undo_if_changed(next_text: str) -> None:
    if not NEWS_PATH.exists():
        return
    old = NEWS_PATH.read_text(encoding="utf-8")
    if old == next_text:
        return
    UNDO_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    (UNDO_DIR / (stamp + ".json")).write_text(old, encoding="utf-8")
    files = undo_paths()
    extra = len(files) - UNDO_MAX
    for path in files[:max(0, extra)]:
        path.unlink(missing_ok=True)


def save_news(data: dict, *, record_undo: bool = True) -> None:
    data.setdefault("meta", {})["updated"] = date.today().isoformat()
    NEWS_PATH.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if record_undo:
        push_undo_if_changed(text)
    NEWS_PATH.write_text(text, encoding="utf-8")


def undo_status() -> tuple[int, dict]:
    return 200, {"ok": True, "remaining": undo_remaining()}


def snapshot_board(fields: dict | None) -> tuple[int, dict]:
    if isinstance(fields, dict) and "items" in fields:
        save_news(fields, record_undo=True)
    if not NEWS_PATH.exists():
        return 400, {"error": "Nothing to save."}
    SNAP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = SNAP_DIR / ("news-" + stamp + ".json")
    dest.write_text(NEWS_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    return 200, {"ok": True, "file": dest.name, "remaining": undo_remaining()}


def restore_undo() -> tuple[int, dict]:
    files = undo_paths()
    if not files:
        return 400, {"error": "Nothing to reverse."}
    latest = files[-1]
    NEWS_PATH.write_text(latest.read_text(encoding="utf-8"), encoding="utf-8")
    latest.unlink(missing_ok=True)
    return 200, {"ok": True, "remaining": undo_remaining()}


SKIP_STREAM = (
    b"/FontFile",
    b"/Type1C",
    b"/CIDFontType0C",
    b"/OpenType",
    b"/Subtype/Image",
    b"/Subtype /Image",
    b"/DCTDecode",
    b"/JPXDecode",
    b"/JBIG2Decode",
    b"/CCITTFaxDecode",
)


def inflate_bytes(payload: bytes) -> bytes | None:
    for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
        try:
            return zlib.decompress(payload, wbits)
        except Exception:
            continue
    return None


def iter_pdf_streams(data: bytes):
    pos = 0
    size = len(data)
    while True:
        idx = data.find(b"stream", pos)
        if idx < 0:
            return
        if idx > 0 and data[idx - 1] not in b" \t\r\n><":
            pos = idx + 6
            continue
        after = idx + 6
        if after < size and data[after:after + 2] == b"\r\n":
            start = after + 2
        elif after < size and data[after] in b"\r\n":
            start = after + 1
        else:
            pos = idx + 6
            continue
        end = data.find(b"endstream", start)
        if end < 0:
            return
        obj = data.rfind(b"obj", max(0, idx - 600), idx)
        dict_start = data.rfind(b"<<", obj if obj >= 0 else max(0, idx - 400), idx)
        header = data[dict_start:idx] if dict_start >= 0 else data[max(0, idx - 200):idx]
        payload = data[start:end]
        if payload.endswith(b"\r\n"):
            payload = payload[:-2]
        elif payload.endswith(b"\n") or payload.endswith(b"\r"):
            payload = payload[:-1]
        yield header, payload
        pos = end + 9


def read_pdf_literal(text: str, index: int) -> tuple[str, int]:
    size = len(text)
    index += 1
    depth = 1
    out: list[str] = []
    while index < size and depth:
        ch = text[index]
        if ch == "\\" and index + 1 < size:
            nxt = text[index + 1]
            mapping = {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "(": "(", ")": ")", "\\": "\\"}
            if nxt in mapping:
                out.append(mapping[nxt])
                index += 2
                continue
            if nxt in "01234567":
                octal = nxt
                index += 2
                while index < size and len(octal) < 3 and text[index] in "01234567":
                    octal += text[index]
                    index += 1
                out.append(chr(int(octal, 8)))
                continue
            out.append(nxt)
            index += 2
            continue
        if ch == "(":
            depth += 1
            out.append(ch)
        elif ch == ")":
            depth -= 1
            if depth:
                out.append(ch)
        else:
            out.append(ch)
        index += 1
    return "".join(out), index


def pdf_utf16(hex_value: str) -> str:
    hex_value = re.sub(r"\s+", "", hex_value)
    if len(hex_value) % 4:
        hex_value = hex_value.zfill(((len(hex_value) + 3) // 4) * 4)
    chars = []
    for i in range(0, len(hex_value), 4):
        code = int(hex_value[i:i + 4], 16)
        if code:
            chars.append(chr(code))
    return "".join(chars)


def cmap_put(cmap: dict[str, str], src: str, dst: str) -> None:
    src = src.upper()
    cmap[src] = dst
    cmap[src.zfill(2)] = dst
    cmap[src.zfill(4)] = dst


def parse_tounicode(text: str) -> dict[str, str]:
    cmap: dict[str, str] = {}
    for block in re.findall(r"beginbfchar(.*?)endbfchar", text, re.S | re.I):
        for src, dst in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            cmap_put(cmap, src, pdf_utf16(dst))
    for block in re.findall(r"beginbfrange(.*?)endbfrange", text, re.S | re.I):
        for src1, src2, items in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([^\]]+)\]",
            block,
        ):
            dests = re.findall(r"<([0-9A-Fa-f]+)>", items)
            start = int(src1, 16)
            for offset, dest in enumerate(dests):
                cmap_put(cmap, format(start + offset, "X").zfill(len(src1)), pdf_utf16(dest))
        for src1, src2, dst in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>",
            block,
        ):
            start = int(src1, 16)
            end = int(src2, 16)
            base = int(dst[:4], 16) if dst else 0
            for offset, cid in enumerate(range(start, end + 1)):
                cmap_put(cmap, format(cid, "X").zfill(len(src1)), chr(base + offset))
    return cmap


def merge_cmaps(maps: list[dict[str, str]]) -> dict[str, str]:
    merged: dict[str, str] = {}
    for cmap in maps:
        for key, value in cmap.items():
            old = merged.get(key)
            if old is None or (not any(ch.isalpha() for ch in old) and any(ch.isalpha() for ch in value)):
                merged[key] = value
    return merged


def decode_hex_string(hex_value: str, cmap: dict[str, str]) -> str:
    hex_value = re.sub(r"\s+", "", hex_value).upper()
    out: list[str] = []
    i = 0
    while i < len(hex_value):
        matched = False
        for width in (4, 2):
            if i + width <= len(hex_value):
                token = hex_value[i:i + width]
                if token in cmap:
                    out.append(cmap[token])
                    i += width
                    matched = True
                    break
        if not matched:
            i += 2 if i + 2 <= len(hex_value) else 1
    return "".join(out)


def skip_ws(text: str, index: int) -> int:
    size = len(text)
    while index < size and text[index] in " \t\r\n":
        index += 1
    return index


def is_show_op(text: str, index: int) -> bool:
    return text.startswith("Tj", index) or (index < len(text) and text[index] in "'\"")


def collect_content_lines(content: bytes, cmap: dict[str, str] | None = None) -> list[tuple[float, str]]:
    if b"Tj" not in content and b"TJ" not in content:
        return []
    cmap = cmap or {}
    text = content.decode("latin-1", errors="ignore")
    size = len(text)
    index = 0
    lines: list[tuple[float, str]] = []
    current: list[str] = []
    font_size = 0.0
    line_size = 0.0

    def flush() -> None:
        nonlocal line_size
        if current:
            lines.append((line_size or font_size, "".join(current)))
            current.clear()
        line_size = font_size

    def add_text(piece: str) -> None:
        nonlocal line_size
        if piece:
            current.append(piece)
            line_size = max(line_size, font_size)

    def read_tf(at: int) -> None:
        nonlocal font_size, line_size
        j = at
        while j > 0 and text[j - 1] in " \t":
            j -= 1
        k = j
        while k > 0 and (text[k - 1].isdigit() or text[k - 1] == "."):
            k -= 1
        if k < j:
            try:
                font_size = float(text[k:j])
                if not current:
                    line_size = font_size
            except ValueError:
                pass

    while index < size:
        ch = text[index]
        if text.startswith("Tf", index) and (index + 2 == size or not text[index + 2].isalnum()):
            read_tf(index)
            index += 2
            continue
        if ch == "(":
            literal, index = read_pdf_literal(text, index)
            index = skip_ws(text, index)
            if is_show_op(text, index):
                add_text(literal)
                if text.startswith("Tj", index):
                    index += 2
                else:
                    flush()
                    index += 1
            continue
        if ch == "<" and index + 1 < size and text[index + 1] != "<":
            end = text.find(">", index)
            if end < 0:
                break
            hex_value = text[index + 1:end]
            index = skip_ws(text, end + 1)
            if is_show_op(text, index):
                add_text(decode_hex_string(hex_value, cmap))
                if text.startswith("Tj", index):
                    index += 2
                else:
                    flush()
                    index += 1
                continue
            index = end + 1
            continue
        if ch == "[":
            pieces: list[str] = []
            index += 1
            depth = 1
            while index < size and depth:
                if text[index] == "(":
                    literal, index = read_pdf_literal(text, index)
                    pieces.append(literal)
                    continue
                if text[index] == "<" and index + 1 < size and text[index + 1] != "<":
                    end = text.find(">", index)
                    if end < 0:
                        break
                    pieces.append(decode_hex_string(text[index + 1:end], cmap))
                    index = end + 1
                    continue
                if text[index] == "[":
                    depth += 1
                elif text[index] == "]":
                    depth -= 1
                    if depth == 0:
                        index += 1
                        break
                index += 1
            index = skip_ws(text, index)
            if text.startswith("TJ", index):
                add_text("".join(pieces))
                index += 2
            continue
        if text.startswith("T*", index) and (index + 2 == size or not text[index + 2].isalnum()):
            flush()
            index += 2
            continue
        if text.startswith("ET", index) and (index + 2 == size or not text[index + 2].isalnum()):
            flush()
            index += 2
            continue
        index += 1
    flush()
    cleaned: list[tuple[float, str]] = []
    for size_value, line in lines:
        line = re.sub(r"[ \t]+", " ", line.replace("\x00", " ")).strip()
        if line:
            cleaned.append((size_value, line))
    return cleaned


def title_from_font(runs: list[tuple[float, str]]) -> str:
    head = []
    for size_value, line in runs[:50]:
        line = re.sub(r"\s+", " ", line).strip(" -–—")
        if line:
            head.append((size_value, line))
    if not head:
        return ""

    def letters(value: str) -> int:
        return sum(ch.isalpha() for ch in value)

    sized = [row for row in head if letters(row[1]) >= 8 and len(row[1]) <= 240]
    pool = sized or [row for row in head if letters(row[1]) >= 4] or head
    max_size = max(row[0] for row in pool) or 1
    parts: list[str] = []
    started = False
    for size_value, line in head:
        if letters(line) < 6:
            if started:
                break
            continue
        if size_value >= max_size * 0.88:
            parts.append(line)
            started = True
        elif not started:
            continue
        else:
            break
    return re.sub(r"\s+", " ", " ".join(parts)).strip()[:300]


def pdf_info_title(data: bytes) -> str:
    match = re.search(rb"/Title\s*\((?:\\.|[^\\)])*\)", data)
    if not match:
        return ""
    raw = match.group(0).split(b"(", 1)[1][:-1]
    text = raw.decode("latin-1", errors="replace")
    text = text.replace("\x18", "ʻ").replace("\x19", "ʻ")
    text = re.sub(r"\\([nrtbf()\\])", lambda m: {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f"}.get(m.group(1), m.group(1)), text)
    return re.sub(r"\s+", " ", text).strip(" -–—")


def extract_pdf_text(path: Path) -> tuple[str, list[str]]:
    data = path.read_bytes()
    raw = data.decode("latin-1", errors="ignore")
    links = find_urls(raw)
    links.extend(re.findall(r"/URI\s*\((https?://[^)]+)\)", raw))
    contents: list[bytes] = []
    cmaps: list[dict[str, str]] = []
    for header, payload in iter_pdf_streams(data):
        if any(marker in header for marker in SKIP_STREAM):
            continue
        content = payload
        if b"/FlateDecode" in header or b"/Flate" in header:
            inflated = inflate_bytes(payload)
            if inflated is None:
                continue
            content = inflated
        if b"beginbfchar" in content or b"beginbfrange" in content:
            cmaps.append(parse_tounicode(content.decode("latin-1", errors="ignore")))
            continue
        if len(content) > 2_000_000 and b"Tj" not in content and b"TJ" not in content:
            continue
        contents.append(content)
    cmap = merge_cmaps(cmaps)
    runs: list[tuple[float, str]] = []
    for content in contents:
        runs.extend(collect_content_lines(content, cmap))
    text = "\n".join(line for _size, line in runs).strip()
    text = re.sub(r"-\s*\n\s*", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    heading = title_from_font(runs)
    if heading:
        first = next((line.strip() for line in text.splitlines() if line.strip()), "")
        if fold(heading) not in fold(first):
            text = heading + ("\n\n" + text if text else "")
    if not runs:
        text = (
            "No readable article text was found in this PDF. "
            "It may be a scan or an image. Please fill in the fields from the original document."
        )
    links.extend(find_urls(text))
    return text, unique_keep(links)


def usable_document_text(text: str) -> bool:
    letters = sum(ch.isalpha() for ch in text)
    if letters < 40:
        return False
    return letters / max(len(text), 1) >= 0.30


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
        return extract_pdf_text(path)
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
    for name in org_skip():
        if len(name) < 8:
            continue
        if folded == name:
            return True
        if folded.endswith(name) and len(folded) - len(name) <= 28:
            return True
    if re.match(r"^(page|http|www\.|\d{1,2}/\d{1,2}/\d{2,4})", text, re.I):
        return True
    if re.match(r"^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d", folded):
        return True
    return False


def first_title(text: str, filename: str) -> str:
    for line in (text or "").splitlines():
        line = re.sub(r"\s+", " ", line).strip(" -–—")
        if len(line) >= 4 and not line.lower().startswith("no readable article"):
            return line[:300]
    stem = Path(filename).stem
    stem = re.sub(r"[_-]+", " ", stem).strip()
    return stem[:140]


def extract_source(text: str, filename: str) -> str:
    lines = [re.sub(r"\s+", " ", line).strip() for line in (text or "").splitlines() if line.strip()]
    tail = "\n".join(lines[-25:])
    tail = tail + "\n" + (text or "")[-2000:]
    hay = fold(tail)
    for label, needles in SOURCES:
        if any(needle in hay for needle in needles):
            return label
    hay_name = fold(filename)
    for label, needles in SOURCES:
        if any(needle in hay_name for needle in needles):
            return label
    return ""


def one_sentence(text: str) -> str:
    lines = []
    for line in (text or "").splitlines():
        cleaned = re.sub(r"\s+", " ", line).strip()
        if cleaned and not is_header_line(cleaned):
            lines.append(cleaned)
    body = " ".join(lines) or re.sub(r"\s+", " ", (text or "")).strip()
    if not body:
        return ""
    for sentence in re.split(r"(?<=[.!?])\s+", body):
        sentence = sentence.strip()
        if len(sentence) < 40:
            continue
        if sentence.lower().startswith("http") or "%2F" in sentence:
            continue
        if sentence.lower().startswith("no readable article"):
            continue
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


def extract_place(text: str) -> tuple[str, str]:
    hay = fold(text)
    tmk = re.search(r"\bTMKs?\b[^.]{0,80}", text or "", re.I)
    for label, kind in PLACES:
        if fold(label) in hay:
            place = label
            if tmk and kind != "road":
                return (place + ", " + re.sub(r"\s+", " ", tmk.group(0)).strip()), "point"
            if tmk and kind == "region":
                return place, "point"
            return place, kind
    if tmk:
        return re.sub(r"\s+", " ", tmk.group(0)).strip(), "point"
    return "", ""


MONTH_WORDS = {
    "january": "01", "jan": "01",
    "february": "02", "feb": "02",
    "march": "03", "mar": "03",
    "april": "04", "apr": "04",
    "may": "05",
    "june": "06", "jun": "06",
    "july": "07", "jul": "07",
    "august": "08", "aug": "08",
    "september": "09", "sept": "09", "sep": "09",
    "october": "10", "oct": "10",
    "november": "11", "nov": "11",
    "december": "12", "dec": "12",
}
MONTH_WORD_RE = r"January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sept\.?|Sep\.?|Oct\.?|Nov\.?|Dec\.?"
MONTH_YEAR_CHUNK = (
    r"(?:(?:" + MONTH_WORD_RE + r")\s+20\d{2}"
    r"|20\d{2}-(?:0[1-9]|1[0-2])(?:-\d{2})?"
    r"|(?:0?[1-9]|1[0-2])/20\d{2}"
    r"|Q[1-4]\s*20\d{2})"
)


def month_number(token: str) -> str:
    raw = re.sub(r"[.]", "", (token or "").strip().lower())
    if raw in MONTH_WORDS:
        return MONTH_WORDS[raw]
    if raw.isdigit() and 1 <= int(raw) <= 12:
        return f"{int(raw):02d}"
    return ""


def parse_month_year(chunk: str, role: str = "begin") -> str:
    text = re.sub(r"\s+", " ", (chunk or "")).strip(" ,;:-")
    if not text:
        return ""
    quarter = re.fullmatch(r"Q([1-4])\s*(20\d{2})", text, re.I)
    if quarter:
        number = int(quarter.group(1))
        year = quarter.group(2)
        month = (number - 1) * 3 + 1 if role == "begin" else number * 3
        return f"{year}-{month:02d}"
    named = re.fullmatch(rf"({MONTH_WORD_RE})\s+(20\d{{2}})", text, re.I)
    if named:
        month = month_number(named.group(1))
        return f"{named.group(2)}-{month}" if month else ""
    iso = re.fullmatch(r"(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?", text)
    if iso:
        return f"{iso.group(1)}-{iso.group(2)}"
    slash = re.fullmatch(r"(0?[1-9]|1[0-2])/(20\d{2})", text)
    if slash:
        return f"{slash.group(2)}-{int(slash.group(1)):02d}"
    return ""


def clean_month_year(value) -> str:
    text = str(value or "").strip()
    return parse_month_year(text, "begin")


def extract_begin_end(text: str) -> tuple[str, str]:
    body = re.sub(r"\s+", " ", text or "")
    begin = ""
    end = ""
    range_match = re.search(
        rf"(?:from|between)\s+({MONTH_YEAR_CHUNK})\s+(?:to|through|until|and)\s+({MONTH_YEAR_CHUNK})",
        body,
        re.I,
    )
    if not range_match:
        range_match = re.search(
            rf"({MONTH_YEAR_CHUNK})\s+(?:to|through|until|–|—|-)\s+({MONTH_YEAR_CHUNK})",
            body,
            re.I,
        )
    if range_match:
        begin = parse_month_year(range_match.group(1), "begin")
        end = parse_month_year(range_match.group(2), "end")
        return begin, end
    begin_match = re.search(
        rf"(?:begin(?:s|ning)?|start(?:s|ing|ed)?|groundbreaking)(?:\s+\w+){{0,8}}?(?:\s+(?:in|on|of))?\s+({MONTH_YEAR_CHUNK})",
        body,
        re.I,
    )
    if begin_match:
        begin = parse_month_year(begin_match.group(1), "begin")
    end_match = re.search(
        rf"(?:expected completion|completion(?: date)?|complete(?:d)?(?:\s+by)?|finish(?:ed|es)?|opening|occupancy|deadline)(?:\s+\w+){{0,8}}?(?:\s+(?:by|in|on|of))?\s+({MONTH_YEAR_CHUNK})",
        body,
        re.I,
    )
    if end_match:
        end = parse_month_year(end_match.group(1), "end")
    return begin, end


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
        "beginDate": "",
        "endDate": "",
        "governmentParties": "",
        "otherParties": "",
        "actionItem": "",
        "sourceUrl": "",
        "sourceType": "",
        "sourceFile": "",
        "archived": False,
        "needsReview": True,
        "documentText": "",
        "geometry": None,
    }


def extract_fields(text: str, filename: str, links: list[str], extra: dict[str, str]) -> dict:
    item = empty_item()
    if not usable_document_text(text):
        item["headline"] = (extra.get("headline") or "").strip() or first_title("", filename)
        item["sourceUrl"] = (extra.get("sourceUrl") or extra.get("link") or "").strip() or (links[0] if links else "")
        if extra.get("note"):
            item["summary"] = extra["note"].strip()
        item["documentText"] = text or ""
        return item
    place, location_type = extract_place(text)
    gov, other = extract_parties(text)
    item["headline"] = (extra.get("headline") or "").strip() or first_title(text, filename)
    item["source"] = extract_source(text, filename)
    item["place"] = place
    item["locationType"] = location_type
    item["summary"] = one_sentence(text)
    begin, end = extract_begin_end(text)
    item["beginDate"] = begin
    item["endDate"] = end
    item["governmentParties"] = gov
    item["otherParties"] = other
    item["sourceUrl"] = (extra.get("sourceUrl") or extra.get("link") or "").strip() or (links[0] if links else "")
    item["date"] = extract_date(text)
    item["documentText"] = text or ""
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
    excerpt = (item.get("documentText") or text or "").strip()
    if not excerpt:
        excerpt = (
            "No readable text was found in this file. "
            "It may be a scan or an image. Please fill in the fields from the original document."
        )
        item["documentText"] = excerpt
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


def as_lnglat(value) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        return None
    try:
        lng = float(value[0])
        lat = float(value[1])
    except (TypeError, ValueError):
        return None
    if not (-158.5 <= lng <= -157.5 and 21.2 <= lat <= 21.8):
        return None
    return [lng, lat]


def clean_geometry(value, location_type: str):
    if value in (None, "", {}, []):
        return None
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return None
    if not isinstance(value, dict):
        return None
    coords = value.get("coordinates")
    gtype = str(value.get("type") or "").strip()
    expected = {"point": "Point", "road": "LineString", "region": "Polygon"}.get(location_type)
    if expected:
        gtype = expected
    if gtype == "Point":
        point = as_lnglat(coords)
        if not point:
            return None
        return {"type": "Point", "coordinates": point, "approximate": bool(value.get("approximate")), "manual": bool(value.get("manual"))}
    if gtype == "LineString":
        if not isinstance(coords, list):
            return None
        line = [as_lnglat(pair) for pair in coords[:200]]
        line = [pair for pair in line if pair]
        if len(line) < 2:
            return None
        return {"type": "LineString", "coordinates": line, "approximate": bool(value.get("approximate")), "manual": bool(value.get("manual"))}
    if gtype == "Polygon":
        ring_src = coords
        if isinstance(coords, list) and coords and isinstance(coords[0], list) and coords[0] and isinstance(coords[0][0], (int, float)):
            ring_src = coords
        elif isinstance(coords, list) and coords:
            ring_src = coords[0]
        else:
            return None
        ring = [as_lnglat(pair) for pair in ring_src[:200]]
        ring = [pair for pair in ring if pair]
        if len(ring) < 3:
            return None
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        if len(ring) < 4:
            return None
        return {"type": "Polygon", "coordinates": [ring], "approximate": bool(value.get("approximate")), "manual": bool(value.get("manual"))}
    return None


def normalized_item(fields: dict, fallback: dict | None = None) -> dict:
    base = empty_item()
    if fallback:
        base.update({key: fallback.get(key, base[key]) for key in base})
    for key in base:
        if key in fields and fields[key] is not None:
            base[key] = fields[key]
    base["headline"] = str(base.get("headline") or "").strip()
    base["beginDate"] = clean_month_year(base.get("beginDate"))
    base["endDate"] = clean_month_year(base.get("endDate"))
    base["archived"] = bool_flag(base.get("archived"))
    base["needsReview"] = False
    if not base.get("id"):
        base["id"] = "news-" + uuid.uuid4().hex[:10]
    location_type = str(base.get("locationType") or "").strip().lower()
    if location_type in {"dot", "site"}:
        location_type = "point"
    if location_type == "line":
        location_type = "road"
    if location_type == "shape":
        location_type = "region"
    if location_type not in {"point", "road", "region"}:
        geom_kind = ""
        if isinstance(base.get("geometry"), dict):
            geom_kind = str(base.get("geometry").get("type") or "")
        location_type = {"Point": "point", "LineString": "road", "Polygon": "region"}.get(geom_kind, "")
    base["locationType"] = location_type
    if "geometry" in fields or base.get("geometry") is not None:
        base["geometry"] = clean_geometry(base.get("geometry"), location_type)
    return base


def save_item(fields: dict) -> tuple[int, dict]:
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
    if not item.get("headline"):
        return 400, {"error": "Add a document title before saving."}
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


def delete_item(item_id: str) -> tuple[int, dict]:
    data = load_news()
    items = data.get("items") or []
    kept = [item for item in items if item.get("id") != item_id]
    if len(kept) == len(items):
        return 404, {"error": "News item not found."}
    data["items"] = kept
    save_news(data)
    return 200, {"ok": True, "id": item_id}


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

    def end_headers(self) -> None:
        path = urlparse(self.path).path.lower()
        if path.endswith(("/", ".html", ".js", ".css", ".json")) or path in {"", "/"}:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

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
        if path == "/api/undo-status":
            status, payload = undo_status()
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
            elif path == "/api/delete":
                fields = json.loads(body.decode("utf-8")) if body else {}
                status, payload = delete_item(str(fields.get("id") or ""))
            elif path == "/api/snapshot":
                fields = json.loads(body.decode("utf-8")) if body else {}
                status, payload = snapshot_board(fields)
            elif path == "/api/undo":
                status, payload = restore_undo()
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
