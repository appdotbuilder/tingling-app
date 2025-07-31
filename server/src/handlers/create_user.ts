
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

// Generate unique ting-xxxx ID
const generateTingId = (): string => {
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ting-${randomNum}`;
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Generate unique ID (in production, you'd want to ensure uniqueness)
    const id = generateTingId();
    
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        id,
        google_id: input.google_id,
        name: input.name,
        emoji: input.emoji,
        profile_picture_url: input.profile_picture_url,
        call_status: 'offline' // Default status
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
