export interface ChatChannel {
  id: string;
  name: string;
  kind: 'company' | 'job';
}
export interface ChatAttachment {
  kind: 'photo' | 'video';
  url: string;
  filename: string;
  sizeBytes: number;
}
export interface ChatMessage {
  attachment: ChatAttachment | null;
  id: string;
  sequence: string;
  channelId: string;
  senderId: string | null;
  senderName: string;
  text: string;
  createdAt: string;
  clientId: string;
}
export interface ChatPage {
  messages: ChatMessage[];
  hasOlder: boolean;
}
export function normalizeChatText(value: unknown, allowEmpty = false): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if ((!text && !allowEmpty) || text.length > 4000) return null;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      (code >= 0xd800 && code <= 0xdfff)
    )
      return null;
  }
  return text;
}
export function mergeChatMessages(previous: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => a.sequence.length - b.sequence.length || a.sequence.localeCompare(b.sequence)
  );
}

// Retry identifier only; this is not an authentication credential.
export function newChatClientId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const value = Math.floor(Math.random() * 16);
    return (c === 'x' ? value : (value & 3) | 8).toString(16);
  });
}
