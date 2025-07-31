
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { searchUsers } from '../handlers/search_users';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    google_id: 'google123',
    name: 'John Doe',
    emoji: '😀',
    profile_picture_url: 'https://example.com/john.jpg'
  },
  {
    google_id: 'google456',
    name: 'Jane Smith',
    emoji: '😊',
    profile_picture_url: null
  },
  {
    google_id: 'google789',
    name: 'Bob Johnson',
    emoji: '🤔',
    profile_picture_url: 'https://example.com/bob.jpg'
  }
];

describe('searchUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search users by exact ID match', async () => {
    // Create test users
    const createdUsers = await db.insert(usersTable)
      .values([
        { ...testUsers[0], id: 'ting-1234' },
        { ...testUsers[1], id: 'ting-5678' },
        { ...testUsers[2], id: 'ting-9999' }
      ])
      .returning()
      .execute();

    const results = await searchUsers('ting-1234');

    expect(results).toHaveLength(1);
    expect(results[0].id).toEqual('ting-1234');
    expect(results[0].name).toEqual('John Doe');
    expect(results[0].google_id).toEqual('google123');
  });

  it('should search users by partial name match (case-insensitive)', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        { ...testUsers[0], id: 'ting-1234' },
        { ...testUsers[1], id: 'ting-5678' },
        { ...testUsers[2], id: 'ting-9999' }
      ])
      .execute();

    const results = await searchUsers('john');

    expect(results).toHaveLength(2); // "John Doe" and "Bob Johnson"
    expect(results.map(u => u.name)).toEqual(expect.arrayContaining(['John Doe', 'Bob Johnson']));
  });

  it('should return empty array when no matches found', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        { ...testUsers[0], id: 'ting-1234' },
        { ...testUsers[1], id: 'ting-5678' }
      ])
      .execute();

    const results = await searchUsers('nonexistent');

    expect(results).toHaveLength(0);
  });

  it('should search case-insensitively', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({ ...testUsers[0], id: 'ting-1234' })
      .execute();

    const results = await searchUsers('JOHN');

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('John Doe');
  });

  it('should return all user fields correctly', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({ ...testUsers[0], id: 'ting-1234' })
      .execute();

    const results = await searchUsers('John');

    expect(results).toHaveLength(1);
    const user = results[0];
    expect(user.id).toEqual('ting-1234');
    expect(user.google_id).toEqual('google123');
    expect(user.name).toEqual('John Doe');
    expect(user.emoji).toEqual('😀');
    expect(user.profile_picture_url).toEqual('https://example.com/john.jpg');
    expect(user.call_status).toEqual('offline');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty query string', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        { ...testUsers[0], id: 'ting-1234' },
        { ...testUsers[1], id: 'ting-5678' }
      ])
      .execute();

    const results = await searchUsers('');

    expect(results).toHaveLength(0);
  });

  it('should handle whitespace-only query string', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        { ...testUsers[0], id: 'ting-1234' },
        { ...testUsers[1], id: 'ting-5678' }
      ])
      .execute();

    const results = await searchUsers('   ');

    expect(results).toHaveLength(0);
  });
});
