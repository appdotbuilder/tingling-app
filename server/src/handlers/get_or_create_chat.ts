
import { db } from '../db';
import { chatsTable, chatParticipantsTable } from '../db/schema';
import { type Chat } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export const getOrCreateChat = async (user1Id: string, user2Id: string): Promise<Chat> => {
  try {
    // First, try to find an existing chat between the two users
    // Chat can exist with either user as user1 or user2
    const existingChats = await db.select()
      .from(chatsTable)
      .where(
        or(
          and(
            eq(chatsTable.user1_id, user1Id),
            eq(chatsTable.user2_id, user2Id)
          ),
          and(
            eq(chatsTable.user1_id, user2Id),
            eq(chatsTable.user2_id, user1Id)
          )
        )
      )
      .execute();

    // If chat exists, return it
    if (existingChats.length > 0) {
      return existingChats[0];
    }

    // No existing chat found, create a new one
    const newChats = await db.insert(chatsTable)
      .values({
        user1_id: user1Id,
        user2_id: user2Id,
        last_message_id: null
      })
      .returning()
      .execute();

    const newChat = newChats[0];

    // Create chat participants for both users (for unread count tracking)
    await db.insert(chatParticipantsTable)
      .values([
        {
          chat_id: newChat.id,
          user_id: user1Id,
          unread_count: 0,
          last_read_at: null
        },
        {
          chat_id: newChat.id,
          user_id: user2Id,
          unread_count: 0,
          last_read_at: null
        }
      ])
      .execute();

    return newChat;
  } catch (error) {
    console.error('Get or create chat failed:', error);
    throw error;
  }
};
