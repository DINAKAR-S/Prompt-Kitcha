# PromptWriter — Claude instructions (caveman mode)

Terse. No fluff. Save tokens.

## What
Windows desktop app. Tauri v2. Rust + React. Grammarly for prompts.
Select text → hotkey → LLM rewrites it → auto-replaces selection.

## Rules
- Reply ≤ 6 lines unless coding.
- No preamble. No recap. No "I'll now…".
- Skip ASCII diagrams, banners, emojis.
- One file at a time when editing.
- Prefer Edit over Write. Never re-Read file you just edited.
- Run tools in parallel when independent.
- Don't spawn subagents unless user says so.
- Don't add comments. Code speaks.

## Stack
- `src-tauri/` Rust backend. Tauri v2.
- `src/` React + TS + Tailwind + Vite.
- Windows-only MVP.
- BYOK: OpenAI, Anthropic, OpenRouter, Ollama.
- Keys in Windows Credential Manager via `keyring` crate.

## Layout
```
src-tauri/src/
  main.rs        tray + plugin init + commands
  keystroke.rs   SendInput ctrl+c/v
  clipboard.rs   save/restore/watch
  hotkey.rs      global shortcut
  cursor.rs      cursor pos for popup
  credentials.rs keyring wrapper
  optimizer.rs   meta-prompt + stream
  config.rs      toml config
  providers/     openai.rs anthropic.rs openrouter.rs ollama.rs
src/
  windows/       Popup.tsx Settings.tsx Pill.tsx
  components/    IntentBadge StreamingText ProviderForm
  lib/           ipc.ts intents.ts
```

## Key flows
1. Hotkey → save clipboard → synth ctrl+c → read → call optimizer → stream → ctrl+v on accept → restore clipboard.
2. Real ctrl+c detected → pill fades in 3s near cursor → click = flow 1.

## Meta-prompt
One LLM call. JSON out: `{intent, prompt}`. Intents: email, code, content, question, analysis, summarize, rewrite, brainstorm, data, other.

## Don't
- Don't add macOS/Linux paths.
- Don't add template editor, history UI, MCP, CLI. Phase 2.
- Don't store API keys in config.toml. Keyring only.
- Don't break popup frameless + always-on-top.

## Build
```
npm i
npm run tauri dev     # dev
npm run tauri build   # ship
```

## Test
Manual: Notepad → type → select → ctrl+shift+space → replace works.
Unit: Rust `cargo test` for providers (wiremock) + json stream parser.

## When stuck
Grep first. Read narrow. Ask one question. Don't guess APIs — use Context7 for Tauri v2.
