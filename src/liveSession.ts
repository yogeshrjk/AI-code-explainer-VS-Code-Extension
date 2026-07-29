import WebSocket, { type RawData } from "ws";
import { buildSystemInstruction } from "./prompts.js";
import type { ImageContext, Preferences } from "./types.js";

const MODEL = "gemini-3.1-flash-live-preview";
const LIVE_API_ENDPOINT =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export type LiveSessionEvent =
  | { readonly type: "connecting" }
  | { readonly type: "opened" }
  | { readonly type: "serverMessage"; readonly payload: unknown }
  | { readonly type: "error"; readonly message: string }
  | {
      readonly type: "closed";
      readonly code: number;
      readonly reason: string;
      readonly intentional: boolean;
    };

export interface LiveFunctionResponse {
  readonly id: string;
  readonly name: string;
  readonly response: Readonly<Record<string, unknown>>;
}

export class LiveSession {
  private socket: WebSocket | undefined;
  private intentionalClose = false;

  public constructor(
    private readonly onEvent: (event: LiveSessionEvent) => void
  ) {}

  public get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public connect(apiKey: string, preferences: Preferences): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.CONNECTING ||
        this.socket.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.intentionalClose = false;
    this.onEvent({ type: "connecting" });

    const endpoint = `${LIVE_API_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
    const socket = new WebSocket(endpoint);
    this.socket = socket;

    socket.on("open", () => {
      if (this.socket !== socket) {
        return;
      }

      socket.send(JSON.stringify(this.createSetupMessage(preferences)));
      this.onEvent({ type: "opened" });
    });

    socket.on("message", (data: RawData) => {
      if (this.socket !== socket) {
        return;
      }

      try {
        let jsonText: string;
        if (Array.isArray(data)) {
          jsonText = Buffer.concat(data).toString("utf8");
        } else if (data instanceof ArrayBuffer) {
          jsonText = Buffer.from(new Uint8Array(data)).toString("utf8");
        } else {
          jsonText = data.toString("utf8");
        }
        const payload: unknown = JSON.parse(jsonText);
        this.onEvent({ type: "serverMessage", payload });
      } catch {
        this.onEvent({
          type: "error",
          message: "Gemini returned an unreadable WebSocket message."
        });
      }
    });

    socket.on("error", (error: Error) => {
      if (this.socket === socket) {
        this.onEvent({ type: "error", message: error.message });
      }
    });

    socket.on("close", (code: number, reason: Buffer) => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = undefined;
      this.onEvent({
        type: "closed",
        code,
        reason: reason.toString(),
        intentional: this.intentionalClose
      });
    });
  }

  public sendAudio(base64Audio: string): boolean {
    return this.send({
      realtimeInput: {
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000"
        }
      }
    });
  }

  public sendPcm16(frame: Int16Array): boolean {
    const audio = Buffer.from(
      frame.buffer,
      frame.byteOffset,
      frame.byteLength
    ).toString("base64");
    return this.sendAudio(audio);
  }

  public sendText(text: string): boolean {
    return this.send({ realtimeInput: { text } });
  }

  /** Interrupt the current model turn by sending an empty realtime input. */
  public sendInterrupt(): boolean {
    return this.send({ realtimeInput: {} });
  }

  public async sendUserTurn(
    text: string,
    images: readonly ImageContext[] = []
  ): Promise<boolean> {
    for (const [index, image] of images.entries()) {
      if (
        !this.send({
          realtimeInput: {
            video: {
              data: image.data,
              mimeType: image.mimeType
            }
          }
        })
      ) {
        return false;
      }

      const isLastImage = index === images.length - 1;
      await delay(isLastImage ? 250 : 1_050);
      if (!this.isConnected) {
        return false;
      }
    }

    return this.send({ realtimeInput: { text } });
  }

  public sendToolResponses(
    functionResponses: readonly LiveFunctionResponse[]
  ): boolean {
    return this.send({
      toolResponse: {
        functionResponses
      }
    });
  }

  public disconnect(): void {
    const socket = this.socket;
    this.intentionalClose = true;
    this.socket = undefined;

    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close(1000, "Client disconnected");
    }
  }

  public dispose(): void {
    this.disconnect();
  }

  private send(payload: unknown): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(JSON.stringify(payload));
    return true;
  }

  private createSetupMessage(preferences: Preferences): unknown {
    return {
      setup: {
        model: `models/${MODEL}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: preferences.voice
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(preferences) }]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "search_workspace",
                description:
                  "Search the currently open VS Code workspace for files, symbols, definitions, imports, routes, components, and usages. Use this whenever the supplied context does not contain enough code to answer. The result contains real code snippets and paths.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    query: {
                      type: "STRING",
                      description:
                        "A precise filename, symbol, import path, or code-search query."
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "read_workspace_file",
                description:
                  "Read a specific workspace file returned by search_workspace. Call this after finding a path when you need more code. Large files can be read in line ranges.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    file_path: {
                      type: "STRING",
                      description:
                        "Workspace-relative file path, such as src/components/TemplateBuilder.jsx."
                    },
                    start_line: {
                      type: "INTEGER",
                      description:
                        "Optional 1-based first line. Defaults to line 1."
                    },
                    end_line: {
                      type: "INTEGER",
                      description:
                        "Optional 1-based last line. Defaults to a bounded section."
                    }
                  },
                  required: ["file_path"]
                }
              },
              {
                name: "render_markdown",
                description:
                  "Displays detailed structured content such as Markdown tables, code blocks, lists, or technical details in the chat UI. Call this whenever a table, code block, structured list, or detailed technical content would improve the answer.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    markdown: {
                      type: "STRING",
                      description: "Complete Markdown content to display."
                    }
                  },
                  required: ["markdown"]
                }
              }
            ]
          }
        ],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            prefixPaddingMs: 250,
            silenceDurationMs: 700
          },
          activityHandling: preferences.autoInterrupt
            ? "START_OF_ACTIVITY_INTERRUPTS"
            : "NO_INTERRUPTION"
        }
      }
    };
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
