![PromptKitchen Banner](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# PromptKitchen - AI-Powered Prompt Optimizer for Everyone

PromptKitchen transforms rough text into powerful AI prompts with a single keystroke. Select text in any app, press `Ctrl+Shift+Space`, and watch it become a well-structured prompt ready for any LLM.

Works everywhere on Windows, Mac, and Linux — Notepad, VS Code, Word, Slack, ChatGPT, Claude, and more.

![PromptKitchen](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## Key Capabilities

- **One Keystroke Optimization**: Select text anywhere, press hotkey, get optimized prompt
- **Smart Intent Detection**: Automatically classifies your text as email, code, content, question, or analysis
- **Streaming Output**: Watch the prompt generate in real-time
- **Auto-Replace**: Seamlessly replaces your selection with the optimized version
- **Image Prompt Generation**: Create stunning AI image prompts from simple ideas
- **Multiple Providers**: Use OpenAI, Anthropic, OpenRouter, or local Ollama
- **Self-Hosting Ready**: Full control, your API keys never leave your machine

## Quick Start

1. Download and install for [Windows](https://github.com/DINAKAR-S/Prompt-Kitcha/releases) or build from source
2. Set your API key in Settings (stored securely in system credential manager)
3. Select text in any app → Press `Ctrl+Shift+Space` → Done!

## Features

### Prompt Optimization
- **Intent Classification**: Detects email, code, content, question, analysis, brainstorm, and more
- **Mode A (Prompt)**: For LLMs like ChatGPT, Claude, Cursor
- **Mode B (Artifact)**: For finished text you paste directly (emails, messages, notes)
- **Refine Loop**: Give feedback, iterate until perfect
- **Technique Selector**: Choose from RACE, CARE, COAST, PAIN, ROSES, and more

### Image Prompt Maker
Generate creative image prompts from simple descriptions:
- **Creative Spark**: AI-enhanced prompts with style, mood, lighting
- **Photo Realistic**: Professional photography prompts
- **Cinematic**: Movie poster-style compositions
- **Digital Art**: Illustration and concept art
- **Anime / Manga**: Japanese animation style
- **3D Render**: Three-dimensional renders

### BYOK (Bring Your Own Key)

| Provider | Default Model | API Required |
|---------|-------------|------------|
| **OpenAI** | GPT-4o-mini | Yes |
| **Anthropic** | Claude Haiku | Yes |
| **OpenRouter** | 100+ models | Yes |
| **Ollama** | llama3.1 | No (local) |

API keys are stored in **system credential manager** — Windows Credential Manager, macOS Keychain, or Linux libsecret. Never stored in config files.

## Supported Platforms

- **Windows** 10/11 (x64) — MSI and NSIS installers
- **macOS** Intel & Apple Silicon — DMG installer
- **Linux** Ubuntu/Debian — AppImage

## Architecture

Built with modern, fast technologies:

- **Tauri v2**: Rust backend for native performance
- **React 18**: Reactive UI with TypeScript
- **Tailwind CSS**: Beautiful, modern styling
- **Zustand**: Lightweight state management
- **Streaming**: Real-time prompt generation via SSE

### Windows-Specific Features
- `SendInput` keystroke synthesis for cross-app text manipulation
- Global hotkey registration via `tauri-plugin-global-shortcut`
- System tray integration
- Windows Credential Manager for secure key storage

## Installation

### From Release (Windows)
1. Download `PromptKitchen_x.x.x_x64-setup.exe` from [releases](https://github.com/DINAKAR-S/Prompt-Kitcha/releases)
2. Run installer
3. Launch from Start Menu or system tray

### From Source
```bash
git clone https://github.com/DINAKAR-S/Prompt-Kitcha.git
cd Prompt-Kitcha
npm install
npm run tauri build
```

### Requirements
- Windows 10/11 with WebView2 (ships with Win11)
- API key from OpenAI/Anthropic/OpenRouter (or Ollama for local)

## Usage

### Basic Flow
1. **Select** text in any app (Notepad, VS Code, Chrome, Slack...)
2. **Press** `Ctrl+Shift+Space`
3. **Watch** popup stream the optimized prompt
4. **Accept** → selection auto-replaced with optimized version

### Alternative: Pill Trigger
- Copy text with `Ctrl+C`
- Floating pill appears near cursor
- Click pill to optimize

### Refine Loop
1. After optimization, type feedback in the refine box
2. Press Enter to regenerate
3. Iterate until satisfied

### Settings
- **Provider**: Choose OpenAI, Anthropic, OpenRouter, or Ollama
- **Model**: Select specific model per provider
- **Hotkey**: Customize keyboard shortcut
- **Auto-replace**: Toggle automatic text replacement

## Resources

- 📚 [Documentation](https://github.com/DINAKAR-S/Prompt-Kitcha/wiki)
- 🔧 [Releases](https://github.com/DINAKAR-S/Prompt-Kitcha/releases)
- 💡 [Example Prompts](https://github.com/DINAKAR-S/Prompt-Kitcha/tree/main/examples)
- 🤖 [GitHub Actions](https://github.com/DINAKAR-S/Prompt-Kitcha/actions) for CI/CD

## Contributing

Found a bug 🐛 or have a feature idea ✨?
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Open Source

PromptKitchen is 100% open source under the MIT License.

- **Source Available**: Always visible source code
- **Self-Hostable**: Deploy anywhere
- **Extensible**: Add your own providers and techniques

Built with ❤️ by the community, for the community.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Author

**Dinakar S** - [@DINAKAR-S](https://github.com/DINAKAR-S)

---

**Made with ❤️ using Tauri, React, and Rust**

[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat&logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-stable-CE422A?style=flat&logo=rust)](https://rust-lang.org)