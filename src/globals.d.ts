declare module 'soundtouchjs' {
  export class PitchShifter {
    constructor(
      audioContext: AudioContext,
      buffer: AudioBuffer,
      bufferSize: number,
    );
    pitch: number;
    tempo: number;
    rate: number;
    sourceNode: AudioBufferSourceNode;
    connect(destination: AudioNode): void;
    disconnect(): void;
  }
}
