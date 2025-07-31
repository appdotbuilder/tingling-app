
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable, statusesTable } from '../db/schema';
import { getFriendsStatuses } from '../handlers/get_friends_statuses';

describe('getFriendsStatuses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active statuses from friends', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .returning()
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        user1_id: 'ting-user1',
        user2_id: 'ting-user2'
      })
      .execute();

    // Create active status from friend
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24); // 24 hours from now

    await db.insert(statusesTable)
      .values({
        user_id: 'ting-user2',
        content: 'Friend status',
        media_type: 'text',
        privacy: 'friends_only',
        expires_at: futureDate
      })
      .execute();

    const result = await getFriendsStatuses('ting-user1');

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe('ting-user2');
    expect(result[0].content).toBe('Friend status');
    expect(result[0].privacy).toBe('friends_only');
    expect(result[0].expires_at).toBeInstanceOf(Date);
  });

  it('should return statuses from both friendship directions', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        },
        {
          id: 'ting-user3',
          google_id: 'google3',
          name: 'User Three',
          emoji: '🚀'
        }
      ])
      .returning()
      .execute();

    // Create friendships in both directions
    await db.insert(friendshipsTable)
      .values([
        {
          user1_id: 'ting-user1',
          user2_id: 'ting-user2'
        },
        {
          user1_id: 'ting-user3',
          user2_id: 'ting-user1'
        }
      ])
      .execute();

    // Create active statuses from both friends
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    await db.insert(statusesTable)
      .values([
        {
          user_id: 'ting-user2',
          content: 'Status from user2',
          media_type: 'text',
          privacy: 'friends_only',
          expires_at: futureDate
        },
        {
          user_id: 'ting-user3',
          content: 'Status from user3',
          media_type: 'text',
          privacy: 'public',
          expires_at: futureDate
        }
      ])
      .execute();

    const result = await getFriendsStatuses('ting-user1');

    expect(result).toHaveLength(2);
    expect(result.map(s => s.user_id)).toContain('ting-user2');
    expect(result.map(s => s.user_id)).toContain('ting-user3');
  });

  it('should not return expired statuses', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        user1_id: 'ting-user1',
        user2_id: 'ting-user2'
      })
      .execute();

    // Create expired status
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago

    await db.insert(statusesTable)
      .values({
        user_id: 'ting-user2',
        content: 'Expired status',
        media_type: 'text',
        privacy: 'friends_only',
        expires_at: pastDate
      })
      .execute();

    const result = await getFriendsStatuses('ting-user1');

    expect(result).toHaveLength(0);
  });

  it('should not return statuses from non-friends', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    // No friendship created between users

    // Create status from non-friend
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    await db.insert(statusesTable)
      .values({
        user_id: 'ting-user2',
        content: 'Non-friend status',
        media_type: 'text',
        privacy: 'friends_only',
        expires_at: futureDate
      })
      .execute();

    const result = await getFriendsStatuses('ting-user1');

    expect(result).toHaveLength(0);
  });

  it('should return both public and friends_only statuses from friends', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        user1_id: 'ting-user1',
        user2_id: 'ting-user2'
      })
      .execute();

    // Create statuses with different privacy settings
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    await db.insert(statusesTable)
      .values([
        {
          user_id: 'ting-user2',
          content: 'Public status',
          media_type: 'text',
          privacy: 'public',
          expires_at: futureDate
        },
        {
          user_id: 'ting-user2',
          content: 'Friends only status',
          media_type: 'text',
          privacy: 'friends_only',
          expires_at: futureDate
        }
      ])
      .execute();

    const result = await getFriendsStatuses('ting-user1');

    expect(result).toHaveLength(2);
    expect(result.map(s => s.privacy)).toContain('public');
    expect(result.map(s => s.privacy)).toContain('friends_only');
  });

  it('should return empty array when user has no friends', async () => {
    // Create test user with no friends
    await db.insert(usersTable)
      .values({
        id: 'ting-user1',
        google_id: 'google1',
        name: 'User One',
        emoji: '😊'
      })
      .execute();

    const result = await getFriendsStatuses('ting-user1');

    expect(result).toHaveLength(0);
  });
});
