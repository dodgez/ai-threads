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
export interface ThreadType {
  id: string;
  messages: MessageType[];
  model?: string;
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
