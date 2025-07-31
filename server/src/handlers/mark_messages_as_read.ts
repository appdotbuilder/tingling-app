
import { db } from '../db';
import { chatParticipantsTable } from '../db/schema';
import { type MarkAsReadInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const markMessagesAsRead = async (input: MarkAsReadInput): Promise<boolean> => {
  try {
    // Update the chat participant record to mark messages as read
    const result = await db.update(chatParticipantsTable)
      .set({
        unread_count: 0,
        last_read_at: new Date()
      })
      .where(
        and(
          eq(chatParticipantsTable.chat_id, input.chat_id),
          eq(chatParticipantsTable.user_id, input.user_id)
        )
      )
      .execute();

    // Return true if a record was updated
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Mark messages as read failed:', error);
    throw error;
  }
};
