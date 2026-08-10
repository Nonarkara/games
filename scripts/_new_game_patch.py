#!/usr/bin/env python3
"""
scripts/_new_game_patch.py — patches app.js, brainGuides.js, storage.js
to register a new NGS game. Idempotent (skips if already present).

Called by scripts/new-game.sh — do not run directly.
"""
import argparse
import pathlib
import re
import sys


def patch_app_js(p, game_id, code, title, wing, category, domain, age, desc, paper, renderer):
    src = p.read_text()
    changed = False

    # Add the import if missing
    imp = f"import {{ {renderer} }} from './games/{game_id}.js';"
    if renderer not in src:
        m = list(re.finditer(r"^import \{[^}]*\} from '\./games/[^']+';$", src, re.M))
        if not m:
            raise SystemExit("no trainer import block found in js/app.js")
        last = m[-1]
        src = src[: last.end()] + "\n" + imp + src[last.end():]
        changed = True
        print(f"  ✓ js/app.js — added {imp}")

    # Add the catalog entry if missing
    id_pattern = f"id: '{game_id}'"
    if id_pattern not in src:
        wing_pat = re.compile(rf"// ── {wing.upper()} ─[^\n]*\n")
        m = wing_pat.search(src)
        if not m:
            entry = (
                f"  {{ id: '{game_id}', code: '{code}', title: '{title}', wing: '{wing}', "
                f"category: '{category}', domain: '{domain}', age: '{age}', desc: '{desc}', "
                f"paper: '{paper}', tags: ['{category}'], renderer: {renderer} }},\n"
            )
            src = src.replace("];\n\nexport const", entry + "];\n\nexport const", 1)
        else:
            end = m.end()
            rest = src[end:]
            close = rest.find(" },\n")
            if close < 0:
                raise SystemExit("could not find insertion point after wing header")
            pos = end + close + len(" },\n")
            entry = (
                f"  {{ id: '{game_id}', code: '{code}', title: '{title}', wing: '{wing}', "
                f"category: '{category}', domain: '{domain}', age: '{age}', desc: '{desc}', "
                f"paper: '{paper}', tags: ['{category}'], renderer: {renderer} }},\n"
            )
            src = src[:pos] + entry + src[pos:]
        changed = True
        print(f"  ✓ js/app.js — added catalog entry for {game_id}")

    if changed:
        p.write_text(src)


def patch_brain_guides(p, game_id, domain):
    src = p.read_text()
    id_pattern = f"'{game_id}':"
    if id_pattern in src:
        return
    needle = "};\n\nexport const PAPER_LINKS"
    if needle not in src:
        raise SystemExit("could not find BRAIN_GUIDES close anchor")
    guide = (
        f"  '{game_id}': {{\n"
        f"    label: '{domain}', minutes: '3–5 min',\n"
        f"    practice: 'Use {domain} while learning the rules through feedback.',\n"
        f"    why: 'Games make a skill visible by connecting each decision to an immediate result.',\n"
        f"    tip: 'Play one short round, then name the strategy you would change next time.',\n"
        f"    stack: ['kahneman', 'plasticity', 'clear']\n"
        f"  }},\n"
        f"}};\n\nexport const PAPER_LINKS"
    )
    # Make sure the previous last entry has a trailing comma
    src = src.replace("  }\n" + needle, "  },\n" + needle, 1)
    src = src.replace(needle, guide, 1)
    p.write_text(src)
    print(f"  ✓ js/brainGuides.js — added guide for {game_id}")


def patch_storage(p, game_id):
    src = p.read_text()
    id_pattern = f"'{game_id}':"
    if id_pattern in src:
        return
    needle_close = "  },\n  favorites: []"
    if needle_close not in src:
        raise SystemExit("could not find favorites:[] anchor in storage.js")
    # Make sure the previous last high-score entry has a trailing comma
    src = re.sub(
        r"(\s+'[^']+': 0)(\n  \},\n  favorites: \[\])",
        r"\1,\2", src, count=1)
    replacement = "    '" + game_id + "': 0,\n  },\n  favorites: []"
    src = src.replace(needle_close, replacement, 1)
    p.write_text(src)
    print(f"  ✓ js/storage.js — added high-score key for {game_id}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", required=True)
    ap.add_argument("--code", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--wing", required=True)
    ap.add_argument("--category", required=True)
    ap.add_argument("--domain", required=True)
    ap.add_argument("--age", required=True)
    ap.add_argument("--desc", required=True)
    ap.add_argument("--paper", default="")
    ap.add_argument("--renderer", required=True)
    a = ap.parse_args()

    root = pathlib.Path(".")
    patch_app_js(root / "js" / "app.js", a.id, a.code, a.title, a.wing,
                 a.category, a.domain, a.age, a.desc, a.paper, a.renderer)
    patch_brain_guides(root / "js" / "brainGuides.js", a.id, a.domain)
    patch_storage(root / "js" / "storage.js", a.id)


if __name__ == "__main__":
    main()
