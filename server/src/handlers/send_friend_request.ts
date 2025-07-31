
import { db } from '../db';
import { usersTable, friendRequestsTable, friendshipsTable, blockedUsersTable } from '../db/schema';
import { type SendFriendRequestInput, type FriendRequest } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export const sendFriendRequest = async (input: SendFriendRequestInput): Promise<FriendRequest> => {
  try {
    // Validate both users exist
    const users = await db.select()
      .from(usersTable)
      .where(or(
        eq(usersTable.id, input.sender_id),
        eq(usersTable.id, input.receiver_id)
      ))
      .execute();

    if (users.length !== 2) {
      throw new Error('One or both users do not exist');
    }

    // Check if users are blocked (either direction)
    const blockedRelations = await db.select()
      .from(blockedUsersTable)
      .where(or(
        and(
          eq(blockedUsersTable.blocker_id, input.sender_id),
          eq(blockedUsersTable.blocked_id, input.receiver_id)
        ),
        and(
          eq(blockedUsersTable.blocker_id, input.receiver_id),
          eq(blockedUsersTable.blocked_id, input.sender_id)
        )
      ))
      .execute();

    if (blockedRelations.length > 0) {
      throw new Error('Cannot send friend request to blocked user');
    }

    // Check if they're already friends
    const existingFriendship = await db.select()
      .from(friendshipsTable)
      .where(or(
        and(
          eq(friendshipsTable.user1_id, input.sender_id),
          eq(friendshipsTable.user2_id, input.receiver_id)
        ),
        and(
          eq(friendshipsTable.user1_id, input.receiver_id),
          eq(friendshipsTable.user2_id, input.sender_id)
        )
      ))
      .execute();

    if (existingFriendship.length > 0) {
      throw new Error('Users are already friends');
    }

    // Check for existing friend request (either direction)
    const existingRequest = await db.select()
      .from(friendRequestsTable)
      .where(or(
        and(
          eq(friendRequestsTable.sender_id, input.sender_id),
          eq(friendRequestsTable.receiver_id, input.receiver_id)
        ),
        and(
          eq(friendRequestsTable.sender_id, input.receiver_id),
          eq(friendRequestsTable.receiver_id, input.sender_id)
        )
      ))
      .execute();

    if (existingRequest.length > 0) {
      throw new Error('Friend request already exists');
    }

    // Create the friend request
    const result = await db.insert(friendRequestsTable)
      .values({
        sender_id: input.sender_id,
        receiver_id: input.receiver_id,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Friend request creation failed:', error);
    throw error;
  }
};
