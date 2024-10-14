import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { AwsCredentialIdentity } from '@smithy/types';

export default async function getSecretKey(
  name: string,
  creds: AwsCredentialIdentity,
  defaultKey?: string,
): Promise<string | undefined> {
  if (defaultKey) return defaultKey;

  const client = new SecretsManagerClient({
    credentials: creds,
    region: 'us-west-2',
  });
  const command = new GetSecretValueCommand({
    SecretId: 'ai-threads/api-keys',
  });
  const apiKeyResponse = await client.send(command);
  const secrets: Record<string, string | undefined> =
    apiKeyResponse.SecretString
      ? (JSON.parse(apiKeyResponse.SecretString) as Record<string, string>)
      : {};

  return secrets[name];
}
