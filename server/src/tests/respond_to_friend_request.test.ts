
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendRequestsTable, friendshipsTable } from '../db/schema';
import { type RespondToFriendRequestInput } from '../schema';
import { respondToFriendRequest } from '../handlers/respond_to_friend_request';
import { eq } from 'drizzle-orm';

describe('respondToFriendRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test users and friend request
  const setupTestData = async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          id: 'ting-sender',
          google_id: 'google-sender',
          name: 'Sender User',
          emoji: '😊'
        },
        {
          id: 'ting-receiver',
          google_id: 'google-receiver',
          name: 'Receiver User',
          emoji: '😎'
        }
      ])
      .returning()
      .execute();

    // Create friend request
    const friendRequests = await db.insert(friendRequestsTable)
      .values({
        sender_id: 'ting-sender',
        receiver_id: 'ting-receiver',
        status: 'pending'
      })
      .returning()
      .execute();

    return {
      users,
      friendRequest: friendRequests[0]
    };
  };

  it('should accept a friend request and create friendship', async () => {
    const { friendRequest } = await setupTestData();

    const input: RespondToFriendRequestInput = {
      request_id: friendRequest.id,
      status: 'accepted'
    };

    const result = await respondToFriendRequest(input);

    // Check updated friend request
    expect(result.id).toEqual(friendRequest.id);
    expect(result.status).toEqual('accepted');
    expect(result.sender_id).toEqual('ting-sender');
    expect(result.receiver_id).toEqual('ting-receiver');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify friendship was created
    const friendships = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.user1_id, 'ting-sender'))
      .execute();

    expect(friendships).toHaveLength(1);
    expect(friendships[0].user1_id).toEqual('ting-sender');
    expect(friendships[0].user2_id).toEqual('ting-receiver');
    expect(friendships[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject a friend request without creating friendship', async () => {
    const { friendRequest } = await setupTestData();

    const input: RespondToFriendRequestInput = {
      request_id: friendRequest.id,
      status: 'rejected'
    };

    const result = await respondToFriendRequest(input);

    // Check updated friend request
    expect(result.id).toEqual(friendRequest.id);
    expect(result.status).toEqual('rejected');
    expect(result.sender_id).toEqual('ting-sender');
    expect(result.receiver_id).toEqual('ting-receiver');

    // Verify no friendship was created
    const friendships = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.user1_id, 'ting-sender'))
      .execute();

    expect(friendships).toHaveLength(0);
  });

  it('should update request status in database', async () => {
    const { friendRequest } = await setupTestData();

    const input: RespondToFriendRequestInput = {
      request_id: friendRequest.id,
      status: 'accepted'
    };

    await respondToFriendRequest(input);

    // Verify database was updated
    const updatedRequests = await db.select()
      .from(friendRequestsTable)
      .where(eq(friendRequestsTable.id, friendRequest.id))
      .execute();

    expect(updatedRequests).toHaveLength(1);
    expect(updatedRequests[0].status).toEqual('accepted');
    expect(updatedRequests[0].updated_at).toBeInstanceOf(Date);
    expect(updatedRequests[0].updated_at.getTime()).toBeGreaterThan(friendRequest.updated_at.getTime());
  });

  it('should throw error for non-existent friend request', async () => {
    const input: RespondToFriendRequestInput = {
      request_id: 999999,
      status: 'accepted'
    };

    await expect(respondToFriendRequest(input)).rejects.toThrow(/friend request not found/i);
  });

  it('should throw error when responding to already processed request', async () => {
    const { friendRequest } = await setupTestData();

    // First, accept the request
    await respondToFriendRequest({
      request_id: friendRequest.id,
      status: 'accepted'
    });

    // Try to respond again
    const input: RespondToFriendRequestInput = {
      request_id: friendRequest.id,
      status: 'rejected'
    };

    await expect(respondToFriendRequest(input)).rejects.toThrow(/already been responded to/i);
  });
});
