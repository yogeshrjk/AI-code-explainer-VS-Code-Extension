import { basename } from "node:path";
import * as vscode from "vscode";
import type {
  ContextSummary,
  CurrentPageContext,
  CurrentPageSummary,
  EditorContext
} from "./types.js";

const MAX_CURRENT_PAGE_CHARACTERS = 80_000;

export function captureEditorContext(): EditorContext | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return undefined;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);
  if (!selectedText.trim()) {
    return undefined;
  }

  const startLine = selection.start.line + 1;
  const endsAtNextLineStart =
    selection.end.character === 0 && selection.end.line > selection.start.line;
  const endLine = endsAtNextLineStart
    ? selection.end.line
    : selection.end.line + 1;

  return {
    uri: editor.document.uri.toString(),
    fileName: basename(editor.document.fileName),
    relativePath: vscode.workspace.asRelativePath(editor.document.uri, false),
    languageId: editor.document.languageId,
    startLine,
    endLine,
    startLineIndex: selection.start.line,
    endLineIndex: selection.end.line,
    startCharacter: selection.start.character,
    endCharacter: selection.end.character,
    text: selectedText
  };
}

export function summarizeEditorContext(
  context: EditorContext | undefined
): ContextSummary | undefined {
  if (!context) {
    return undefined;
  }

  return {
    fileName: context.fileName,
    startLine: context.startLine,
    endLine: context.endLine,
    label: `${context.fileName} ${context.startLine}-${context.endLine}`
  };
}

export function captureCurrentPageContext(
  requestedUri?: string
): CurrentPageContext | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const documentUri = editor.document.uri.toString();
  if (requestedUri && requestedUri !== documentUri) {
    return undefined;
  }

  const completeText = editor.document.getText();
  const truncated = completeText.length > MAX_CURRENT_PAGE_CHARACTERS;
  const text = truncated
    ? completeText.slice(0, MAX_CURRENT_PAGE_CHARACTERS)
    : completeText;

  return {
    uri: documentUri,
    fileName: basename(editor.document.fileName),
    relativePath: vscode.workspace.asRelativePath(editor.document.uri, false),
    languageId: editor.document.languageId,
    startLine: 1,
    endLine: editor.document.lineCount,
    text,
    truncated
  };
}

export function summarizeCurrentPage(
  context: CurrentPageContext | undefined
): CurrentPageSummary | undefined {
  if (!context) {
    return undefined;
  }

  return {
    uri: context.uri,
    fileName: context.fileName,
    relativePath: context.relativePath,
    label: context.relativePath
  };
}
