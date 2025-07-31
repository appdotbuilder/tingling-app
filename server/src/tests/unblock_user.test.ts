
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, blockedUsersTable } from '../db/schema';
import { unblockUser } from '../handlers/unblock_user';
import { eq, and } from 'drizzle-orm';

describe('unblockUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should unblock a user successfully', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google1',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google2',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Create block record
    await db.insert(blockedUsersTable).values({
      blocker_id: 'ting-user1',
      blocked_id: 'ting-user2'
    }).execute();

    // Unblock the user
    const result = await unblockUser('ting-user1', 'ting-user2');

    expect(result).toBe(true);

    // Verify block record was removed
    const blocks = await db.select()
      .from(blockedUsersTable)
      .where(
        and(
          eq(blockedUsersTable.blocker_id, 'ting-user1'),
          eq(blockedUsersTable.blocked_id, 'ting-user2')
        )
      )
      .execute();

    expect(blocks).toHaveLength(0);
  });

  it('should return false when no block exists', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google1',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google2',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Attempt to unblock when no block exists
    const result = await unblockUser('ting-user1', 'ting-user2');

    expect(result).toBe(false);
  });

  it('should only remove the specific block record', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google1',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google2',
        name: 'User Two',
        emoji: '😊'
      },
      {
        id: 'ting-user3',
        google_id: 'google3',
        name: 'User Three',
        emoji: '😄'
      }
    ]).execute();

    // Create multiple block records
    await db.insert(blockedUsersTable).values([
      {
        blocker_id: 'ting-user1',
        blocked_id: 'ting-user2'
      },
      {
        blocker_id: 'ting-user1',
        blocked_id: 'ting-user3'
      },
      {
        blocker_id: 'ting-user2',
        blocked_id: 'ting-user1'
      }
    ]).execute();

    // Unblock only user2 from user1
    const result = await unblockUser('ting-user1', 'ting-user2');

    expect(result).toBe(true);

    // Verify only the specific block was removed
    const allBlocks = await db.select()
      .from(blockedUsersTable)
      .execute();

    expect(allBlocks).toHaveLength(2);
    
    // Check that the other blocks still exist
    const user1BlocksUser3 = allBlocks.some(block => 
      block.blocker_id === 'ting-user1' && block.blocked_id === 'ting-user3'
    );
    const user2BlocksUser1 = allBlocks.some(block => 
      block.blocker_id === 'ting-user2' && block.blocked_id === 'ting-user1'
    );

    expect(user1BlocksUser3).toBe(true);
    expect(user2BlocksUser1).toBe(true);
  });

  it('should handle non-existent users gracefully', async () => {
    // Attempt to unblock with non-existent users
    const result = await unblockUser('ting-nonexistent1', 'ting-nonexistent2');

    expect(result).toBe(false);
  });
});
