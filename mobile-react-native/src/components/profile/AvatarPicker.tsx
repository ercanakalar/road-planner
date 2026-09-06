import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { showNotification } from 'services/notificationService';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  photo?: string | null;
  isUploading?: boolean;
  onPicked: (uri: string) => void;
}

const AvatarPicker = ({ photo, isUploading, onPicked }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handlePress = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showNotification({
        type: 'info',
        header: 'Photo access needed',
        message: 'Allow photo access to choose a profile picture.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    const uri = result.canceled ? null : result.assets?.[0]?.uri;
    if (uri) onPicked(uri);
  }, [onPicked]);

  const source = resolvePhotoUrl(photo);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        disabled={isUploading}
        accessibilityRole='button'
        accessibilityLabel='Change profile photo'
        accessibilityState={{ busy: !!isUploading }}
        style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
      >
        {source ? (
          <Image source={{ uri: source }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Ionicons name='person' size={40} color={colors.textSubtle} />
          </View>
        )}

        <View style={styles.badge}>
          {isUploading ? (
            <ActivityIndicator size='small' color={colors.textInverse} />
          ) : (
            <Ionicons name='camera' size={16} color={colors.textInverse} />
          )}
        </View>
      </Pressable>

      <Text style={styles.hint}>
        {isUploading ? 'Uploading…' : 'Tap to change your photo'}
      </Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: { alignItems: 'center', gap: spacing.sm },
    avatarWrap: { width: 104, height: 104 },
    pressed: { opacity: 0.85 },
    avatar: {
      width: 104,
      height: 104,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    badge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.background,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });

export default memo(AvatarPicker);
