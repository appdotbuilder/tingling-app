
import { db } from '../db';
import { friendRequestsTable, friendshipsTable } from '../db/schema';
import { type RespondToFriendRequestInput, type FriendRequest } from '../schema';
import { eq } from 'drizzle-orm';

export const respondToFriendRequest = async (input: RespondToFriendRequestInput): Promise<FriendRequest> => {
  try {
    // First, get the friend request to validate it exists and get sender/receiver info
    const existingRequests = await db.select()
      .from(friendRequestsTable)
      .where(eq(friendRequestsTable.id, input.request_id))
      .execute();

    if (existingRequests.length === 0) {
      throw new Error('Friend request not found');
    }

    const friendRequest = existingRequests[0];

    // Check if request is still pending
    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request has already been responded to');
    }

    // Update the friend request status
    const updatedRequests = await db.update(friendRequestsTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(friendRequestsTable.id, input.request_id))
      .returning()
      .execute();

    const updatedRequest = updatedRequests[0];

    // If accepted, create friendship record
    if (input.status === 'accepted') {
      await db.insert(friendshipsTable)
        .values({
          user1_id: friendRequest.sender_id,
          user2_id: friendRequest.receiver_id
        })
        .execute();
    }

    return updatedRequest;
  } catch (error) {
    console.error('Responding to friend request failed:', error);
    throw error;
  }
};
