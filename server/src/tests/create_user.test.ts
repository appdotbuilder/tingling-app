
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  google_id: '123456789',
  name: 'John Doe',
  emoji: '😊',
  profile_picture_url: 'https://example.com/profile.jpg'
};

const testInputWithNullPicture: CreateUserInput = {
  google_id: '987654321',
  name: 'Jane Smith',
  emoji: '🎉',
  profile_picture_url: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with profile picture', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.google_id).toEqual('123456789');
    expect(result.name).toEqual('John Doe');
    expect(result.emoji).toEqual('😊');
    expect(result.profile_picture_url).toEqual('https://example.com/profile.jpg');
    expect(result.call_status).toEqual('offline');
    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^ting-\d{4}$/); // Should match ting-xxxx format
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with null profile picture', async () => {
    const result = await createUser(testInputWithNullPicture);

    expect(result.google_id).toEqual('987654321');
    expect(result.name).toEqual('Jane Smith');
    expect(result.emoji).toEqual('🎉');
    expect(result.profile_picture_url).toBeNull();
    expect(result.call_status).toEqual('offline');
    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^ting-\d{4}$/);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].google_id).toEqual('123456789');
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].emoji).toEqual('😊');
    expect(users[0].profile_picture_url).toEqual('https://example.com/profile.jpg');
    expect(users[0].call_status).toEqual('offline');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique ting-xxxx IDs', async () => {
    const result1 = await createUser(testInput);
    const result2 = await createUser({
      ...testInput,
      google_id: '999888777'
    });

    expect(result1.id).toMatch(/^ting-\d{4}$/);
    expect(result2.id).toMatch(/^ting-\d{4}$/);
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should handle database constraints', async () => {
    await createUser(testInput);

    // Attempt to create user with same google_id should fail
    await expect(createUser(testInput)).rejects.toThrow(/unique/i);
  });
});
