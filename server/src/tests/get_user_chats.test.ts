
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable } from '../db/schema';
import { getUserChats } from '../handlers/get_user_chats';
import { eq } from 'drizzle-orm';

describe('getUserChats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no chats', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      id: 'ting-test1',
      google_id: 'google-123',
      name: 'Test User',
      emoji: '😀'
    }).execute();

    const result = await getUserChats('ting-test1');

    expect(result).toEqual([]);
  });

  it('should return chats where user is user1', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-test1',
        google_id: 'google-123',
        name: 'Test User 1',
        emoji: '😀'
      },
      {
        id: 'ting-test2',
        google_id: 'google-456',
        name: 'Test User 2',
        emoji: '😊'
      }
    ]).execute();

    // Create chat where test1 is user1
    const chatResult = await db.insert(chatsTable).values({
      user1_id: 'ting-test1',
      user2_id: 'ting-test2'
    }).returning().execute();

    const result = await getUserChats('ting-test1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(chatResult[0].id);
    expect(result[0].user1_id).toEqual('ting-test1');
    expect(result[0].user2_id).toEqual('ting-test2');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return chats where user is user2', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-test1',
        google_id: 'google-123',
        name: 'Test User 1',
        emoji: '😀'
      },
      {
        id: 'ting-test2',
        google_id: 'google-456',
        name: 'Test User 2',
        emoji: '😊'
      }
    ]).execute();

    // Create chat where test1 is user2
    const chatResult = await db.insert(chatsTable).values({
      user1_id: 'ting-test2',
      user2_id: 'ting-test1'
    }).returning().execute();

    const result = await getUserChats('ting-test1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(chatResult[0].id);
    expect(result[0].user1_id).toEqual('ting-test2');
    expect(result[0].user2_id).toEqual('ting-test1');
  });

  it('should return multiple chats for a user', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-test1',
        google_id: 'google-123',
        name: 'Test User 1',
        emoji: '😀'
      },
      {
        id: 'ting-test2',
        google_id: 'google-456',
        name: 'Test User 2',
        emoji: '😊'
      },
      {
        id: 'ting-test3',
        google_id: 'google-789',
        name: 'Test User 3',
        emoji: '😎'
      }
    ]).execute();

    // Create multiple chats
    await db.insert(chatsTable).values([
      {
        user1_id: 'ting-test1',
        user2_id: 'ting-test2'
      },
      {
        user1_id: 'ting-test3',
        user2_id: 'ting-test1'
      }
    ]).execute();

    const result = await getUserChats('ting-test1');

    expect(result).toHaveLength(2);
    // Verify that test1 is in each chat (either as user1 or user2)
    result.forEach(chat => {
      expect(
        chat.user1_id === 'ting-test1' || chat.user2_id === 'ting-test1'
      ).toBe(true);
    });
  });

  it('should order chats by updated_at descending', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-test1',
        google_id: 'google-123',
        name: 'Test User 1',
        emoji: '😀'
      },
      {
        id: 'ting-test2',
        google_id: 'google-456',
        name: 'Test User 2',
        emoji: '😊'
      },
      {
        id: 'ting-test3',
        google_id: 'google-789',
        name: 'Test User 3',
        emoji: '😎'
      }
    ]).execute();

    // Create first chat
    const firstChat = await db.insert(chatsTable).values({
      user1_id: 'ting-test1',
      user2_id: 'ting-test2'
    }).returning().execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second chat (should have later timestamp)
    const secondChat = await db.insert(chatsTable).values({
      user1_id: 'ting-test1',
      user2_id: 'ting-test3'
    }).returning().execute();

    const result = await getUserChats('ting-test1');

    expect(result).toHaveLength(2);
    // More recent chat should come first
    expect(result[0].id).toEqual(secondChat[0].id);
    expect(result[1].id).toEqual(firstChat[0].id);
    expect(result[0].updated_at >= result[1].updated_at).toBe(true);
  });

  it('should not return chats for other users', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-test1',
        google_id: 'google-123',
        name: 'Test User 1',
        emoji: '😀'
      },
      {
        id: 'ting-test2',
        google_id: 'google-456',
        name: 'Test User 2',
        emoji: '😊'
      },
      {
        id: 'ting-test3',
        google_id: 'google-789',
        name: 'Test User 3',
        emoji: '😎'
      }
    ]).execute();

    // Create chat between test2 and test3 (test1 not involved)
    await db.insert(chatsTable).values({
      user1_id: 'ting-test2',
      user2_id: 'ting-test3'
    }).execute();

    const result = await getUserChats('ting-test1');

    expect(result).toEqual([]);
  });
});
