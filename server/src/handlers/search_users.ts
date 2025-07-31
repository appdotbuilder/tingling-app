
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { or, ilike } from 'drizzle-orm';

export const searchUsers = async (query: string): Promise<User[]> => {
  try {
    // Return empty array for empty queries
    if (!query || query.trim() === '') {
      return [];
    }

    // Search for users by ID (exact match) or name (case-insensitive partial match)
    const results = await db.select()
      .from(usersTable)
      .where(
        or(
          ilike(usersTable.id, query), // Exact match for ting-xxxx format
          ilike(usersTable.name, `%${query}%`) // Partial match for name
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('User search failed:', error);
    throw error;
  }
};
