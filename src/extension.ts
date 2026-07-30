import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { AttachmentStore } from "./attachments.js";
import { ChatHistoryStore } from "./chatHistory.js";
import {
  captureEditorContext,
  captureCurrentPageContext,
  summarizeCurrentPage,
  summarizeEditorContext
} from "./editorContext.js";
import {
  LiveSession,
  type LiveFunctionResponse,
  type LiveSessionEvent
} from "./liveSession.js";
import { isLiveFunctionResponse } from "./liveProtocol.js";
import { MicrophoneCapture } from "./microphoneCapture.js";
import {
  buildConversationHistoryPrompt,
  buildEditorContextPrompt,
  buildTextPrompt,
  buildWorkspaceContextPrompt
} from "./prompts.js";
import { readPreferences, savePreferences } from "./preferences.js";
import type {
  EditorContext,
  Preferences,
  StoredChat
} from "./types.js";
import { WorkspaceContextRetriever } from "./workspaceContext.js";

const API_KEY_SECRET = "liveline.geminiApiKey";
const VIEW_ID = "liveline.chatView";

interface WebviewMessage {
  readonly type: string;
  readonly value?: string;
  readonly muted?: boolean;
  readonly requestId?: string;
  readonly actionId?: string;
  readonly code?: string;
  readonly targetId?: string;
  readonly chatId?: string;
  readonly chat?: StoredChat;
  readonly includeCurrentPage?: boolean;
  readonly currentPageUri?: string;
  readonly attachmentIds?: readonly string[];
  readonly preferences?: Preferences;
  readonly functionResponse?: unknown;
}

interface ApplyTarget {
  readonly uri: vscode.Uri;
  readonly range: vscode.Range;
  readonly originalText: string;
}

interface LiveToolFunctionCall {
  readonly id?: string;
  readonly name?: string;
  readonly args?: Readonly<Record<string, unknown>>;
}

const MAX_APPLY_TARGETS = 20;
const MAX_PATCH_CHARACTERS = 1_000_000;
const MAX_WORKSPACE_TOOL_CALLS_PER_TURN = 8;

class GeminiXViewProvider
  implements vscode.WebviewViewProvider, vscode.Disposable
{
  private view: vscode.WebviewView | undefined;
  private session: LiveSession | undefined;
  private microphone: MicrophoneCapture | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly workspaceContextRetriever = new WorkspaceContextRetriever();
  private readonly applyTargets = new Map<string, ApplyTarget>();
  private readonly attachmentStore = new AttachmentStore();
  private readonly chatHistory: ChatHistoryStore;
  private turnPrimaryContext: EditorContext | undefined;
  private workspaceToolCallsThisTurn = 0;
  private micMuted = false;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly secrets: vscode.SecretStorage,
    globalStorageUri: vscode.Uri
  ) {
    this.chatHistory = new ChatHistoryStore(globalStorageUri);
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(() => {
        this.postEditorContextState();
      }),
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.postEditorContextState();
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (
          event.document.uri.toString() ===
          vscode.window.activeTextEditor?.document.uri.toString()
        ) {
          this.postEditorContextState();
        }
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("liveline")) {
          this.post({
            type: "preferences",
            preferences: readPreferences()
          });
        }
      })
    );
  }

  public resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const distributionUri = vscode.Uri.joinPath(this.extensionUri, "dist");

    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [distributionUri]
    };
    view.webview.html = this.getHtml(view.webview);

    this.disposables.push(
      view.webview.onDidReceiveMessage((message: WebviewMessage) =>
        this.handleMessage(message)
      ),
      view.onDidDispose(() => {
        this.disposeLiveResources();
        this.view = undefined;
      })
    );
  }

  public async configureApiKey(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      password: true,
      placeHolder: "AIza...",
      prompt: "Enter your Google AI Studio Gemini API key",
      title: "Configure GeminiX"
    });

    if (apiKey === undefined) {
      return;
    }

    if (!apiKey.trim()) {
      void vscode.window.showErrorMessage("The Gemini API key cannot be empty.");
      return;
    }

    await this.secrets.store(API_KEY_SECRET, apiKey.trim());
    await this.postApiStatus();
    void vscode.window.showInformationMessage("GeminiX API key saved securely.");
  }

  public dispose(): void {
    this.disposeLiveResources();
    this.disposables.forEach((disposable) => {
      disposable.dispose();
    });
    this.workspaceContextRetriever.dispose();
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case "ready":
          await this.sendInitialState();
          break;
        case "saveApiKey":
          await this.saveApiKey(message.value);
          break;
        case "removeApiKey":
          await this.removeApiKey();
          break;
        case "savePreferences":
          await this.updatePreferences(message.preferences);
          break;
        case "startSession":
          await this.startSession();
          break;
        case "stopSession":
          this.stopSession();
          break;
        case "sendText":
          await this.sendText(
            message.value,
            message.requestId,
            message.chatId,
            message.includeCurrentPage,
            message.currentPageUri,
            message.attachmentIds
          );
          break;
        case "pickFileAttachments":
          await this.pickFileAttachments();
          break;
        case "pickImageAttachments":
          await this.pickImageAttachments();
          break;
        case "removeAttachment":
          this.removeAttachment(message.value);
          break;
        case "saveChat":
          await this.saveChat(message.chat);
          break;
        case "loadChat":
          await this.loadChat(message.chatId);
          break;
        case "deleteChat":
          await this.deleteChat(message.chatId);
          break;
        case "copyCode":
          await this.copyCode(message.code, message.actionId);
          break;
        case "applyPatch":
          await this.applyPatch(
            message.code,
            message.targetId,
            message.actionId
          );
          break;
        case "muteMic":
          this.micMuted = Boolean(message.muted);
          this.post({
            type: "micMuted",
            muted: this.micMuted,
            level: this.micMuted ? 0 : undefined
          });
          break;
        case "interruptTurn":
          this.session?.sendInterrupt();
          break;
        case "sendToolResponse":
          this.sendToolResponse(message.functionResponse);
          break;
      }
    } catch (error) {
      this.post({
        type: "hostError",
        message:
          error instanceof Error
            ? error.message
            : "GeminiX could not continue."
      });
    }
  }

  private async sendInitialState(): Promise<void> {
    await this.chatHistory.initialize();
    this.post({
      type: "initialState",
      apiConfigured: Boolean(await this.secrets.get(API_KEY_SECRET)),
      preferences: readPreferences(),
      selection: summarizeEditorContext(captureEditorContext()),
      currentPage: summarizeCurrentPage(captureCurrentPageContext()),
      attachments: this.attachmentStore.list(),
      chats: await this.chatHistory.list()
    });
  }

  private async saveApiKey(value: string | undefined): Promise<void> {
    const apiKey = value?.trim();
    if (!apiKey) {
      throw new Error("Enter a Gemini API key before saving.");
    }

    await this.secrets.store(API_KEY_SECRET, apiKey);
    await this.postApiStatus();
  }

  private async removeApiKey(): Promise<void> {
    this.stopSession();
    await this.secrets.delete(API_KEY_SECRET);
    await this.postApiStatus();
  }

  private async updatePreferences(
    preferences: Preferences | undefined
  ): Promise<void> {
    if (!preferences) {
      throw new Error("GeminiX settings were not provided.");
    }

    const savedPreferences = await savePreferences(preferences);
    this.post({
      type: "preferencesSaved",
      preferences: savedPreferences
    });
  }

  private async startSession(): Promise<void> {
    const apiKey = await this.secrets.get(API_KEY_SECRET);
    if (!apiKey) {
      this.post({ type: "apiRequired" });
      return;
    }

    this.disposeLiveResources();
    this.session = new LiveSession((event) => {
      this.handleSessionEvent(event);
    });

    this.microphone = new MicrophoneCapture({
      onFrame: (frame) => {
        if (!this.micMuted) {
          this.session?.sendPcm16(frame);
        }
      },
      onLevel: (level) => {
        this.post({ type: "microphoneLevel", level });
      },
      onSpeechStart: () => {
        void this.sendVoiceContext();
      },
      onError: (message) => {
        this.post({ type: "sessionError", message });
        this.stopSession();
      }
    });

    try {
      this.microphone.start();
      this.session.connect(apiKey, readPreferences());
    } catch (error) {
      this.disposeLiveResources();
      throw new Error(
        error instanceof Error
          ? `Could not open the default microphone: ${error.message}`
          : "Could not open the default microphone."
      );
    }
  }

  private stopSession(): void {
    this.disposeLiveResources();
    this.post({ type: "sessionStopped" });
  }

  private async sendText(
    text: string | undefined,
    requestId: string | undefined,
    chatId: string | undefined,
    includeCurrentPage: boolean | undefined,
    currentPageUri: string | undefined,
    attachmentIds: readonly string[] | undefined
  ): Promise<void> {
    const userText = text?.trim();
    if (!userText || !this.session?.isConnected) {
      this.post({
        type: "textRejected",
        requestId,
        message: "Start a live session before sending a message."
      });
      return;
    }

    const context = captureEditorContext();
    const currentPageContext = includeCurrentPage
      ? captureCurrentPageContext(currentPageUri)
      : undefined;
    const applyTargetId = this.registerApplyTarget(context);
    this.turnPrimaryContext = context;
    this.workspaceToolCallsThisTurn = 0;
    const requestedAttachmentIds = attachmentIds ?? [];
    const preparedAttachments = await this.attachmentStore.prepare(
      requestedAttachmentIds
    );

    this.post({
      type: "textAccepted",
      requestId,
      text: userText,
      context: summarizeEditorContext(context),
      currentPage: summarizeCurrentPage(currentPageContext),
      applyTargetId,
      attachments: requestedAttachmentIds
    });

    const announceSearch = shouldAnnounceWorkspaceSearch(userText);
    if (announceSearch) {
      this.post({
        type: "workspaceSearchStarted",
        requestId,
        message: "Let me search the workspace and read the relevant code."
      });
    }

    const workspaceContext = await this.workspaceContextRetriever.retrieve(
      userText,
      context
    );
    if (announceSearch) {
      this.postWorkspaceSearchCompleted(requestId, workspaceContext);
    }

    const conversationPrompt = buildConversationHistoryPrompt(
      await this.chatHistory.conversationContext(chatId)
    );
    const prompt = buildTextPrompt(
      userText,
      context,
      currentPageContext,
      workspaceContext,
      preparedAttachments.prompt,
      conversationPrompt
    );
    const session = this.session;
    if (
      !(await session.sendUserTurn(prompt, preparedAttachments.images)) ||
      session !== this.session
    ) {
      this.post({
        type: "textRejected",
        requestId,
        message: "The message could not be sent."
      });
      return;
    }

    this.attachmentStore.release(requestedAttachmentIds);
    this.postAttachmentState();
  }

  private sendToolResponse(
    functionResponse: unknown
  ): void {
    if (!isLiveFunctionResponse(functionResponse)) {
      this.post({
        type: "toolResponseStatus",
        success: false,
        message: "Rejected an invalid Gemini tool-response payload."
      });
      return;
    }

    const session = this.session;
    const sent = Boolean(
      session?.sendToolResponses([functionResponse])
    );
    this.post({
      type: "toolResponseStatus",
      functionCallId: functionResponse.id,
      functionName: functionResponse.name,
      success: sent,
      message: sent
        ? `Sent ${functionResponse.name} response (${functionResponse.id}).`
        : `Could not send ${functionResponse.name} response because the Gemini session is not connected.`
    });
  }

  private async pickFileAttachments(): Promise<void> {
    try {
      await this.attachmentStore.pickTextFiles();
    } finally {
      this.postAttachmentState();
    }
  }

  private async pickImageAttachments(): Promise<void> {
    try {
      await this.attachmentStore.pickImages();
    } finally {
      this.postAttachmentState();
    }
  }

  private removeAttachment(id: string | undefined): void {
    if (id) {
      this.attachmentStore.remove(id);
      this.postAttachmentState();
    }
  }

  private async saveChat(chat: StoredChat | undefined): Promise<void> {
    if (!chat) {
      throw new Error("The chat content was not provided.");
    }

    const saved = await this.chatHistory.save(chat);
    this.post({
      type: "chatSaved",
      chatId: saved.id,
      chats: await this.chatHistory.list()
    });
  }

  private async loadChat(chatId: string | undefined): Promise<void> {
    if (!chatId) {
      throw new Error("Choose a saved chat to reuse.");
    }

    this.post({
      type: "chatLoaded",
      chat: await this.chatHistory.read(chatId)
    });
  }

  private async deleteChat(chatId: string | undefined): Promise<void> {
    if (!chatId) {
      throw new Error("Choose a saved chat to delete.");
    }

    const confirmation = await vscode.window.showWarningMessage(
      "Delete this saved GeminiX chat? This cannot be undone.",
      { modal: true },
      "Delete"
    );
    if (confirmation !== "Delete") {
      return;
    }

    await this.chatHistory.delete(chatId);
    this.post({
      type: "chatDeleted",
      chatId,
      chats: await this.chatHistory.list()
    });
  }

  private async sendVoiceContext(): Promise<void> {
    const context = captureEditorContext();
    const session = this.session;
    this.turnPrimaryContext = context;
    this.workspaceToolCallsThisTurn = 0;
    if (context && session?.isConnected) {
      const workspaceContext = await this.workspaceContextRetriever.retrieve(
        "",
        context
      );
      if (session !== this.session || !this.session.isConnected) {
        return;
      }

      const workspacePrompt = buildWorkspaceContextPrompt(workspaceContext);
      session.sendText(
        [
          buildEditorContextPrompt(context),
          workspacePrompt,
          "The user is now asking a voice question about this context."
        ]
          .filter(Boolean)
          .join("\n\n")
      );
    }

    this.post({
      type: "voiceContext",
      context: summarizeEditorContext(context),
      applyTargetId: this.registerApplyTarget(context)
    });
  }

  private handleSessionEvent(event: LiveSessionEvent): void {
    switch (event.type) {
      case "connecting":
        this.post({ type: "sessionConnecting" });
        break;
      case "opened":
        this.post({ type: "sessionOpened" });
        break;
      case "serverMessage":
        void this.handleWorkspaceToolCalls(event.payload);
        this.post({ type: "serverMessage", payload: event.payload });
        break;
      case "debug":
        this.post({ type: "debugLog", message: event.message });
        break;
      case "error":
        this.post({ type: "sessionError", message: event.message });
        break;
      case "closed":
        this.microphone?.dispose();
        this.microphone = undefined;
        this.session = undefined;
        this.post({
          type: "sessionClosed",
          code: event.code,
          reason: event.reason,
          intentional: event.intentional
        });
        break;
    }
  }

  private disposeLiveResources(): void {
    this.microphone?.dispose();
    this.microphone = undefined;
    this.session?.dispose();
    this.session = undefined;
  }

  private async postApiStatus(): Promise<void> {
    this.post({
      type: "apiStatus",
      configured: Boolean(await this.secrets.get(API_KEY_SECRET))
    });
  }

  private postEditorContextState(): void {
    this.post({
      type: "selectionChanged",
      selection: summarizeEditorContext(captureEditorContext()),
      currentPage: summarizeCurrentPage(captureCurrentPageContext())
    });
  }

  private registerApplyTarget(
    context: EditorContext | undefined
  ): string | undefined {
    if (!context) {
      return undefined;
    }

    const targetId = randomBytes(16).toString("hex");
    this.applyTargets.set(targetId, {
      uri: vscode.Uri.parse(context.uri),
      range: new vscode.Range(
        context.startLineIndex,
        context.startCharacter,
        context.endLineIndex,
        context.endCharacter
      ),
      originalText: context.text
    });

    while (this.applyTargets.size > MAX_APPLY_TARGETS) {
      const oldestTargetId = this.applyTargets.keys().next().value;
      if (!oldestTargetId) {
        break;
      }
      this.applyTargets.delete(oldestTargetId);
    }
    return targetId;
  }

  private async copyCode(
    code: string | undefined,
    actionId: string | undefined
  ): Promise<void> {
    if (code === undefined) {
      throw new Error("No code was provided to copy.");
    }

    await vscode.env.clipboard.writeText(code);
    this.post({ type: "codeCopied", actionId });
  }

  private async applyPatch(
    code: string | undefined,
    targetId: string | undefined,
    actionId: string | undefined
  ): Promise<void> {
    if (code === undefined || code.length > MAX_PATCH_CHARACTERS) {
      throw new Error("The returned code is empty or too large to apply.");
    }

    const activeEditor = vscode.window.activeTextEditor;
    const activeSelection =
      activeEditor && !activeEditor.selection.isEmpty
        ? {
            uri: activeEditor.document.uri,
            range: activeEditor.selection,
            originalText: activeEditor.document.getText(activeEditor.selection)
          }
        : undefined;
    const capturedTarget = targetId
      ? this.applyTargets.get(targetId)
      : undefined;
    const target = activeSelection ?? capturedTarget;
    if (!target) {
      throw new Error(
        "Select the code you want to replace in the active editor, then click Apply again."
      );
    }

    const document = await vscode.workspace.openTextDocument(target.uri);
    if (
      !activeSelection &&
      document.getText(target.range) !== target.originalText
    ) {
      throw new Error(
        "The selected code changed after the answer was generated. Select it again before applying."
      );
    }

    const replacement =
      !target.originalText.endsWith("\n") && code.endsWith("\n")
        ? code.slice(0, -1)
        : code;
    const edit = new vscode.WorkspaceEdit();
    edit.replace(target.uri, target.range, replacement);
    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
      throw new Error("VS Code could not apply the returned code.");
    }

    if (targetId) {
      this.applyTargets.delete(targetId);
    }
    this.post({ type: "patchApplied", actionId, targetId });
    void vscode.window.showInformationMessage(
      `GeminiX applied the code to ${vscode.workspace.asRelativePath(target.uri, false)}.`
    );
  }

  private async handleWorkspaceToolCalls(payload: unknown): Promise<void> {
    const functionCalls = getToolFunctionCalls(payload);
    const session = this.session;
    if (!functionCalls.length || !session?.isConnected) {
      return;
    }

    const responses: LiveFunctionResponse[] = [];
    for (const functionCall of functionCalls) {
      const id = functionCall.id;
      const name = functionCall.name;
      if (!id || !name) {
        continue;
      }

      // render_markdown is handled by the webview, not the extension host.
      if (name === "render_markdown") {
        continue;
      }

      if (
        this.workspaceToolCallsThisTurn >=
        MAX_WORKSPACE_TOOL_CALLS_PER_TURN
      ) {
        responses.push({
          id,
          name,
          response: {
            error:
              "Workspace tool limit reached for this turn. Answer from the evidence already returned."
          }
        });
        continue;
      }
      this.workspaceToolCallsThisTurn += 1;

      if (name === "search_workspace") {
        const query = getStringArgument(functionCall.args, "query");
        if (!query) {
          responses.push({
            id,
            name,
            response: { error: "A non-empty search query is required." }
          });
          continue;
        }

        this.post({
          type: "workspaceSearchStarted",
          requestId: id,
          message: `Let me search the workspace for ${query}.`
        });
        try {
          const workspaceContext =
            await this.workspaceContextRetriever.retrieve(
              query,
              this.turnPrimaryContext
            );
          this.postWorkspaceSearchCompleted(id, workspaceContext);
          responses.push({
            id,
            name,
            response: {
              query,
              indexedFileCount: workspaceContext.indexedFileCount,
              snippets: workspaceContext.snippets,
              truncated: workspaceContext.truncated,
              message: workspaceContext.snippets.length
                ? "Workspace code was found and read."
                : "No matching workspace code was found."
            }
          });
        } catch (error) {
          responses.push({
            id,
            name,
            response: {
              error:
                error instanceof Error
                  ? error.message
                  : "The workspace search failed."
            }
          });
        }
        continue;
      }

      if (name === "read_workspace_file") {
        const filePath = getStringArgument(functionCall.args, "file_path");
        if (!filePath) {
          responses.push({
            id,
            name,
            response: {
              error: "A workspace-relative file_path is required."
            }
          });
          continue;
        }

        this.post({
          type: "workspaceSearchStarted",
          requestId: id,
          message: `Let me read ${displayFileName(filePath)}.`
        });
        try {
          const file = await this.workspaceContextRetriever.readFile(
            filePath,
            getNumberArgument(functionCall.args, "start_line"),
            getNumberArgument(functionCall.args, "end_line")
          );
          this.post({
            type: "workspaceSearchCompleted",
            requestId: id,
            files: [file.filePath],
            message: `Read lines ${file.startLine}-${file.endLine}.`
          });
          responses.push({
            id,
            name,
            response: { file }
          });
        } catch (error) {
          responses.push({
            id,
            name,
            response: {
              error:
                error instanceof Error
                  ? error.message
                  : "The workspace file could not be read."
            }
          });
        }
        continue;
      }

      responses.push({
        id,
        name,
        response: { error: `Unknown tool: ${name}` }
      });
    }

    if (
      responses.length &&
      session === this.session
    ) {
      if (!session.sendToolResponses(responses)) {
        this.post({
          type: "sessionError",
          message: "The workspace tool results could not be sent to Gemini."
        });
      }
    }
  }

  private postWorkspaceSearchCompleted(
    requestId: string | undefined,
    workspaceContext: Awaited<
      ReturnType<WorkspaceContextRetriever["retrieve"]>
    >
  ): void {
    const files = [
      ...new Set(workspaceContext.snippets.map((snippet) => snippet.filePath))
    ];
    this.post({
      type: "workspaceSearchCompleted",
      requestId,
      files,
      message: files.length
        ? `Reviewed ${files.length} relevant code ${files.length === 1 ? "file" : "files"}.`
        : vscode.workspace.workspaceFolders?.length
          ? `Searched ${workspaceContext.indexedFileCount} source files; no strong code match was found.`
          : "No VS Code workspace folder is open. Open the project folder to enable codebase search."
    });
  }

  private postAttachmentState(): void {
    this.post({
      type: "attachmentsChanged",
      attachments: this.attachmentStore.list()
    });
  }

  private post(message: unknown): void {
    void this.view?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString("base64");
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "styles.css")
    );

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri.toString()}">
  <title>GeminiX</title>
</head>
<body>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span>
          <strong>GeminiX</strong>
          <small>Gemini Live code assistant</small>
        </span>
      </div>
      <div class="header-actions">
        <span id="headerStatus" class="header-status">Ready</span>
        <button
          id="newChatButton"
          class="icon-button"
          type="button"
          aria-label="Start a new chat"
          title="New chat"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2h8.5A1.5 1.5 0 0 1 12 3.5V7h-1.2V3.5a.3.3 0 0 0-.3-.3h-7a.3.3 0 0 0-.3.3v7a.3.3 0 0 0 .3.3H7V12H3.5A1.5 1.5 0 0 1 2 10.5V2zm9.4 6v2.6H14v1.2h-2.6v2.6h-1.2v-2.6H7.6v-1.2h2.6V8h1.2z"/>
          </svg>
        </button>
        <button
          id="historyButton"
          class="icon-button"
          type="button"
          aria-label="Open chat history"
          aria-pressed="false"
          title="Chat history"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2a6 6 0 1 1-5.64 3.95l1.13.41A4.8 4.8 0 1 0 8 3.2c-1.3 0-2.48.51-3.34 1.35L6.2 6.1H2V1.9l1.8 1.8A5.98 5.98 0 0 1 8 2zm-.6 2.4h1.2v3.35l2.25 1.3-.6 1.04L7.4 8.45V4.4z"/>
          </svg>
        </button>
        <button
          id="settingsButton"
          class="icon-button settings-button"
          type="button"
          aria-label="Open settings"
          aria-pressed="false"
          title="Settings"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M9.9 1.5l.35 1.4c.3.13.57.29.82.48l1.39-.42 1.15 1.98-1.04 1c.03.2.05.4.05.61s-.02.41-.05.61l1.04 1-1.15 1.98-1.39-.42c-.25.19-.52.35-.82.48l-.35 1.4H7.6l-.35-1.4a4.4 4.4 0 0 1-.82-.48l-1.39.42-1.15-1.98 1.04-1a4 4 0 0 1 0-1.22l-1.04-1 1.15-1.98 1.39.42c.25-.19.52-.35.82-.48l.35-1.4h2.3zm-1.15 3.3a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5z"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="app-main">
      <section id="chatPanel" class="panel is-active" aria-label="Chat">
        <div class="chat-scroll-region">
          <div id="apiRequiredCard" class="notice-card hidden">
            <strong>Connect Gemini to begin</strong>
            <p>Add your Gemini API key in settings to start a live code conversation.</p>
            <button id="configureApiButton" class="secondary-button" type="button">Open settings</button>
          </div>

          <section id="voiceStage" class="voice-stage">
            <canvas id="orbCanvas" aria-label="Live session animation"></canvas>
            <span id="orbMode" class="orb-mode">standby</span>
            <div class="status-line">
              <span class="status-left">
                <span id="statusDot" class="status-dot"></span>
                <span id="statusLabel">Ready</span>
              </span>
              <span class="status-actions">
                <button
                  id="muteMicButton"
                  class="icon-button"
                  type="button"
                  title="Mute microphone"
                  aria-label="Mute microphone"
                  hidden
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.5a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0V5A2.5 2.5 0 0 0 10 2.5Z" />
                    <path d="M6.5 9.25a.75.75 0 0 0-1.5 0 5 5 0 0 0 4.25 4.94V16H7a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25v-1.81a5 5 0 0 0 4.25-4.94.75.75 0 0 0-1.5 0 3.5 3.5 0 1 1-7 0Z" />
                    <path d="M13.5 2.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0V3.25a.75.75 0 0 1 .75-.75Z" class="mute-slash" />
                    <path d="M13.5 6.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Z" class="mute-slash" />
                  </svg>
                </button>
                <button
                  id="stopPlaybackButton"
                  class="icon-button"
                  type="button"
                  title="Stop response"
                  aria-label="Stop response"
                  hidden
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" />
                  </svg>
                </button>
                <span id="sessionTimer" class="session-timer hidden">00:00</span>
              </span>
            </div>
            <div class="mic-track" aria-hidden="true">
              <span id="micMeter" class="mic-meter"></span>
            </div>
            <div class="session-actions">
              <button id="sessionButton" class="primary-button" type="button">
                Start live session
              </button>
            </div>
          </section>

          <div id="errorBox" class="error-box hidden" role="alert"></div>

          <section class="transcript-section">
            <div class="section-heading">
              <span>Chat</span>
            <button id="clearButton" class="text-button" type="button">New chat</button>
            </div>
            <div id="transcript" class="transcript" aria-live="polite">
              <div id="emptyState" class="empty-state">
                <strong>Ask about the code you are working on</strong>
                <span>Select lines in the editor to add them as private context.</span>
              </div>
            </div>
          </section>
        </div>

        <form id="textForm" class="composer">
          <div id="mentionMenu" class="mention-menu hidden" role="listbox" aria-label="Context suggestions">
            <button id="currentPageMention" class="mention-option" type="button" role="option">
              <span class="mention-symbol" aria-hidden="true">@</span>
              <span class="mention-copy">
                <strong>Current file</strong>
                <small id="currentPageMentionLabel"></small>
              </span>
            </button>
          </div>
          <div id="selectionBar" class="selection-bar hidden">
            <span class="selection-icon" aria-hidden="true">&lt;/&gt;</span>
            <span class="selection-copy">
              <small>Selected context</small>
              <strong id="selectionLabel"></strong>
            </span>
          </div>
          <div id="currentPageBar" class="selection-bar current-page-bar hidden">
            <span class="selection-icon" aria-hidden="true">@</span>
            <span class="selection-copy">
              <small>Current file context</small>
              <strong id="currentPageLabel"></strong>
            </span>
            <button id="removeCurrentPageButton" class="context-remove-button" type="button" aria-label="Remove current file context" title="Remove context">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4.3 3.4 3.7 3.7 3.7-3.7.9.9L8.9 8l3.7 3.7-.9.9L8 8.9l-3.7 3.7-.9-.9L7.1 8 3.4 4.3l.9-.9z"/>
              </svg>
            </button>
          </div>
          <div id="attachmentList" class="attachment-list hidden" aria-label="Attached files"></div>
          <div class="composer-row">
            <div class="attachment-menu-wrap">
              <button id="attachmentButton" class="composer-tool-button" type="button" aria-label="Add a file or image" aria-expanded="false" title="Add context">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M7.4 2h1.2v5.4H14v1.2H8.6V14H7.4V8.6H2V7.4h5.4V2z"/>
                </svg>
              </button>
              <div id="attachmentMenu" class="attachment-menu hidden" role="menu">
                <button id="attachFileButton" class="attachment-option" type="button" role="menuitem">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5h6.2L13 5.3v9.2H3v-13zm1.2 1.2v10.6h7.6V6H8.5V2.7H4.2zm5.5.7v1.4h1.4L9.7 3.4z"/></svg>
                  <span>Add file</span>
                </button>
                <button id="attachImageButton" class="attachment-option" type="button" role="menuitem">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v12H2V2zm1.2 1.2v9.6h9.6V3.2H3.2zm1.1 8.2 2.6-3 1.8 2 1.2-1.3 1.8 2.3H4.3zm6.4-6.9a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z"/></svg>
                  <span>Add image</span>
                </button>
              </div>
            </div>
            <textarea
              id="textInput"
              rows="1"
              autocomplete="off"
              placeholder="Ask GeminiX about your code…"
              aria-label="Chat message"
            ></textarea>
            <button id="sendButton" class="send-button" type="submit" disabled aria-label="Send message" title="Send">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.2 2.4a.65.65 0 0 1 .72-.12l10.2 5.1a.7.7 0 0 1 0 1.24l-10.2 5.1A.65.65 0 0 1 2 13.08L3.1 9 8.3 8 3.1 7 2 2.92a.65.65 0 0 1 .2-.52z"/>
              </svg>
            </button>
          </div>
          <small class="composer-hint">Type @ for current file · + for attachments · Enter to send</small>
        </form>
      </section>

      <section id="historyPanel" class="panel" aria-label="Chat history">
        <div class="settings-header">
          <button id="backFromHistoryButton" class="icon-button" type="button" aria-label="Back to chat" title="Back to chat">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M7.35 2.15 1.5 8l5.85 5.85.9-.9L3.94 8.63H14v-1.26H3.94l4.31-4.32-.9-.9z"/>
            </svg>
          </button>
          <span class="panel-heading-copy">
            <strong>Chat history</strong>
            <small>Stored locally by GeminiX</small>
          </span>
          <button id="newChatFromHistoryButton" class="secondary-button compact" type="button">New chat</button>
        </div>
        <div id="chatHistoryList" class="chat-history-list">
          <div id="emptyHistory" class="empty-history">No saved chats yet.</div>
        </div>
      </section>

      <section id="settingsPanel" class="panel" aria-label="Settings">
        <div class="settings-header">
          <button id="backToChatButton" class="icon-button" type="button" aria-label="Back to chat" title="Back to chat">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M7.35 2.15 1.5 8l5.85 5.85.9-.9L3.94 8.63H14v-1.26H3.94l4.31-4.32-.9-.9z"/>
            </svg>
          </button>
          <span>
            <strong>Settings</strong>
            <small>Configure GeminiX</small>
          </span>
        </div>

        <div class="settings-group">
          <div class="settings-title">
            <span>
              <strong>Gemini API</strong>
              <small id="apiStatusText">Not configured</small>
            </span>
            <span id="apiStatusDot" class="api-status-dot"></span>
          </div>
          <label class="field">
            <span>API key</span>
            <input id="apiKeyInput" type="password" spellcheck="false" autocomplete="off" placeholder="AIza…">
          </label>
          <div class="button-row">
            <button id="saveApiButton" class="primary-button compact" type="button">Save API key</button>
            <button id="removeApiButton" class="secondary-button compact hidden" type="button">Remove key</button>
          </div>
          <p class="field-help">Stored with VS Code SecretStorage in your operating system keychain.</p>
        </div>

        <div class="settings-group">
          <label class="field">
            <span>Gemini voice</span>
            <select id="voiceSelect"></select>
          </label>
          <label class="field">
            <span>Preferred language</span>
            <select id="languageSelect"></select>
          </label>
          <label class="field">
            <span>Behaviour</span>
            <select id="behaviorSelect">
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <label class="toggle-row">
            <span>
              <strong>Auto-interrupt</strong>
              <small>Interrupt Gemini when you start speaking.</small>
            </span>
            <input id="autoInterruptInput" type="checkbox">
          </label>
          <p id="reconnectHint" class="field-help warning hidden">Reconnect the live session to apply changed voice settings.</p>
          <button id="savePreferencesButton" class="primary-button" type="button">Save preferences</button>
          <p id="settingsFeedback" class="field-help hidden" role="status"></p>
        </div>

        <div class="settings-group">
          <button id="debugToggle" class="debug-toggle" type="button" aria-expanded="false">
            <svg viewBox="0 0 16 16" aria-hidden="true" class="debug-toggle-icon"><path d="M5.65 2.15 3.5 4.29 7.21 8 3.5 11.71l2.15 2.14L11.5 8 5.65 2.15z"/></svg>
            <span>Debug log</span>
            <small id="debugBadge" class="debug-badge hidden">0</small>
          </button>
          <div id="debugPanel" class="debug-panel hidden">
            <div id="debugEntries" class="debug-entries" role="log" aria-live="polite"></div>
            <button id="debugClearButton" class="code-action-button debug-clear" type="button">Clear log</button>
          </div>
        </div>
      </section>
    </main>
  </div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}

function getToolFunctionCalls(payload: unknown): readonly LiveToolFunctionCall[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const toolCall = (payload as { readonly toolCall?: unknown }).toolCall;
  if (typeof toolCall !== "object" || toolCall === null) {
    return [];
  }

  const functionCalls = (
    toolCall as { readonly functionCalls?: unknown }
  ).functionCalls;
  return Array.isArray(functionCalls)
    ? (functionCalls as readonly LiveToolFunctionCall[])
    : [];
}

function getStringArgument(
  args: Readonly<Record<string, unknown>> | undefined,
  name: string
): string | undefined {
  const value = args?.[name];
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function getNumberArgument(
  args: Readonly<Record<string, unknown>> | undefined,
  name: string
): number | undefined {
  const value = args?.[name];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : undefined;
}

function shouldAnnounceWorkspaceSearch(userText: string): boolean {
  return (
    /\b(find|search|locate|look\s+for|where|defined|definition|references?|usages?|implementation|codebase|workspace|project|file|component|route)\b/iu.test(
      userText
    ) ||
    /(?:^|[\s"'`(])(?:[.@\w-]+[\\/])*[.@\w-]+\.[A-Za-z0-9]+(?=$|[\s"'`),:;?])/u.test(
      userText
    )
  );
}

function displayFileName(filePath: string): string {
  return filePath.split(/[\\/]/u).pop() ?? filePath;
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new GeminiXViewProvider(
    context.extensionUri,
    context.secrets,
    context.globalStorageUri
  );

  context.subscriptions.push(
    provider,
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }),
    vscode.commands.registerCommand("liveline.configureApiKey", () =>
      provider.configureApiKey()
    )
  );
}

export function deactivate(): void {}
