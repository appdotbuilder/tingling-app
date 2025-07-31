
import { db } from '../db';
import { callLogsTable } from '../db/schema';
import { type LogCallInput, type CallLog } from '../schema';

export const logCall = async (input: LogCallInput): Promise<CallLog> => {
  try {
    // Insert call log record
    const result = await db.insert(callLogsTable)
      .values({
        caller_id: input.caller_id,
        receiver_id: input.receiver_id,
        call_type: input.call_type,
        status: input.status,
        duration: input.duration // Integer column - no conversion needed
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Call logging failed:', error);
    throw error;
  }
};
