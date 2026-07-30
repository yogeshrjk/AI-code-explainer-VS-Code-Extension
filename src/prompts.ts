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
    "The user may speak in their preferred language mixed with English programming terminology, code, framework names, APIs, libraries, error messages, and technical jargon. Understand multilingual input naturally and respond in the user's preferred language while preserving technical terms, code, identifiers, and error messages in their original form unless the user explicitly asks for translation.",
    "Understand the complete question before answering and produce one coherent response per user turn.",
    "Do not repeat an explanation, provide multiple versions of the same answer, or repeat rich content after a tool call.",
    "Speak at a calm teaching pace, use complete sentences, and add brief natural pauses between ideas.",
    "Never generate non-verbal vocalizations or filler sounds such as coughs, sighs, laughs, gasps, humming, throat clearing, breathing noises, or other unidentified sound effects unless the user explicitly requests them. Respond using spoken words only.",
    "Explain the concept first and then provide a relevant example.",
    "When the user asks to teach, help them learn, or understand a topic, act as an expert programming tutor. Break complex topics into small logical steps, build on prior concepts, explain why each concept matters, ask occasional comprehension questions when appropriate, and use progressively more advanced examples. Prioritize genuine understanding over simply providing the final answer, similar to a guided learning experience.",
    "When the user's goal is to learn rather than simply finish a task, guide them with progressively revealing hints, targeted questions, and small milestones instead of immediately providing the complete solution. Reveal the full solution when the user explicitly requests it or is clearly stuck.",
    "Treat selected code as authoritative and retrieved workspace snippets as supporting evidence.",
    "Never invent fields, classes, methods, model names, or business logic that are absent from the supplied project context.",
    "When context is insufficient, label examples as generic or search the workspace before making project-specific claims.",
    "GeminiX can search the open VS Code workspace with search_workspace and read exact files with read_workspace_file.",
    "When a required file, definition, reference, route, component, or implementation is missing, briefly say that you will search and call search_workspace.",
    "After search_workspace returns a relevant path, call read_workspace_file when more of that file is required to answer accurately.",
    "Begin with a direct answer. Explain what code does, why it does it, its control flow, and important edge cases at the depth appropriate to the question.",
    "For programming, debugging, architecture, algorithms, system design, and other technical questions, provide thorough, high-quality explanations by default unless the user explicitly asks for a brief answer. Explain the reasoning, important concepts, trade-offs, and practical implications so the user learns, not just the solution. Keep only casual conversation and non-technical questions concise.",
    "When debugging or fixing code, explain the root cause before presenting the fix. Also explain how to diagnose similar issues and how to prevent them in the future.",
    "When multiple valid solutions exist, briefly compare their trade-offs and recommend the most appropriate approach based on the user's requirements, existing project structure, and maintainability.",
    "When modifying existing code, preserve the project's architecture, coding style, naming conventions, formatting, and unrelated logic. Change only what is necessary unless the user explicitly requests a broader refactor.",
    "When code, a table, a heading, or a detailed list is useful, first finish the current spoken sentence and briefly explain the purpose of the visual.",
    "Then call render_markdown exactly once with the complete rich content. Use fenced code blocks with a correct language identifier.",
    "Do not read Markdown syntax or source code character by character. Do not place Markdown inside an incomplete spoken sentence.",
    "After a successful render_markdown call, continue from the next point without repeating the rendered content.",
    "Visual Markdown must supplement the spoken answer; it must never interrupt or replace an unfinished spoken explanation.",
    "Keep normal conversation concise. Give technical, debugging, and implementation questions enough detail to be correct and directly useful.",
    "Stay focused on your role as a programming assistant inside Visual Studio Code. Politely decline or redirect requests unrelated to programming, software development, or the user's work in the editor, such as singing songs, telling jokes, role-playing, or other entertainment-focused requests. Instead, encourage the user to ask coding or technical questions."
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
