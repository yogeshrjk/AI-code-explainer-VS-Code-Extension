import assert from "node:assert/strict";
import test from "node:test";
import {
  chatMessageToText,
  parseChatMessage
} from "../src/chatSchema.ts";
import {
  createToolResponsePayload,
  isLiveFunctionResponse
} from "../src/liveProtocol.ts";
import { shouldInterruptPlayback } from "../webview/playbackPolicy.ts";

void test("formats the Gemini Live tool-response payload with matching IDs", () => {
  const response = {
    id: "call-123",
    name: "render_markdown",
    response: { success: true }
  } as const;
  assert.deepEqual(createToolResponsePayload([response]), {
    toolResponse: {
      functionResponses: [response]
    }
  });
  assert.equal(isLiveFunctionResponse(response), true);
  assert.equal(
    isLiveFunctionResponse({
      name: "render_markdown",
      response: { success: true }
    }),
    false
  );
});

void test("migrates legacy text-only chat messages", () => {
  const message = parseChatMessage(
    {
      id: "legacy-message",
      role: "model",
      text: "Legacy spoken answer",
      createdAt: "2026-07-30T00:00:00.000Z"
    },
    10_000
  );
  assert.equal(message.spokenText, "Legacy spoken answer");
  assert.equal(message.visualText, undefined);
});

void test("preserves spoken, visual, and Markdown content during save and restore", () => {
  const message = parseChatMessage(
    {
      id: "rich-message",
      role: "model",
      spokenText: "Here is the example.",
      visualText: "## Details",
      markdownBlocks: [
        {
          id: "block-1",
          functionCallId: "call-1",
          markdown: "```python\nprint('visible')\n```"
        }
      ],
      createdAt: "2026-07-30T00:00:00.000Z"
    },
    10_000
  );
  assert.match(chatMessageToText(message), /Here is the example/u);
  assert.match(chatMessageToText(message), /## Details/u);
  assert.match(chatMessageToText(message), /print\('visible'\)/u);
  assert.equal(message.markdownBlocks?.[0]?.functionCallId, "call-1");
});

void test("only a Gemini interrupted event clears playback", () => {
  assert.equal(shouldInterruptPlayback({ interrupted: true }), true);
  assert.equal(shouldInterruptPlayback({ interrupted: false }), false);
  assert.equal(shouldInterruptPlayback({}), false);
});
