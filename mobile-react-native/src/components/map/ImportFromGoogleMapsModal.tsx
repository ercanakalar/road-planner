import { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from 'components/ui/PrimaryButton';
import useGoogleMapsImport from 'hooks/map/useGoogleMapsImport';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  useThemedTextInputProps,
} from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const DEFAULT_TITLE = 'Imported route';

const ImportFromGoogleMapsModal = ({ visible, onClose }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inputTheme = useThemedTextInputProps();

  const {
    link,
    handleLinkChange,
    pasteFromClipboard,
    isReading,
    preview,
    error,
    read,
    confirm,
    reset,
  } = useGoogleMapsImport();

  const [title, setTitle] = useState(DEFAULT_TITLE);

  useEffect(() => {
    if (!visible) {
      reset();
      setTitle(DEFAULT_TITLE);
    }
  }, [reset, visible]);

  const handleAdd = useCallback(() => {
    if (confirm(title)) onClose();
  }, [confirm, onClose, title]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>Import from Google Maps</Text>
              <Text style={styles.subheading}>
                Share a route from Google Maps, then paste the link here.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel='Close import'
            >
              <Ionicons name='close' size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name='link' size={18} color={colors.textMuted} />
            <TextInput
              placeholder='https://maps.app.goo.gl/…'
              value={link}
              onChangeText={handleLinkChange}
              style={styles.input}
              {...inputTheme}
              autoCapitalize='none'
              autoCorrect={false}
              multiline
              accessibilityLabel='Google Maps link'
            />
            <Pressable
              onPress={pasteFromClipboard}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel='Paste from clipboard'
            >
              <Ionicons
                name='clipboard-outline'
                size={18}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {preview ? (
            <>
              <Text style={styles.foundLabel}>
                {preview.resolved.length} stop
                {preview.resolved.length === 1 ? '' : 's'} found
              </Text>

              <ScrollView
                style={styles.stops}
                keyboardShouldPersistTaps='handled'
              >
                {preview.resolved.map((stop, index) => (
                  <View key={`${stop.latitude},${stop.longitude}`} style={styles.stop}>
                    <View style={styles.rank}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stopText} numberOfLines={2}>
                      {stop.label}
                    </Text>
                  </View>
                ))}

                {preview.unresolved.length > 0 ? (
                  <View style={styles.notice}>
                    <Ionicons
                      name='alert-circle-outline'
                      size={14}
                      color={colors.warning}
                    />
                    <Text style={styles.noticeText}>
                      Could not place {preview.unresolved.join(', ')}. The rest
                      of the route came through.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              <TextInput
                value={title}
                onChangeText={setTitle}
                style={styles.titleInput}
                {...inputTheme}
                placeholder='Route name'
                accessibilityLabel='Route name'
              />

              <PrimaryButton label='Add to my routes' onPress={handleAdd} />
            </>
          ) : (
            <PrimaryButton
              label={isReading ? 'Reading the link…' : 'Read the link'}
              onPress={read}
              isLoading={isReading}
              disabled={!link.trim()}
            />
          )}

          {isReading && !preview ? (
            <ActivityIndicator size='small' color={colors.textMuted} />
          ) : null}

          <Text style={styles.footnote}>
            Stops are matched through Google, so check them before adding.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.overlay,
    },
    sheet: {
      gap: spacing.md,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      backgroundColor: colors.surface,
      maxHeight: '85%',
      ...shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headerText: { flex: 1, gap: spacing.xxs },
    heading: { ...typography.title, color: colors.text },
    subheading: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.text,
      maxHeight: 80,
      paddingVertical: 0,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      lineHeight: 18,
    },
    foundLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    stops: { maxHeight: 220 },
    stop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    rank: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    rankText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.primary,
    },
    stopText: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
    },
    noticeText: {
      ...typography.caption,
      color: colors.textMuted,
      flex: 1,
      lineHeight: 17,
    },
    titleInput: {
      ...typography.body,
      color: colors.text,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    footnote: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSubtle,
      textAlign: 'center',
    },
  });

export default memo(ImportFromGoogleMapsModal);
