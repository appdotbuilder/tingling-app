
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { callLogsTable, usersTable } from '../db/schema';
import { type LogCallInput } from '../schema';
import { logCall } from '../handlers/log_call';
import { eq } from 'drizzle-orm';

// Test users data
const testCaller = {
  id: 'ting-caller',
  google_id: 'google_caller_123',
  name: 'Test Caller',
  emoji: '😊',
  profile_picture_url: null
};

const testReceiver = {
  id: 'ting-receiver',
  google_id: 'google_receiver_456',
  name: 'Test Receiver',
  emoji: '😎',
  profile_picture_url: null
};

// Test input for completed call
const testInput: LogCallInput = {
  caller_id: 'ting-caller',
  receiver_id: 'ting-receiver',
  call_type: 'video',
  status: 'completed',
  duration: 120
};

describe('logCall', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test users
    await db.insert(usersTable).values([testCaller, testReceiver]).execute();
  });

  afterEach(resetDB);

  it('should log a completed call', async () => {
    const result = await logCall(testInput);

    // Basic field validation
    expect(result.caller_id).toEqual('ting-caller');
    expect(result.receiver_id).toEqual('ting-receiver');
    expect(result.call_type).toEqual('video');
    expect(result.status).toEqual('completed');
    expect(result.duration).toEqual(120);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save call log to database', async () => {
    const result = await logCall(testInput);

    // Query using proper drizzle syntax
    const callLogs = await db.select()
      .from(callLogsTable)
      .where(eq(callLogsTable.id, result.id))
      .execute();

    expect(callLogs).toHaveLength(1);
    expect(callLogs[0].caller_id).toEqual('ting-caller');
    expect(callLogs[0].receiver_id).toEqual('ting-receiver');
    expect(callLogs[0].call_type).toEqual('video');
    expect(callLogs[0].status).toEqual('completed');
    expect(callLogs[0].duration).toEqual(120);
    expect(callLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should log a missed call with null duration', async () => {
    const missedCallInput: LogCallInput = {
      caller_id: 'ting-caller',
      receiver_id: 'ting-receiver',
      call_type: 'audio',
      status: 'missed',
      duration: null
    };

    const result = await logCall(missedCallInput);

    expect(result.caller_id).toEqual('ting-caller');
    expect(result.receiver_id).toEqual('ting-receiver');
    expect(result.call_type).toEqual('audio');
    expect(result.status).toEqual('missed');
    expect(result.duration).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should log a rejected call', async () => {
    const rejectedCallInput: LogCallInput = {
      caller_id: 'ting-caller',
      receiver_id: 'ting-receiver',
      call_type: 'video',
      status: 'rejected',
      duration: null
    };

    const result = await logCall(rejectedCallInput);

    expect(result.status).toEqual('rejected');
    expect(result.duration).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle different call types', async () => {
    const audioCallInput: LogCallInput = {
      caller_id: 'ting-caller',
      receiver_id: 'ting-receiver',
      call_type: 'audio',
      status: 'completed',
      duration: 300
    };

    const result = await logCall(audioCallInput);

    expect(result.call_type).toEqual('audio');
    expect(result.duration).toEqual(300);
  });
});
