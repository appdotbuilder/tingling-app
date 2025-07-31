
import { db } from '../db';
import { statusesTable, friendshipsTable, usersTable } from '../db/schema';
import { type Status } from '../schema';
import { eq, or, and, gt } from 'drizzle-orm';

export const getFriendsStatuses = async (userId: string): Promise<Status[]> => {
  try {
    // Get all active statuses from friends
    // A status is active if it hasn't expired yet
    const now = new Date();
    
    const results = await db.select({
      id: statusesTable.id,
      user_id: statusesTable.user_id,
      content: statusesTable.content,
      media_url: statusesTable.media_url,
      media_type: statusesTable.media_type,
      privacy: statusesTable.privacy,
      expires_at: statusesTable.expires_at,
      created_at: statusesTable.created_at
    })
    .from(statusesTable)
    .innerJoin(
      friendshipsTable,
      or(
        and(
          eq(friendshipsTable.user1_id, userId),
          eq(friendshipsTable.user2_id, statusesTable.user_id)
        ),
        and(
          eq(friendshipsTable.user2_id, userId),
          eq(friendshipsTable.user1_id, statusesTable.user_id)
        )
      )
    )
    .where(
      and(
        gt(statusesTable.expires_at, now), // Only active (non-expired) statuses
        or(
          eq(statusesTable.privacy, 'public'),
          eq(statusesTable.privacy, 'friends_only') // Friends can see friends_only statuses
        )
      )
    )
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get friends statuses:', error);
    throw error;
  }
};
