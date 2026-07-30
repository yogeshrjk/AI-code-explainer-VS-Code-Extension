const SENTENCE_END_PATTERN = /[.!?।]\s*$/u;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_]/u;
const OPENING_CHARACTER_PATTERN = /[\p{L}\p{N}_([{]/u;

export function mergeSpokenText(
  currentText: string,
  incomingText: string
): string {
  if (!incomingText) {
    return currentText;
  }

  if (!currentText) {
    return incomingText;
  }

  if (incomingText === currentText || currentText.endsWith(incomingText)) {
    return currentText;
  }

  if (incomingText.startsWith(currentText)) {
    return incomingText;
  }

  if (
    currentText.startsWith(incomingText) ||
    containsCompleteDuplicate(currentText, incomingText)
  ) {
    return currentText;
  }

  const overlap = findSuffixPrefixOverlap(currentText, incomingText);
  if (overlap > 0) {
    return currentText + incomingText.slice(overlap);
  }

  const separator = needsSpokenSeparator(currentText, incomingText) ? " " : "";
  return currentText + separator + incomingText;
}

export function mergeVisualText(
  currentText: string,
  incomingText: string
): string {
  if (!incomingText) {
    return currentText;
  }

  if (!currentText) {
    return incomingText;
  }

  if (incomingText.startsWith(currentText)) {
    return incomingText;
  }

  if (
    incomingText === currentText ||
    currentText.endsWith(incomingText) ||
    currentText.startsWith(incomingText)
  ) {
    return currentText;
  }

  const overlap = findSuffixPrefixOverlap(currentText, incomingText);
  return overlap > 0
    ? currentText + incomingText.slice(overlap)
    : currentText + incomingText;
}

export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""))
    .join("\n")
    .trim();
}

export function hashMarkdown(markdown: string): string {
  const normalized = normalizeMarkdown(markdown);
  let hash = 0x811c9dc5;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function findSuffixPrefixOverlap(
  currentText: string,
  incomingText: string
): number {
  const maximumOverlap = Math.min(currentText.length, incomingText.length);

  for (let overlap = maximumOverlap; overlap > 0; overlap -= 1) {
    if (
      currentText.slice(currentText.length - overlap) ===
      incomingText.slice(0, overlap)
    ) {
      return overlap;
    }
  }

  return 0;
}

function containsCompleteDuplicate(
  currentText: string,
  incomingText: string
): boolean {
  const compactIncoming = incomingText.trim();
  if (
    compactIncoming.length < 12 ||
    !SENTENCE_END_PATTERN.test(compactIncoming)
  ) {
    return false;
  }

  const duplicateIndex = currentText.indexOf(compactIncoming);
  if (duplicateIndex < 0) {
    return false;
  }

  const before = currentText.at(duplicateIndex - 1) ?? " ";
  const after =
    currentText.at(duplicateIndex + compactIncoming.length) ?? " ";
  return !WORD_CHARACTER_PATTERN.test(before) && !WORD_CHARACTER_PATTERN.test(after);
}

function needsSpokenSeparator(
  currentText: string,
  incomingText: string
): boolean {
  const currentCharacter = currentText.at(-1) ?? "";
  const incomingCharacter = incomingText.at(0) ?? "";

  if (
    /\s/u.test(currentCharacter) ||
    /\s/u.test(incomingCharacter) ||
    /^[,.;:!?।)\]}]/u.test(incomingCharacter)
  ) {
    return false;
  }

  return (
    WORD_CHARACTER_PATTERN.test(currentCharacter) &&
    OPENING_CHARACTER_PATTERN.test(incomingCharacter)
  ) || (
    /[.!?।,;:)\]}]/u.test(currentCharacter) &&
    OPENING_CHARACTER_PATTERN.test(incomingCharacter)
  );
}
