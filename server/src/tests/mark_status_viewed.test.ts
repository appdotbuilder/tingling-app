
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, statusesTable, statusViewsTable } from '../db/schema';
import { markStatusViewed } from '../handlers/mark_status_viewed';
import { eq, and } from 'drizzle-orm';

describe('markStatusViewed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new status view record', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        id: 'ting-1234',
        google_id: 'google123',
        name: 'Test User',
        emoji: '😊'
      })
      .returning()
      .execute();

    // Create test status with expires_at
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    const status = await db.insert(statusesTable)
      .values({
        user_id: user[0].id,
        content: 'Test status',
        media_type: 'text',
        privacy: 'public',
        expires_at: expiresAt
      })
      .returning()
      .execute();

    // Create viewer
    const viewer = await db.insert(usersTable)
      .values({
        id: 'ting-5678',
        google_id: 'google456',
        name: 'Viewer User',
        emoji: '👀'
      })
      .returning()
      .execute();

    // Mark status as viewed
    const result = await markStatusViewed(status[0].id, viewer[0].id);

    // Verify response
    expect(result.status_id).toEqual(status[0].id);
    expect(result.viewer_id).toEqual(viewer[0].id);
    expect(result.id).toBeDefined();
    expect(result.viewed_at).toBeInstanceOf(Date);
  });

  it('should save status view to database', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        id: 'ting-1234',
        google_id: 'google123',
        name: 'Test User',
        emoji: '😊'
      })
      .returning()
      .execute();

    // Create test status
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await db.insert(statusesTable)
      .values({
        user_id: user[0].id,
        content: 'Test status',
        media_type: 'text',
        privacy: 'public',
        expires_at: expiresAt
      })
      .returning()
      .execute();

    // Create viewer
    const viewer = await db.insert(usersTable)
      .values({
        id: 'ting-5678',
        google_id: 'google456',
        name: 'Viewer User',
        emoji: '👀'
      })
      .returning()
      .execute();

    // Mark status as viewed
    const result = await markStatusViewed(status[0].id, viewer[0].id);

    // Query database to verify record was created
    const statusViews = await db.select()
      .from(statusViewsTable)
      .where(eq(statusViewsTable.id, result.id))
      .execute();

    expect(statusViews).toHaveLength(1);
    expect(statusViews[0].status_id).toEqual(status[0].id);
    expect(statusViews[0].viewer_id).toEqual(viewer[0].id);
    expect(statusViews[0].viewed_at).toBeInstanceOf(Date);
  });

  it('should return existing view if already viewed', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        id: 'ting-1234',
        google_id: 'google123',
        name: 'Test User',
        emoji: '😊'
      })
      .returning()
      .execute();

    // Create test status
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await db.insert(statusesTable)
      .values({
        user_id: user[0].id,
        content: 'Test status',
        media_type: 'text',
        privacy: 'public',
        expires_at: expiresAt
      })
      .returning()
      .execute();

    // Create viewer
    const viewer = await db.insert(usersTable)
      .values({
        id: 'ting-5678',
        google_id: 'google456',
        name: 'Viewer User',
        emoji: '👀'
      })
      .returning()
      .execute();

    // Mark status as viewed first time
    const firstResult = await markStatusViewed(status[0].id, viewer[0].id);

    // Mark status as viewed second time
    const secondResult = await markStatusViewed(status[0].id, viewer[0].id);

    // Should return the same record
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.status_id).toEqual(firstResult.status_id);
    expect(secondResult.viewer_id).toEqual(firstResult.viewer_id);
    expect(secondResult.viewed_at).toEqual(firstResult.viewed_at);

    // Verify only one record exists in database
    const allViews = await db.select()
      .from(statusViewsTable)
      .where(
        and(
          eq(statusViewsTable.status_id, status[0].id),
          eq(statusViewsTable.viewer_id, viewer[0].id)
        )
      )
      .execute();

    expect(allViews).toHaveLength(1);
  });

  it('should throw error if status does not exist', async () => {
    // Create viewer
    const viewer = await db.insert(usersTable)
      .values({
        id: 'ting-5678',
        google_id: 'google456',
        name: 'Viewer User',
        emoji: '👀'
      })
      .returning()
      .execute();

    // Try to mark non-existent status as viewed
    await expect(markStatusViewed(999, viewer[0].id))
      .rejects.toThrow(/status not found/i);
  });

  it('should throw error if viewer does not exist', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        id: 'ting-1234',
        google_id: 'google123',
        name: 'Test User',
        emoji: '😊'
      })
      .returning()
      .execute();

    // Create test status
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await db.insert(statusesTable)
      .values({
        user_id: user[0].id,
        content: 'Test status',
        media_type: 'text',
        privacy: 'public',
        expires_at: expiresAt
      })
      .returning()
      .execute();

    // Try to mark status as viewed with non-existent viewer
    await expect(markStatusViewed(status[0].id, 'ting-nonexistent'))
      .rejects.toThrow(/foreign key/i);
  });
});
