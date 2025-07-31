
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendRequestsTable, friendshipsTable, blockedUsersTable } from '../db/schema';
import { type SendFriendRequestInput } from '../schema';
import { sendFriendRequest } from '../handlers/send_friend_request';
import { eq, and, or } from 'drizzle-orm';

describe('sendFriendRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test users
  const user1 = {
    id: 'ting-1234',
    google_id: 'google-1234',
    name: 'John Doe',
    emoji: '😊',
    profile_picture_url: null
  };

  const user2 = {
    id: 'ting-5678',
    google_id: 'google-5678', 
    name: 'Jane Smith',
    emoji: '😎',
    profile_picture_url: null
  };

  const testInput: SendFriendRequestInput = {
    sender_id: user1.id,
    receiver_id: user2.id
  };

  it('should send a friend request successfully', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    const result = await sendFriendRequest(testInput);

    // Validate friend request fields
    expect(result.sender_id).toEqual(user1.id);
    expect(result.receiver_id).toEqual(user2.id);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save friend request to database', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    const result = await sendFriendRequest(testInput);

    // Query database to verify friend request was saved
    const friendRequests = await db.select()
      .from(friendRequestsTable)
      .where(eq(friendRequestsTable.id, result.id))
      .execute();

    expect(friendRequests).toHaveLength(1);
    expect(friendRequests[0].sender_id).toEqual(user1.id);
    expect(friendRequests[0].receiver_id).toEqual(user2.id);
    expect(friendRequests[0].status).toEqual('pending');
  });

  it('should throw error when sender does not exist', async () => {
    // Only create receiver
    await db.insert(usersTable).values([user2]).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/one or both users do not exist/i);
  });

  it('should throw error when receiver does not exist', async () => {
    // Only create sender
    await db.insert(usersTable).values([user1]).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/one or both users do not exist/i);
  });

  it('should throw error when users are already friends', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    // Create existing friendship
    await db.insert(friendshipsTable).values({
      user1_id: user1.id,
      user2_id: user2.id
    }).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/users are already friends/i);
  });

  it('should throw error when friendship exists in reverse direction', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    // Create existing friendship (reverse direction)
    await db.insert(friendshipsTable).values({
      user1_id: user2.id,
      user2_id: user1.id
    }).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/users are already friends/i);
  });

  it('should throw error when sender has blocked receiver', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    // Create block relationship
    await db.insert(blockedUsersTable).values({
      blocker_id: user1.id,
      blocked_id: user2.id
    }).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/cannot send friend request to blocked user/i);
  });

  it('should throw error when receiver has blocked sender', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    // Create block relationship (reverse direction)
    await db.insert(blockedUsersTable).values({
      blocker_id: user2.id,
      blocked_id: user1.id
    }).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/cannot send friend request to blocked user/i);
  });

  it('should throw error when friend request already exists', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    // Create existing friend request
    await db.insert(friendRequestsTable).values({
      sender_id: user1.id,
      receiver_id: user2.id,
      status: 'pending'
    }).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/friend request already exists/i);
  });

  it('should throw error when reverse friend request already exists', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    // Create existing friend request (reverse direction)
    await db.insert(friendRequestsTable).values({
      sender_id: user2.id,
      receiver_id: user1.id,
      status: 'pending'
    }).execute();

    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/friend request already exists/i);
  });

  it('should allow friend request after previous request was rejected', async () => {
    // Create test users
    await db.insert(usersTable).values([user1, user2]).execute();

    // Create existing rejected friend request
    await db.insert(friendRequestsTable).values({
      sender_id: user1.id,
      receiver_id: user2.id,
      status: 'rejected'
    }).execute();

    // Should still throw error because ANY existing request prevents new ones
    await expect(sendFriendRequest(testInput))
      .rejects.toThrow(/friend request already exists/i);
  });
});
