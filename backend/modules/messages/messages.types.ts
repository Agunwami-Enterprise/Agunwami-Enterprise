/**
 * backend/modules/messages/messages.types.ts
 *
 * Types for CEO Executive Messaging & Channels.
 */

export interface ChatChannel {
  id: string;
  name: string;
  type: 'channel' | 'direct';
  description?: string;
  unreadCount: number;
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: string;
  };
  membersCount: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  text: string;
  timestamp: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
}

export interface SendMessageDto {
  channelId: string;
  text: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
}
