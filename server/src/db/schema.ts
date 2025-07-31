
import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const callStatusEnum = pgEnum('call_status', ['online', 'offline', 'in_call']);
export const friendRequestStatusEnum = pgEnum('friend_request_status', ['pending', 'accepted', 'rejected']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'video', 'audio']);
export const callTypeEnum = pgEnum('call_type', ['audio', 'video']);
export const callLogStatusEnum = pgEnum('call_log_status', ['completed', 'missed', 'rejected']);
export const mediaTypeEnum = pgEnum('media_type', ['text', 'image', 'video']);
export const privacyEnum = pgEnum('privacy', ['public', 'friends_only']);

// Users table
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(), // ting-xxxx format
  google_id: text('google_id').notNull().unique(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  profile_picture_url: text('profile_picture_url'),
  call_status: callStatusEnum('call_status').notNull().default('offline'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Friend requests table
export const friendRequestsTable = pgTable('friend_requests', {
  id: serial('id').primaryKey(),
  sender_id: text('sender_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  receiver_id: text('receiver_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: friendRequestStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Friendships table
export const friendshipsTable = pgTable('friendships', {
  id: serial('id').primaryKey(),
  user1_id: text('user1_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  user2_id: text('user2_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Blocked users table
export const blockedUsersTable = pgTable('blocked_users', {
  id: serial('id').primaryKey(),
  blocker_id: text('blocker_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  blocked_id: text('blocked_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Chats table
export const chatsTable = pgTable('chats', {
  id: serial('id').primaryKey(),
  user1_id: text('user1_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  user2_id: text('user2_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  last_message_id: integer('last_message_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  chat_id: integer('chat_id').notNull().references(() => chatsTable.id, { onDelete: 'cascade' }),
  sender_id: text('sender_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  message_type: messageTypeEnum('message_type').notNull().default('text'),
  is_deleted: boolean('is_deleted').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Chat participants table (for unread counts)
export const chatParticipantsTable = pgTable('chat_participants', {
  id: serial('id').primaryKey(),
  chat_id: integer('chat_id').notNull().references(() => chatsTable.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  unread_count: integer('unread_count').notNull().default(0),
  last_read_at: timestamp('last_read_at'),
});

// Call logs table
export const callLogsTable = pgTable('call_logs', {
  id: serial('id').primaryKey(),
  caller_id: text('caller_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  receiver_id: text('receiver_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  call_type: callTypeEnum('call_type').notNull(),
  status: callLogStatusEnum('status').notNull(),
  duration: integer('duration'), // in seconds
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Statuses table
export const statusesTable = pgTable('statuses', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content'),
  media_url: text('media_url'),
  media_type: mediaTypeEnum('media_type').notNull().default('text'),
  privacy: privacyEnum('privacy').notNull().default('friends_only'),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Status views table
export const statusViewsTable = pgTable('status_views', {
  id: serial('id').primaryKey(),
  status_id: integer('status_id').notNull().references(() => statusesTable.id, { onDelete: 'cascade' }),
  viewer_id: text('viewer_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  viewed_at: timestamp('viewed_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  sentFriendRequests: many(friendRequestsTable, { relationName: 'sender' }),
  receivedFriendRequests: many(friendRequestsTable, { relationName: 'receiver' }),
  friendships1: many(friendshipsTable, { relationName: 'user1' }),
  friendships2: many(friendshipsTable, { relationName: 'user2' }),
  blockedUsers: many(blockedUsersTable, { relationName: 'blocker' }),
  blockedBy: many(blockedUsersTable, { relationName: 'blocked' }),
  chats1: many(chatsTable, { relationName: 'user1' }),
  chats2: many(chatsTable, { relationName: 'user2' }),
  messages: many(messagesTable),
  chatParticipants: many(chatParticipantsTable),
  callsInitiated: many(callLogsTable, { relationName: 'caller' }),
  callsReceived: many(callLogsTable, { relationName: 'receiver' }),
  statuses: many(statusesTable),
  statusViews: many(statusViewsTable),
}));

export const friendRequestsRelations = relations(friendRequestsTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [friendRequestsTable.sender_id],
    references: [usersTable.id],
    relationName: 'sender',
  }),
  receiver: one(usersTable, {
    fields: [friendRequestsTable.receiver_id],
    references: [usersTable.id],
    relationName: 'receiver',
  }),
}));

export const friendshipsRelations = relations(friendshipsTable, ({ one }) => ({
  user1: one(usersTable, {
    fields: [friendshipsTable.user1_id],
    references: [usersTable.id],
    relationName: 'user1',
  }),
  user2: one(usersTable, {
    fields: [friendshipsTable.user2_id],
    references: [usersTable.id],
    relationName: 'user2',
  }),
}));

export const blockedUsersRelations = relations(blockedUsersTable, ({ one }) => ({
  blocker: one(usersTable, {
    fields: [blockedUsersTable.blocker_id],
    references: [usersTable.id],
    relationName: 'blocker',
  }),
  blocked: one(usersTable, {
    fields: [blockedUsersTable.blocked_id],
    references: [usersTable.id],
    relationName: 'blocked',
  }),
}));

export const chatsRelations = relations(chatsTable, ({ one, many }) => ({
  user1: one(usersTable, {
    fields: [chatsTable.user1_id],
    references: [usersTable.id],
    relationName: 'user1',
  }),
  user2: one(usersTable, {
    fields: [chatsTable.user2_id],
    references: [usersTable.id],
    relationName: 'user2',
  }),
  messages: many(messagesTable),
  participants: many(chatParticipantsTable),
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  chat: one(chatsTable, {
    fields: [messagesTable.chat_id],
    references: [chatsTable.id],
  }),
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id],
  }),
}));

export const chatParticipantsRelations = relations(chatParticipantsTable, ({ one }) => ({
  chat: one(chatsTable, {
    fields: [chatParticipantsTable.chat_id],
    references: [chatsTable.id],
  }),
  user: one(usersTable, {
    fields: [chatParticipantsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const callLogsRelations = relations(callLogsTable, ({ one }) => ({
  caller: one(usersTable, {
    fields: [callLogsTable.caller_id],
    references: [usersTable.id],
    relationName: 'caller',
  }),
  receiver: one(usersTable, {
    fields: [callLogsTable.receiver_id],
    references: [usersTable.id],
    relationName: 'receiver',
  }),
}));

export const statusesRelations = relations(statusesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [statusesTable.user_id],
    references: [usersTable.id],
  }),
  views: many(statusViewsTable),
}));

export const statusViewsRelations = relations(statusViewsTable, ({ one }) => ({
  status: one(statusesTable, {
    fields: [statusViewsTable.status_id],
    references: [statusesTable.id],
  }),
  viewer: one(usersTable, {
    fields: [statusViewsTable.viewer_id],
    references: [usersTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  friendRequests: friendRequestsTable,
  friendships: friendshipsTable,
  blockedUsers: blockedUsersTable,
  chats: chatsTable,
  messages: messagesTable,
  chatParticipants: chatParticipantsTable,
  callLogs: callLogsTable,
  statuses: statusesTable,
  statusViews: statusViewsTable,
};
