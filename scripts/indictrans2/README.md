# Free Tamil translation with IndicTrans2 (on a GPU, e.g. Lightning AI)

[IndicTrans2](https://huggingface.co/ai4bharat/indictrans2-en-indic-1B) by AI4Bharat is an open-source translation model built for Indian languages. This script uses it to translate the ~17,000 Recall questions into Tamil for free. It keeps Bible names in their Tamil Bible spelling (`content/glossary/names-ta.json`).

## 1. Hugging Face (once, 2 minutes)
1. Sign in at huggingface.co and open [indictrans2-en-indic-1B](https://huggingface.co/ai4bharat/indictrans2-en-indic-1B). Accept the terms.
2. Create a **Read** token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

## 2. In a Lightning AI Studio with a GPU (Terminal)
```bash
git clone https://github.com/Enosh-P/bible-trivia.git
cd bible-trivia
pip install -r scripts/indictrans2/requirements.txt
hf auth login        # paste the Hugging Face Read token (older versions: huggingface-cli login)
```
The repo is private, so `git clone` asks for your GitHub username and a **token as the password**. Create one at github.com → Settings → Developer settings → Personal access tokens, with access to this repository (read and write, so you can push the results back).

**Check the quality first** (prints 20 lines: plain, and with Tamil Bible names):
```bash
python scripts/indictrans2/translate.py --sample
```
If the `TA+` lines read better, keep the names swap (the default). Otherwise add `--no-glossary` to the commands below.

**Translate** (it saves after every batch; if it stops, run the same command again and it continues):
```bash
python scripts/indictrans2/translate.py --top 11     # the 11 popular books first
python scripts/indictrans2/translate.py              # then everything else
```

**Send the results to GitHub:**
```bash
git config user.name "Your Name" && git config user.email "you@example.com"
git add content/translations
git commit -m "Tamil translations (IndicTrans2)"
git push
```
(Or download the `content/translations` folder from the Studio's file browser and copy it into your project folder.)

## 3. Back on your computer
```bash
git pull
npm run translate:recall -- --merge-only   # puts the Tamil into the app's question files
npm run db:import                          # puts the Tamil into Supabase (only where Tamil is empty)
git add public/packs && git commit -m "Tamil in Recall packs" && git push
```
Run `supabase/setup.sql` in the SQL Editor first if you haven't since the Tamil update (it adds the Tamil step).

## Notes
- Default model: `ai4bharat/indictrans2-en-indic-1B` (best quality). On a small GPU, or for speed, add `--model ai4bharat/indictrans2-en-indic-dist-200M`. If the GPU runs out of memory, add `--batch 16`.
- Every translation is marked "machine" in Supabase until a person edits it. Edits become "reviewed" and are never overwritten.

## Multiple-choice questions (Quiz by Book, Who Said It?)

The same script translates the ~33,000 multiple-choice questions: each question and its options. Names that repeat thousands of times ("David", "Moses") are translated only once. Expect 1–2 hours on a free Colab T4.

```bash
python scripts/indictrans2/translate.py --set mcq --top 11   # the popular books first
python scripts/indictrans2/translate.py --set mcq            # the rest (finished books are skipped)
```

Output: `content/translations/ta/mcq/<BOOK>.json`. Bring it back to your computer, then:

```bash
npm run content:mcq -- --merge-only
```
