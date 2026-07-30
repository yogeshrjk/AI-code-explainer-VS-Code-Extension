import assert from "node:assert/strict";
import test from "node:test";
import {
  hashMarkdown,
  mergeSpokenText,
  mergeVisualText,
  normalizeMarkdown
} from "../webview/streaming.ts";

void test("merges incremental spoken chunks with a missing word boundary", () => {
  assert.equal(
    mergeSpokenText(
      "The function prepares and validates a text message from",
      "the user before starting the submission process."
    ),
    "The function prepares and validates a text message from the user before starting the submission process."
  );
});

void test("accepts a cumulative spoken transcription chunk", () => {
  assert.equal(
    mergeSpokenText("Django में F object", "Django में F object field को refer करता है।"),
    "Django में F object field को refer करता है।"
  );
});

void test("removes duplicate spoken chunks and complete sentences", () => {
  const sentence = "Q object complex conditions बनाता है।";
  assert.equal(mergeSpokenText(sentence, sentence), sentence);
  assert.equal(
    mergeSpokenText(`पहले F समझें। ${sentence}`, sentence),
    `पहले F समझें। ${sentence}`
  );
});

void test("visual chunks preserve identifiers, fences, indentation, and pipes", () => {
  const source = mergeVisualText(
    "```ts\nconst userNa",
    "me = \"Yogesh\";\n\nconst row = \"a | b\";\n```"
  );
  assert.equal(
    source,
    "```ts\nconst userName = \"Yogesh\";\n\nconst row = \"a | b\";\n```"
  );
});

void test("Markdown normalization and hashing deduplicate equivalent content", () => {
  const first = "| A | B |\r\n| --- | --- |\r\n| 1 | 2 |  ";
  const second = "| A | B |\n| --- | --- |\n| 1 | 2 |";
  assert.equal(normalizeMarkdown(first), normalizeMarkdown(second));
  assert.equal(hashMarkdown(first), hashMarkdown(second));
});

void test("Hindi-English technical identifiers remain unchanged", () => {
  const current = "Django में F और Q";
  const incoming = " objects QuerySet queries बनाते हैं।";
  assert.equal(
    mergeSpokenText(current, incoming),
    "Django में F और Q objects QuerySet queries बनाते हैं।"
  );
});
