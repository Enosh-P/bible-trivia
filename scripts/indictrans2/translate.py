#!/usr/bin/env python3
"""
Translate the Recall questions into Tamil with AI4Bharat IndicTrans2 (free, open
source, best on a GPU). Bible names are swapped for their Tamil Bible spelling
first (content/glossary/names-ta.json), e.g. David -> தாவீது, God -> தேவன்.

  python scripts/indictrans2/translate.py --sample            # 20 lines, with and without the names swap
  python scripts/indictrans2/translate.py --books GEN,JHN     # some books
  python scripts/indictrans2/translate.py --top 11            # the 11 popular books
  python scripts/indictrans2/translate.py                     # everything

Options: --model ai4bharat/indictrans2-en-indic-1B (default; better) or
         ai4bharat/indictrans2-en-indic-dist-200M (smaller, faster)
         --batch 64   --no-glossary

Output: content/translations/ta/recall/<BOOK>.json  ({id: {q, a}}), the same
format as the Google script, saved after every batch so a stopped run resumes.
Afterwards (on any computer): npm run translate:recall -- --merge-only
then npm run db:import.
"""
import argparse, json, re, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKS = ROOT / "public/packs/uw"
OUT = ROOT / "content/translations/ta/recall"
POPULAR = ["GEN", "EXO", "PSA", "PRO", "DAN", "MAT", "MRK", "LUK", "JHN", "ACT", "REV"]

# ---------- Bible names glossary (same rules as scripts/lib/glossary.mjs) ----------
TERMS = json.loads((ROOT / "content/glossary/names-ta.json").read_text(encoding="utf-8"))["terms"]
_keys = sorted(TERMS, key=len, reverse=True)
_pattern = re.compile(r"(?<![A-Za-z])(" + "|".join(map(re.escape, _keys)) + r")(?![A-Za-z])")

def protect_names(text: str) -> str:
    return _pattern.sub(lambda m: TERMS[m.group(1)], text)

def tidy(s: str) -> str:
    s = re.sub(r"\s+([,.;:?!])", r"\1", s)
    return re.sub(r"\s{2,}", " ", s).strip()

# ---------- Model ----------
def load(model_name: str):
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    from IndicTransToolkit.processor import IndicProcessor

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading {model_name} on {device}…", file=sys.stderr)
    tok = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_name, trust_remote_code=True,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
    ).to(device).eval()
    ip = IndicProcessor(inference=True)
    state = {"cache": True}

    def translate(lines):
        batch = ip.preprocess_batch(lines, src_lang="eng_Latn", tgt_lang="tam_Taml")
        enc = tok(batch, truncation=True, padding="longest", return_tensors="pt").to(device)
        with torch.inference_mode():
            try:
                out = model.generate(**enc, use_cache=state["cache"], min_length=0, max_length=256, num_beams=4, num_return_sequences=1)
            except AttributeError:
                # Newer transformers versions don't match the model's cache code: run without the cache (slower, same result).
                if not state["cache"]:
                    raise
                print("Note: running without the generation cache (slower). Install transformers==4.46.3 for full speed.", file=sys.stderr)
                state["cache"] = False
                out = model.generate(**enc, use_cache=False, min_length=0, max_length=256, num_beams=4, num_return_sequences=1)
        dec = tok.batch_decode(out, skip_special_tokens=True, clean_up_tokenization_spaces=True)
        return [tidy(t) for t in ip.postprocess_batch(dec, lang="tam_Taml")]

    return translate

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--books")
    ap.add_argument("--top", type=int)
    ap.add_argument("--model", default="ai4bharat/indictrans2-en-indic-1B")
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--sample", action="store_true", help="translate 20 sample lines both ways and print them")
    ap.add_argument("--no-glossary", action="store_true")
    a = ap.parse_args()

    all_books = sorted(p.stem for p in PACKS.glob("*.json") if re.fullmatch(r"[0-9A-Z]{3}", p.stem))
    if a.books:
        books = [b.strip().upper() for b in a.books.split(",")]
    elif a.top:
        books = (POPULAR + [b for b in all_books if b not in POPULAR])[: a.top]
    else:
        books = POPULAR + [b for b in all_books if b not in POPULAR]

    translate = load(a.model)

    if a.sample:
        picks = [("GEN", 0), ("GEN", 40), ("1SA", 200), ("MAT", 30), ("JHN", 70), ("ACT", 100), ("EXO", 60), ("DAN", 20), ("LUK", 150), ("REV", 40)]
        lines = []
        for b, i in picks:
            row = json.loads((PACKS / f"{b}.json").read_text(encoding="utf-8"))["rows"][i]
            lines += [row[4], row[5]]
        plain = translate(lines)
        named = translate([protect_names(l) for l in lines])
        for en, p, n in zip(lines, plain, named):
            print(f"\nEN : {en}\nTA : {p}\nTA+: {n}   (with Tamil Bible names)")
        print("\nIf the TA+ lines read better, run without --sample; otherwise add --no-glossary.")
        return

    OUT.mkdir(parents=True, exist_ok=True)
    started, total = time.time(), 0
    for book in books:
        pack_path = PACKS / f"{book}.json"
        if not pack_path.exists():
            print(f"{book}: no pack, skipped", file=sys.stderr)
            continue
        rows = json.loads(pack_path.read_text(encoding="utf-8"))["rows"]
        out_path = OUT / f"{book}.json"
        done = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
        todo = [r for r in rows if r[0] not in done]
        if not todo:
            print(f"{book}: already translated ({len(rows)})")
            continue
        prep = (lambda s: s) if a.no_glossary else protect_names
        print(f"{book}: {len(todo)} questions…", end="", flush=True)
        step = max(1, a.batch // 2)  # each question = 2 lines (question + answer)
        for i in range(0, len(todo), step):
            chunk = todo[i : i + step]
            lines = [prep(t) for r in chunk for t in (r[4], r[5])]
            out = translate(lines)
            for j, r in enumerate(chunk):
                done[r[0]] = {"q": out[2 * j], "a": out[2 * j + 1]}
            out_path.write_text(json.dumps(done, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            print(".", end="", flush=True)
        total += len(todo)
        print(f" done ({total} so far, {time.time() - started:.0f}s)")
    print(f"\nTranslated {total} questions into content/translations/ta/recall/.")
    print("Next: npm run translate:recall -- --merge-only   then   npm run db:import")

if __name__ == "__main__":
    main()
