
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserById } from '../handlers/get_user_by_id';

const testUser = {
  id: 'ting-1234',
  google_id: 'google-123',
  name: 'Test User',
  emoji: '😀',
  profile_picture_url: 'https://example.com/pic.jpg'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await getUserById('ting-1234');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('ting-1234');
    expect(result!.google_id).toEqual('google-123');
    expect(result!.name).toEqual('Test User');
    expect(result!.emoji).toEqual('😀');
    expect(result!.profile_picture_url).toEqual('https://example.com/pic.jpg');
    expect(result!.call_status).toEqual('offline'); // default value
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUserById('ting-nonexistent');

    expect(result).toBeNull();
  });

  it('should handle empty database', async () => {
    const result = await getUserById('ting-1234');

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    await db.insert(usersTable)
      .values([
        testUser,
        {
          id: 'ting-5678',
          google_id: 'google-456',
          name: 'Another User',
          emoji: '🎉',
          profile_picture_url: null
        }
      ])
      .execute();

    const result = await getUserById('ting-5678');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('ting-5678');
    expect(result!.name).toEqual('Another User');
    expect(result!.emoji).toEqual('🎉');
    expect(result!.profile_picture_url).toBeNull();
  });
});
