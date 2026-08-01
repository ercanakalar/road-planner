import type { Ionicons } from '@expo/vector-icons';

export interface ContextMenuOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger';
  action: () => void;
}

export interface ContextMenuProps {
  visible: boolean;
  title?: string;
  options: ContextMenuOption[];
  onClose: () => void;
}
