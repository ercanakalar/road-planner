import { Page } from 'types/store/bases';

/** What a notification is about. One kind so far; the field is the API's. */
export type NotificationKind = 'ROUTE_PUBLISHED';

/** Who caused it. Null once that account is gone. */
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
  /**
   * False when the route has since been unpublished, archived or deleted. The
   * line stays — it is a true record of what happened — but tapping it would
   * go nowhere.
   */
  isOpenable: boolean;
}

/** A page of the inbox, with how much of the whole thing is still unread. */
export interface NotificationPage extends Page<AppNotification> {
  unread: number;
}

export interface NotificationPageArgs {
  limit?: number;
  offset?: number;
}

/** Where somebody wants to hear about what they follow. */
export interface NotificationSettings {
  inApp: boolean;
  email: boolean;
}

/** One switch at a time: a missing field leaves the other alone. */
export type NotificationSettingsPatch = Partial<NotificationSettings>;

export interface UnreadCount {
  unread: number;
}
