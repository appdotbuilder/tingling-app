
import { db } from '../db';
import { statusesTable, friendshipsTable } from '../db/schema';
import { type Status } from '../schema';
import { eq, and, gt, or, desc } from 'drizzle-orm';

export const getUserStatuses = async (userId: string, viewerId: string): Promise<Status[]> => {
  try {
    // If viewing own statuses, no privacy filter needed
    if (userId === viewerId) {
      const results = await db.select()
        .from(statusesTable)
        .where(
          and(
            eq(statusesTable.user_id, userId),
            gt(statusesTable.expires_at, new Date())
          )
        )
        .orderBy(desc(statusesTable.created_at))
        .execute();

      return results;
    }

    // Check if they are friends
    const friendship = await db.select()
      .from(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.user1_id, userId),
            eq(friendshipsTable.user2_id, viewerId)
          ),
          and(
            eq(friendshipsTable.user1_id, viewerId),
            eq(friendshipsTable.user2_id, userId)
          )
        )
      )
      .execute();

    const areFriends = friendship.length > 0;

    // Build privacy condition based on friendship
    let privacyCondition;
    if (areFriends) {
      // Friends can see both public and friends_only statuses
      privacyCondition = or(
        eq(statusesTable.privacy, 'public'),
        eq(statusesTable.privacy, 'friends_only')
      );
    } else {
      // Non-friends can only see public statuses
      privacyCondition = eq(statusesTable.privacy, 'public');
    }

    // Query statuses with privacy filter
    const results = await db.select()
      .from(statusesTable)
      .where(
        and(
          eq(statusesTable.user_id, userId),
          gt(statusesTable.expires_at, new Date()),
          privacyCondition
        )
      )
      .orderBy(desc(statusesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Get user statuses failed:', error);
    throw error;
  }
};
