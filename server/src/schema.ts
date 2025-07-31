
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string(), // ting-xxxx format
  google_id: z.string(),
  name: z.string(),
  emoji: z.string(),
  profile_picture_url: z.string().nullable(),
  call_status: z.enum(['online', 'offline', 'in_call']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Friend request schema
export const friendRequestSchema = z.object({
  id: z.number(),
  sender_id: z.string(),
  receiver_id: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type FriendRequest = z.infer<typeof friendRequestSchema>;

// Friendship schema
export const friendshipSchema = z.object({
  id: z.number(),
  user1_id: z.string(),
  user2_id: z.string(),
  created_at: z.coerce.date()
});

export type Friendship = z.infer<typeof friendshipSchema>;

// Blocked users schema
export const blockedUserSchema = z.object({
  id: z.number(),
  blocker_id: z.string(),
  blocked_id: z.string(),
  created_at: z.coerce.date()
});

export type BlockedUser = z.infer<typeof blockedUserSchema>;

// Chat schema
export const chatSchema = z.object({
  id: z.number(),
  user1_id: z.string(),
  user2_id: z.string(),
  last_message_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Chat = z.infer<typeof chatSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  chat_id: z.number(),
  sender_id: z.string(),
  content: z.string(),
  message_type: z.enum(['text', 'image', 'video', 'audio']),
  is_deleted: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Chat participant schema (for unread counts)
export const chatParticipantSchema = z.object({
  id: z.number(),
  chat_id: z.number(),
  user_id: z.string(),
  unread_count: z.number().int(),
  last_read_at: z.coerce.date().nullable()
});

export type ChatParticipant = z.infer<typeof chatParticipantSchema>;

// Call log schema
export const callLogSchema = z.object({
  id: z.number(),
  caller_id: z.string(),
  receiver_id: z.string(),
  call_type: z.enum(['audio', 'video']),
  status: z.enum(['completed', 'missed', 'rejected']),
  duration: z.number().int().nullable(), // in seconds
  created_at: z.coerce.date()
});

export type CallLog = z.infer<typeof callLogSchema>;

// Status schema
export const statusSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  content: z.string().nullable(),
  media_url: z.string().nullable(),
  media_type: z.enum(['text', 'image', 'video']),
  privacy: z.enum(['public', 'friends_only']),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Status = z.infer<typeof statusSchema>;

// Status view schema (for tracking who viewed status)
export const statusViewSchema = z.object({
  id: z.number(),
  status_id: z.number(),
  viewer_id: z.string(),
  viewed_at: z.coerce.date()
});

export type StatusView = z.infer<typeof statusViewSchema>;

// Input schemas for creating/updating
export const createUserInputSchema = z.object({
  google_id: z.string(),
  name: z.string(),
  emoji: z.string(),
  profile_picture_url: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  emoji: z.string().optional(),
  profile_picture_url: z.string().nullable().optional(),
  call_status: z.enum(['online', 'offline', 'in_call']).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const sendFriendRequestInputSchema = z.object({
  sender_id: z.string(),
  receiver_id: z.string()
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestInputSchema>;

export const respondToFriendRequestInputSchema = z.object({
  request_id: z.number(),
  status: z.enum(['accepted', 'rejected'])
});

export type RespondToFriendRequestInput = z.infer<typeof respondToFriendRequestInputSchema>;

export const blockUserInputSchema = z.object({
  blocker_id: z.string(),
  blocked_id: z.string()
});

export type BlockUserInput = z.infer<typeof blockUserInputSchema>;

export const sendMessageInputSchema = z.object({
  chat_id: z.number(),
  sender_id: z.string(),
  content: z.string(),
  message_type: z.enum(['text', 'image', 'video', 'audio'])
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const deleteMessageInputSchema = z.object({
  message_id: z.number(),
  user_id: z.string()
});

export type DeleteMessageInput = z.infer<typeof deleteMessageInputSchema>;

export const createStatusInputSchema = z.object({
  user_id: z.string(),
  content: z.string().nullable(),
  media_url: z.string().nullable(),
  media_type: z.enum(['text', 'image', 'video']),
  privacy: z.enum(['public', 'friends_only'])
});

export type CreateStatusInput = z.infer<typeof createStatusInputSchema>;

export const logCallInputSchema = z.object({
  caller_id: z.string(),
  receiver_id: z.string(),
  call_type: z.enum(['audio', 'video']),
  status: z.enum(['completed', 'missed', 'rejected']),
  duration: z.number().int().nullable()
});

export type LogCallInput = z.infer<typeof logCallInputSchema>;

export const markAsReadInputSchema = z.object({
  chat_id: z.number(),
  user_id: z.string()
});

export type MarkAsReadInput = z.infer<typeof markAsReadInputSchema>;
