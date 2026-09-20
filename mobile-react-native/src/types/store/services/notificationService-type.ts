import { Page } from 'types/store/bases';

export type NotificationKind = 'ROUTE_PUBLISHED';

export interface NotificationActor {
  id: string;
  displayName: string;
  photo: string | null;
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor | null;
  road: { id: string; title: string } | null;
  isOpenable: boolean;
}

export interface NotificationPage extends Page<AppNotification> {
  unread: number;
}

export interface NotificationPageArgs {
  limit?: number;
  offset?: number;
}

export interface NotificationSettings {
  inApp: boolean;
  email: boolean;
}

export type NotificationSettingsPatch = Partial<NotificationSettings>;

export interface UnreadCount {
  unread: number;
}
