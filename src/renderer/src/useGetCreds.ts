import type { AwsCredentialIdentity } from '@smithy/types';

import type { StoreState } from './useThreadStore';
import { useThreadStore } from './useThreadStore';

export async function getCreds(
  awsCredProfile: StoreState['awsCredProfile'],
  awsCreds: StoreState['awsCreds'],
  useAwsCredProfile: StoreState['useAwsCredProfile'],
): Promise<AwsCredentialIdentity | undefined> {
  const { ipcRenderer } =
    (window.require as NodeRequire | undefined) && useAwsCredProfile
      ? window.require('electron')
      : {
          ipcRenderer: {
            invoke: () => Promise.resolve(awsCreds),
          },
        };

  return ipcRenderer.invoke('creds', awsCredProfile) as Promise<
    AwsCredentialIdentity | undefined
  >;
}

export default function useGetCreds(): () => Promise<
  AwsCredentialIdentity | undefined
> {
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const awsCreds = useThreadStore((state) => state.awsCreds);
  const useAwsCredProfile = useThreadStore((state) => state.useAwsCredProfile);

  return getCreds.bind(null, awsCredProfile, awsCreds, useAwsCredProfile);
}
