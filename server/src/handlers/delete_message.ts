
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type DeleteMessageInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteMessage = async (input: DeleteMessageInput): Promise<boolean> => {
  try {
    // Update the message to set is_deleted flag to true
    // Only allow deletion if the user is the sender of the message
    const result = await db.update(messagesTable)
      .set({ 
        is_deleted: true,
        updated_at: new Date()
      })
      .where(
        and(
          eq(messagesTable.id, input.message_id),
          eq(messagesTable.sender_id, input.user_id)
        )
      )
      .returning()
      .execute();

    // Return true if a message was updated, false if no message was found or user doesn't own it
    return result.length > 0;
  } catch (error) {
    console.error('Message deletion failed:', error);
    throw error;
  }
};
