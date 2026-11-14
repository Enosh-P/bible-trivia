#!/usr/bin/env python3
"""
Translate the Recall questions into Tamil with AI4Bharat IndicTrans2 (free, open
source, best on a GPU). Bible names are swapped for their Tamil Bible spelling
first (content/glossary/names-ta.json), e.g. David -> தாவீது, God -> தேவன்.

  python scripts/indictrans2/translate.py --sample            # 20 lines, with and without the names swap
  python scripts/indictrans2/translate.py --books GEN,JHN     # some books
  python scripts/indictrans2/translate.py --top 11            # the 11 popular books
  python scripts/indictrans2/translate.py                     # everything

  python scripts/indictrans2/translate.py --set mcq --top 11  # multiple-choice questions (question + options)
  python scripts/indictrans2/translate.py --set mcq           # all of them


Options: --model ai4bharat/indictrans2-en-indic-1B (default; better) or
         ai4bharat/indictrans2-en-indic-dist-200M (smaller, faster)
         --batch 64   --no-glossary
         --beams 2   (about twice as fast, nearly the same quality; default 4)

Output: content/translations/ta/recall/<BOOK>.json  ({id: {q, a}}), the same
format as the Google script, saved after every batch so a stopped run resumes.
Afterwards (on any computer): npm run translate:recall -- --merge-only
then npm run db:import.

With --set mcq: content/translations/ta/mcq/<BOOK>.json ({id: {q, o: [options]}}).
Afterwards: npm run content:mcq -- --merge-only
"""
import argparse, json, re, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKS = ROOT / "public/packs/uw"
OUT = ROOT / "content/translations/ta/recall"
MCQ_PACKS = ROOT / "public/packs/mcq"
MCQ_OUT = ROOT / "content/translations/ta/mcq"
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
def load(model_name: str, beams: int = 4, no_repeat: int = 0):
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
    # --redo: stop the model from repeating itself ("யார் யார் யார் …").
    extra = {"no_repeat_ngram_size": no_repeat, "repetition_penalty": 1.3} if no_repeat else {}

    def translate(lines):
        # Out of GPU memory: free it, then translate each half separately.
        try:
            return translate_once(lines)
        except torch.OutOfMemoryError:
            torch.cuda.empty_cache()
            if len(lines) <= 2:
                raise
            print("(smaller batch)", end="", file=sys.stderr, flush=True)
            mid = len(lines) // 2
            mid += mid % 2  # keep each question with its answer
            return translate(lines[:mid]) + translate(lines[mid:])

    def translate_once(lines):
        batch = ip.preprocess_batch(lines, src_lang="eng_Latn", tgt_lang="tam_Taml")
        enc = tok(batch, truncation=True, padding="longest", return_tensors="pt").to(device)
        with torch.inference_mode():
            try:
                out = model.generate(**enc, use_cache=state["cache"], min_length=0, max_length=256, num_beams=beams, num_return_sequences=1, **extra)
            except AttributeError:
                # Newer transformers versions don't match the model's cache code: run without the cache (slower, same result).
                if not state["cache"]:
                    raise
                print("Note: running without the generation cache (slower). Install transformers==4.46.3 for full speed.", file=sys.stderr)
                state["cache"] = False
                out = model.generate(**enc, use_cache=False, min_length=0, max_length=256, num_beams=beams, num_return_sequences=1, **extra)
        dec = tok.batch_decode(out, skip_special_tokens=True, clean_up_tokenization_spaces=True)
        return [tidy(t) for t in ip.postprocess_batch(dec, lang="tam_Taml")]

    return translate

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--books")
    ap.add_argument("--top", type=int)
    ap.add_argument("--model", default="ai4bharat/indictrans2-en-indic-1B")
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--beams", type=int, default=4, help="4 = best quality; 2 = about twice as fast; 1 = fastest")
    ap.add_argument("--sample", action="store_true", help="translate 20 sample lines both ways and print them")
    ap.add_argument("--no-glossary", action="store_true")
    ap.add_argument("--set", choices=["recall", "mcq"], default="recall", help="which questions to translate")
    ap.add_argument("--redo", action="store_true", help="with --set mcq: translate again the ones listed in content/translations/ta/mcq/redo.json")
    a = ap.parse_args()

    if a.set == "mcq":
        return translate_mcq(a)

    all_books = sorted(p.stem for p in PACKS.glob("*.json") if re.fullmatch(r"[0-9A-Z]{3}", p.stem))
    if a.books:
        books = [b.strip().upper() for b in a.books.split(",")]
    elif a.top:
        books = (POPULAR + [b for b in all_books if b not in POPULAR])[: a.top]
    else:
        books = POPULAR + [b for b in all_books if b not in POPULAR]

    translate = load(a.model, a.beams)

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

def translate_mcq(a):
    """Multiple-choice packs: the question and every option. Repeated strings
    (names like "David" appear thousands of times) are translated once."""
    all_books = sorted(p.stem for p in MCQ_PACKS.glob("*.json") if re.fullmatch(r"[0-9A-Z]{3}", p.stem))
    redo = {}
    if a.redo:
        for item in json.loads((MCQ_OUT / "redo.json").read_text(encoding="utf-8")):
            redo.setdefault(item["book"], set()).add(item["id"])
        books = sorted(redo)
        print(f"Translating {sum(len(v) for v in redo.values())} questions again.")
    elif a.books:
        books = [b.strip().upper() for b in a.books.split(",")]
    else:
        books = POPULAR + [b for b in all_books if b not in POPULAR]
        if a.top:
            books = books[: a.top]

    translate = load(a.model, a.beams, no_repeat=3 if a.redo else 0)
    names = (lambda s: s) if a.no_glossary else protect_names
    # Words in capitals ("EXCEPT", "NOT") can send the model into a loop: write them in lower case.
    caps = lambda s: re.sub(r"\b[A-Z]{3,}\b", lambda m: m.group(0).lower(), s)
    prep = (lambda s: names(caps(s))) if a.redo else names
    memo = {}
    BLANK = "____"

    def run(strings):
        todo = [s for s in dict.fromkeys(strings) if s not in memo]
        for i in range(0, len(todo), a.batch):
            chunk = todo[i : i + a.batch]
            # The blank in "Diligent hands will ____" doesn't survive translation: swap it for "…" and back.
            out = translate([prep(s.replace(BLANK, "…")) for s in chunk])
            for src, ta in zip(chunk, out):
                if BLANK in src:
                    ta = ta.replace("…", BLANK, 1) if "…" in ta else ta.rstrip(" .") + " " + BLANK
                memo[src] = ta

    MCQ_OUT.mkdir(parents=True, exist_ok=True)
    started, total = time.time(), 0
    for book in books:
        pack = MCQ_PACKS / f"{book}.json"
        if not pack.exists():
            print(f"{book}: no pack, skipped", file=sys.stderr)
            continue
        rows = json.loads(pack.read_text(encoding="utf-8"))["rows"]
        out_path = MCQ_OUT / f"{book}.json"
        done = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
        if a.redo:
            for rid in redo.get(book, ()):
                done.pop(rid, None)
            todo = [r for r in rows if r[0] in redo.get(book, ())]
        else:
            todo = [r for r in rows if r[0] not in done]
        if not todo:
            print(f"{book}: already translated ({len(rows)})")
            continue
        print(f"{book}: {len(todo)} questions…", end="", flush=True)
        step = 48
        for i in range(0, len(todo), step):
            chunk = todo[i : i + step]
            run([r[4] for r in chunk] + [o for r in chunk for o in r[5]])
            for r in chunk:
                done[r[0]] = {"q": memo[r[4]], "o": [memo[o] for o in r[5]]}
            out_path.write_text(json.dumps(done, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            print(".", end="", flush=True)
        total += len(todo)
        print(f" done ({total} so far, {time.time() - started:.0f}s)")
    print(f"\nTranslated {total} questions into content/translations/ta/mcq/.")
    print("Next: npm run content:mcq -- --merge-only")

if __name__ == "__main__":
    main()
