
import { db } from '../db';
import { blockedUsersTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const unblockUser = async (blockerId: string, blockedId: string): Promise<boolean> => {
  try {
    // Remove the block record from database
    const result = await db.delete(blockedUsersTable)
      .where(
        and(
          eq(blockedUsersTable.blocker_id, blockerId),
          eq(blockedUsersTable.blocked_id, blockedId)
        )
      )
      .execute();

    // Return true if a record was deleted, false if no record existed
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('User unblock failed:', error);
    throw error;
  }
};
