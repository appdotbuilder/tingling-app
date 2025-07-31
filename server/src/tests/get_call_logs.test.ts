
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, callLogsTable } from '../db/schema';
import { getCallLogs } from '../handlers/get_call_logs';

describe('getCallLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no call logs', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      id: 'ting-user1',
      google_id: 'google-123',
      name: 'Test User',
      emoji: '😀'
    }).execute();

    const result = await getCallLogs('ting-user1');

    expect(result).toEqual([]);
  });

  it('should return call logs where user is caller', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-caller',
        google_id: 'google-caller',
        name: 'Caller User',
        emoji: '📞'
      },
      {
        id: 'ting-receiver',
        google_id: 'google-receiver',
        name: 'Receiver User',
        emoji: '📱'
      }
    ]).execute();

    // Create call log
    await db.insert(callLogsTable).values({
      caller_id: 'ting-caller',
      receiver_id: 'ting-receiver',
      call_type: 'audio',
      status: 'completed',
      duration: 120
    }).execute();

    const result = await getCallLogs('ting-caller');

    expect(result).toHaveLength(1);
    expect(result[0].caller_id).toBe('ting-caller');
    expect(result[0].receiver_id).toBe('ting-receiver');
    expect(result[0].call_type).toBe('audio');
    expect(result[0].status).toBe('completed');
    expect(result[0].duration).toBe(120);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return call logs where user is receiver', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-caller',
        google_id: 'google-caller',
        name: 'Caller User',
        emoji: '📞'
      },
      {
        id: 'ting-receiver',
        google_id: 'google-receiver',
        name: 'Receiver User',
        emoji: '📱'
      }
    ]).execute();

    // Create call log
    await db.insert(callLogsTable).values({
      caller_id: 'ting-caller',
      receiver_id: 'ting-receiver',
      call_type: 'video',
      status: 'missed',
      duration: null
    }).execute();

    const result = await getCallLogs('ting-receiver');

    expect(result).toHaveLength(1);
    expect(result[0].caller_id).toBe('ting-caller');
    expect(result[0].receiver_id).toBe('ting-receiver');
    expect(result[0].call_type).toBe('video');
    expect(result[0].status).toBe('missed');
    expect(result[0].duration).toBe(null);
  });

  it('should return call logs ordered by date descending', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-user1',
        name: 'User 1',
        emoji: '👤'
      },
      {
        id: 'ting-user2',
        google_id: 'google-user2',
        name: 'User 2',
        emoji: '👥'
      }
    ]).execute();

    // Create multiple call logs with slight delay to ensure different timestamps
    await db.insert(callLogsTable).values({
      caller_id: 'ting-user1',
      receiver_id: 'ting-user2',
      call_type: 'audio',
      status: 'completed',
      duration: 60
    }).execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(callLogsTable).values({
      caller_id: 'ting-user2',
      receiver_id: 'ting-user1',
      call_type: 'video',
      status: 'rejected',
      duration: null
    }).execute();

    const result = await getCallLogs('ting-user1');

    expect(result).toHaveLength(2);
    // Should be ordered by created_at desc (newest first)
    expect(result[0].call_type).toBe('video');
    expect(result[1].call_type).toBe('audio');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should return all call logs for user as both caller and receiver', async () => {
    // Create users
    await db.insert(usersTable).values([
      {
        id: 'ting-mainuser',
        google_id: 'google-main',
        name: 'Main User',
        emoji: '🎯'
      },
      {
        id: 'ting-other1',
        google_id: 'google-other1',
        name: 'Other User 1',
        emoji: '👤'
      },
      {
        id: 'ting-other2',
        google_id: 'google-other2',
        name: 'Other User 2',
        emoji: '👥'
      }
    ]).execute();

    // Create call logs where main user is caller
    await db.insert(callLogsTable).values({
      caller_id: 'ting-mainuser',
      receiver_id: 'ting-other1',
      call_type: 'audio',
      status: 'completed',
      duration: 45
    }).execute();

    // Create call log where main user is receiver
    await db.insert(callLogsTable).values({
      caller_id: 'ting-other2',
      receiver_id: 'ting-mainuser',
      call_type: 'video',
      status: 'missed',
      duration: null
    }).execute();

    // Create call log that doesn't involve main user (should not be returned)
    await db.insert(callLogsTable).values({
      caller_id: 'ting-other1',
      receiver_id: 'ting-other2',
      call_type: 'audio',
      status: 'rejected',
      duration: null
    }).execute();

    const result = await getCallLogs('ting-mainuser');

    expect(result).toHaveLength(2);
    
    // Check that all results involve the main user
    result.forEach(log => {
      expect(
        log.caller_id === 'ting-mainuser' || log.receiver_id === 'ting-mainuser'
      ).toBe(true);
    });
  });
});
