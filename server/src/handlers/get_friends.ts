
import { db } from '../db';
import { usersTable, friendshipsTable } from '../db/schema';
import { type User } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export const getFriends = async (userId: string): Promise<User[]> => {
  try {
    // Query friendships where the user is either user1 or user2
    // Join with users table to get friend details
    const results = await db.select({
      id: usersTable.id,
      google_id: usersTable.google_id,
      name: usersTable.name,
      emoji: usersTable.emoji,
      profile_picture_url: usersTable.profile_picture_url,
      call_status: usersTable.call_status,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
      friendship_user1_id: friendshipsTable.user1_id,
      friendship_user2_id: friendshipsTable.user2_id
    })
    .from(friendshipsTable)
    .innerJoin(usersTable, 
      or(
        and(eq(friendshipsTable.user1_id, userId), eq(usersTable.id, friendshipsTable.user2_id)),
        and(eq(friendshipsTable.user2_id, userId), eq(usersTable.id, friendshipsTable.user1_id))
      )
    )
    .execute();

    // Map results to User objects, excluding the friendship fields
    return results.map(result => ({
      id: result.id,
      google_id: result.google_id,
      name: result.name,
      emoji: result.emoji,
      profile_picture_url: result.profile_picture_url,
      call_status: result.call_status,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Get friends failed:', error);
    throw error;
  }
};
