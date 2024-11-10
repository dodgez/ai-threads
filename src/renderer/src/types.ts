import { DocumentFormat, ImageFormat } from '@aws-sdk/client-bedrock-runtime';
import type {
  FilePart as AIFilePart,
  ImagePart as AIImagePart,
  TextPart as AITextPart,
  CoreAssistantMessage,
} from 'ai';

export type TextPart = AITextPart & { id: string };
export type ImagePart = AIImagePart & { id: string; name: string };
export type FilePart = AIFilePart & { id: string; name: string };

interface UserMessage {
  content: (FilePart | ImagePart | TextPart)[];
  role: 'user';
}
export type MessageType = (CoreAssistantMessage | UserMessage) & {
  id: string;
};
export enum ModelId {
  Claude35Haiku = 'anthropic.claude-3-5-haiku-20241022-v1:0',
  Claude35Sonnet = 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  Claude35Sonnet2 = 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  Claude3Haiku = 'anthropic.claude-3-haiku-20240307-v1:0',
  Claude3Sonnet = 'anthropic.claude-3-sonnet-20240229-v1:0',
  GPT4o = 'gpt-4o',
  GPT4oMini = 'gpt-4o-mini',
}
export enum Provider {
  AmazonBedrock,
  OpenAI,
}
interface ModelMetadataInfo {
  label: string;
  /**
   * Dollars per 1 million tokens
   */
  pricing: { input: number; output: number };
  provider: Provider;
  supportsDocs: boolean;
}
export const ModelMetadata: Record<ModelId, ModelMetadataInfo> = {
  [ModelId.Claude35Haiku]: {
    label: 'Claude 3.5 Haiku',
    pricing: {
      input: 1,
      output: 1.5,
    },
    provider: Provider.AmazonBedrock,
    supportsDocs: true,
  },
  [ModelId.Claude35Sonnet]: {
    label: 'Claude 3.5 Sonnet',
    pricing: {
      input: 3,
      output: 15,
    },
    provider: Provider.AmazonBedrock,
    supportsDocs: false,
  },
  [ModelId.Claude35Sonnet2]: {
    label: 'Claude 3.5 Sonnet v2',
    pricing: {
      input: 3,
      output: 15,
    },
    provider: Provider.AmazonBedrock,
    supportsDocs: false,
  },
  [ModelId.Claude3Haiku]: {
    label: 'Claude 3 Haiku',
    pricing: {
      input: 0.25,
      output: 1.25,
    },
    provider: Provider.AmazonBedrock,
    supportsDocs: true,
  },
  [ModelId.Claude3Sonnet]: {
    label: 'Claude 3 Sonnet',
    pricing: {
      input: 3,
      output: 15,
    },
    provider: Provider.AmazonBedrock,
    supportsDocs: true,
  },
  [ModelId.GPT4o]: {
    label: 'GPT-4o',
    pricing: {
      input: 2.5,
      output: 10,
    },
    provider: Provider.OpenAI,
    supportsDocs: false,
  },
  [ModelId.GPT4oMini]: {
    label: 'GPT-4o mini',
    pricing: {
      input: 0.15,
      output: 0.6,
    },
    provider: Provider.OpenAI,
    supportsDocs: false,
  },
};
export interface ThreadType {
  id: string;
  messages: MessageType[];
  model: ModelId;
  name: string;
  tokens: Partial<Record<ModelId, { input: number; output: number }>>;
}

export const DocMimeTypeMapping: Record<string, DocumentFormat> = {
  'application/msword': DocumentFormat.DOC,
  'application/pdf': DocumentFormat.PDF,
  'application/vnd.ms-excel': DocumentFormat.XLS,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    DocumentFormat.XLSX,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    DocumentFormat.DOCX,
  'text/csv': DocumentFormat.CSV,
  'text/html': DocumentFormat.HTML,
  'text/markdown': DocumentFormat.MD,
  'text/plain': DocumentFormat.TXT,
};

export const ImageMimeTypeMapping: Record<string, ImageFormat> = {
  'image/gif': ImageFormat.GIF,
  'image/jpeg': ImageFormat.JPEG,
  'image/png': ImageFormat.PNG,
  'image/webp': ImageFormat.WEBP,
};
