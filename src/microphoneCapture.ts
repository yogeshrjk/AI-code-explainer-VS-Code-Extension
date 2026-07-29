import { PvRecorder } from "@picovoice/pvrecorder-node";

const FRAME_LENGTH = 1_024;
const REQUIRED_SAMPLE_RATE = 16_000;
const SPEECH_THRESHOLD = 0.045;
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
    void this.readFrames(recorder);
  }

  public stop(): void {
    this.running = false;
    this.speechActive = false;
    this.speechSilenceStartedAt = 0;

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
    if (level > SPEECH_THRESHOLD) {
      this.speechSilenceStartedAt = 0;
      if (!this.speechActive) {
        this.speechActive = true;
        this.callbacks.onSpeechStart();
      }
      return;
    }

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
