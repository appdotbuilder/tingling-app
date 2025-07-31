
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type Message } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getChatMessages = async (chatId: number, limit?: number, offset?: number): Promise<Message[]> => {
  try {
    // Build query based on pagination parameters to avoid TypeScript issues
    let results;

    if (limit !== undefined && offset !== undefined) {
      results = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.chat_id, chatId))
        .orderBy(asc(messagesTable.created_at))
        .limit(limit)
        .offset(offset)
        .execute();
    } else if (limit !== undefined) {
      results = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.chat_id, chatId))
        .orderBy(asc(messagesTable.created_at))
        .limit(limit)
        .execute();
    } else if (offset !== undefined) {
      results = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.chat_id, chatId))
        .orderBy(asc(messagesTable.created_at))
        .offset(offset)
        .execute();
    } else {
      results = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.chat_id, chatId))
        .orderBy(asc(messagesTable.created_at))
        .execute();
    }

    return results;
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    throw error;
  }
};
