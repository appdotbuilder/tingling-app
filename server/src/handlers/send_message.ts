
import { type SendMessageInput, type Message } from '../schema';

export const sendMessage = async (input: SendMessageInput): Promise<Message> => {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is sending a message in a chat.
  // Should save message, update chat's last_message_id, and increment unread count for receiver.
  return Promise.resolve({
    id: 0,
    chat_id: input.chat_id,
    sender_id: input.sender_id,
    content: input.content,
    message_type: input.message_type,
    is_deleted: false,
    created_at: new Date(),
    updated_at: new Date()
  } as Message);
};
