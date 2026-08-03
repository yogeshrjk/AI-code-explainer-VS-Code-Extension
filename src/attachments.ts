import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import * as vscode from "vscode";
import {
  captureCurrentPageContext,
  summarizeCurrentPage
} from "./editorContext.js";
import type {
  AttachmentDisplay,
  AttachmentSummary,
  CurrentPageContext,
  ImageContext
} from "./types.js";

const MAX_ATTACHMENTS = 6;
const MAX_IMAGE_ATTACHMENTS = 3;
const MAX_TEXT_FILE_BYTES = 1 * 1_024 * 1_024;
const MAX_IMAGE_FILE_BYTES = 12 * 1_024 * 1_024;
const MAX_ATTACHMENT_TEXT_CHARACTERS = 80_000;

const IMAGE_MIME_TYPES = new Map([
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function sniffImageMimeType(bytes: Uint8Array): string | undefined {
  const startsWith = (offset: number, expected: readonly number[]): boolean =>
    expected.every((byte, index) => bytes[offset + index] === byte);

  // JPEG: FF D8 FF
  if (startsWith(0, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    startsWith(0, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }
  // GIF: GIF8
  if (startsWith(0, [0x47, 0x49, 0x46, 0x38])) {
    return "image/gif";
  }
  return undefined;
}

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".conf",
  ".cpp",
  ".cs",
  ".css",
  ".csv",
  ".dart",
  ".env",
  ".go",
  ".graphql",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".kt",
  ".kts",
  ".log",
  ".md",
  ".php",
  ".properties",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".tsv",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml"
]);

interface StoredAttachment {
  readonly summary: AttachmentSummary;
  readonly uri?: vscode.Uri;
  readonly currentPage?: CurrentPageContext;
  readonly mimeType?: string;
}

export interface PreparedAttachments {
  readonly prompt: string;
  readonly images: readonly ImageContext[];
}

export class AttachmentStore {
  private readonly attachments = new Map<string, StoredAttachment>();

  public list(): readonly AttachmentSummary[] {
    return [...this.attachments.values()].map(({ summary }) => summary);
  }

  public addCurrentFile(): AttachmentSummary {
    const currentPage = captureCurrentPageContext();
    const currentPageSummary = summarizeCurrentPage(currentPage);
    if (!currentPage || !currentPageSummary) {
      throw new Error("Open a text editor before adding the current file.");
    }

    const duplicate = [...this.attachments.values()].find(
      (attachment) =>
        attachment.summary.kind === "currentFile" &&
        attachment.currentPage?.uri === currentPage.uri
    );
    if (duplicate) {
      return duplicate.summary;
    }

    this.assertCapacity(1);
    const summary: AttachmentSummary = {
      id: randomUUID(),
      kind: "currentFile",
      label: currentPageSummary.label
    };
    this.attachments.set(summary.id, { currentPage, summary });
    return summary;
  }

  public async pickTextFiles(): Promise<readonly AttachmentSummary[]> {
    return this.pickFiles("text");
  }

  public async pickImages(): Promise<readonly AttachmentSummary[]> {
    return this.pickFiles("image");
  }

  private async pickFiles(
    selectionKind: "text" | "image"
  ): Promise<readonly AttachmentSummary[]> {
    const isImageSelection = selectionKind === "image";
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      openLabel: isImageSelection ? "Add images" : "Add files",
      title: isImageSelection
        ? "Add image context to GeminiX"
        : "Add file context to GeminiX",
      filters: isImageSelection
        ? { Images: ["jpg", "jpeg", "png", "webp"] }
        : {
            "Code and text": [...TEXT_EXTENSIONS].map((extension) =>
              extension.slice(1)
            )
          }
    });
    if (!uris?.length) {
      return [];
    }

    this.assertCapacity(uris.length);
    const added: AttachmentSummary[] = [];
    for (const uri of uris) {
      const duplicate = [...this.attachments.values()].find(
        (attachment) => attachment.uri?.toString() === uri.toString()
      );
      if (duplicate) {
        added.push(duplicate.summary);
        continue;
      }

      const extension = extname(uri.path).toLowerCase();
      const imageMimeType = IMAGE_MIME_TYPES.get(extension);
      const kind = imageMimeType ? "image" : "textFile";
      if (!imageMimeType && !TEXT_EXTENSIONS.has(extension)) {
        throw new Error(
          `${basename(uri.fsPath)} is not a supported code, text, or image file.`
        );
      }

      const imageCount = [...this.attachments.values()].filter(
        (attachment) => attachment.summary.kind === "image"
      ).length;
      if (kind === "image" && imageCount >= MAX_IMAGE_ATTACHMENTS) {
        throw new Error(
          `GeminiX accepts up to ${MAX_IMAGE_ATTACHMENTS} images per message.`
        );
      }

      const stat = await vscode.workspace.fs.stat(uri);
      const maximumBytes =
        kind === "image" ? MAX_IMAGE_FILE_BYTES : MAX_TEXT_FILE_BYTES;
      if (stat.size > maximumBytes) {
        const maximumMegabytes = Math.floor(maximumBytes / 1_024 / 1_024);
        throw new Error(
          `${basename(uri.fsPath)} is larger than the ${maximumMegabytes} MB attachment limit.`
        );
      }

      const summary: AttachmentSummary = {
        id: randomUUID(),
        kind,
        label: basename(uri.fsPath)
      };
      this.attachments.set(summary.id, {
        summary,
        uri,
        mimeType: imageMimeType
      });
      added.push(summary);
    }
    return added;
  }

  public remove(id: string): void {
    this.attachments.delete(id);
  }

  public clear(): void {
    this.attachments.clear();
  }

  public async prepare(
    requestedIds: readonly string[]
  ): Promise<PreparedAttachments> {
    const requested = requestedIds
      .map((id) => this.attachments.get(id))
      .filter(
        (attachment): attachment is StoredAttachment => attachment !== undefined
      );
    const promptSections: string[] = [];
    const images: ImageContext[] = [];
    let remainingTextCharacters = MAX_ATTACHMENT_TEXT_CHARACTERS;

    for (const attachment of requested) {
      if (attachment.summary.kind === "image") {
        if (!attachment.uri) {
          continue;
        }
        const bytes = await vscode.workspace.fs.readFile(attachment.uri);
        // Prefer the MIME type sniffed from the file's magic bytes over the
        // extension-based guess so renamed or mismatched files are still
        // sent to Gemini with the correct MIME type.
        const mimeType =
          sniffImageMimeType(bytes) ?? attachment.mimeType;
        if (!mimeType) {
          continue;
        }
        images.push({
          data: Buffer.from(bytes).toString("base64"),
          label: attachment.summary.label,
          mimeType
        });
        promptSections.push(
          [
            `Attached image: ${attachment.summary.label}`,
            "The image is sent as a Gemini Live visual frame immediately before the user request. Inspect its visible content and use it as supporting context."
          ].join("\n")
        );
        continue;
      }

      const textAttachment = await this.readTextAttachment(attachment);
      if (!textAttachment || remainingTextCharacters <= 0) {
        continue;
      }

      const acceptedText = textAttachment.text.slice(
        0,
        remainingTextCharacters
      );
      remainingTextCharacters -= acceptedText.length;
      promptSections.push(
        [
          `Attached file: ${textAttachment.relativePath}`,
          textAttachment.truncated ||
          acceptedText.length < textAttachment.text.length
            ? "Note: The file was truncated at the safe context limit."
            : "",
          `\`\`\`${textAttachment.languageId}`,
          acceptedText,
          "```"
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    return {
      prompt: promptSections.length
        ? [
            "Use these explicitly attached files as private supporting context.",
            "If selected editor code is also supplied, the selected code remains primary.",
            ...promptSections
          ].join("\n\n")
        : "",
      images
    };
  }

  public release(requestedIds: readonly string[]): void {
    requestedIds.forEach((id) => {
      this.attachments.delete(id);
    });
  }

  public async displayInfo(
    requestedIds: readonly string[]
  ): Promise<readonly AttachmentDisplay[]> {
    const result: AttachmentDisplay[] = [];
    for (const id of requestedIds) {
      const attachment = this.attachments.get(id);
      if (!attachment) {
        continue;
      }
      if (attachment.summary.kind === "image" && attachment.uri) {
        const bytes = await vscode.workspace.fs.readFile(attachment.uri);
        const mimeType = sniffImageMimeType(bytes) ?? attachment.mimeType;
        if (mimeType) {
          result.push({
            id,
            kind: "image",
            label: attachment.summary.label,
            dataUri: `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`
          });
          continue;
        }
      }
      result.push({
        id,
        kind: attachment.summary.kind,
        label: attachment.summary.label
      });
    }
    return result;
  }

  private assertCapacity(additionalCount: number): void {
    if (this.attachments.size + additionalCount > MAX_ATTACHMENTS) {
      throw new Error(
        `GeminiX accepts up to ${MAX_ATTACHMENTS} context attachments per message.`
      );
    }
  }

  private async readTextAttachment(
    attachment: StoredAttachment
  ): Promise<
    | {
        readonly languageId: string;
        readonly relativePath: string;
        readonly text: string;
        readonly truncated: boolean;
      }
    | undefined
  > {
    if (attachment.currentPage) {
      return {
        languageId: attachment.currentPage.languageId,
        relativePath: attachment.currentPage.relativePath,
        text: attachment.currentPage.text,
        truncated: attachment.currentPage.truncated
      };
    }
    if (!attachment.uri) {
      return undefined;
    }

    const document = await vscode.workspace.openTextDocument(attachment.uri);
    const completeText = document.getText();
    if (completeText.includes("\u0000")) {
      throw new Error(
        `${attachment.summary.label} appears to be a binary file.`
      );
    }
    return {
      languageId: document.languageId,
      relativePath: vscode.workspace.asRelativePath(attachment.uri, false),
      text: completeText,
      truncated: false
    };
  }
}
