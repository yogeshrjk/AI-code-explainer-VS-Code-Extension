import { PvRecorder } from "@picovoice/pvrecorder-node";

const FRAME_LENGTH = 1_024;
const REQUIRED_SAMPLE_RATE = 16_000;
const MINIMUM_SPEECH_THRESHOLD = 0.03;
const NOISE_FLOOR_MULTIPLIER = 3.5;
const NOISE_FLOOR_SMOOTHING = 0.96;
const SPEECH_START_CONSECUTIVE_FRAMES = 4;
const SPEECH_START_COOLDOWN_MS = 750;
const END_OF_SPEECH_DELAY_MS = 850;

interface MicrophoneCallbacks {
  readonly onFrame: (frame: Int16Array) => void;
  readonly onLevel: (level: number) => void;
  readonly onSpeechStart: () => void;
  readonly onError: (message: string) => void;
}

export class MicrophoneCapture {
  private recorder: PvRecorder | undefined;
  private running = false;
  private speechActive = false;
  private speechSilenceStartedAt = 0;
  private speechCandidateFrames = 0;
  private lastSpeechStartedAt = 0;
  private noiseFloor = 0.008;

  public constructor(private readonly callbacks: MicrophoneCallbacks) {}

  public start(): void {
    if (this.running) {
      return;
    }

    const recorder = new PvRecorder(FRAME_LENGTH, -1, 50);
    if (recorder.sampleRate !== REQUIRED_SAMPLE_RATE) {
      recorder.release();
      throw new Error(
        `The selected microphone uses an unsupported ${recorder.sampleRate} Hz sample rate.`
      );
    }

    recorder.start();
    this.recorder = recorder;
    this.running = true;
    this.speechActive = false;
    this.speechSilenceStartedAt = 0;
    this.speechCandidateFrames = 0;
    this.lastSpeechStartedAt = 0;
    this.noiseFloor = 0.008;
    void this.readFrames(recorder);
  }

  public stop(): void {
    this.running = false;
    this.speechActive = false;
    this.speechSilenceStartedAt = 0;
    this.speechCandidateFrames = 0;

    const recorder = this.recorder;
    this.recorder = undefined;
    if (!recorder) {
      return;
    }

    try {
      if (recorder.isRecording) {
        recorder.stop();
      }
    } finally {
      recorder.release();
    }

    this.callbacks.onLevel(0);
  }

  public dispose(): void {
    this.stop();
  }

  private async readFrames(recorder: PvRecorder): Promise<void> {
    try {
      while (this.isCurrentRecorder(recorder)) {
        const frame = await recorder.read();
        if (!this.isCurrentRecorder(recorder)) {
          return;
        }

        const level = this.calculateLevel(frame);
        this.updateSpeechState(level);
        this.callbacks.onLevel(level);
        this.callbacks.onFrame(frame);
      }
    } catch (error) {
      if (this.running && this.recorder === recorder) {
        this.running = false;
        this.recorder = undefined;
        try {
          recorder.release();
        } catch {
          // Preserve the original recorder error.
        }
        this.callbacks.onError(
          error instanceof Error
            ? error.message
            : "The microphone stopped unexpectedly."
        );
      }
    }
  }

  private isCurrentRecorder(recorder: PvRecorder): boolean {
    return this.running && this.recorder === recorder;
  }

  private calculateLevel(frame: Int16Array): number {
    let energy = 0;
    for (const sample of frame) {
      const normalized = sample / 32_768;
      energy += normalized * normalized;
    }
    return Math.sqrt(energy / frame.length);
  }

  private updateSpeechState(level: number): void {
    const now = Date.now();
    const speechThreshold = Math.max(
      MINIMUM_SPEECH_THRESHOLD,
      this.noiseFloor * NOISE_FLOOR_MULTIPLIER
    );

    if (!this.speechActive && level <= speechThreshold) {
      this.noiseFloor =
        this.noiseFloor * NOISE_FLOOR_SMOOTHING +
        level * (1 - NOISE_FLOOR_SMOOTHING);
    }

    if (level > speechThreshold) {
      this.speechSilenceStartedAt = 0;
      if (!this.speechActive) {
        this.speechCandidateFrames += 1;
        if (
          this.speechCandidateFrames >=
            SPEECH_START_CONSECUTIVE_FRAMES &&
          now - this.lastSpeechStartedAt >= SPEECH_START_COOLDOWN_MS
        ) {
          this.speechActive = true;
          this.speechCandidateFrames = 0;
          this.lastSpeechStartedAt = now;
          this.callbacks.onSpeechStart();
        }
      }
      return;
    }

    this.speechCandidateFrames = 0;
    if (!this.speechActive) {
      return;
    }

    if (!this.speechSilenceStartedAt) {
      this.speechSilenceStartedAt = now;
    } else if (now - this.speechSilenceStartedAt > END_OF_SPEECH_DELAY_MS) {
      this.speechActive = false;
      this.speechSilenceStartedAt = 0;
    }
  }
}
