
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { statusesTable, usersTable } from '../db/schema';
import { type CreateStatusInput } from '../schema';
import { createStatus } from '../handlers/create_status';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  id: 'ting-test-user',
  google_id: 'google-123',
  name: 'Test User',
  emoji: '😊',
  profile_picture_url: null
};

// Test input for text status
const testTextInput: CreateStatusInput = {
  user_id: 'ting-test-user',
  content: 'This is my status update!',
  media_url: null,
  media_type: 'text',
  privacy: 'friends_only'
};

// Test input for image status
const testImageInput: CreateStatusInput = {
  user_id: 'ting-test-user',
  content: null,
  media_url: 'https://example.com/image.jpg',
  media_type: 'image',
  privacy: 'public'
};

describe('createStatus', () => {
  beforeEach(async () => {
    await createDB();
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();
  });
  
  afterEach(resetDB);

  it('should create a text status', async () => {
    const result = await createStatus(testTextInput);

    // Basic field validation
    expect(result.user_id).toEqual('ting-test-user');
    expect(result.content).toEqual('This is my status update!');
    expect(result.media_url).toBeNull();
    expect(result.media_type).toEqual('text');
    expect(result.privacy).toEqual('friends_only');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.expires_at).toBeInstanceOf(Date);

    // Verify expiration is set to 24 hours from now (with some tolerance)
    const now = new Date();
    const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(result.expires_at.getTime() - expectedExpiry.getTime());
    expect(timeDiff).toBeLessThan(5000); // Allow 5 second tolerance
  });

  it('should create an image status', async () => {
    const result = await createStatus(testImageInput);

    expect(result.user_id).toEqual('ting-test-user');
    expect(result.content).toBeNull();
    expect(result.media_url).toEqual('https://example.com/image.jpg');
    expect(result.media_type).toEqual('image');
    expect(result.privacy).toEqual('public');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.expires_at).toBeInstanceOf(Date);
  });

  it('should save status to database', async () => {
    const result = await createStatus(testTextInput);

    // Query database to verify the status was saved
    const statuses = await db.select()
      .from(statusesTable)
      .where(eq(statusesTable.id, result.id))
      .execute();

    expect(statuses).toHaveLength(1);
    expect(statuses[0].user_id).toEqual('ting-test-user');
    expect(statuses[0].content).toEqual('This is my status update!');
    expect(statuses[0].media_type).toEqual('text');
    expect(statuses[0].privacy).toEqual('friends_only');
    expect(statuses[0].created_at).toBeInstanceOf(Date);
    expect(statuses[0].expires_at).toBeInstanceOf(Date);
  });

  it('should create video status with proper expiration', async () => {
    const videoInput: CreateStatusInput = {
      user_id: 'ting-test-user',
      content: 'Check out this video!',
      media_url: 'https://example.com/video.mp4',
      media_type: 'video',
      privacy: 'public'
    };

    const result = await createStatus(videoInput);

    expect(result.media_type).toEqual('video');
    expect(result.media_url).toEqual('https://example.com/video.mp4');
    expect(result.content).toEqual('Check out this video!');

    // Verify 24-hour expiration
    const hoursUntilExpiry = (result.expires_at.getTime() - result.created_at.getTime()) / (1000 * 60 * 60);
    expect(hoursUntilExpiry).toBeCloseTo(24, 0);
  });
});
