# Echo

Echo adds a Gemini Live voice console to the VS Code Activity Bar. Select code
in the active editor, open Echo, and ask a spoken or typed question.
The selected code is sent to Gemini as private context; the conversation shows
only the file name and selected line range.

## Features

- Gemini Live voice conversation with streaming input/output transcripts.
- Active-editor selection as the primary context for voice and typed questions.
- Workspace search as a Gemini Live tool: Echo can pause an answer, search and
  read relevant files or symbols through VS Code, and continue with the result.
- Lightweight in-memory lexical and filename index kept current by a file
  watcher; no vector database is required.
- `@` suggestion for attaching the complete current editor file as context.
- Compact `+` menu for attaching files and images in the composer.
- Icon-only copy and apply-to-selection actions on returned code blocks.
- Automatic Live-session startup when a typed message is sent.
- Local JSON chat history with reuse and delete actions.
- Shiki syntax highlighting with VS Code light and dark themes.
- Gemini voice, preferred language, behaviour, and auto-interrupt settings.
- Gemini API key stored through VS Code SecretStorage (the OS keychain).

## Install

1. Open VS Code.
2. Run **Extensions: Install from VSIX…** from the Command Palette.
3. Select `echo-gemini-live-code-assistant-v0.6.0.vsix`.
4. Open Echo in the Activity Bar.
5. Select the gear button in Echo and save a Gemini API key.

## Use selected code as context

1. Select one or more lines in the active editor.
2. Confirm the compact context label in Echo, such as `page.jsx 14-67`.
3. Ask by voice, or type a question and press **Send**. A typed question starts
   the Live session automatically when needed.

The full selection and retrieved workspace snippets are not rendered in the
conversation. Echo sends the selection first as authoritative context and adds
only bounded, relevant supporting snippets from the workspace.

## Attach the current file

Type `@` in the chat input and choose **Current file**. Echo shows only the file
path in the composer and privately sends the file contents with that question.

## Attach files or images

Use the `+` button and choose a source/text file or a JPEG, PNG, or WebP image.
Echo displays removable filename chips and sends only those attachments with
the next typed question. Attachments are bounded by count and size before they
are read. Images are paced as Live visual frames before the typed request.

## Copy or apply returned code

Use the clipboard icon in a code block to copy it. Select the destination range
in the active editor and use the adjacent apply icon to replace it. If no
current selection exists, Echo can safely reuse the selection captured with
the original question when it has not changed.

## Reuse local chats

Open the history button in the Echo header to reopen or delete saved chats.
Each conversation is stored as a separate JSON file in VS Code's local
extension storage. Reopening a chat restores the visible transcript and sends
only a bounded set of recent messages as continuation context.

## Development

```bash
npm install
npm run check
npm run build
npm run package
```

The extension uses `gemini-3.1-flash-live-preview`. Typed questions and
retrieved workspace context use Live API real-time text input, while attached
images use Live API video-frame input. Voice input is raw PCM16 audio at 16 kHz
and playback is PCM16 audio at 24 kHz. Microphone capture runs in the local
VS Code extension host because VS Code webviews do not grant direct microphone
access. Cross-platform recorder binaries are included in the VSIX; your
operating system may ask VS Code for microphone permission on first use.
