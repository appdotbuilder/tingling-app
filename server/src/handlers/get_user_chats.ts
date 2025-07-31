
import { db } from '../db';
import { chatsTable, messagesTable, chatParticipantsTable } from '../db/schema';
import { type Chat } from '../schema';
import { eq, or, desc, and } from 'drizzle-orm';

export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    // Get all chats where the user is either user1 or user2
    // Order by updated_at descending to show most recent chats first
    const results = await db.select()
      .from(chatsTable)
      .where(
        or(
          eq(chatsTable.user1_id, userId),
          eq(chatsTable.user2_id, userId)
        )
      )
      .orderBy(desc(chatsTable.updated_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Get user chats failed:', error);
    throw error;
  }
};
