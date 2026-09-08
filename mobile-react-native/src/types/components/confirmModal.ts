import { Ionicons } from '@expo/vector-icons';

/** What a confirmation asks, and how strongly it asks it. */
export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger';
}
