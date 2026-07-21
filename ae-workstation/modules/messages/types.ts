export interface Message {
  id: string;
  senderUid: string;
  recipientUid: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}
