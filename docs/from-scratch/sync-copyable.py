"""Refresh/check the documentation-only text source snapshot.

Run at the repository root:
    python docs/from-scratch/sync-copyable.py
    python docs/from-scratch/sync-copyable.py --check

The explicit allowlist avoids copying .env files, secrets, binary media, and Git data.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DESTINATION = Path(__file__).resolve().parent / "copyable"


def source_files() -> list[Path]:
    paths: list[Path] = []
    paths += [
        path for path in (ROOT / "frontend/src").rglob("*")
        if path.is_file() and path.suffix in {".ts", ".tsx", ".css", ".json", ".svg"}
    ]
    paths += list((ROOT / "frontend/scripts").glob("*.mjs"))
    paths += list((ROOT / "supabase/migrations").glob("*.sql"))
    paths += list((ROOT / "supabase/tests").glob("*.sql"))
    paths += list((ROOT / "tools").glob("*.py"))
    paths += list((ROOT / "frontend/public/pokerogue/LICENSES").glob("*.txt"))
    paths += [
        ROOT / name for name in (
            "package.json",
            "package-lock.json",
            "frontend/.env.example",
            "frontend/package.json",
            "frontend/package-lock.json",
            "frontend/sprite-ids.json",
            "frontend/index.html",
            "frontend/public/favicon.svg",
            "frontend/vite.config.ts",
            "frontend/tsconfig.json",
            "frontend/tsconfig.app.json",
            "frontend/tsconfig.node.json",
            "supabase/config.toml",
            "judge-data/question-tests.json",
            "frontend/public/pokerogue/ATTRIBUTION.md",
            "frontend/public/pokerogue/REUSE.toml",
        )
    ]
    result = sorted({path.resolve() for path in paths if path.is_file()})
    for path in result:
        if not path.is_relative_to(ROOT):
            raise ValueError(f"Source escaped repository: {path}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="only report snapshot drift")
    args = parser.parse_args()
    sources = source_files()
    changed: list[str] = []
    lines = [
        "# Copyable source manifest",
        "",
        "This is a snapshot of repository text files. Paths below are relative to the project root. "
        "Copy a file from this folder to the same path in your new project. "
        "Binary art/audio and large public animation asset data are explained in lesson 6 and are not mirrored here.",
        "",
        "| File | SHA-256 |",
        "| --- | --- |",
    ]
    for source in sources:
        relative = source.relative_to(ROOT)
        target = DESTINATION / relative
        raw = source.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        lines.append(f"| [{relative.as_posix()}]({relative.as_posix()}) | `{digest}` |")
        if not target.is_file() or target.read_bytes() != raw:
            changed.append(relative.as_posix())
            if not args.check:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(raw)

    manifest = DESTINATION / "SNAPSHOT-MANIFEST.md"
    content = "\n".join(lines) + "\n"
    if not manifest.is_file() or manifest.read_text(encoding="utf-8") != content:
        changed.append("SNAPSHOT-MANIFEST.md")
        if not args.check:
            manifest.parent.mkdir(parents=True, exist_ok=True)
            manifest.write_text(content, encoding="utf-8")

    if changed:
        print(("Out of date" if args.check else "Updated") + f": {len(changed)} files")
        for name in changed[:20]:
            print(" -", name)
        if len(changed) > 20:
            print(f" ... and {len(changed) - 20} more")
        return 1 if args.check else 0
    print(f"Copyable snapshot matches {len(sources)} source files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
