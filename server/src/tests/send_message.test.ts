
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, messagesTable, chatParticipantsTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq, and } from 'drizzle-orm';

const testInput: SendMessageInput = {
  chat_id: 1,
  sender_id: 'ting-user1',
  content: 'Hello, this is a test message!',
  message_type: 'text'
};

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send a message', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-123',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-456',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Create test chat
    await db.insert(chatsTable).values({
      id: 1,
      user1_id: 'ting-user1',
      user2_id: 'ting-user2'
    }).execute();

    // Create chat participants
    await db.insert(chatParticipantsTable).values([
      {
        chat_id: 1,
        user_id: 'ting-user1',
        unread_count: 0
      },
      {
        chat_id: 1,
        user_id: 'ting-user2',
        unread_count: 0
      }
    ]).execute();

    const result = await sendMessage(testInput);

    // Basic field validation
    expect(result.chat_id).toEqual(1);
    expect(result.sender_id).toEqual('ting-user1');
    expect(result.content).toEqual('Hello, this is a test message!');
    expect(result.message_type).toEqual('text');
    expect(result.is_deleted).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-123',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-456',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Create test chat
    await db.insert(chatsTable).values({
      id: 1,
      user1_id: 'ting-user1',
      user2_id: 'ting-user2'
    }).execute();

    // Create chat participants
    await db.insert(chatParticipantsTable).values([
      {
        chat_id: 1,
        user_id: 'ting-user1',
        unread_count: 0
      },
      {
        chat_id: 1,
        user_id: 'ting-user2',
        unread_count: 0
      }
    ]).execute();

    const result = await sendMessage(testInput);

    // Verify message exists in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toEqual('Hello, this is a test message!');
    expect(messages[0].sender_id).toEqual('ting-user1');
    expect(messages[0].chat_id).toEqual(1);
    expect(messages[0].message_type).toEqual('text');
    expect(messages[0].is_deleted).toEqual(false);
  });

  it('should update chat last_message_id', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-123',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-456',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Create test chat
    await db.insert(chatsTable).values({
      id: 1,
      user1_id: 'ting-user1',
      user2_id: 'ting-user2',
      last_message_id: null
    }).execute();

    // Create chat participants
    await db.insert(chatParticipantsTable).values([
      {
        chat_id: 1,
        user_id: 'ting-user1',
        unread_count: 0
      },
      {
        chat_id: 1,
        user_id: 'ting-user2',
        unread_count: 0
      }
    ]).execute();

    const result = await sendMessage(testInput);

    // Verify chat's last_message_id was updated
    const chats = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.id, 1))
      .execute();

    expect(chats).toHaveLength(1);
    expect(chats[0].last_message_id).toEqual(result.id);
    expect(chats[0].updated_at).toBeInstanceOf(Date);
  });

  it('should increment unread count for receiver', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-123',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-456',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Create test chat
    await db.insert(chatsTable).values({
      id: 1,
      user1_id: 'ting-user1',
      user2_id: 'ting-user2'
    }).execute();

    // Create chat participants with initial unread counts
    await db.insert(chatParticipantsTable).values([
      {
        chat_id: 1,
        user_id: 'ting-user1',
        unread_count: 2
      },
      {
        chat_id: 1,
        user_id: 'ting-user2',
        unread_count: 5
      }
    ]).execute();

    await sendMessage(testInput);

    // Verify unread counts - sender should remain the same, receiver should increment
    const participants = await db.select()
      .from(chatParticipantsTable)
      .where(eq(chatParticipantsTable.chat_id, 1))
      .execute();

    expect(participants).toHaveLength(2);
    
    const senderParticipant = participants.find(p => p.user_id === 'ting-user1');
    const receiverParticipant = participants.find(p => p.user_id === 'ting-user2');

    expect(senderParticipant?.unread_count).toEqual(2); // Should remain unchanged
    expect(receiverParticipant?.unread_count).toEqual(6); // Should increment from 5 to 6
  });

  it('should handle different message types', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'ting-user1',
        google_id: 'google-123',
        name: 'User One',
        emoji: '😀'
      },
      {
        id: 'ting-user2',
        google_id: 'google-456',
        name: 'User Two',
        emoji: '😊'
      }
    ]).execute();

    // Create test chat
    await db.insert(chatsTable).values({
      id: 1,
      user1_id: 'ting-user1',
      user2_id: 'ting-user2'
    }).execute();

    // Create chat participants
    await db.insert(chatParticipantsTable).values([
      {
        chat_id: 1,
        user_id: 'ting-user1',
        unread_count: 0
      },
      {
        chat_id: 1,
        user_id: 'ting-user2',
        unread_count: 0
      }
    ]).execute();

    const imageMessageInput: SendMessageInput = {
      chat_id: 1,
      sender_id: 'ting-user1',
      content: 'image-url.jpg',
      message_type: 'image'
    };

    const result = await sendMessage(imageMessageInput);

    expect(result.message_type).toEqual('image');
    expect(result.content).toEqual('image-url.jpg');

    // Verify in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages[0].message_type).toEqual('image');
  });
});
