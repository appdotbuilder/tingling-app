
import { db } from '../db';
import { statusesTable } from '../db/schema';
import { type CreateStatusInput, type Status } from '../schema';

export const createStatus = async (input: CreateStatusInput): Promise<Status> => {
  try {
    // Set expiration time to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert status record
    const result = await db.insert(statusesTable)
      .values({
        user_id: input.user_id,
        content: input.content,
        media_url: input.media_url,
        media_type: input.media_type,
        privacy: input.privacy,
        expires_at: expiresAt
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Status creation failed:', error);
    throw error;
  }
};
