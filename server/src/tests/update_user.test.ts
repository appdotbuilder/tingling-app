
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test user before each test
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        id: 'ting-test123',
        google_id: 'google-123',
        name: 'Test User',
        emoji: '😊',
        profile_picture_url: 'https://example.com/pic.jpg',
        call_status: 'offline'
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should update user name', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: 'ting-test123',
      name: 'Updated Name'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual('ting-test123');
    expect(result.name).toEqual('Updated Name');
    expect(result.emoji).toEqual('😊'); // Should remain unchanged
    expect(result.profile_picture_url).toEqual('https://example.com/pic.jpg');
    expect(result.call_status).toEqual('offline');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user emoji', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: 'ting-test123',
      emoji: '🚀'
    };

    const result = await updateUser(input);

    expect(result.emoji).toEqual('🚀');
    expect(result.name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update profile picture URL', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: 'ting-test123',
      profile_picture_url: 'https://example.com/new-pic.jpg'
    };

    const result = await updateUser(input);

    expect(result.profile_picture_url).toEqual('https://example.com/new-pic.jpg');
    expect(result.name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update call status', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: 'ting-test123',
      call_status: 'online'
    };

    const result = await updateUser(input);

    expect(result.call_status).toEqual('online');
    expect(result.name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: 'ting-test123',
      name: 'Multi Update',
      emoji: '🎉',
      call_status: 'in_call'
    };

    const result = await updateUser(input);

    expect(result.name).toEqual('Multi Update');
    expect(result.emoji).toEqual('🎉');
    expect(result.call_status).toEqual('in_call');
    expect(result.profile_picture_url).toEqual('https://example.com/pic.jpg'); // Should remain unchanged
  });

  it('should set profile picture URL to null', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: 'ting-test123',
      profile_picture_url: null
    };

    const result = await updateUser(input);

    expect(result.profile_picture_url).toBeNull();
    expect(result.name).toEqual('Test User'); // Should remain unchanged
  });

  it('should save changes to database', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: 'ting-test123',
      name: 'Database Test',
      emoji: '💾'
    };

    await updateUser(input);

    // Verify changes were persisted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 'ting-test123'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Database Test');
    expect(users[0].emoji).toEqual('💾');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const input: UpdateUserInput = {
      id: 'ting-nonexistent',
      name: 'Should Fail'
    };

    expect(updateUser(input)).rejects.toThrow(/user.*not found/i);
  });

  it('should update timestamp when making changes', async () => {
    const originalUser = await createTestUser();
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateUserInput = {
      id: 'ting-test123',
      name: 'Timestamp Test'
    };

    const result = await updateUser(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUser.updated_at.getTime());
  });
});
