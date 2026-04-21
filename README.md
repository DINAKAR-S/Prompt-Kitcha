# PromptWriter

Grammarly-style prompt optimizer for Windows. Select rough text in any app, press `Ctrl+Shift+Space`, and the selection is replaced with a well-structured prompt you can paste into any LLM.

Runs as a tray app. Works everywhere on Windows — Notepad, VS Code, Word, Slack, ChatGPT web.

## Why

Most people know *what* they want from AI but not *how* to prompt for it. PromptWriter classifies intent (email, code, content, question, analysis, …) and rewrites the rough text into the appropriate prompt framework in a single LLM call.

## BYOK

Bring your own key. Supported providers:

- **OpenAI** — GPT-4o / GPT-4o-mini
- **Anthropic** — Claude Sonnet / Haiku
- **OpenRouter** — 100+ models through one key
- **Ollama** — local models, zero cost, fully offline

Keys are stored in the **Windows Credential Manager** via the `keyring` crate. They never touch `config.toml`.

## Usage

1. Select text in any app.
2. Press `Ctrl+Shift+Space`.
3. Popup appears, streams the optimized prompt, auto-replaces your selection.

Alternative trigger: copy text with `Ctrl+C` → a floating pill appears near the cursor for 3 seconds → click to optimize.

## Build

```bash
npm install
npm run tauri dev      # dev
npm run tauri build    # produce installers (msi, nsis)
```

Requires: Rust stable, MS C++ Build Tools, Node 20+, Webview2 (ships with Win11).

## Configuration

- UI config: `%APPDATA%\PromptWriter\config.toml`
- API keys: Windows Credential Manager (service `com.promptwriter`)

## Architecture

Tauri v2. Rust backend for global hotkey, `SendInput` keystroke synthesis, clipboard save/restore, keyring, and provider streaming. React + TypeScript + Tailwind frontend with three windows: popup (frameless, transparent, always-on-top), settings, and pill.

See [CLAUDE.md](CLAUDE.md) for the caveman-mode project notes.

## License

MIT
