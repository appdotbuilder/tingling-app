
import { db } from '../db';
import { friendRequestsTable } from '../db/schema';
import { type FriendRequest } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    // Query pending friend requests where user is the receiver
    const results = await db.select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.receiver_id, userId),
          eq(friendRequestsTable.status, 'pending')
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Get friend requests failed:', error);
    throw error;
  }
};
