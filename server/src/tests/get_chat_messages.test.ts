
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, messagesTable } from '../db/schema';
import { getChatMessages } from '../handlers/get_chat_messages';

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch messages for a specific chat', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User 1',
          emoji: '😀'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User 2',
          emoji: '😊'
        }
      ])
      .returning()
      .execute();

    // Create test chat
    const chats = await db.insert(chatsTable)
      .values({
        user1_id: 'ting-user1',
        user2_id: 'ting-user2'
      })
      .returning()
      .execute();

    const chatId = chats[0].id;

    // Create test messages
    await db.insert(messagesTable)
      .values([
        {
          chat_id: chatId,
          sender_id: 'ting-user1',
          content: 'First message',
          message_type: 'text'
        },
        {
          chat_id: chatId,
          sender_id: 'ting-user2',
          content: 'Second message',
          message_type: 'text'
        },
        {
          chat_id: chatId,
          sender_id: 'ting-user1',
          content: 'Third message',
          message_type: 'text'
        }
      ])
      .execute();

    const messages = await getChatMessages(chatId);

    expect(messages).toHaveLength(3);
    expect(messages[0].content).toEqual('First message');
    expect(messages[0].sender_id).toEqual('ting-user1');
    expect(messages[0].chat_id).toEqual(chatId);
    expect(messages[0].message_type).toEqual('text');
    expect(messages[0].is_deleted).toEqual(false);
    expect(messages[0].created_at).toBeInstanceOf(Date);
    expect(messages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return messages in chronological order', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User 1',
          emoji: '😀'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User 2',
          emoji: '😊'
        }
      ])
      .execute();

    // Create test chat
    const chats = await db.insert(chatsTable)
      .values({
        user1_id: 'ting-user1',
        user2_id: 'ting-user2'
      })
      .returning()
      .execute();

    const chatId = chats[0].id;

    // Create messages with slight delay to ensure different timestamps
    const message1 = await db.insert(messagesTable)
      .values({
        chat_id: chatId,
        sender_id: 'ting-user1',
        content: 'First message',
        message_type: 'text'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const message2 = await db.insert(messagesTable)
      .values({
        chat_id: chatId,
        sender_id: 'ting-user2',
        content: 'Second message',
        message_type: 'text'
      })
      .returning()
      .execute();

    const messages = await getChatMessages(chatId);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toEqual('First message');
    expect(messages[1].content).toEqual('Second message');
    expect(messages[0].created_at <= messages[1].created_at).toBe(true);
  });

  it('should support pagination with limit and offset', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User 1',
          emoji: '😀'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User 2',
          emoji: '😊'
        }
      ])
      .execute();

    // Create test chat
    const chats = await db.insert(chatsTable)
      .values({
        user1_id: 'ting-user1',
        user2_id: 'ting-user2'
      })
      .returning()
      .execute();

    const chatId = chats[0].id;

    // Create 5 test messages
    await db.insert(messagesTable)
      .values([
        {
          chat_id: chatId,
          sender_id: 'ting-user1',
          content: 'Message 1',
          message_type: 'text'
        },
        {
          chat_id: chatId,
          sender_id: 'ting-user2',
          content: 'Message 2',
          message_type: 'text'
        },
        {
          chat_id: chatId,
          sender_id: 'ting-user1',
          content: 'Message 3',
          message_type: 'text'
        },
        {
          chat_id: chatId,
          sender_id: 'ting-user2',
          content: 'Message 4',
          message_type: 'text'
        },
        {
          chat_id: chatId,
          sender_id: 'ting-user1',
          content: 'Message 5',
          message_type: 'text'
        }
      ])
      .execute();

    // Test with limit only
    const limitedMessages = await getChatMessages(chatId, 3);
    expect(limitedMessages).toHaveLength(3);
    expect(limitedMessages[0].content).toEqual('Message 1');
    expect(limitedMessages[2].content).toEqual('Message 3');

    // Test with offset only
    const offsetMessages = await getChatMessages(chatId, undefined, 2);
    expect(offsetMessages).toHaveLength(3);
    expect(offsetMessages[0].content).toEqual('Message 3');

    // Test with both limit and offset
    const paginatedMessages = await getChatMessages(chatId, 2, 1);
    expect(paginatedMessages).toHaveLength(2);
    expect(paginatedMessages[0].content).toEqual('Message 2');
    expect(paginatedMessages[1].content).toEqual('Message 3');
  });

  it('should return empty array for non-existent chat', async () => {
    const messages = await getChatMessages(999);
    expect(messages).toHaveLength(0);
  });

  it('should only return messages for the specified chat', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'ting-user1',
          google_id: 'google1',
          name: 'User 1',
          emoji: '😀'
        },
        {
          id: 'ting-user2',
          google_id: 'google2',
          name: 'User 2',
          emoji: '😊'
        },
        {
          id: 'ting-user3',
          google_id: 'google3',
          name: 'User 3',
          emoji: '🙂'
        }
      ])
      .execute();

    // Create two test chats
    const chats = await db.insert(chatsTable)
      .values([
        {
          user1_id: 'ting-user1',
          user2_id: 'ting-user2'
        },
        {
          user1_id: 'ting-user1',
          user2_id: 'ting-user3'
        }
      ])
      .returning()
      .execute();

    const chat1Id = chats[0].id;
    const chat2Id = chats[1].id;

    // Create messages in both chats
    await db.insert(messagesTable)
      .values([
        {
          chat_id: chat1Id,
          sender_id: 'ting-user1',
          content: 'Chat 1 message',
          message_type: 'text'
        },
        {
          chat_id: chat2Id,
          sender_id: 'ting-user1',
          content: 'Chat 2 message',
          message_type: 'text'
        }
      ])
      .execute();

    const chat1Messages = await getChatMessages(chat1Id);
    expect(chat1Messages).toHaveLength(1);
    expect(chat1Messages[0].content).toEqual('Chat 1 message');
    expect(chat1Messages[0].chat_id).toEqual(chat1Id);

    const chat2Messages = await getChatMessages(chat2Id);
    expect(chat2Messages).toHaveLength(1);
    expect(chat2Messages[0].content).toEqual('Chat 2 message');
    expect(chat2Messages[0].chat_id).toEqual(chat2Id);
  });
});
