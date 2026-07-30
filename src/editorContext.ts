import { basename } from "node:path";
import * as vscode from "vscode";
import type {
  ContextSummary,
  CurrentPageContext,
  CurrentPageSummary,
  EditorContext
} from "./types.js";

const MAX_CURRENT_PAGE_CHARACTERS = 80_000;
const SUPPORTING_LINES_BEFORE_SELECTION = 30;
const SUPPORTING_LINES_AFTER_SELECTION = 30;
const MAX_IMPORT_SCAN_LINES = 100;
const MAX_RELATED_IMPORT_LINES = 40;
const IMPORT_PATTERN =
  /^\s*(?:import\b|from\s+\S+\s+import\b|using\b|#include\b|(?:const|let|var)\s+\S+\s*=\s*require\s*\()/u;

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
  const selectedEndLineIndex = Math.max(
    selection.start.line,
    endsAtNextLineStart ? selection.end.line - 1 : selection.end.line
  );
  const supportingStartLineIndex = Math.max(
    0,
    selection.start.line - SUPPORTING_LINES_BEFORE_SELECTION
  );
  const supportingEndLineIndex = Math.min(
    editor.document.lineCount - 1,
    selectedEndLineIndex + SUPPORTING_LINES_AFTER_SELECTION
  );
  const supportingRange = new vscode.Range(
    supportingStartLineIndex,
    0,
    supportingEndLineIndex,
    editor.document.lineAt(supportingEndLineIndex).range.end.character
  );
  const relatedImports = readRelatedImports(editor.document);

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
    text: selectedText,
    supportingStartLine: supportingStartLineIndex + 1,
    supportingEndLine: supportingEndLineIndex + 1,
    supportingText: editor.document.getText(supportingRange),
    relatedImports
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

function readRelatedImports(document: vscode.TextDocument): string {
  const importLines: string[] = [];
  const scanLineCount = Math.min(
    document.lineCount,
    MAX_IMPORT_SCAN_LINES
  );

  for (
    let lineIndex = 0;
    lineIndex < scanLineCount &&
    importLines.length < MAX_RELATED_IMPORT_LINES;
    lineIndex += 1
  ) {
    const line = document.lineAt(lineIndex).text;
    if (IMPORT_PATTERN.test(line)) {
      importLines.push(`${lineIndex + 1}: ${line}`);
    }
  }

  return importLines.join("\n");
}
