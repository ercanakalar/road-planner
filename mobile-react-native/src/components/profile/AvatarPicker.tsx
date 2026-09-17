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

import { AVATAR_MAX_LABEL } from 'constants/avatar';
import { showNotification } from 'services/notificationService';
import { isPhotoTooLarge, PickedPhoto } from 'utils/photoUpload';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { useTranslation } from 'react-i18next';

interface Props {
  photo?: string | null;
  isUploading?: boolean;
  onPicked: (photo: PickedPhoto) => void;
}

const AvatarPicker = ({ photo, isUploading, onPicked }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const handlePress = useCallback(async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showNotification({
          type: 'info',
          header: t('toast.photoAccessNeeded'),
          message: t('toast.photoAccessMessage'),
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      // Checked here rather than discovered from a failed upload: the API
      // refuses anything larger, and on a phone connection that refusal can be
      // several megabytes and half a minute away.
      if (isPhotoTooLarge(asset.fileSize)) {
        showNotification({
          type: 'error',
          header: t('toast.photoTooLarge'),
          message: t('toast.photoTooLargeMessage', { limit: AVATAR_MAX_LABEL }),
        });
        return;
      }

      onPicked({ uri: asset.uri });
    } catch {
      // The picker is another app's activity, and it can fail to open or come
      // back empty-handed. Unhandled, that rejection is invisible: the tap does
      // nothing at all and there is no way to tell it apart from a dead button.
      showNotification({
        type: 'error',
        header: t('toast.couldNotOpenPhotos'),
        message: t('toast.photoPickerFailed'),
      });
    }
  }, [onPicked]);

  const source = resolvePhotoUrl(photo);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        disabled={isUploading}
        accessibilityRole='button'
        accessibilityLabel={t('mapUi.changeProfilePhoto')}
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
        {isUploading ? t('defaults.uploading') : t('defaults.tapToChangePhoto')}
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
