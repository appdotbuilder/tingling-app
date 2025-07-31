
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable, blockedUsersTable } from '../db/schema';
import { type BlockUserInput } from '../schema';
import { blockUser } from '../handlers/block_user';
import { eq, or, and } from 'drizzle-orm';

// Test users
const testUser1 = {
  id: 'ting-user1',
  google_id: 'google-user1',
  name: 'Test User 1',
  emoji: '😀'
};

const testUser2 = {
  id: 'ting-user2',
  google_id: 'google-user2',
  name: 'Test User 2',
  emoji: '😊'
};

const testInput: BlockUserInput = {
  blocker_id: 'ting-user1',
  blocked_id: 'ting-user2'
};

describe('blockUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should block a user', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    const result = await blockUser(testInput);

    // Validate returned blocked user record
    expect(result.blocker_id).toEqual('ting-user1');
    expect(result.blocked_id).toEqual('ting-user2');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save blocked user to database', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    const result = await blockUser(testInput);

    // Verify blocked user record exists in database
    const blockedUsers = await db.select()
      .from(blockedUsersTable)
      .where(eq(blockedUsersTable.id, result.id))
      .execute();

    expect(blockedUsers).toHaveLength(1);
    expect(blockedUsers[0].blocker_id).toEqual('ting-user1');
    expect(blockedUsers[0].blocked_id).toEqual('ting-user2');
    expect(blockedUsers[0].created_at).toBeInstanceOf(Date);
  });

  it('should remove existing friendship when blocking', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    // Create existing friendship
    await db.insert(friendshipsTable).values({
      user1_id: 'ting-user1',
      user2_id: 'ting-user2'
    }).execute();

    // Verify friendship exists before blocking
    const friendshipsBefore = await db.select()
      .from(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.user1_id, 'ting-user1'),
            eq(friendshipsTable.user2_id, 'ting-user2')
          ),
          and(
            eq(friendshipsTable.user1_id, 'ting-user2'),
            eq(friendshipsTable.user2_id, 'ting-user1')
          )
        )
      )
      .execute();

    expect(friendshipsBefore).toHaveLength(1);

    // Block the user
    await blockUser(testInput);

    // Verify friendship is removed
    const friendshipsAfter = await db.select()
      .from(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.user1_id, 'ting-user1'),
            eq(friendshipsTable.user2_id, 'ting-user2')
          ),
          and(
            eq(friendshipsTable.user1_id, 'ting-user2'),
            eq(friendshipsTable.user2_id, 'ting-user1')
          )
        )
      )
      .execute();

    expect(friendshipsAfter).toHaveLength(0);
  });

  it('should remove friendship regardless of user order', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    // Create friendship with users in reverse order
    await db.insert(friendshipsTable).values({
      user1_id: 'ting-user2',
      user2_id: 'ting-user1'
    }).execute();

    // Block the user
    await blockUser(testInput);

    // Verify friendship is removed
    const friendships = await db.select()
      .from(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.user1_id, 'ting-user1'),
            eq(friendshipsTable.user2_id, 'ting-user2')
          ),
          and(
            eq(friendshipsTable.user1_id, 'ting-user2'),
            eq(friendshipsTable.user2_id, 'ting-user1')
          )
        )
      )
      .execute();

    expect(friendships).toHaveLength(0);
  });

  it('should work when no friendship exists', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    // Block without existing friendship
    const result = await blockUser(testInput);

    // Verify blocking succeeded
    expect(result.blocker_id).toEqual('ting-user1');
    expect(result.blocked_id).toEqual('ting-user2');

    // Verify blocked user record exists
    const blockedUsers = await db.select()
      .from(blockedUsersTable)
      .where(eq(blockedUsersTable.id, result.id))
      .execute();

    expect(blockedUsers).toHaveLength(1);
  });

  it('should throw error when blocker user does not exist', async () => {
    // Create only the blocked user
    await db.insert(usersTable).values([testUser2]).execute();

    await expect(blockUser(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error when blocked user does not exist', async () => {
    // Create only the blocker user
    await db.insert(usersTable).values([testUser1]).execute();

    await expect(blockUser(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
