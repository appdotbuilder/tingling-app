
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendRequestsTable } from '../db/schema';
import { getFriendRequests } from '../handlers/get_friend_requests';
import { eq } from 'drizzle-orm';

describe('getFriendRequests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return pending friend requests for user', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-1',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-2',
        name: 'User Two',
        emoji: '😊'
      },
      {
        id: 'ting-user3',
        google_id: 'google-3',
        name: 'User Three',
        emoji: '😃'
      }
    ]).execute();

    // Create friend requests - one pending, one accepted
    await db.insert(friendRequestsTable).values([
      {
        sender_id: 'ting-user1',
        receiver_id: 'ting-user2',
        status: 'pending'
      },
      {
        sender_id: 'ting-user3',
        receiver_id: 'ting-user2',
        status: 'accepted'
      }
    ]).execute();

    const results = await getFriendRequests('ting-user2');

    // Should only return the pending request
    expect(results).toHaveLength(1);
    expect(results[0].sender_id).toEqual('ting-user1');
    expect(results[0].receiver_id).toEqual('ting-user2');
    expect(results[0].status).toEqual('pending');
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(results[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no pending requests', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'ting-user1',
      google_id: 'google-1',
      name: 'User One',
      emoji: '😀'
    }).execute();

    const results = await getFriendRequests('ting-user1');

    expect(results).toHaveLength(0);
  });

  it('should not return requests where user is sender', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-1',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-2',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Create friend request where user1 is sender
    await db.insert(friendRequestsTable).values({
      sender_id: 'ting-user1',
      receiver_id: 'ting-user2',
      status: 'pending'
    }).execute();

    const results = await getFriendRequests('ting-user1');

    // Should not return requests where user is sender
    expect(results).toHaveLength(0);
  });

  it('should not return rejected or accepted requests', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-1',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-2',
        name: 'User Two',
        emoji: '😊'
      },
      {
        id: 'ting-user3',
        google_id: 'google-3',
        name: 'User Three',
        emoji: '😃'
      }
    ]).execute();

    // Create non-pending friend requests
    await db.insert(friendRequestsTable).values([
      {
        sender_id: 'ting-user1',
        receiver_id: 'ting-user2',
        status: 'accepted'
      },
      {
        sender_id: 'ting-user3',
        receiver_id: 'ting-user2',
        status: 'rejected'
      }
    ]).execute();

    const results = await getFriendRequests('ting-user2');

    expect(results).toHaveLength(0);
  });

  it('should return multiple pending requests', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-1',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-2',
        name: 'User Two',
        emoji: '😊'
      },
      {
        id: 'ting-user3',
        google_id: 'google-3',
        name: 'User Three',
        emoji: '😃'
      },
      {
        id: 'ting-user4',
        google_id: 'google-4',
        name: 'User Four',
        emoji: '🙂'
      }
    ]).execute();

    // Create multiple pending requests for same receiver
    await db.insert(friendRequestsTable).values([
      {
        sender_id: 'ting-user1',
        receiver_id: 'ting-user4',
        status: 'pending'
      },
      {
        sender_id: 'ting-user2',
        receiver_id: 'ting-user4',
        status: 'pending'
      },
      {
        sender_id: 'ting-user3',
        receiver_id: 'ting-user4',
        status: 'pending'
      }
    ]).execute();

    const results = await getFriendRequests('ting-user4');

    expect(results).toHaveLength(3);
    
    // Verify all are pending and for correct receiver
    results.forEach(request => {
      expect(request.receiver_id).toEqual('ting-user4');
      expect(request.status).toEqual('pending');
      expect(['ting-user1', 'ting-user2', 'ting-user3']).toContain(request.sender_id);
    });
  });
});
