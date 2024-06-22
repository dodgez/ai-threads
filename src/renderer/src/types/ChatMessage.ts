export enum ChatMessageType {
  Bot,
  User,
}
export interface ChatMessage {
  id: string;
  message: string;
  type: ChatMessageType;
}
