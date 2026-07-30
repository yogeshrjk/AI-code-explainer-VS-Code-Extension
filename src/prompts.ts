import type {
  ChatMessage,
  CurrentPageContext,
  EditorContext,
  Preferences,
  WorkspaceContext
} from "./types.js";
import { chatMessageToText } from "./chatSchema.js";

const BEHAVIOR_INSTRUCTIONS = {
  professional: "Be clear, structured, concise, and professional.",
  friendly: "Be approachable, conversational, patient, and easy to follow.",
  expert:
    "Be deeply technical and precise. Explain control flow, data flow, edge cases, and important trade-offs."
} as const;

export function buildSystemInstruction(preferences: Preferences): string {
  return [
    "You are GeminiX, a patient voice-first programming tutor integrated into Visual Studio Code.",
    `Always respond in ${preferences.preferredLanguage}, unless the user explicitly asks for another language.`,
    BEHAVIOR_INSTRUCTIONS[preferences.behavior],
    "The user may speak Hindi mixed with English programming terminology.",
    "Respond in the language used by the user. For Hindi, use natural Indian Hindi in Devanagari while preserving programming terms and identifiers in their original Latin spelling.",
    "Never convert Django to Jango. Preserve identifiers such as F, Q, QuerySet, class names, field names, variables, and functions exactly.",
    "Understand the complete question before answering and produce one coherent response per user turn.",
    "Do not repeat an explanation, provide multiple versions of the same answer, or repeat rich content after a tool call.",
    "Speak at a calm teaching pace, use complete sentences, and add brief natural pauses between ideas.",
    "Explain the concept first and then provide a relevant example.",
    "Treat selected code as authoritative and retrieved workspace snippets as supporting evidence.",
    "Never invent fields, classes, methods, model names, or business logic that are absent from the supplied project context.",
    "When context is insufficient, label examples as generic or search the workspace before making project-specific claims.",
    "GeminiX can search the open VS Code workspace with search_workspace and read exact files with read_workspace_file.",
    "When a required file, definition, reference, route, component, or implementation is missing, briefly say that you will search and call search_workspace.",
    "After search_workspace returns a relevant path, call read_workspace_file when more of that file is required to answer accurately.",
    "Begin with a direct answer. Explain what code does, why it does it, its control flow, and important edge cases at the depth appropriate to the question.",
    "When code, a table, a heading, or a detailed list is useful, first finish the current spoken sentence and briefly explain the purpose of the visual.",
    "Then call render_markdown exactly once with the complete rich content. Use fenced code blocks with a correct language identifier.",
    "Do not read Markdown syntax or source code character by character. Do not place Markdown inside an incomplete spoken sentence.",
    "After a successful render_markdown call, continue from the next point without repeating the rendered content.",
    "Visual Markdown must supplement the spoken answer; it must never interrupt or replace an unfinished spoken explanation.",
    "Keep normal conversation concise. Give technical, debugging, and implementation questions enough detail to be correct and directly useful."
  ].join(" ");
}

export function buildConversationHistoryPrompt(
  messages: readonly ChatMessage[]
): string {
  if (!messages.length) {
    return "";
  }

  return [
    "The user reopened this locally saved GeminiX chat. Use the following recent messages only to continue the prior conversation; current selected code and attachments remain authoritative.",
    ...messages.map(
      (message) =>
        `${message.role === "user" ? "User" : "GeminiX"}: ${chatMessageToText(message)}`
    )
  ].join("\n\n");
}

export function buildEditorContextPrompt(context: EditorContext): string {
  return [
    "PRIMARY EDITOR CONTEXT",
    "Use the exact selection as the authoritative target for the user's request.",
    "Do not repeat the full context unless the user explicitly asks for it.",
    `File: ${context.relativePath}`,
    `Exact selected lines: ${context.startLine}-${context.endLine}`,
    `\`\`\`${context.languageId}`,
    context.text,
    "```",
    context.relatedImports
      ? [
          "Related import declarations from the same file:",
          context.relatedImports
        ].join("\n")
      : "",
    `Supporting file window: lines ${context.supportingStartLine}-${context.supportingEndLine}`,
    `\`\`\`${context.languageId}`,
    context.supportingText,
    "```",
    "END PRIMARY EDITOR CONTEXT"
  ].join("\n");
}

export function buildCurrentPagePrompt(context: CurrentPageContext): string {
  return [
    "The user explicitly attached the current editor file with @.",
    "Use it as private context. If selected code is also supplied, the selected code remains the primary context.",
    `File: ${context.relativePath}`,
    `Lines: ${context.startLine}-${context.endLine}`,
    context.truncated
      ? "Note: The file was truncated at the safe context limit."
      : "",
    `\`\`\`${context.languageId}`,
    context.text,
    "```"
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWorkspaceContextPrompt(
  context: WorkspaceContext
): string {
  if (!context.snippets.length) {
    return context.indexedFileCount > 0
      ? [
          `GeminiX directly searched the open VS Code workspace index (${context.indexedFileCount} source files) but did not retrieve a strong match yet.`,
          "Do not say that you cannot access or search the workspace.",
          "If the request requires a specific file, definition, or usage, call search_workspace with a focused filename or symbol and then call read_workspace_file for the returned path."
        ].join(" ")
      : [
          "No VS Code workspace folder is currently available to the extension host.",
          "Do not describe this as a general inability to access files.",
          "If repository context is required, clearly ask the user to open the project folder as a VS Code workspace."
        ].join(" ");
  }

  const snippets = context.snippets.map((snippet, index) =>
    [
      `[${index + 1}] ${snippet.filePath} lines ${snippet.startLine}-${snippet.endLine}`,
      `Relevance: ${snippet.reason}`,
      `\`\`\`${snippet.languageId}`,
      snippet.text,
      "```"
    ].join("\n")
  );

  return [
    "GeminiX searched and read the VS Code workspace and retrieved the following code as secondary supporting context.",
    "They may be incomplete or only lexically related. Prefer the selected code and the user's request if evidence conflicts.",
    "Do not claim that you cannot access or search these files; their contents are included below.",
    ...snippets,
    context.truncated
      ? "Additional matches were omitted to stay within the context limit."
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildTextPrompt(
  userText: string,
  context: EditorContext | undefined,
  currentPageContext: CurrentPageContext | undefined,
  workspaceContext: WorkspaceContext,
  attachmentPrompt = "",
  conversationPrompt = ""
): string {
  const sections: string[] = [];
  if (conversationPrompt) {
    sections.push(conversationPrompt);
  }
  if (context) {
    sections.push(buildEditorContextPrompt(context));
  }

  if (currentPageContext) {
    sections.push(buildCurrentPagePrompt(currentPageContext));
  }

  const workspacePrompt = buildWorkspaceContextPrompt(workspaceContext);
  if (workspacePrompt) {
    sections.push(workspacePrompt);
  }

  if (attachmentPrompt) {
    sections.push(attachmentPrompt);
  }

  sections.push(`User request:\n${userText}`);
  return sections.join("\n\n");
}
