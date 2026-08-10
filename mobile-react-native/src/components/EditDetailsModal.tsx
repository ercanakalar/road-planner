import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import FormField from './FormField';
import PrimaryButton from './PrimaryButton';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

export const TITLE_MAX_LENGTH = 255;
export const DESCRIPTION_MAX_LENGTH = 2000;

export interface DetailsDraft {
  title: string;
  description: string;
  isPublic?: boolean;
}

interface Props {
  visible: boolean;
  heading?: string;
  hint?: string;
  initialTitle?: string | null;
  initialDescription?: string | null;
  titleLabel?: string;
  isSaving?: boolean;
  requireTitle?: boolean;
  showPublishToggle?: boolean;
  initialIsPublic?: boolean;
  onSave: (draft: DetailsDraft) => void;
  onCancel: () => void;
}

const EditDetailsModal = ({
  visible,
  heading = 'Edit details',
  hint,
  initialTitle,
  initialDescription,
  titleLabel = 'Title',
  isSaving,
  requireTitle = true,
  showPublishToggle = false,
  initialIsPublic = false,
  onSave,
  onCancel,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [title, setTitle] = useState(initialTitle ?? '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle(initialTitle ?? '');
    setDescription(initialDescription ?? '');
    setIsPublic(initialIsPublic);
    setError('');
  }, [initialDescription, initialIsPublic, initialTitle, visible]);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();

    if (requireTitle && !trimmedTitle) {
      setError('A title is required.');
      return;
    }
    if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      setError(`Keep the title under ${TITLE_MAX_LENGTH} characters.`);
      return;
    }
    if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
      setError(
        `Keep the description under ${DESCRIPTION_MAX_LENGTH} characters.`,
      );
      return;
    }

    onSave({
      title: trimmedTitle,
      description: description.trim(),
      ...(showPublishToggle ? { isPublic } : {}),
    });
  }, [description, isPublic, onSave, requireTitle, showPublishToggle, title]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={styles.card} onPress={swallowPress}>
            <ScrollView
              keyboardShouldPersistTaps='handled'
              contentContainerStyle={styles.content}
            >
              <Text style={styles.heading}>{heading}</Text>
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}

              <FormField
                label={titleLabel}
                value={title}
                onChangeText={setTitle}
                placeholder='Give it a name'
                maxLength={TITLE_MAX_LENGTH}
                autoCapitalize='sentences'
              />

              <FormField
                label='Description'
                value={description}
                onChangeText={setDescription}
                placeholder='Optional notes'
                maxLength={DESCRIPTION_MAX_LENGTH}
                multiline
                error={error}
              />

              {showPublishToggle ? (
                <View style={styles.publishRow}>
                  <View style={styles.publishText}>
                    <Text style={styles.publishLabel}>
                      Share with the community
                    </Text>
                    <Text style={styles.publishHint}>
                      Your name and this route&apos;s stops become visible to
                      everyone on the Home screen.
                    </Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{
                      true: colors.primary,
                      false: colors.borderStrong,
                    }}
                    thumbColor={colors.surface}
                    ios_backgroundColor={colors.borderStrong}
                    accessibilityLabel='Share this route with the community'
                  />
                </View>
              ) : null}

              <View style={styles.actions}>
                <PrimaryButton
                  label='Cancel'
                  variant='secondary'
                  onPress={onCancel}
                  disabled={isSaving}
                  style={styles.action}
                />
                <PrimaryButton
                  label='Save'
                  onPress={handleSave}
                  isLoading={isSaving}
                  style={styles.action}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const swallowPress = () => {};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '85%',
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      ...shadows.lg,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    heading: {
      ...typography.heading,
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: -spacing.sm,
      lineHeight: 18,
    },
    publishRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
    },
    publishText: { flex: 1, gap: spacing.xxs },
    publishLabel: {
      ...typography.label,
      color: colors.text,
    },
    publishHint: {
      ...typography.caption,
      color: colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    action: { flex: 1 },
  });

export default memo(EditDetailsModal);
