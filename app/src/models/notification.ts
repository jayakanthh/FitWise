export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'duo_invite'
  | 'community_invite'
  | 'achievement'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string; // recipient
  fromUserId?: string;
  fromUserName?: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: number;
  data?: {
    sessionId?: string;
    inviteId?: string;
    friendRequestId?: string;
    communityId?: string;
    [key: string]: any;
  };
}
