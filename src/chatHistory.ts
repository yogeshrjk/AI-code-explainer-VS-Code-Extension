import * as vscode from "vscode";
import type { ChatMessage, ChatSummary, StoredChat } from "./types.js";

const CHAT_DIRECTORY_NAME = "chats";
const MAX_CHAT_COUNT = 100;
const MAX_CHAT_MESSAGES = 250;
const MAX_MESSAGE_CHARACTERS = 200_000;
const CHAT_ID_PATTERN = /^[0-9a-f-]{16,64}$/iu;

export class ChatHistoryStore {
  private readonly chatDirectory: vscode.Uri;

  public constructor(globalStorageUri: vscode.Uri) {
    this.chatDirectory = vscode.Uri.joinPath(
      globalStorageUri,
      CHAT_DIRECTORY_NAME
    );
  }

  public async initialize(): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.chatDirectory);
  }

  public async list(): Promise<readonly ChatSummary[]> {
    const chats = await this.readAll();
    return chats.slice(0, MAX_CHAT_COUNT).map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length
    }));
  }

  private async readAll(): Promise<readonly StoredChat[]> {
    await this.initialize();
    const entries = await vscode.workspace.fs.readDirectory(this.chatDirectory);
    const chats = await Promise.all(
      entries
        .filter(
          ([name, type]) =>
            type === vscode.FileType.File && name.endsWith(".json")
        )
        .map(async ([name]) => {
          try {
            return await this.read(name.slice(0, -5));
          } catch {
            return undefined;
          }
        })
    );

    return chats
      .filter((chat): chat is StoredChat => chat !== undefined)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  public async read(chatId: string): Promise<StoredChat> {
    this.assertChatId(chatId);
    const bytes = await vscode.workspace.fs.readFile(this.chatUri(chatId));
    const parsed: unknown = JSON.parse(Buffer.from(bytes).toString("utf8"));
    return this.validateChat(parsed);
  }

  public async save(chat: StoredChat): Promise<StoredChat> {
    await this.initialize();
    const validated = this.validateChat(chat);
    const serialized = `${JSON.stringify(validated, undefined, 2)}\n`;
    await vscode.workspace.fs.writeFile(
      this.chatUri(validated.id),
      Buffer.from(serialized, "utf8")
    );
    await this.prune();
    return validated;
  }

  public async delete(chatId: string): Promise<void> {
    this.assertChatId(chatId);
    try {
      await vscode.workspace.fs.delete(this.chatUri(chatId), {
        recursive: false,
        useTrash: false
      });
    } catch (error) {
      if (!(error instanceof vscode.FileSystemError && error.code === "FileNotFound")) {
        throw error;
      }
    }
  }

  public async conversationContext(
    chatId: string | undefined
  ): Promise<readonly ChatMessage[]> {
    if (!chatId) {
      return [];
    }

    try {
      const chat = await this.read(chatId);
      const selected: ChatMessage[] = [];
      let remainingCharacters = 24_000;
      for (
        let index = chat.messages.length - 1;
        index >= 0 && selected.length < 12 && remainingCharacters > 0;
        index -= 1
      ) {
        const message = chat.messages[index];
        if (!message) {
          continue;
        }
        const text = message.text.slice(-remainingCharacters);
        remainingCharacters -= text.length;
        selected.unshift({ ...message, text });
      }
      return selected;
    } catch {
      return [];
    }
  }

  private chatUri(chatId: string): vscode.Uri {
    return vscode.Uri.joinPath(this.chatDirectory, `${chatId}.json`);
  }

  private assertChatId(chatId: string): void {
    if (!CHAT_ID_PATTERN.test(chatId)) {
      throw new Error("The chat identifier is invalid.");
    }
  }

  private validateChat(value: unknown): StoredChat {
    if (!isRecord(value)) {
      throw new Error("The chat file is invalid.");
    }

    const id = readString(value, "id");
    this.assertChatId(id);
    const createdAt = readDate(value, "createdAt");
    const updatedAt = readDate(value, "updatedAt");
    const rawMessages = value["messages"];
    if (!Array.isArray(rawMessages)) {
      throw new Error("The chat message list is invalid.");
    }

    const messages = rawMessages
      .slice(-MAX_CHAT_MESSAGES)
      .map((message) => this.validateMessage(message));

    return {
      id,
      title: readString(value, "title").slice(0, 120),
      createdAt,
      updatedAt,
      messages
    };
  }

  private validateMessage(value: unknown): ChatMessage {
    if (!isRecord(value)) {
      throw new Error("A stored chat message is invalid.");
    }

    const role = value["role"];
    if (role !== "user" && role !== "model") {
      throw new Error("A stored chat message has an invalid role.");
    }

    return {
      id: readString(value, "id").slice(0, 80),
      role,
      text: readString(value, "text").slice(0, MAX_MESSAGE_CHARACTERS),
      createdAt: readDate(value, "createdAt"),
      contextLabel: readOptionalString(value, "contextLabel"),
      currentPageLabel: readOptionalString(value, "currentPageLabel")
    };
  }

  private async prune(): Promise<void> {
    const chats = await this.readAll();
    const stale = chats.slice(MAX_CHAT_COUNT);
    await Promise.all(
      stale.map(async (chat) => {
        await vscode.workspace.fs.delete(this.chatUri(chat.id), {
          recursive: false,
          useTrash: false
        });
      })
    );
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function readString(
  value: Readonly<Record<string, unknown>>,
  key: string
): string {
  const field = value[key];
  if (typeof field !== "string" || !field.trim()) {
    throw new Error(`The chat field '${key}' is invalid.`);
  }
  return field.trim();
}

function readOptionalString(
  value: Readonly<Record<string, unknown>>,
  key: string
): string | undefined {
  const field = value[key];
  return typeof field === "string" && field.trim()
    ? field.trim().slice(0, 240)
    : undefined;
}

function readDate(
  value: Readonly<Record<string, unknown>>,
  key: string
): string {
  const field = readString(value, key);
  if (Number.isNaN(Date.parse(field))) {
    throw new Error(`The chat date '${key}' is invalid.`);
  }
  return field;
}
