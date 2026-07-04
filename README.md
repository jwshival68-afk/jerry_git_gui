# Git GUI (Tauri + Rust, macOS)

A lightweight native Git client for macOS. Rust backend shells out to your
system `git`; the frontend is plain HTML/CSS/JS (no bundler needed).

Features: open/init/clone a repo, view status, stage/unstage/discard files,
commit, push, pull, list/create/switch/delete branches, and a commit history
timeline.

## 1. Prerequisites (on your Mac)

- **Xcode Command Line Tools**: `xcode-select --install`
- **Rust**: https://rustup.rs → `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Tauri CLI** (no Node.js required for this project):
  ```bash
  cargo install tauri-cli --version "^2.0.0" --locked
  ```
- `git` itself (already on macOS, or via Xcode tools / Homebrew)

## 2. Get the project onto your Mac

Unzip `git-gui-macos.zip` and `cd` into the folder.

## 3. Generate app icons (one-time)

The repo ships with placeholder PNGs/ICO but no macOS `.icns`. Generate the
full set from the included 1024×1024 source:

```bash
cargo tauri icon src-tauri/icons/icon.png
```

This fills in `icon.icns` (and refreshes the others) in `src-tauri/icons/`.

## 4. Run it in development

```bash
cargo tauri dev
```

This compiles the Rust backend and opens a native window pointing at the
static files in `src/` — no dev server needed.

## 5. Build a distributable app

```bash
cargo tauri build
```

Output: `src-tauri/target/release/bundle/macos/Git GUI.app` and a `.dmg` in
the same directory.

## Project layout

```
src/                     # frontend (static, no build step)
  index.html
  style.css
  app.js
src-tauri/
  src/main.rs            # Tauri commands (bridge to git.rs)
  src/git.rs             # shells out to `git`, parses output
  tauri.conf.json
  capabilities/default.json
  icons/
```

## Notes & good next steps

- **Diffs**: this scaffold doesn't render per-file diffs yet — `git diff` /
  `git diff --staged` output could be piped into a `<pre>` block or a syntax
  highlighter fairly easily by adding one more Tauri command.
- **Merge conflicts**: not handled specially yet; conflicted files will show
  up with a status code in the file list but there's no dedicated resolver UI.
- **Auth for push/pull**: relies on your existing git credential setup
  (SSH keys, macOS Keychain, credential helper) since it calls your system
  `git` binary directly.
- **Multi-branch graph**: the history view currently renders a single
  chronological line (`git log`), not a full multi-branch DAG layout
  (`git log --graph`'s ASCII art would need parsing to draw properly).
