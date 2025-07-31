
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  sendFriendRequestInputSchema,
  respondToFriendRequestInputSchema,
  blockUserInputSchema,
  sendMessageInputSchema,
  deleteMessageInputSchema,
  markAsReadInputSchema,
  logCallInputSchema,
  createStatusInputSchema
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { updateUser } from './handlers/update_user';
import { getUserById } from './handlers/get_user_by_id';
import { searchUsers } from './handlers/search_users';
import { sendFriendRequest } from './handlers/send_friend_request';
import { respondToFriendRequest } from './handlers/respond_to_friend_request';
import { getFriendRequests } from './handlers/get_friend_requests';
import { getFriends } from './handlers/get_friends';
import { blockUser } from './handlers/block_user';
import { unblockUser } from './handlers/unblock_user';
import { getOrCreateChat } from './handlers/get_or_create_chat';
import { sendMessage } from './handlers/send_message';
import { getChatMessages } from './handlers/get_chat_messages';
import { deleteMessage } from './handlers/delete_message';
import { markMessagesAsRead } from './handlers/mark_messages_as_read';
import { getUserChats } from './handlers/get_user_chats';
import { logCall } from './handlers/log_call';
import { getCallLogs } from './handlers/get_call_logs';
import { createStatus } from './handlers/create_status';
import { getUserStatuses } from './handlers/get_user_statuses';
import { getFriendsStatuses } from './handlers/get_friends_statuses';
import { markStatusViewed } from './handlers/mark_status_viewed';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
    
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
    
  getUserById: publicProcedure
    .input(z.string())
    .query(({ input }) => getUserById(input)),
    
  searchUsers: publicProcedure
    .input(z.string())
    .query(({ input }) => searchUsers(input)),

  // Friend system
  sendFriendRequest: publicProcedure
    .input(sendFriendRequestInputSchema)
    .mutation(({ input }) => sendFriendRequest(input)),
    
  respondToFriendRequest: publicProcedure
    .input(respondToFriendRequestInputSchema)
    .mutation(({ input }) => respondToFriendRequest(input)),
    
  getFriendRequests: publicProcedure
    .input(z.string())
    .query(({ input }) => getFriendRequests(input)),
    
  getFriends: publicProcedure
    .input(z.string())
    .query(({ input }) => getFriends(input)),
    
  blockUser: publicProcedure
    .input(blockUserInputSchema)
    .mutation(({ input }) => blockUser(input)),
    
  unblockUser: publicProcedure
    .input(z.object({ blockerId: z.string(), blockedId: z.string() }))
    .mutation(({ input }) => unblockUser(input.blockerId, input.blockedId)),

  // Messaging
  getOrCreateChat: publicProcedure
    .input(z.object({ user1Id: z.string(), user2Id: z.string() }))
    .mutation(({ input }) => getOrCreateChat(input.user1Id, input.user2Id)),
    
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),
    
  getChatMessages: publicProcedure
    .input(z.object({ 
      chatId: z.number(), 
      limit: z.number().optional(), 
      offset: z.number().optional() 
    }))
    .query(({ input }) => getChatMessages(input.chatId, input.limit, input.offset)),
    
  deleteMessage: publicProcedure
    .input(deleteMessageInputSchema)
    .mutation(({ input }) => deleteMessage(input)),
    
  markMessagesAsRead: publicProcedure
    .input(markAsReadInputSchema)
    .mutation(({ input }) => markMessagesAsRead(input)),
    
  getUserChats: publicProcedure
    .input(z.string())
    .query(({ input }) => getUserChats(input)),

  // Calling
  logCall: publicProcedure
    .input(logCallInputSchema)
    .mutation(({ input }) => logCall(input)),
    
  getCallLogs: publicProcedure
    .input(z.string())
    .query(({ input }) => getCallLogs(input)),

  // Status
  createStatus: publicProcedure
    .input(createStatusInputSchema)
    .mutation(({ input }) => createStatus(input)),
    
  getUserStatuses: publicProcedure
    .input(z.object({ userId: z.string(), viewerId: z.string() }))
    .query(({ input }) => getUserStatuses(input.userId, input.viewerId)),
    
  getFriendsStatuses: publicProcedure
    .input(z.string())
    .query(({ input }) => getFriendsStatuses(input)),
    
  markStatusViewed: publicProcedure
    .input(z.object({ statusId: z.number(), viewerId: z.string() }))
    .mutation(({ input }) => markStatusViewed(input.statusId, input.viewerId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TINGLING TRPC server listening at port: ${port}`);
}

start();
