
import { db } from '../db';
import { blockedUsersTable, friendshipsTable } from '../db/schema';
import { type BlockUserInput, type BlockedUser } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export const blockUser = async (input: BlockUserInput): Promise<BlockedUser> => {
  try {
    // First, remove any existing friendship between the users
    await db.delete(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.user1_id, input.blocker_id),
            eq(friendshipsTable.user2_id, input.blocked_id)
          ),
          and(
            eq(friendshipsTable.user1_id, input.blocked_id),
            eq(friendshipsTable.user2_id, input.blocker_id)
          )
        )
      )
      .execute();

    // Add the user to the blocked list
    const result = await db.insert(blockedUsersTable)
      .values({
        blocker_id: input.blocker_id,
        blocked_id: input.blocked_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Block user failed:', error);
    throw error;
  }
};
