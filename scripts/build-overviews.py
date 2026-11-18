"""Generate light chapter previews from the existing scroll footage."""

import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from math import ceil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public" / "media"
CLIPS = json.loads((ROOT / "src" / "frame-atlas.json").read_text())
STRIDE, COLUMNS, WIDTH = 5, 6, 96


def build_overview(chapter):
    name, clip = chapter
    count = ceil(clip["count"] / STRIDE)
    rows = ceil(count / COLUMNS)
    height = round(WIDTH * clip["height"] / clip["width"])
    filters = (
        f"fps={CLIPS['fps']}:start_time=0,select=not(mod(n\\,{STRIDE})),"
        f"scale={WIDTH}:{height},tile={COLUMNS}x{rows}"
    )
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-nostdin", "-y", "-threads", "2",
            "-filter_threads", "2", "-i", str(MEDIA / f"{name}.mp4"),
            "-vf", filters, "-frames:v", "1", "-c:v", "libwebp", "-quality", "53",
            str(MEDIA / "frames" / f"{name}-overview.webp"),
        ],
        check=True,
    )


with ThreadPoolExecutor(max_workers=2) as executor:
    list(executor.map(build_overview, CLIPS["clips"].items()))
