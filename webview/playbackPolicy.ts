export interface PlaybackServerContent {
  readonly interrupted?: boolean;
}

export function shouldInterruptPlayback(
  content: PlaybackServerContent
): boolean {
  return content.interrupted === true;
}
