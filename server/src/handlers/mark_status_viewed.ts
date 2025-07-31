
import { db } from '../db';
import { statusViewsTable, statusesTable } from '../db/schema';
import { type StatusView } from '../schema';
import { eq, and } from 'drizzle-orm';

export const markStatusViewed = async (statusId: number, viewerId: string): Promise<StatusView> => {
  try {
    // Check if status exists
    const existingStatus = await db.select()
      .from(statusesTable)
      .where(eq(statusesTable.id, statusId))
      .execute();

    if (existingStatus.length === 0) {
      throw new Error('Status not found');
    }

    // Check if already viewed by this user
    const existingView = await db.select()
      .from(statusViewsTable)
      .where(
        and(
          eq(statusViewsTable.status_id, statusId),
          eq(statusViewsTable.viewer_id, viewerId)
        )
      )
      .execute();

    if (existingView.length > 0) {
      // Return existing view record if already viewed
      return existingView[0];
    }

    // Create new status view record
    const result = await db.insert(statusViewsTable)
      .values({
        status_id: statusId,
        viewer_id: viewerId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Mark status viewed operation failed:', error);
    throw error;
  }
};
