import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from '@aws-sdk/client-transcribe-streaming';
import KeyboardVoice from '@mui/icons-material/KeyboardVoice';
import Stop from '@mui/icons-material/Stop';
import IconButton from '@mui/material/IconButton';
import type { AwsCredentialIdentity } from '@smithy/types';
import MicrophoneStream from 'microphone-stream';
import { enqueueSnackbar } from 'notistack';
import { useCallback, useRef, useState } from 'react';

import { useThreadStore } from '../useThreadStore';

const { ipcRenderer } = window.require('electron');

export default function Transcriber({
  onVoiceData,
}: {
  onVoiceData: (transcript: string) => void;
}) {
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const [isRecording, setIsRecording] = useState(false);
  const stream = useRef<MicrophoneStream>();

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (stream.current) {
      stream.current.stop();
      stream.current = undefined;
    }
  }, [stream]);

  const startRecording = useCallback(async () => {
    const creds = (await ipcRenderer
      .invoke('creds', awsCredProfile)
      .catch((e: unknown) => {
        enqueueSnackbar(`Error getting credentials: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
      })) as AwsCredentialIdentity | undefined;
    if (!creds) return;

    const client = new TranscribeStreamingClient({
      credentials: creds,
      region: 'us-west-2',
    });

    setIsRecording(true);

    const micStream = new MicrophoneStream();
    const source = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    micStream.setStream(source);
    stream.current = micStream;

    const encodePCMChunk = (chunk: Buffer) => {
      const input = MicrophoneStream.toRaw(chunk);
      let offset = 0;
      const buffer = new ArrayBuffer(input.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      return Buffer.from(buffer);
    };

    const audioStream = async function* () {
      interface AsyncIterableMicrophoneStream
        extends MicrophoneStream,
          AsyncIterable<Buffer> {}
      for await (const chunk of micStream as AsyncIterableMicrophoneStream) {
        if (chunk.length <= micStream.context.sampleRate) {
          yield {
            AudioEvent: {
              AudioChunk: encodePCMChunk(chunk),
            },
          };
        }
      }
    };

    const command = new StartStreamTranscriptionCommand({
      AudioStream: audioStream(),
      LanguageCode: 'en-US',
      MediaEncoding: 'pcm',
      MediaSampleRateHertz: micStream.context.sampleRate,
    });

    try {
      const response = await client.send(command);
      if (!response.TranscriptResultStream) {
        enqueueSnackbar(
          `Unexpected response from Amazon Transcribe: ${JSON.stringify(response)}`,
          {
            autoHideDuration: 3000,
            variant: 'error',
          },
        );
        stopRecording();
        return;
      }
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent?.Transcript) {
          const results = event.TranscriptEvent.Transcript.Results;
          if (!results?.length) continue;
          for (const result of results) {
            if (!!result.IsPartial || !result.Alternatives?.[0]?.Transcript) {
              continue;
            }
            onVoiceData(result.Alternatives[0].Transcript);
          }
        }
      }
    } catch (e) {
      enqueueSnackbar(
        `Error streaming transcription from Amazon Transcribe: ${JSON.stringify(e)}`,
        {
          autoHideDuration: 3000,
          variant: 'error',
        },
      );
      stopRecording();
    }
  }, [awsCredProfile, onVoiceData, stopRecording]);

  return (
    <IconButton onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? <Stop /> : <KeyboardVoice />}
    </IconButton>
  );
}
