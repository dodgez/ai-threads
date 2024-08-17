import {
  Engine,
  LanguageCode,
  OutputFormat,
  PollyClient,
  SynthesizeSpeechCommand,
  TextType,
  VoiceId,
} from '@aws-sdk/client-polly';
import Stop from '@mui/icons-material/Stop';
import VolumeUp from '@mui/icons-material/VolumeUp';
import IconButton from '@mui/material/IconButton';
import type { AwsCredentialIdentity } from '@smithy/types';
import { enqueueSnackbar } from 'notistack';
import { useCallback, useState } from 'react';

import { useThreadStore } from '../useThreadStore';

const { ipcRenderer } = window.require('electron');

export default function Synthesizer({ text }: { text: string }) {
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode>();
  const [isPlaying, setPlaying] = useState(false);

  const synthesizeSpeech = useCallback(async () => {
    if (isPlaying) return;
    const creds = (await ipcRenderer
      .invoke('creds', awsCredProfile)
      .catch((e: unknown) => {
        enqueueSnackbar(`Error getting credentials: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
      })) as AwsCredentialIdentity | undefined;
    if (!creds) {
      enqueueSnackbar('Unknown getting credentials.', {
        autoHideDuration: 3000,
        variant: 'error',
      });
      return;
    }

    const client = new PollyClient({
      region: 'us-west-2',
      credentials: creds,
    });

    const params = {
      Engine: Engine.NEURAL,
      LanguageCode: LanguageCode.en_US,
      OutputFormat: OutputFormat.MP3,
      Text: text,
      TextType: TextType.TEXT,
      VoiceId: VoiceId.Matthew,
    };

    try {
      const command = new SynthesizeSpeechCommand(params);
      const { AudioStream } = await client.send(command);

      if (AudioStream instanceof ReadableStream) {
        const audioContext = new window.AudioContext();
        setAudioContext(audioContext);

        const reader = AudioStream.getReader();
        const chunks: Uint8Array[] = [];

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
        while (true) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { done, value } = await reader.read();
          if (done) break;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          chunks.push(value);
        }

        const audioData = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0),
        );
        let offset = 0;
        for (const chunk of chunks) {
          audioData.set(chunk, offset);
          offset += chunk.length;
        }

        setPlaying(true);
        const buffer = await audioContext.decodeAudioData(audioData.buffer);
        const audioSource = audioContext.createBufferSource();
        setAudioSource(audioSource);
        audioSource.buffer = buffer;
        audioSource.connect(audioContext.destination);
        audioSource.start();
        audioSource.onended = () => {
          setAudioSource(undefined);
          audioSource.disconnect();
          setAudioContext(undefined);
          void audioContext.close();
          setPlaying(false);
        };
      }
    } catch (e) {
      enqueueSnackbar(`Error synthesizing text: ${JSON.stringify(e)}`, {
        autoHideDuration: 3000,
        variant: 'error',
      });
    }
  }, [awsCredProfile, isPlaying, text]);

  const stopPlayback = useCallback(() => {
    if (audioSource) {
      setAudioSource(undefined);
      audioSource.stop();
      audioSource.disconnect();
    }
    if (audioContext) {
      setAudioContext(undefined);
      void audioContext.close();
    }
    setPlaying(false);
  }, [audioContext, audioSource]);

  return isPlaying ? (
    <IconButton onClick={stopPlayback}>
      <Stop />
    </IconButton>
  ) : (
    <IconButton
      onClick={() => {
        void synthesizeSpeech();
      }}
    >
      <VolumeUp />
    </IconButton>
  );
}
