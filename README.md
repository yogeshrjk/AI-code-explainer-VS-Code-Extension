<p align="center">
  <img src="media/gemini-x.png" alt="GeminiX" width="96" />
</p>

<h1 align="center">GeminiX</h1>

<p align="center">
  <strong>Voice-first AI code assistant for VS Code, powered by Gemini Live.</strong>
</p>

<p align="center">
  <img alt="VS Code" src="https://img.shields.io/badge/VS_Code-^1.96.0-007ACC?logo=visualstudiocode" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.6.1-blue" />
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-3.1_Flash_Live-8E75B2" />
</p>

---

**GeminiX** transforms your VS Code editor into a conversational AI workspace. Select any code, open GeminiX in the Activity Bar, and ask spoken or typed questions — just like pair programming with a senior developer who already understands your project.

No more context-switching to a browser. No more copy-pasting code into external chat windows. GeminiX lives in your editor, brings Gemini's real-time voice and reasoning capabilities directly to your workflow, and keeps your code private.

---

## ✨ Features

### 🎙️ Gemini Live Voice Conversation

Real-time, streaming voice interaction with Gemini. Speak your question naturally, hear responses spoken back, and follow along with live input/output transcripts and audio playback. Choose from 30+ distinct Gemini voices.

### 📐 Automatic Editor Context

Select code in any editor — GeminiX captures the exact selection plus surrounding context (supporting lines, related imports) and sends it all privately to Gemini. The conversation shows only the file name and line range; your code stays out of the transcript.

### 🔍 Intelligent Workspace Search

Gemini can pause mid-response, search your workspace for relevant files or symbols, read specific sections, and continue its answer — all through VS Code's native tooling. An in-memory lexical and filename index (kept current by a file watcher) enables fast, targeted retrieval without a vector database.

### 📎 Rich Attachments

- **`@` mention** — Type `@` in the chat input to attach the complete current editor file as context.
- **`+` button** — Attach source files, text files, or images (JPEG, PNG, WebP) with your next typed question. Bounded by count and size limits; images are paced as Live video frames before the request.

### 🛠️ Code Actions

Every code block in the response includes:

- **Copy** — One-click copy to clipboard.
- **Apply** — Select a destination range in your editor and replace it with the returned code. GeminiX remembers the original selection context for safe reuse.

### 🔇 Live Session Controls

- **Mute** — Toggle microphone mute during a live session. Stops audio from being sent to Gemini while keeping the session alive.
- **Stop** — Immediately halts audio playback and tells Gemini to stop generating. The model stays silent until your next question.
- **Auto-interrupt** — When enabled, speaking while Gemini is responding will automatically interrupt the current reply.

### 💾 Local Chat History

Every conversation is automatically saved as a local JSON file in VS Code's extension storage. Open the history panel to browse, reopen, or delete past chats. Reopening restores the full transcript and sends recent messages as continuation context so Gemini can pick up where you left off.

### 🎨 Shiki Syntax Highlighting

Code blocks are rendered with full Shiki syntax highlighting, matching VS Code's light and dark themes for a seamless visual experience.

### 🌐 Multi-language & Behavior Profiles

- **30+ Gemini voices** — Choose from Zephyr, Puck, Kore, Fenrir, and more.
- **18 languages** — English, Hindi, Spanish, French, German, Japanese, Korean, Mandarin Chinese, Arabic, and more.
- **3 behavior modes** — Professional (clear & structured), Friendly (conversational & patient), Expert (deeply technical with control flow, edge cases, and trade-offs).

### 🔑 Secure API Key Storage

Your Gemini API key is stored via VS Code's SecretStorage API, which uses the OS-native keychain (macOS Keychain, Windows Credential Vault, Linux libsecret).

---

## 📦 Installation

1. Open VS Code.
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux) to open the Command Palette.
3. Run **Extensions: Install from VSIX…**.
4. Select `gemini-x-v0.6.1.vsix`.
5. Open **GeminiX** from the Activity Bar (the GeminiX icon).
6. Click the gear button (⚙️) in GeminiX and save your **Gemini API key** from [Google AI Studio](https://aistudio.google.com/).

> **💡 Tip:** You can also configure your API key by running the command **GeminiX: Configure Gemini API Key** from the Command Palette.

---

## 🚀 Quick Start

### Ask about selected code

1. Select one or more lines in the active editor.
2. Confirm the context label in GeminiX (e.g., `page.jsx 14-67`).
3. Ask by voice (click the microphone button), or type a question and press **Send**.

### Start a voice conversation

1. Make sure your microphone is connected and VS Code has microphone permission.
2. Click the **Start Session** button in GeminiX.
3. Speak naturally — GeminiX streams your voice to Gemini and plays responses in real time.
4. Typing a message automatically starts the Live session if it's not already active.

### Attach a file with `@`

Type `@` in the chat input and select **Current file** to attach the entire active editor file as private context for your next question.

### Attach files or images

Click the **`+`** button, choose source/text files or JPEG/PNG/WebP images. Removable chips show what's attached. Images are paced as Live visual frames before your typed request is sent.

---

## 🧭 Detailed Usage

### Editor Context

When you select code and ask a question, GeminiX captures:

- The **exact selection** (sent as authoritative context)
- **Surrounding lines** (30 lines before and after the selection for supporting context)
- **Related imports** from the file (up to 40 lines of import declarations)

The full selection and retrieved workspace snippets are never rendered in the conversation transcript — only the file name and line range are shown.

### Workspace Search

GeminiX gives Gemini two workspace tools:

- **`search_workspace`** — Searches the in-memory lexical index for filenames, symbols, and keywords.
- **`read_workspace_file`** — Reads specific sections of a file by path.

Gemini can autonomously decide when to search, read, and incorporate results into its answer — up to 8 tool calls per turn, with up to 7 code snippets returned.

### Mute & Stop Controls

When a Live session is active, two buttons appear in the GeminiX header:

| Button      | Action                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| **Mute** 🎤 | Toggles microphone audio on/off. The mic icon shows a slash when muted.                                    |
| **Stop** ⏹️ | Immediately halts audio playback and tells Gemini to stop. Gemini remains silent until your next question. |

### Copy & Apply Code

Every code block in a response includes two action buttons:

- **📋 Copy** — Copies the code to your clipboard.
- **📄 Apply** — If you have a selection in the active editor, replaces it with the code block. If the original selection from the question is still valid, GeminiX reuses it.

### Chat History

- **Save** — Chats are saved automatically after each turn.
- **Reopen** — Open the history panel (📁 button) and click any saved chat to restore the transcript and continue the conversation.
- **Delete** — Remove individual chats from the history panel.

---

## ⚙️ Configuration

Access settings via VS Code's Settings UI (`Cmd+,` / `Ctrl+,`) and search for `liveline`, or click the gear button in GeminiX.

| Setting                      | Default        | Description                                                        |
| ---------------------------- | -------------- | ------------------------------------------------------------------ |
| `liveline.voice`             | `Kore`         | Gemini voice for audio responses (30+ options).                    |
| `liveline.preferredLanguage` | `English`      | Preferred response language (18 supported).                        |
| `liveline.behavior`          | `professional` | Conversation style: `professional`, `friendly`, or `expert`.       |
| `liveline.autoInterrupt`     | `true`         | Automatically interrupt Gemini's response when you start speaking. |

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/yogeshrjk/AI-code-explainer-VS-Code-Extension-.git
cd AI-code-explainer

# Install dependencies
npm install

# Type-check and lint
npm run check

# Build the extension
npm run build

# Package into a VSIX
npm run package
```

### Technical Architecture

| Component          | Details                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Model**       | `gemini-3.1-flash-live-preview` via the Gemini Live API (WebSocket).                                                                      |
| **Voice Input**    | Raw PCM16 audio at 16 kHz, captured via `@picovoice/pvrecorder-node` in the extension host.                                               |
| **Audio Playback** | PCM16 audio at 24 kHz, rendered in the webview via the Web Audio API.                                                                     |
| **Microphone**     | Runs in the VS Code extension host (webviews don't have direct mic access). Cross-platform binaries included in the VSIX.                 |
| **Indexing**       | In-memory lexical and filename index over workspace source files (up to 1,500 files, 384 KB each). Kept current by a `FileSystemWatcher`. |
| **Text Input**     | Real-time text via Live API `realtimeInput`.                                                                                              |
| **Image Input**    | Live API video-frame input for attached images (JPEG, PNG, WebP).                                                                         |
| **Rendering**      | Shiki syntax highlighting with VS Code's `light-plus` and `dark-plus` themes.                                                             |
| **History**        | Local JSON files in VS Code's `globalStorage`.                                                                                            |

---

## 🔒 Privacy

GeminiX is designed with privacy in mind:

- The selected code and workspace snippets are sent **directly to the Gemini API only**.
- The conversation transcript shows **only the file name and line range** — never the actual code.
- Your API key is stored in your **OS keychain** via VS Code SecretStorage.
- All chat history is stored **locally** on your machine.

---

## 📄 License

MIT
