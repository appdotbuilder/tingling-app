
import { db } from '../db';
import { callLogsTable } from '../db/schema';
import { type CallLog } from '../schema';
import { eq, or, desc } from 'drizzle-orm';

export const getCallLogs = async (userId: string): Promise<CallLog[]> => {
  try {
    const results = await db.select()
      .from(callLogsTable)
      .where(
        or(
          eq(callLogsTable.caller_id, userId),
          eq(callLogsTable.receiver_id, userId)
        )
      )
      .orderBy(desc(callLogsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch call logs:', error);
    throw error;
  }
};
