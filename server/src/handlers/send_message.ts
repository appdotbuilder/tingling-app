
import { db } from '../db';
import { messagesTable, chatsTable, chatParticipantsTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq, and, ne, sql } from 'drizzle-orm';

export const sendMessage = async (input: SendMessageInput): Promise<Message> => {
  try {
    // Insert the message
    const messageResult = await db.insert(messagesTable)
      .values({
        chat_id: input.chat_id,
        sender_id: input.sender_id,
        content: input.content,
        message_type: input.message_type
      })
      .returning()
      .execute();

    const message = messageResult[0];

    // Update chat's last_message_id
    await db.update(chatsTable)
      .set({
        last_message_id: message.id,
        updated_at: new Date()
      })
      .where(eq(chatsTable.id, input.chat_id))
      .execute();

    // Increment unread count for the receiver (all participants except sender)
    await db.update(chatParticipantsTable)
      .set({
        unread_count: sql`${chatParticipantsTable.unread_count} + 1`
      })
      .where(
        and(
          eq(chatParticipantsTable.chat_id, input.chat_id),
          ne(chatParticipantsTable.user_id, input.sender_id)
        )
      )
      .execute();

    return message;
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
};
