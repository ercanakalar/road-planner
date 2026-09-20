import { Ionicons } from '@expo/vector-icons';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger';
}
