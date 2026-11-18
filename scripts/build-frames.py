"""Build the scroll frame atlases from the four original videos with FFmpeg."""

import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public" / "media"
FPS = 15
COLUMNS = 4
ROWS = 2
SHEETS = MEDIA / "frames"


def build_clip(clip, width, height):
    directory = SHEETS / clip
    directory.mkdir(parents=True, exist_ok=True)
    filters = (
        f"fps={FPS}:start_time=0,scale={width}:{height}:flags=lanczos,"
        f"showinfo,tile={COLUMNS}x{ROWS}"
    )
    result = subprocess.run(
        [
            "ffmpeg", "-nostdin", "-y", "-threads", "2", "-filter_threads", "2",
            "-i", str(MEDIA / f"{clip}.mp4"), "-an", "-vf", filters,
            "-c:v", "libaom-av1", "-still-picture", "1", "-g", "1", "-crf", "34",
            "-cpu-used", "7", "-threads", "2", "-f", "segment",
            "-segment_format", "avif", "-segment_time", "0.01", "-reset_timestamps", "1",
            str(directory / "%03d.avif"),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr)

    frames = [int(number) for number in re.findall(r"showinfo[^\n]+?\bn:\s*(\d+)\s+pts:", result.stderr)]
    if not frames:
        raise RuntimeError(f"FFmpeg reported no frames for {clip}")
    count = frames[-1] + 1
    sheet_count = (count + COLUMNS * ROWS - 1) // (COLUMNS * ROWS)
    for sheet in directory.glob("*.avif"):
        if sheet.stem.isdecimal() and int(sheet.stem) >= sheet_count:
            sheet.unlink()
    print(f"{clip}: {count} frames in {sheet_count} sheets", flush=True)
    return {"count": count, "width": width, "height": height}


def main():
    heights = {"library": 640, "notes": 648, "writing": 648, "friends": 648}
    with ThreadPoolExecutor(max_workers=2) as executor:
        jobs = {clip: executor.submit(build_clip, clip, 360, height) for clip, height in heights.items()}
        clips = {clip: job.result() for clip, job in jobs.items()}
    manifest = {"fps": FPS, "columns": COLUMNS, "rows": ROWS, "clips": clips}
    (ROOT / "src" / "frame-atlas.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
