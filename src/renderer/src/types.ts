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
  role: 'user';
  content: (TextPart | ImagePart | FilePart)[];
}
export type MessageType = (CoreAssistantMessage | UserMessage) & {
  id: string;
};
export enum ModelId {
  Claude3Sonnet = 'anthropic.claude-3-sonnet-20240229-v1:0',
  Claude3Haiku = 'anthropic.claude-3-haiku-20240307-v1:0',
  Claude35Sonnet = 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  GPT4o = 'gpt-4o',
  GPT4oMini = 'gpt-4o-mini',
}
export enum Provider {
  AmazonBedrock,
  OpenAI,
}
export const ModelMetadata: Record<
  ModelId,
  { label: string; provider: Provider; supportsDocs: boolean }
> = {
  [ModelId.Claude3Sonnet]: {
    label: 'Anthropic Claude 3 Sonnet',
    provider: Provider.AmazonBedrock,
    supportsDocs: true,
  },
  [ModelId.Claude3Haiku]: {
    label: 'Anthropic Claude 3 Haiku',
    provider: Provider.AmazonBedrock,
    supportsDocs: true,
  },
  [ModelId.Claude35Sonnet]: {
    label: 'Anthropic Claude 3.5 Sonnet',
    provider: Provider.AmazonBedrock,
    supportsDocs: false,
  },
  [ModelId.GPT4o]: {
    label: 'OpenAI GPT-4o',
    provider: Provider.OpenAI,
    supportsDocs: false,
  },
  [ModelId.GPT4oMini]: {
    label: 'OpenAI GPT-4o mini',
    provider: Provider.OpenAI,
    supportsDocs: false,
  },
};
export interface ThreadType {
  id: string;
  messages: MessageType[];
  model: ModelId;
  name: string;
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
