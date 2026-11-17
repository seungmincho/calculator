"""Read-only inspection of the PDF produced by Chromium's native print renderer."""
import json
import pathlib
import sys

from pypdf import PdfReader

source = pathlib.Path(sys.argv[1])
reader = PdfReader(source)
pages = [page.extract_text() or "" for page in reader.pages]
source.with_suffix(".extracted.txt").write_text("\n\f\n".join(pages), encoding="utf-8")
# Chrome's Windows system fallback writes tabular figures as private-use Unicode
# in Type3 ToUnicode. The first rendered page was visually checked: E071..E07A
# are 0..9 and E095 is colon. Preserve raw extraction as separate evidence.
tabular_map = {0xE071 + digit: ord("0") + digit for digit in range(10)}
tabular_map[0xE095] = ord(":")
text = "\n\f\n".join(pages)
normalized = text.translate(tabular_map)
source.with_suffix(".normalized.txt").write_text(normalized, encoding="utf-8")
print(json.dumps({"pages": len(pages), "pageCharacters": [len(text) for text in pages], "bytes": source.stat().st_size, "windowsTabularPuaNormalized": text != normalized}))
