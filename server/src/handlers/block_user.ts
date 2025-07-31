
import { type BlockUserInput, type BlockedUser } from '../schema';

export const blockUser = async (input: BlockUserInput): Promise<BlockedUser> => {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is blocking a user.
  // Should remove friendship if exists and add to blocked list.
  return Promise.resolve({
    id: 0,
    blocker_id: input.blocker_id,
    blocked_id: input.blocked_id,
    created_at: new Date()
  } as BlockedUser);
};
