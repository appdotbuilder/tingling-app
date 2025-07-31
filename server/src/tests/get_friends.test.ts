
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable } from '../db/schema';
import { getFriends } from '../handlers/get_friends';

describe('getFriends', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no friends', async () => {
    // Create a user with no friendships
    await db.insert(usersTable)
      .values({
        id: 'ting-user1',
        google_id: 'google123',
        name: 'Test User',
        emoji: '😊'
      })
      .execute();

    const friends = await getFriends('ting-user1');

    expect(friends).toEqual([]);
  });

  it('should return friends when user1_id matches', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google123',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google456',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    // Create friendship where user1 is user1_id
    await db.insert(friendshipsTable)
      .values({
        user1_id: 'ting-user1',
        user2_id: 'ting-user2'
      })
      .execute();

    const friends = await getFriends('ting-user1');

    expect(friends).toHaveLength(1);
    expect(friends[0].id).toEqual('ting-user2');
    expect(friends[0].name).toEqual('User Two');
    expect(friends[0].emoji).toEqual('😎');
    expect(friends[0].google_id).toEqual('google456');
    expect(friends[0].call_status).toEqual('offline');
    expect(friends[0].created_at).toBeInstanceOf(Date);
    expect(friends[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return friends when user2_id matches', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google123',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google456',
          name: 'User Two',
          emoji: '😎'
        }
      ])
      .execute();

    // Create friendship where user2 is user2_id
    await db.insert(friendshipsTable)
      .values({
        user1_id: 'ting-user2',
        user2_id: 'ting-user1'
      })
      .execute();

    const friends = await getFriends('ting-user1');

    expect(friends).toHaveLength(1);
    expect(friends[0].id).toEqual('ting-user2');
    expect(friends[0].name).toEqual('User Two');
    expect(friends[0].emoji).toEqual('😎');
  });

  it('should return multiple friends', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google123',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google456',
          name: 'User Two',
          emoji: '😎'
        },
        {
          id: 'ting-user3',
          google_id: 'google789',
          name: 'User Three',
          emoji: '🤔'
        }
      ])
      .execute();

    // Create multiple friendships
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

    const friends = await getFriends('ting-user1');

    expect(friends).toHaveLength(2);
    
    // Sort by id for consistent testing
    const sortedFriends = friends.sort((a, b) => a.id.localeCompare(b.id));
    
    expect(sortedFriends[0].id).toEqual('ting-user2');
    expect(sortedFriends[0].name).toEqual('User Two');
    
    expect(sortedFriends[1].id).toEqual('ting-user3');
    expect(sortedFriends[1].name).toEqual('User Three');
  });

  it('should not return duplicate friends', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google123',
          name: 'User One',
          emoji: '😊'
        },
        {
          id: 'ting-user2',
          google_id: 'google456',
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

    const friends = await getFriends('ting-user1');

    expect(friends).toHaveLength(1);
    expect(friends[0].id).toEqual('ting-user2');
  });

  it('should handle non-existent user gracefully', async () => {
    const friends = await getFriends('ting-nonexistent');

    expect(friends).toEqual([]);
  });
});
