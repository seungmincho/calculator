"""Render the September 2026 official PDFs into image crops used by maps.ts.

Requires pypdfium2 and Pillow. Arguments: Lotte PDF, Gyeongju PDF.
Download sources and provenance: docs/theme-park-planners.md.
"""
import sys
from pathlib import Path
import pypdfium2 as pdfium

sources = {"lotte": sys.argv[1], "gjw": sys.argv[2]}
out = Path("public/park-assets")
out.mkdir(exist_ok=True)
jobs = [
    ("lotte", 0, "lotte-b1", (580, 115, 1395, 720), (1700, 957)),
    ("lotte", 1, "lotte-1f", (340, 60, 1270, 705), (1700, 957)),
    ("lotte", 2, "lotte-2f", (130, 115, 870, 400), (1700, 957)),
    ("lotte", 2, "lotte-3f", (535, 290, 1210, 535), (1700, 957)),
    ("lotte", 2, "lotte-4f", (925, 430, 1635, 710), (1700, 957)),
    ("lotte", 3, "lotte-magic", (280, 55, 985, 715), (1700, 957)),
    ("gjw", 1, "gyeongju-world", (180, 30, 1008, 700), (1038, 868)),
]
for park, page_number, name, bounds, reference in jobs:
    with pdfium.PdfDocument(sources[park]) as document:
        page = document[page_number]
        image = page.render(scale=2500 / page.get_width()).to_pil().convert("RGB")
        w, h = image.size
        rw, rh = reference
        crop = image.crop((round(bounds[0] / rw * w), round(bounds[1] / rh * h),
                           round(bounds[2] / rw * w), round(bounds[3] / rh * h)))
        crop.save(out / (name + ".webp"), quality=88)
        print(name, crop.size)
