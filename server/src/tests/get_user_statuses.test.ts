
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, statusesTable, friendshipsTable } from '../db/schema';
import { getUserStatuses } from '../handlers/get_user_statuses';

describe('getUserStatuses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active statuses for a user viewing their own statuses', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        id: 'ting-test1',
        google_id: 'google1',
        name: 'Test User',
        emoji: '😀'
      })
      .returning()
      .execute();

    // Create active status
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    await db.insert(statusesTable)
      .values({
        user_id: 'ting-test1',
        content: 'Test status',
        media_type: 'text',
        privacy: 'friends_only',
        expires_at: futureDate
      })
      .execute();

    const result = await getUserStatuses('ting-test1', 'ting-test1');

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Test status');
    expect(result[0].user_id).toEqual('ting-test1');
    expect(result[0].privacy).toEqual('friends_only');
  });

  it('should not return expired statuses', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        id: 'ting-test1',
        google_id: 'google1',
        name: 'Test User',
        emoji: '😀'
      })
      .execute();

    // Create expired status
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);

    await db.insert(statusesTable)
      .values({
        user_id: 'ting-test1',
        content: 'Expired status',
        media_type: 'text',
        privacy: 'public',
        expires_at: pastDate
      })
      .execute();

    const result = await getUserStatuses('ting-test1', 'ting-test1');

    expect(result).toHaveLength(0);
  });

  it('should return only public statuses for non-friends', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-test1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😀'
        },
        {
          id: 'ting-test2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    // Create public and friends_only statuses
    await db.insert(statusesTable)
      .values([
        {
          user_id: 'ting-test1',
          content: 'Public status',
          media_type: 'text',
          privacy: 'public',
          expires_at: futureDate
        },
        {
          user_id: 'ting-test1',
          content: 'Friends only status',
          media_type: 'text',
          privacy: 'friends_only',
          expires_at: futureDate
        }
      ])
      .execute();

    // Non-friend viewing statuses
    const result = await getUserStatuses('ting-test1', 'ting-test2');

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Public status');
    expect(result[0].privacy).toEqual('public');
  });

  it('should return both public and friends_only statuses for friends', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-test1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😀'
        },
        {
          id: 'ting-test2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        user1_id: 'ting-test1',
        user2_id: 'ting-test2'
      })
      .execute();

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    // Create public and friends_only statuses
    await db.insert(statusesTable)
      .values([
        {
          user_id: 'ting-test1',
          content: 'Public status',
          media_type: 'text',
          privacy: 'public',
          expires_at: futureDate
        },
        {
          user_id: 'ting-test1',
          content: 'Friends only status',
          media_type: 'text',
          privacy: 'friends_only',
          expires_at: futureDate
        }
      ])
      .execute();

    // Friend viewing statuses
    const result = await getUserStatuses('ting-test1', 'ting-test2');

    expect(result).toHaveLength(2);
    expect(result.some(s => s.content === 'Public status')).toBe(true);
    expect(result.some(s => s.content === 'Friends only status')).toBe(true);
  });

  it('should work with bidirectional friendship', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-test1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😀'
        },
        {
          id: 'ting-test2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    // Create friendship in reverse order (user2 -> user1)
    await db.insert(friendshipsTable)
      .values({
        user1_id: 'ting-test2',
        user2_id: 'ting-test1'
      })
      .execute();

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    await db.insert(statusesTable)
      .values({
        user_id: 'ting-test1',
        content: 'Friends only status',
        media_type: 'text',
        privacy: 'friends_only',
        expires_at: futureDate
      })
      .execute();

    // Should still work regardless of friendship direction
    const result = await getUserStatuses('ting-test1', 'ting-test2');

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Friends only status');
  });

  it('should return empty array when user has no active statuses', async () => {
    // Create test user without any statuses
    await db.insert(usersTable)
      .values({
        id: 'ting-test1',
        google_id: 'google1',
        name: 'Test User',
        emoji: '😀'
      })
      .execute();

    const result = await getUserStatuses('ting-test1', 'ting-test1');

    expect(result).toHaveLength(0);
  });
});
