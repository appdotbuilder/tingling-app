
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, chatParticipantsTable, messagesTable } from '../db/schema';
import { type MarkAsReadInput } from '../schema';
import { markMessagesAsRead } from '../handlers/mark_messages_as_read';
import { eq, and } from 'drizzle-orm';

describe('markMessagesAsRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark messages as read and reset unread count', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User 1',
          emoji: '😀'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User 2',
          emoji: '😎'
        }
      ])
      .returning()
      .execute();

    // Create test chat
    const chat = await db.insert(chatsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    // Create chat participant with unread messages
    await db.insert(chatParticipantsTable)
      .values({
        chat_id: chat[0].id,
        user_id: users[0].id,
        unread_count: 5,
        last_read_at: null
      })
      .execute();

    const input: MarkAsReadInput = {
      chat_id: chat[0].id,
      user_id: users[0].id
    };

    const result = await markMessagesAsRead(input);

    expect(result).toBe(true);

    // Verify unread count was reset and last_read_at was updated
    const participant = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, chat[0].id),
          eq(chatParticipantsTable.user_id, users[0].id)
        )
      )
      .execute();

    expect(participant).toHaveLength(1);
    expect(participant[0].unread_count).toBe(0);
    expect(participant[0].last_read_at).toBeInstanceOf(Date);
  });

  it('should return false when no chat participant exists', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        id: 'ting-user1',
        google_id: 'google1',
        name: 'User 1',
        emoji: '😀'
      })
      .returning()
      .execute();

    const input: MarkAsReadInput = {
      chat_id: 999, // Non-existent chat
      user_id: user[0].id
    };

    const result = await markMessagesAsRead(input);

    expect(result).toBe(false);
  });

  it('should handle already read messages correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User 1',
          emoji: '😀'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User 2',
          emoji: '😎'
        }
      ])
      .returning()
      .execute();

    // Create test chat
    const chat = await db.insert(chatsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    const previousReadTime = new Date('2024-01-01T10:00:00Z');

    // Create chat participant with no unread messages
    await db.insert(chatParticipantsTable)
      .values({
        chat_id: chat[0].id,
        user_id: users[0].id,
        unread_count: 0,
        last_read_at: previousReadTime
      })
      .execute();

    const input: MarkAsReadInput = {
      chat_id: chat[0].id,
      user_id: users[0].id
    };

    const result = await markMessagesAsRead(input);

    expect(result).toBe(true);

    // Verify last_read_at was updated even when unread_count was already 0
    const participant = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, chat[0].id),
          eq(chatParticipantsTable.user_id, users[0].id)
        )
      )
      .execute();

    expect(participant).toHaveLength(1);
    expect(participant[0].unread_count).toBe(0);
    expect(participant[0].last_read_at).toBeInstanceOf(Date);
    expect(participant[0].last_read_at?.getTime()).toBeGreaterThan(previousReadTime.getTime());
  });
});
