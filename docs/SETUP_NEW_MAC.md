# Setting up the OLS Digital Skills pipeline on a new Mac

This is the one-time setup needed to run `/next` and `/build` on a Mac that hasn't been set up yet. Once done, that Mac will work identically to any other set-up Mac: you can run `/next` or `/build` in a fresh Claude Code session and it builds the next request end-to-end, exactly like the other machine.

Designed to be pasted into a fresh Claude Code session on the new Mac — the session can run every step itself. Damien only needs to OK the few prompts.

---

## What this gives you

After running these steps, the new Mac will have:

- A working local clone of the activities repo at `~/Sites/ols-digital-skills/` (matches the path the playbook and slash commands assume).
- The `/next` and `/build` slash commands installed at `~/.claude/commands/` and pointing at the latest versions of the playbook in the repo.
- All the tools a build needs: `gh` CLI authenticated, `ffmpeg`, `whisper` for audio/video transcription, the `python-pptx` / `markitdown` Python helpers, Node global packages for HTML/SVG/PDF generation.
- Power Automate, Microsoft Forms, GitHub Issues — all already in the cloud, nothing to install.

It does **not** touch:

- Your iCloud Desktop or the Claude Work folder.
- Any local OneDrive sync.
- Any existing Claude Code chats or other repos.

---

## Prerequisites the new Mac is assumed to already have

These are normal for any developer-set-up Mac, and Damien's M5 MacBook Pro already has all of them per the personal-memory note `reference_nodejs_global_packages.md`:

| Tool | How to check | Install if missing |
|---|---|---|
| Homebrew (`brew`) | `brew --version` | https://brew.sh |
| `gh` CLI authenticated as `dgaj-g` | `gh auth status` | `brew install gh && gh auth login` |
| Python 3 (any modern 3.x) | `python3 --version` | Comes with macOS / `brew install python` |
| Node.js + npm | `node --version && npm --version` | `brew install node` |

If any are missing, install them before running the rest.

---

## The setup, step by step

### 1. Clone the activities repo

```bash
mkdir -p ~/Sites
cd ~/Sites
gh repo clone dgaj-g/ols-digital-skills
```

This brings the repo down to `~/Sites/ols-digital-skills/` — the same path the playbook and slash commands assume. Don't use a different path.

(The private inbox repo `dgaj-g/ols-digital-skills-inbox` doesn't need cloning — the build process reads from it via `gh issue view ...` over the network.)

### 2. Install the slash commands

The canonical copies live in the repo at `~/Sites/ols-digital-skills/commands/`. Copy them into Claude Code's commands directory:

```bash
mkdir -p ~/.claude/commands
cp ~/Sites/ols-digital-skills/commands/next.md ~/.claude/commands/next.md
cp ~/Sites/ols-digital-skills/commands/build.md ~/.claude/commands/build.md
```

After this, `/next` and `/build` will be available in any new Claude Code session on this Mac.

**To stay in sync going forward:** whenever you pull the repo on this Mac (`git pull`), if the slash commands have changed in the repo, re-run the two `cp` commands. Or, if you prefer auto-sync, replace each copy with a symlink:

```bash
ln -sf ~/Sites/ols-digital-skills/commands/next.md ~/.claude/commands/next.md
ln -sf ~/Sites/ols-digital-skills/commands/build.md ~/.claude/commands/build.md
```

(Symlinks track the repo automatically. Recommended.)

### 3. Install Whisper (for audio/video transcription)

```bash
pip3 install -U openai-whisper
```

Verify it installed:

```bash
python3 -c "import whisper; print('whisper OK, version:', whisper.__version__)"
```

A first transcription downloads the chosen model — `base` is ~140 MB, `small` is ~460 MB. The build playbook uses `small` by default. Pre-download it (optional, saves ~30 s on first real use) with:

```bash
python3 -c "import whisper; whisper.load_model('small')"
```

### 4. Install / verify the supporting Python packages

```bash
pip3 install -U python-pptx markitdown
```

These are used by the `pptx` skill (PowerPoint reading) and for fast text extraction.

### 5. Install / verify the supporting Homebrew tools

```bash
brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
brew list poppler >/dev/null 2>&1 || brew install poppler
brew list ghostscript >/dev/null 2>&1 || brew install ghostscript
```

- **ffmpeg** — needed for audio extraction from videos (then Whisper transcribes the audio).
- **poppler** — provides `pdftoppm`, used to render PDF pages to images for handwriting / scan OCR.
- **ghostscript** — used to compress oversize PDFs.

### 6. Verify the Node global packages

These should already be installed per Damien's normal Mac setup. Check:

```bash
npm list -g --depth=0 2>/dev/null | grep -E "(puppeteer|sharp|qrcode|pptxgenjs|mermaid-cli|highlight.js)"
```

If anything's missing, install:

```bash
npm install -g puppeteer sharp qrcode pptxgenjs mermaid-cli highlight.js react react-icons
```

### 7. Smoke-test the pipeline

In a fresh Claude Code session on this Mac, type:

```
/next
```

It should:
1. Read the build playbook from the local clone of the repo
2. Run `gh issue list --repo dgaj-g/ols-digital-skills-inbox --state open` and show you the oldest open issue
3. Show you a one-screen summary and wait for your confirmation

If you see that summary, the setup is verified. Confirm or stop as you wish.

---

## What's now identical across both Macs

Once setup is complete:

- **The playbook** (`docs/BUILD_PLAYBOOK.md`) is identical because both Macs read the same file from the repo. Update on either Mac, push, pull on the other — both stay in sync.
- **The slash commands** are identical because both Macs copy (or symlink) them from the repo.
- **Whisper, ffmpeg, Python, gh CLI** all behave identically.
- **GitHub state** (inbox issues, main repo, PRs) is the cloud source of truth — both Macs see exactly the same queue.
- **Power Automate** runs in the cloud — neither Mac touches it.

So `/next` on the MacBook does the same thing as `/next` on the Mac Mini: picks up the oldest open issue and builds it. You can switch machines mid-project at any time. The only constraint is **don't run `/next` on both machines simultaneously** — they'd both try to build the same issue and you'd end up with conflicting PRs.

---

## Updating in future

Whenever the playbook or slash commands change in the repo:

```bash
cd ~/Sites/ols-digital-skills
git pull
# If you used cp (not symlinks) for the slash commands, re-run:
cp commands/*.md ~/.claude/commands/
```

That's it.
