
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, messagesTable } from '../db/schema';
import { type DeleteMessageInput } from '../schema';
import { deleteMessage } from '../handlers/delete_message';
import { eq } from 'drizzle-orm';

describe('deleteMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete a message when user owns it', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        id: 'ting-user1',
        google_id: 'google123',
        name: 'Test User 1',
        emoji: '😀'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        id: 'ting-user2',
        google_id: 'google456',
        name: 'Test User 2',
        emoji: '😁'
      })
      .returning()
      .execute();

    // Create a chat
    const [chat] = await db.insert(chatsTable)
      .values({
        user1_id: user1.id,
        user2_id: user2.id
      })
      .returning()
      .execute();

    // Create a message
    const [message] = await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        sender_id: user1.id,
        content: 'Test message to delete',
        message_type: 'text'
      })
      .returning()
      .execute();

    const input: DeleteMessageInput = {
      message_id: message.id,
      user_id: user1.id
    };

    const result = await deleteMessage(input);

    expect(result).toBe(true);

    // Verify message is soft deleted
    const deletedMessage = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, message.id))
      .execute();

    expect(deletedMessage).toHaveLength(1);
    expect(deletedMessage[0].is_deleted).toBe(true);
    expect(deletedMessage[0].content).toEqual('Test message to delete');
    expect(deletedMessage[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return false when user does not own the message', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        id: 'ting-user1',
        google_id: 'google123',
        name: 'Test User 1',
        emoji: '😀'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        id: 'ting-user2',
        google_id: 'google456',
        name: 'Test User 2',
        emoji: '😁'
      })
      .returning()
      .execute();

    // Create a chat
    const [chat] = await db.insert(chatsTable)
      .values({
        user1_id: user1.id,
        user2_id: user2.id
      })
      .returning()
      .execute();

    // Create a message from user1
    const [message] = await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        sender_id: user1.id,
        content: 'Test message',
        message_type: 'text'
      })
      .returning()
      .execute();

    // Try to delete with user2 (who doesn't own the message)
    const input: DeleteMessageInput = {
      message_id: message.id,
      user_id: user2.id
    };

    const result = await deleteMessage(input);

    expect(result).toBe(false);

    // Verify message is not deleted
    const unchangedMessage = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, message.id))
      .execute();

    expect(unchangedMessage).toHaveLength(1);
    expect(unchangedMessage[0].is_deleted).toBe(false);
  });

  it('should return false when message does not exist', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        id: 'ting-user1',
        google_id: 'google123',
        name: 'Test User',
        emoji: '😀'
      })
      .returning()
      .execute();

    const input: DeleteMessageInput = {
      message_id: 99999, // Non-existent message ID
      user_id: user.id
    };

    const result = await deleteMessage(input);

    expect(result).toBe(false);
  });

  it('should handle already deleted messages correctly', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        id: 'ting-user1',
        google_id: 'google123',
        name: 'Test User 1',
        emoji: '😀'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        id: 'ting-user2',
        google_id: 'google456',
        name: 'Test User 2',
        emoji: '😁'
      })
      .returning()
      .execute();

    // Create a chat
    const [chat] = await db.insert(chatsTable)
      .values({
        user1_id: user1.id,
        user2_id: user2.id
      })
      .returning()
      .execute();

    // Create a message that is already deleted
    const [message] = await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        sender_id: user1.id,
        content: 'Already deleted message',
        message_type: 'text',
        is_deleted: true
      })
      .returning()
      .execute();

    const input: DeleteMessageInput = {
      message_id: message.id,
      user_id: user1.id
    };

    const result = await deleteMessage(input);

    expect(result).toBe(true);

    // Verify message remains deleted
    const deletedMessage = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, message.id))
      .execute();

    expect(deletedMessage).toHaveLength(1);
    expect(deletedMessage[0].is_deleted).toBe(true);
  });
});
