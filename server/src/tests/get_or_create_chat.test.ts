
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, chatParticipantsTable } from '../db/schema';
import { getOrCreateChat } from '../handlers/get_or_create_chat';
import { eq, and, or } from 'drizzle-orm';

describe('getOrCreateChat', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const user1 = {
    id: 'ting-1234',
    google_id: 'google-1234',
    name: 'Test User 1',
    emoji: '😀'
  };

  const user2 = {
    id: 'ting-5678',
    google_id: 'google-5678',
    name: 'Test User 2',
    emoji: '😊'
  };

  beforeEach(async () => {
    // Create test users
    await db.insert(usersTable)
      .values([user1, user2])
      .execute();
  });

  it('should create a new chat when none exists', async () => {
    const result = await getOrCreateChat(user1.id, user2.id);

    // Verify chat properties
    expect(result.user1_id).toEqual(user1.id);
    expect(result.user2_id).toEqual(user2.id);
    expect(result.last_message_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save chat to database', async () => {
    const result = await getOrCreateChat(user1.id, user2.id);

    // Verify chat was saved to database
    const chats = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.id, result.id))
      .execute();

    expect(chats).toHaveLength(1);
    expect(chats[0].user1_id).toEqual(user1.id);
    expect(chats[0].user2_id).toEqual(user2.id);
  });

  it('should create chat participants for both users', async () => {
    const result = await getOrCreateChat(user1.id, user2.id);

    // Verify chat participants were created
    const participants = await db.select()
      .from(chatParticipantsTable)
      .where(eq(chatParticipantsTable.chat_id, result.id))
      .execute();

    expect(participants).toHaveLength(2);
    
    // Check both users are participants
    const user1Participant = participants.find(p => p.user_id === user1.id);
    const user2Participant = participants.find(p => p.user_id === user2.id);

    expect(user1Participant).toBeDefined();
    expect(user1Participant!.unread_count).toEqual(0);
    expect(user1Participant!.last_read_at).toBeNull();

    expect(user2Participant).toBeDefined();
    expect(user2Participant!.unread_count).toEqual(0);
    expect(user2Participant!.last_read_at).toBeNull();
  });

  it('should return existing chat when called with same users', async () => {
    // Create initial chat
    const firstResult = await getOrCreateChat(user1.id, user2.id);

    // Call again with same users
    const secondResult = await getOrCreateChat(user1.id, user2.id);

    // Should return the same chat
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.user1_id).toEqual(firstResult.user1_id);
    expect(secondResult.user2_id).toEqual(firstResult.user2_id);
  });

  it('should return existing chat when called with users in reverse order', async () => {
    // Create chat with user1, user2
    const firstResult = await getOrCreateChat(user1.id, user2.id);

    // Call with users in reverse order
    const secondResult = await getOrCreateChat(user2.id, user1.id);

    // Should return the same chat
    expect(secondResult.id).toEqual(firstResult.id);
  });

  it('should not create duplicate chat participants when chat exists', async () => {
    // Create initial chat
    await getOrCreateChat(user1.id, user2.id);

    // Call again
    const result = await getOrCreateChat(user1.id, user2.id);

    // Verify only 2 participants exist (no duplicates)
    const participants = await db.select()
      .from(chatParticipantsTable)
      .where(eq(chatParticipantsTable.chat_id, result.id))
      .execute();

    expect(participants).toHaveLength(2);
  });

  it('should handle different user combinations independently', async () => {
    // Create third user
    const user3 = {
      id: 'ting-9999',
      google_id: 'google-9999',
      name: 'Test User 3',
      emoji: '🎉'
    };

    await db.insert(usersTable)
      .values([user3])
      .execute();

    // Create different chat combinations
    const chat1 = await getOrCreateChat(user1.id, user2.id);
    const chat2 = await getOrCreateChat(user1.id, user3.id);
    const chat3 = await getOrCreateChat(user2.id, user3.id);

    // All chats should be different
    expect(chat1.id).not.toEqual(chat2.id);
    expect(chat1.id).not.toEqual(chat3.id);
    expect(chat2.id).not.toEqual(chat3.id);

    // Verify all chats exist in database
    const allChats = await db.select()
      .from(chatsTable)
      .execute();

    expect(allChats).toHaveLength(3);
  });
});
